package store

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"weave/internal/engine"
	"weave/internal/graph"
	"weave/internal/redact"
)

// PostgresStore implements engine.Store and all Weave persistence operations.
type PostgresStore struct {
	pool *pgxpool.Pool
}

// NewPostgresStore connects to Postgres and returns a PostgresStore.
func NewPostgresStore(ctx context.Context, connString string) (*PostgresStore, error) {
	cfg, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, fmt.Errorf("invalid postgres conn string: %w", err)
	}
	cfg.MaxConns = 25
	cfg.MinConns = 2

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}

	if err := RunMigrations(ctx, pool); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	return &PostgresStore{pool: pool}, nil
}

func (p *PostgresStore) Close() {
	p.pool.Close()
}

// -------------------------------------------------------------
// Authentication & Multi-Tenancy (Better Auth)
// -------------------------------------------------------------

// AuthSession represents an authenticated user session validated against Better Auth.
type AuthSession struct {
	UserID               string    `json:"user_id"`
	UserName             string    `json:"user_name"`
	UserEmail            string    `json:"user_email"`
	ActiveOrganizationID string    `json:"active_organization_id,omitempty"`
	WorkspaceID          string    `json:"workspace_id"`
	WorkspaceName        string    `json:"workspace_name"`
	ExpiresAt            time.Time `json:"expires_at"`
}

