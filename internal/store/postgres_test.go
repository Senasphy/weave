package store

import (
	"context"
	"encoding/json"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"weave/internal/engine"
	"weave/internal/graph"
)

func getTestDatabaseURL() string {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		url = "postgres://postgres@localhost:5432/weave?sslmode=disable"
	}
	return url
}

func TestPostgresStore_Lifecycle(t *testing.T) {
	ctx := context.Background()
	dbURL := getTestDatabaseURL()
	s, err := NewPostgresStore(ctx, dbURL)
	if err != nil {
		t.Skipf("Skipping Postgres test (no local database accessible): %v", err)
		return
	}
	defer s.Close()

	workspaceID := "00000000-0000-0000-0000-000000000001"

	// 1. Create Workflow
	wf, err := s.CreateWorkflow(ctx, workspaceID, "triage-service", "Automated customer triage", &graph.WorkflowGraph{
		SchemaVersion: "1",
		Name:          "triage-service",
	})
	if err != nil {
		t.Fatalf("CreateWorkflow failed: %v", err)
	}

	// 2. Publish Version
	v1, err := s.PublishWorkflowVersion(ctx, workspaceID, wf.ID, json.RawMessage(`{"nodes": []}`), "hash-12345", "test-user")
	if err != nil {
		t.Fatalf("PublishWorkflowVersion failed: %v", err)
	}
	if v1.VersionNumber != 1 {
		t.Fatalf("expected version number 1, got %d", v1.VersionNumber)
	}

	// 3. Create Run Record & Events
	runID := uuid.New().String()
	_, err = s.CreateRunRecord(ctx, runID, workspaceID, v1.ID, map[string]any{"ticket": "1"}, nil)
	if err != nil {
		t.Fatalf("CreateRunRecord failed: %v", err)
	}

	ev1 := engine.Event{
		RunID:     runID,
		Timestamp: time.Now(),
		Type:      engine.EventRunStarted,
		Payload:   json.RawMessage(`{}`),
	}
	if err := s.AppendEvent(ctx, ev1); err != nil {
		t.Fatalf("AppendEvent failed: %v", err)
	}

	ev2 := engine.Event{
		RunID:     runID,
		Timestamp: time.Now(),
		Type:      engine.EventStateWritten,
		Payload:   json.RawMessage(`{"key": "ticket_status", "value": "triaged"}`),
	}
	if err := s.AppendEvent(ctx, ev2); err != nil {
		t.Fatalf("AppendEvent failed: %v", err)
	}

	events, err := s.GetEvents(ctx, runID, 0)
	if err != nil {
		t.Fatalf("GetEvents failed: %v", err)
	}
	if len(events) != 2 {
		t.Fatalf("expected 2 events, got %d", len(events))
	}
	if events[0].Seq != 1 || events[1].Seq != 2 {
		t.Fatalf("expected monotonic seqs 1, 2, got %d, %d", events[0].Seq, events[1].Seq)
	}

	// 4. Job queue test with SELECT FOR UPDATE SKIP LOCKED
	err = s.EnqueueJob(ctx, runID, "step-1", "execute_step", map[string]any{"attempt": 1})
	if err != nil {
		t.Fatalf("EnqueueJob failed: %v", err)
	}

	job, err := s.ClaimJob(ctx, "worker-1", 10*time.Second)
	if err != nil {
		t.Fatalf("ClaimJob failed: %v", err)
	}
	if job == nil || job.StepID != "step-1" {
		t.Fatalf("expected claimed job for step-1, got %+v", job)
	}

	// Heartbeat
	if err := s.HeartbeatJob(ctx, job.ID, "worker-1", 30*time.Second); err != nil {
		t.Fatalf("HeartbeatJob failed: %v", err)
	}

	// Complete
	if err := s.CompleteJob(ctx, job.ID); err != nil {
		t.Fatalf("CompleteJob failed: %v", err)
	}

	// 5. Gate optimistic concurrency test
	gateID := uuid.New().String()
	gateRec := engine.GateRecord{
		GateID:    gateID,
		RunID:     runID,
		StepID:    "step-gate",
		NodeID:    "node-approve",
		Prompt:    "Approve action?",
		Status:    "waiting",
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	if err := s.SaveGate(ctx, gateRec); err != nil {
		t.Fatalf("SaveGate failed: %v", err)
	}

	// First resolve succeeds
	err = s.UpdateGate(ctx, gateID, "approved", "approve", "reviewer@test.com", map[string]any{"ok": true})
	if err != nil {
		t.Fatalf("first UpdateGate failed: %v", err)
	}

	// Second resolve conflicts
	errConflict := s.UpdateGate(ctx, gateID, "approved", "approve", "reviewer2@test.com", nil)
	if errConflict == nil {
		t.Fatalf("expected conflict on second UpdateGate, got nil")
	}
}

func TestPostgresStore_VerifySession(t *testing.T) {
	ctx := context.Background()
	dbURL := getTestDatabaseURL()
	s, err := NewPostgresStore(ctx, dbURL)
	if err != nil {
		t.Skipf("Skipping Postgres test: %v", err)
		return
	}
	defer s.Close()

	// Insert test user and session directly into Better Auth tables
	userID := "usr_" + uuid.New().String()
	sessToken := "tok_" + uuid.New().String()
	now := time.Now()

	_, err = s.pool.Exec(ctx, `
		INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
		VALUES ($1, $2, $3, $4, $5, $6)
	`, userID, "Test Engineer", "engineer@weave.test", true, now, now)
	if err != nil {
		t.Fatalf("failed to insert test user: %v", err)
	}

	_, err = s.pool.Exec(ctx, `
		INSERT INTO session (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
		VALUES ($1, $2, $3, $4, $5, $6)
	`, "sess_"+uuid.New().String(), userID, sessToken, now.Add(24*time.Hour), now, now)
	if err != nil {
		t.Fatalf("failed to insert test session: %v", err)
	}

	sess, err := s.VerifySession(ctx, sessToken)
	if err != nil {
		t.Fatalf("VerifySession failed: %v", err)
	}
	if sess == nil {
		t.Fatalf("expected active session, got nil")
	}
	if sess.UserID != userID || sess.UserEmail != "engineer@weave.test" {
		t.Fatalf("session user mismatch: %+v", sess)
	}
	if sess.WorkspaceID == "" {
		t.Fatalf("expected workspace ID to be resolved")
	}

	// Verify non-existent token returns nil, nil
	nilSess, err := s.VerifySession(ctx, "nonexistent-token")
	if err != nil {
		t.Fatalf("VerifySession on nonexistent token failed: %v", err)
	}
	if nilSess != nil {
		t.Fatalf("expected nil session for nonexistent token")
	}
}