// VerifySession verifies a session token against the Better Auth session table and resolves the active workspace.
func (p *PostgresStore) VerifySession(ctx context.Context, token string) (*AuthSession, error) {
	if token == "" {
		return nil, nil
	}

	query := `
		SELECT s."userId", COALESCE(s."activeOrganizationId", ''), u.name, u.email, s."expiresAt",
		       COALESCE(o.name, '')
		FROM session s
		JOIN "user" u ON u.id = s."userId"
		LEFT JOIN organization o ON o.id = s."activeOrganizationId"
		WHERE s.token = $1 AND s."expiresAt" > NOW()
	`

	var sess AuthSession
	var orgName string
	err := p.pool.QueryRow(ctx, query, token).Scan(
		&sess.UserID,
		&sess.ActiveOrganizationID,
		&sess.UserName,
		&sess.UserEmail,
		&sess.ExpiresAt,
		&orgName,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to verify session: %w", err)
	}

	// Deterministic UUIDv5 maps Better Auth IDs to valid Postgres UUID workspaces
	if sess.ActiveOrganizationID != "" {
		sess.WorkspaceID = uuid.NewSHA1(uuid.NameSpaceOID, []byte("org:"+sess.ActiveOrganizationID)).String()
		if orgName != "" {
			sess.WorkspaceName = orgName
		} else {
			sess.WorkspaceName = "Team Workspace"
		}
	} else {
		sess.WorkspaceID = uuid.NewSHA1(uuid.NameSpaceOID, []byte("user:"+sess.UserID)).String()
		if sess.UserName != "" {
			sess.WorkspaceName = sess.UserName + " (Personal)"
		} else {
			sess.WorkspaceName = "Personal Workspace"
		}
	}

	// Upsert workspace record so foreign key constraints are always satisfied
	_, _ = p.pool.Exec(ctx,
		`INSERT INTO workspaces (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
		sess.WorkspaceID, sess.WorkspaceName,
	)

	return &sess, nil
}

// -------------------------------------------------------------
// engine.Store Implementation
// -------------------------------------------------------------

func (p *PostgresStore) AppendEvent(ctx context.Context, ev engine.Event) error {
	// Redact secrets and enforce 64KB max event payload size (ADR-007)
	ev.Payload = redact.SanitizePayload(ev.Payload)

	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Compute strictly monotonic sequence number per run
	var nextSeq int64
	err = tx.QueryRow(ctx,
		`SELECT COALESCE(MAX(seq), 0) + 1 FROM run_events WHERE run_id = $1`,
		ev.RunID,
	).Scan(&nextSeq)
	if err != nil {
		return fmt.Errorf("failed to calculate next event seq: %w", err)
	}

	evID := ev.ID
	if evID == "" {
		evID = uuid.New().String()
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO run_events (id, run_id, seq, ts, type, step_id, node_id, payload)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, evID, ev.RunID, nextSeq, ev.Timestamp, ev.Type, ev.StepID, ev.NodeID, ev.Payload)
	if err != nil {
		return fmt.Errorf("failed to insert run_event: %w", err)
	}

	// Update projections on runs table
	switch ev.Type {
	case engine.EventRunStarted:
		_, _ = tx.Exec(ctx, `UPDATE runs SET status = 'running', started_at = $2 WHERE id = $1`, ev.RunID, ev.Timestamp)

	case engine.EventRunSucceeded:
		var pld struct {
			Output any `json:"output"`
		}
		_ = json.Unmarshal(ev.Payload, &pld)
		outJSON, _ := json.Marshal(pld.Output)
		_, _ = tx.Exec(ctx, `UPDATE runs SET status = 'succeeded', output = $2, ended_at = $3 WHERE id = $1`, ev.RunID, outJSON, ev.Timestamp)

	case engine.EventRunFailed:
		var pld struct {
			Error string `json:"error"`
		}
		_ = json.Unmarshal(ev.Payload, &pld)
		_, _ = tx.Exec(ctx, `UPDATE runs SET status = 'failed', error = $2, ended_at = $3 WHERE id = $1`, ev.RunID, pld.Error, ev.Timestamp)

	case engine.EventRunCancelled:
		_, _ = tx.Exec(ctx, `UPDATE runs SET status = 'cancelled', ended_at = $2 WHERE id = $1`, ev.RunID, ev.Timestamp)

	case engine.EventRunBudgetExceeded:
		_, _ = tx.Exec(ctx, `UPDATE runs SET status = 'budget_exceeded', ended_at = $2 WHERE id = $1`, ev.RunID, ev.Timestamp)

	case engine.EventGateOpened:
		_, _ = tx.Exec(ctx, `UPDATE runs SET status = 'waiting_human' WHERE id = $1`, ev.RunID)

	case engine.EventGateResolved:
		_, _ = tx.Exec(ctx, `UPDATE runs SET status = 'running' WHERE id = $1`, ev.RunID)
	}

	// Update projections on steps table
	switch ev.Type {
	case engine.EventStepReady:
		var pld struct {
			NodeID  string `json:"node_id"`
			Attempt int    `json:"attempt"`
			Input   any    `json:"input"`
		}
		_ = json.Unmarshal(ev.Payload, &pld)
		inputJSON, _ := json.Marshal(pld.Input)
		_, _ = tx.Exec(ctx, `
			INSERT INTO steps (run_id, step_id, node_id, attempt, status, input)
			VALUES ($1, $2, $3, $4, 'pending', $5)
			ON CONFLICT (run_id, step_id, attempt) DO NOTHING
		`, ev.RunID, ev.StepID, pld.NodeID, pld.Attempt, inputJSON)

	case engine.EventStepStarted:
		_, _ = tx.Exec(ctx, `
			UPDATE steps SET status = 'running', started_at = $3
			WHERE run_id = $1 AND step_id = $2
		`, ev.RunID, ev.StepID, ev.Timestamp)

	case engine.EventStepSucceeded:
		var pld struct {
			Output any `json:"output"`
		}
		_ = json.Unmarshal(ev.Payload, &pld)
		outJSON, _ := json.Marshal(pld.Output)
		_, _ = tx.Exec(ctx, `
			UPDATE steps SET status = 'succeeded', output = $3, ended_at = $4
			WHERE run_id = $1 AND step_id = $2
		`, ev.RunID, ev.StepID, outJSON, ev.Timestamp)

	case engine.EventStepFailed:
		var pld struct {
			Error string `json:"error"`
		}
		_ = json.Unmarshal(ev.Payload, &pld)
		_, _ = tx.Exec(ctx, `
			UPDATE steps SET status = 'failed', error = $3, ended_at = $4
			WHERE run_id = $1 AND step_id = $2
		`, ev.RunID, ev.StepID, pld.Error, ev.Timestamp)
	}

	return tx.Commit(ctx)
}

func (p *PostgresStore) GetEvents(ctx context.Context, runID string, afterSeq int64) ([]engine.Event, error) {
	rows, err := p.pool.Query(ctx, `
		SELECT id, run_id, seq, ts, type, COALESCE(step_id, ''), COALESCE(node_id, ''), payload
		FROM run_events
		WHERE run_id = $1 AND seq > $2
		ORDER BY seq ASC
	`, runID, afterSeq)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []engine.Event
	for rows.Next() {
		var ev engine.Event
		var pld []byte
		if err := rows.Scan(&ev.ID, &ev.RunID, &ev.Seq, &ev.Timestamp, &ev.Type, &ev.StepID, &ev.NodeID, &pld); err != nil {
			return nil, err
		}
		ev.Payload = pld
		events = append(events, ev)
	}
	return events, rows.Err()
}

func (p *PostgresStore) GetRunState(ctx context.Context, runID string) (*engine.RunState, error) {
	events, err := p.GetEvents(ctx, runID, 0)
	if err != nil {
		return nil, err
	}
	if len(events) == 0 {
		return nil, fmt.Errorf("run '%s' not found or has no events", runID)
	}
	return engine.FoldEvents(runID, events), nil
}

func (p *PostgresStore) SaveGate(ctx context.Context, gate engine.GateRecord) error {
	pldJSON, _ := json.Marshal(gate.Payload)
	_, err := p.pool.Exec(ctx, `
		INSERT INTO gates (id, run_id, step_id, node_id, prompt, status, expires_at, created_at, payload)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
		ON CONFLICT (id) DO UPDATE SET
			status = EXCLUDED.status,
			payload = EXCLUDED.payload
	`, gate.GateID, gate.RunID, gate.StepID, gate.NodeID, gate.Prompt, gate.Status, gate.ExpiresAt, pldJSON)
	return err
}

func (p *PostgresStore) GetGate(ctx context.Context, gateID string) (*engine.GateRecord, error) {
	var g engine.GateRecord
	var pld []byte
	var resolvedBy, resolution *string
	var wsID string

	err := p.pool.QueryRow(ctx, `
		SELECT g.id, g.run_id, g.step_id, g.node_id, g.prompt, g.status, g.expires_at, g.resolved_by, g.resolution, g.payload, r.workspace_id
		FROM gates g
		JOIN runs r ON r.id = g.run_id
		WHERE g.id = $1
	`, gateID).Scan(&g.GateID, &g.RunID, &g.StepID, &g.NodeID, &g.Prompt, &g.Status, &g.ExpiresAt, &resolvedBy, &resolution, &pld, &wsID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("gate '%s' not found", gateID)
		}
		return nil, err
	}

	g.WorkspaceID = wsID
	if resolvedBy != nil {
		g.ResolvedBy = *resolvedBy
	}
	if resolution != nil {
		g.Resolution = *resolution
	}
	if len(pld) > 0 {
		_ = json.Unmarshal(pld, &g.Payload)
	}
	return &g, nil
}

func (p *PostgresStore) UpdateGate(ctx context.Context, gateID string, status, resolution, actor string, payload any) error {
	pldJSON, _ := json.Marshal(payload)
	cmd, err := p.pool.Exec(ctx, `
		UPDATE gates
		SET status = $2, resolution = $3, resolved_by = $4, payload = $5
		WHERE id = $1 AND status = 'waiting'
	`, gateID, status, resolution, actor, pldJSON)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return fmt.Errorf("conflict: gate '%s' was already resolved or does not exist", gateID)
	}
	return nil
}

func (p *PostgresStore) GetPendingGates(ctx context.Context) ([]engine.GateRecord, error) {
	rows, err := p.pool.Query(ctx, `
		SELECT g.id, g.run_id, g.step_id, g.node_id, g.prompt, g.status, g.expires_at, r.workspace_id
		FROM gates g
		JOIN runs r ON r.id = g.run_id
		WHERE g.status = 'waiting'
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var gates []engine.GateRecord
	for rows.Next() {
		var g engine.GateRecord
		if err := rows.Scan(&g.GateID, &g.RunID, &g.StepID, &g.NodeID, &g.Prompt, &g.Status, &g.ExpiresAt, &g.WorkspaceID); err != nil {
			return nil, err
		}
		gates = append(gates, g)
	}
	return gates, rows.Err()
}

// GetPendingGatesByWorkspace retrieves pending gates strictly scoped to the caller's workspace.
func (p *PostgresStore) GetPendingGatesByWorkspace(ctx context.Context, workspaceID string) ([]engine.GateRecord, error) {
	rows, err := p.pool.Query(ctx, `
		SELECT g.id, g.run_id, g.step_id, g.node_id, g.prompt, g.status, g.expires_at, r.workspace_id
		FROM gates g
		JOIN runs r ON r.id = g.run_id
		WHERE g.status = 'waiting' AND r.workspace_id = $1
		ORDER BY g.created_at DESC
	`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var gates []engine.GateRecord
	for rows.Next() {
		var g engine.GateRecord
		if err := rows.Scan(&g.GateID, &g.RunID, &g.StepID, &g.NodeID, &g.Prompt, &g.Status, &g.ExpiresAt, &g.WorkspaceID); err != nil {
			return nil, err
		}
		gates = append(gates, g)
	}
	return gates, rows.Err()
}

// -------------------------------------------------------------
// Workflows, Versions, and Runs Records
// -------------------------------------------------------------

type WorkflowRecord struct {
	ID          string          `json:"id"`
	WorkspaceID string          `json:"workspace_id"`
	Name        string          `json:"name"`
	Description string          `json:"description,omitempty"`
	DraftGraph  json.RawMessage `json:"draft_graph,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type VersionRecord struct {
	ID            string          `json:"id"`
	WorkflowID    string          `json:"workflow_id"`
	VersionNumber int             `json:"version_number"`
	Graph         json.RawMessage `json:"graph"`
	SemanticHash  string          `json:"semantic_hash"`
	Status        string          `json:"status"` // "draft", "published"
	CreatedBy     string          `json:"created_by,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
}

type RunRecord struct {
	ID          string          `json:"id"`
	WorkspaceID string          `json:"workspace_id"`
	VersionID   string          `json:"version_id"`
	Status      string          `json:"status"`
	Input       json.RawMessage `json:"input,omitempty"`
	Output      json.RawMessage `json:"output,omitempty"`
	Error       string          `json:"error,omitempty"`
	Budgets     json.RawMessage `json:"budgets,omitempty"`
	Usage       json.RawMessage `json:"usage,omitempty"`
	StartedAt   *time.Time      `json:"started_at,omitempty"`
	EndedAt     *time.Time      `json:"ended_at,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
}

func (p *PostgresStore) CreateWorkflow(ctx context.Context, workspaceID, name, description string, initialDraft *graph.WorkflowGraph) (*WorkflowRecord, error) {
	id := uuid.New().String()
	var draftJSON []byte
	if initialDraft != nil {
		draftJSON, _ = json.Marshal(initialDraft)
	} else {
		defaultGraph := graph.WorkflowGraph{
			SchemaVersion: "1",
			Name:          name,
			Nodes:         []graph.Node{},
			Edges:         []graph.Edge{},
		}
		draftJSON, _ = json.Marshal(defaultGraph)
	}

	var rec WorkflowRecord
	err := p.pool.QueryRow(ctx, `
		INSERT INTO workflows (id, workspace_id, name, description, draft_graph, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		RETURNING id, workspace_id, name, COALESCE(description, ''), draft_graph, created_at, updated_at
	`, id, workspaceID, name, description, draftJSON).Scan(
		&rec.ID, &rec.WorkspaceID, &rec.Name, &rec.Description, &rec.DraftGraph, &rec.CreatedAt, &rec.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create workflow: %w", err)
	}
	return &rec, nil
}

func (p *PostgresStore) GetWorkflow(ctx context.Context, workspaceID, id string) (*WorkflowRecord, error) {
	var rec WorkflowRecord
	err := p.pool.QueryRow(ctx, `
		SELECT id, workspace_id, name, COALESCE(description, ''), draft_graph, created_at, updated_at
		FROM workflows
		WHERE id = $1 AND workspace_id = $2
	`, id, workspaceID).Scan(
		&rec.ID, &rec.WorkspaceID, &rec.Name, &rec.Description, &rec.DraftGraph, &rec.CreatedAt, &rec.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("workflow '%s' not found", id)
		}
		return nil, err
	}
	return &rec, nil
}

func (p *PostgresStore) ListWorkflows(ctx context.Context, workspaceID string) ([]WorkflowRecord, error) {
	rows, err := p.pool.Query(ctx, `
		SELECT id, workspace_id, name, COALESCE(description, ''), draft_graph, created_at, updated_at
		FROM workflows
		WHERE workspace_id = $1
		ORDER BY updated_at DESC
	`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []WorkflowRecord
	for rows.Next() {
		var rec WorkflowRecord
		if err := rows.Scan(&rec.ID, &rec.WorkspaceID, &rec.Name, &rec.Description, &rec.DraftGraph, &rec.CreatedAt, &rec.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, rec)
	}
	return list, rows.Err()
}

func (p *PostgresStore) UpdateWorkflowDraft(ctx context.Context, workspaceID, id string, draftGraph json.RawMessage) error {
	cmd, err := p.pool.Exec(ctx, `
		UPDATE workflows
		SET draft_graph = $3, updated_at = NOW()
		WHERE id = $1 AND workspace_id = $2
	`, id, workspaceID, draftGraph)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return fmt.Errorf("workflow '%s' not found", id)
	}
	return nil
}

func (p *PostgresStore) PublishWorkflowVersion(ctx context.Context, workspaceID, workflowID string, graphData json.RawMessage, semanticHash, createdBy string) (*VersionRecord, error) {
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var nextVersion int
	err = tx.QueryRow(ctx, `
		SELECT COALESCE(MAX(version_number), 0) + 1
		FROM workflow_versions
		WHERE workflow_id = $1
	`, workflowID).Scan(&nextVersion)
	if err != nil {
		return nil, err
	}

	versionID := uuid.New().String()
	var rec VersionRecord
	err = tx.QueryRow(ctx, `
		INSERT INTO workflow_versions (id, workflow_id, version_number, graph, semantic_hash, status, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, 'published', $6, NOW())
		RETURNING id, workflow_id, version_number, graph, semantic_hash, status, COALESCE(created_by, ''), created_at
	`, versionID, workflowID, nextVersion, graphData, semanticHash, createdBy).Scan(
		&rec.ID, &rec.WorkflowID, &rec.VersionNumber, &rec.Graph, &rec.SemanticHash, &rec.Status, &rec.CreatedBy, &rec.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to publish version: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &rec, nil
}

func (p *PostgresStore) ListWorkflowVersions(ctx context.Context, workflowID string) ([]VersionRecord, error) {
	rows, err := p.pool.Query(ctx, `
		SELECT id, workflow_id, version_number, graph, semantic_hash, status, COALESCE(created_by, ''), created_at
		FROM workflow_versions
		WHERE workflow_id = $1
		ORDER BY version_number DESC
	`, workflowID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []VersionRecord
	for rows.Next() {
		var rec VersionRecord
		if err := rows.Scan(&rec.ID, &rec.WorkflowID, &rec.VersionNumber, &rec.Graph, &rec.SemanticHash, &rec.Status, &rec.CreatedBy, &rec.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, rec)
	}
	return list, rows.Err()
}

func (p *PostgresStore) GetWorkflowVersion(ctx context.Context, workflowID string, versionNumber int) (*VersionRecord, error) {
	var rec VersionRecord
	err := p.pool.QueryRow(ctx, `
		SELECT id, workflow_id, version_number, graph, semantic_hash, status, COALESCE(created_by, ''), created_at
		FROM workflow_versions
		WHERE workflow_id = $1 AND version_number = $2
	`, workflowID, versionNumber).Scan(
		&rec.ID, &rec.WorkflowID, &rec.VersionNumber, &rec.Graph, &rec.SemanticHash, &rec.Status, &rec.CreatedBy, &rec.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("version %d for workflow '%s' not found", versionNumber, workflowID)
		}
		return nil, err
	}
	return &rec, nil
}

func (p *PostgresStore) CreateRunRecord(ctx context.Context, runID, workspaceID, versionID string, input any, budgets *graph.Budgets) (*RunRecord, error) {
	inputJSON, _ := json.Marshal(input)
	budgetsJSON, _ := json.Marshal(budgets)

	var rec RunRecord
	err := p.pool.QueryRow(ctx, `
		INSERT INTO runs (id, workspace_id, version_id, status, input, budgets, created_at)
		VALUES ($1, $2, $3, 'queued', $4, $5, NOW())
		RETURNING id, workspace_id, COALESCE(version_id::text, ''), status, input, created_at
	`, runID, workspaceID, versionID, inputJSON, budgetsJSON).Scan(
		&rec.ID, &rec.WorkspaceID, &rec.VersionID, &rec.Status, &rec.Input, &rec.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create run record: %w", err)
	}
	return &rec, nil
}

func (p *PostgresStore) GetRunRecord(ctx context.Context, runID string) (*RunRecord, error) {
	var rec RunRecord
	var errText *string
	err := p.pool.QueryRow(ctx, `
		SELECT id, workspace_id, COALESCE(version_id::text, ''), status, input, output, budgets, usage, error, started_at, ended_at, created_at
		FROM runs
		WHERE id = $1
	`, runID).Scan(
		&rec.ID, &rec.WorkspaceID, &rec.VersionID, &rec.Status, &rec.Input, &rec.Output, &rec.Budgets, &rec.Usage, &errText, &rec.StartedAt, &rec.EndedAt, &rec.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("run '%s' not found", runID)
		}
		return nil, err
	}
	if errText != nil {
		rec.Error = *errText
	}
	return &rec, nil
}

func (p *PostgresStore) ListRuns(ctx context.Context, workspaceID string, status string) ([]RunRecord, error) {
	query := `
		SELECT id, workspace_id, COALESCE(version_id::text, ''), status, input, output, error, started_at, ended_at, created_at
		FROM runs
		WHERE workspace_id = $1
	`
	var args []any
	args = append(args, workspaceID)

	if status != "" {
		query += ` AND status = $2`
		args = append(args, status)
	}
	query += ` ORDER BY created_at DESC LIMIT 100`

	rows, err := p.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []RunRecord
	for rows.Next() {
		var rec RunRecord
		var errText *string
		if err := rows.Scan(&rec.ID, &rec.WorkspaceID, &rec.VersionID, &rec.Status, &rec.Input, &rec.Output, &errText, &rec.StartedAt, &rec.EndedAt, &rec.CreatedAt); err != nil {
			return nil, err
		}
		if errText != nil {
			rec.Error = *errText
		}
		list = append(list, rec)
	}
	return list, rows.Err()
}

// -------------------------------------------------------------
// Durable Job Queue with Lease Heartbeats
// -------------------------------------------------------------

type JobRecord struct {
	ID        string          `json:"id"`
	RunID     string          `json:"run_id"`
	StepID    string          `json:"step_id"`
	Kind      string          `json:"kind"`
	Payload   json.RawMessage `json:"payload"`
	Status    string          `json:"status"`
	CreatedAt time.Time       `json:"created_at"`
}

func (p *PostgresStore) EnqueueJob(ctx context.Context, runID, stepID, kind string, payload any) error {
	pldJSON, _ := json.Marshal(payload)
	jobID := uuid.New().String()
	_, err := p.pool.Exec(ctx, `
		INSERT INTO jobs (id, run_id, step_id, kind, payload, status, created_at)
		VALUES ($1, $2, $3, $4, $5, 'queued', NOW())
	`, jobID, runID, stepID, kind, pldJSON)
	return err
}

func (p *PostgresStore) ClaimJob(ctx context.Context, leaseOwner string, leaseDuration time.Duration) (*JobRecord, error) {
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var job JobRecord
	expiresAt := time.Now().Add(leaseDuration)

	// SELECT FOR UPDATE SKIP LOCKED
	err = tx.QueryRow(ctx, `
		SELECT id, run_id, step_id, kind, payload, status, created_at
		FROM jobs
		WHERE (status = 'queued') OR (status = 'leased' AND lease_expires_at < NOW())
		ORDER BY created_at ASC
		LIMIT 1
		FOR UPDATE SKIP LOCKED
	`).Scan(&job.ID, &job.RunID, &job.StepID, &job.Kind, &job.Payload, &job.Status, &job.CreatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil // No jobs available
		}
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		UPDATE jobs
		SET status = 'leased', lease_owner = $2, lease_expires_at = $3
		WHERE id = $1
	`, job.ID, leaseOwner, expiresAt)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &job, nil
}

func (p *PostgresStore) CompleteJob(ctx context.Context, jobID string) error {
	_, err := p.pool.Exec(ctx, `
		UPDATE jobs
		SET status = 'completed'
		WHERE id = $1
	`, jobID)
	return err
}

func (p *PostgresStore) HeartbeatJob(ctx context.Context, jobID, leaseOwner string, extendBy time.Duration) error {
	newExpires := time.Now().Add(extendBy)
	cmd, err := p.pool.Exec(ctx, `
		UPDATE jobs
		SET lease_expires_at = $3
		WHERE id = $1 AND lease_owner = $2 AND status = 'leased'
	`, jobID, leaseOwner, newExpires)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return fmt.Errorf("failed to heartbeat job '%s': lease expired or not owner", jobID)
	}
	return nil
}

func (p *PostgresStore) FailJob(ctx context.Context, jobID string, errorMsg string) error {
	_, err := p.pool.Exec(ctx, `
		UPDATE jobs
		SET status = 'failed'
		WHERE id = $1
	`, jobID)
	return err
}

func (p *PostgresStore) GetVersionGraph(ctx context.Context, versionID string) ([]byte, error) {
	var graphJSON []byte
	err := p.pool.QueryRow(ctx, `
		SELECT graph
		FROM workflow_versions
		WHERE id = $1
	`, versionID).Scan(&graphJSON)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("workflow version '%s' not found", versionID)
		}
		return nil, err
	}
	return graphJSON, nil
}
