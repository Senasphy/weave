package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/google/uuid"
	"weave/internal/graph"
)

// DefaultIDGen generates random UUIDs.
type DefaultIDGen struct{}

func (DefaultIDGen) NewID() string {
	return uuid.New().String()
}

// Engine orchestrates workflow graph execution.
type Engine struct {
	store       Store
	llm         LLM
	toolRunner  ToolRunner
	clock       Clock
	idGen       IDGen
	celCompiler *graph.CELCompiler

	mu       sync.Mutex
	graphs   map[string]*graph.WorkflowGraph // runID -> graph
	stepWork chan stepJob
}

type stepJob struct {
	runID  string
	stepID string
}

// NewEngine creates an execution engine instance.
func NewEngine(store Store, llm LLM, toolRunner ToolRunner, clock Clock, idGen IDGen) (*Engine, error) {
	if clock == nil {
		clock = RealClock{}
	}
	if idGen == nil {
		idGen = DefaultIDGen{}
	}
	compiler, err := graph.NewCELCompiler()
	if err != nil {
		return nil, fmt.Errorf("failed to init CEL compiler: %w", err)
	}

	return &Engine{
		store:       store,
		llm:         llm,
		toolRunner:  toolRunner,
		clock:       clock,
		idGen:       idGen,
		celCompiler: compiler,
		graphs:      make(map[string]*graph.WorkflowGraph),
		stepWork:    make(chan stepJob, 500),
	}, nil
}

// RegisterGraph associates an in-memory graph with a run.
func (e *Engine) RegisterGraph(runID string, g *graph.WorkflowGraph) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.graphs[runID] = g
}

func (e *Engine) getGraph(ctx context.Context, runID string) (*graph.WorkflowGraph, error) {
	e.mu.Lock()
	g, ok := e.graphs[runID]
	e.mu.Unlock()
	if ok && g != nil {
		return g, nil
	}

	// SMELL-3 fix: Hydrate graph from database if not present in memory (e.g. after restart or gate resolution)
	state, err := e.store.GetRunState(ctx, runID)
	if err != nil {
		return nil, fmt.Errorf("failed to get run state for run '%s': %w", runID, err)
	}
	if state.VersionID == "" {
		return nil, fmt.Errorf("graph for run '%s' not registered and version_id missing", runID)
	}

	graphBytes, err := e.store.GetVersionGraph(ctx, state.VersionID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch graph for version '%s': %w", state.VersionID, err)
	}

	var hydrated graph.WorkflowGraph
	if err := json.Unmarshal(graphBytes, &hydrated); err != nil {
		return nil, fmt.Errorf("failed to unmarshal graph for version '%s': %w", state.VersionID, err)
	}

	e.RegisterGraph(runID, &hydrated)
	return &hydrated, nil
}

// CreateRun initializes an event-sourced run record and returns its initial state.
func (e *Engine) CreateRun(ctx context.Context, g *graph.WorkflowGraph, versionID string, input any) (*RunState, error) {
	return e.CreateRunWithID(ctx, e.idGen.NewID(), g, versionID, input)
}

// CreateRunWithID initializes an event-sourced run with an existing pre-allocated runID.
func (e *Engine) CreateRunWithID(ctx context.Context, runID string, g *graph.WorkflowGraph, versionID string, input any) (*RunState, error) {
	e.RegisterGraph(runID, g)

	// Persist to MemStore if in test environment
	if gBytes, err := json.Marshal(g); err == nil && versionID != "" {
		if memStore, ok := e.store.(*MemStore); ok {
			memStore.SaveVersionGraph(versionID, gBytes)
		}
	}

	payloadBytes, err := json.Marshal(map[string]any{
		"version_id": versionID,
		"input":      input,
	})
	if err != nil {
		return nil, err
	}

	event := Event{
		ID:        e.idGen.NewID(),
		RunID:     runID,
		Timestamp: e.clock.Now(),
		Type:      EventRunCreated,
		Payload:   payloadBytes,
	}

	if err := e.store.AppendEvent(ctx, event); err != nil {
		return nil, fmt.Errorf("failed to append EventRunCreated: %w", err)
	}

	return e.store.GetRunState(ctx, runID)
}

// StartRun kicks off execution of the entry node in the graph.
func (e *Engine) StartRun(ctx context.Context, runID string) error {
	g, err := e.getGraph(ctx, runID)
	if err != nil {
		return err
	}

	// 1. Emit RunStarted
	startEv := Event{
		ID:        e.idGen.NewID(),
		RunID:     runID,
		Timestamp: e.clock.Now(),
		Type:      EventRunStarted,
		Payload:   json.RawMessage("{}"),
	}
	if err := e.store.AppendEvent(ctx, startEv); err != nil {
		return err
	}

	// 2. Locate entry node
	var entryNode *graph.Node
	for i := range g.Nodes {
		if g.Nodes[i].IsEntry {
			entryNode = &g.Nodes[i]
			break
		}
	}
	if entryNode == nil {
		// Find node with 0 incoming edges
		incoming := make(map[string]int)
		for _, edge := range g.Edges {
			incoming[edge.To]++
		}
		for i := range g.Nodes {
			if incoming[g.Nodes[i].ID] == 0 {
				entryNode = &g.Nodes[i]
				break
			}
		}
	}
	if entryNode == nil {
		return fmt.Errorf("no entry node found in graph")
	}

	// 3. Emit StepReady for entry node
	state, err := e.store.GetRunState(ctx, runID)
	if err != nil {
		return err
	}

	stepID := e.idGen.NewID()
	stepReadyPayload, _ := json.Marshal(map[string]any{
		"node_id": entryNode.ID,
		"attempt": 1,
		"input":   state.Input,
	})
	stepReadyEv := Event{
		ID:        e.idGen.NewID(),
		RunID:     runID,
		StepID:    stepID,
		NodeID:    entryNode.ID,
		Timestamp: e.clock.Now(),
		Type:      EventStepReady,
		Payload:   stepReadyPayload,
	}
	if err := e.store.AppendEvent(ctx, stepReadyEv); err != nil {
		return err
	}

	// 4. Execute the entry step
	return e.ExecuteStep(ctx, runID, stepID)
}

// ExecuteStep runs a single step attempt and proceeds down outgoing edges.
func (e *Engine) ExecuteStep(ctx context.Context, runID string, stepID string) error {
	g, err := e.getGraph(ctx, runID)
	if err != nil {
		return err
	}

	state, err := e.store.GetRunState(ctx, runID)
	if err != nil {
		return err
	}

	// If run is already in terminal state or cancelled, stop
	if state.Status.IsTerminal() {
		return nil
	}

	step := state.Steps[stepID]
	if step == nil {
		return fmt.Errorf("step '%s' not found in run '%s'", stepID, runID)
	}

	// Find node in graph
	var node *graph.Node
	for i := range g.Nodes {
		if g.Nodes[i].ID == step.NodeID {
			node = &g.Nodes[i]
			break
		}
	}
	if node == nil {
		return fmt.Errorf("node '%s' not found in graph", step.NodeID)
	}

	// Check pre-call run budgets
	if err := CheckRunBudgetPreCall(state.Usage, g.Budgets, 0, 0, state.Usage.StartedAt, e.clock.Now()); err != nil {
		return e.terminateBudgetExceeded(ctx, runID, err.Error())
	}

	// Emit StepStarted
	startedEv := Event{
		ID:        e.idGen.NewID(),
		RunID:     runID,
		StepID:    stepID,
		NodeID:    node.ID,
		Timestamp: e.clock.Now(),
		Type:      EventStepStarted,
		Payload:   json.RawMessage("{}"),
	}
	if err := e.store.AppendEvent(ctx, startedEv); err != nil {
		return err
	}

	// Execute node logic based on type
	switch node.Type {
	case graph.NodeTypeAgent:
		return e.executeAgentNode(ctx, g, runID, stepID, node, step)

	case graph.NodeTypeGate:
		return e.executeGateNode(ctx, g, runID, stepID, node, step)

	case graph.NodeTypeRouter:
		return e.executeRouterNode(ctx, g, runID, stepID, node, step)

	case graph.NodeTypeFanOut:
		return e.executeFanOutNode(ctx, g, runID, stepID, node, step)

	case graph.NodeTypeJoin:
		return e.executeJoinNode(ctx, g, runID, stepID, node, step)

	default:
		return fmt.Errorf("unsupported node type: %s", node.Type)
	}
}

// CancelRun terminates an active run.
func (e *Engine) CancelRun(ctx context.Context, runID string) error {
	cancelEv := Event{
		ID:        e.idGen.NewID(),
		RunID:     runID,
		Timestamp: e.clock.Now(),
		Type:      EventRunCancelled,
		Payload:   json.RawMessage("{}"),
	}
	return e.store.AppendEvent(ctx, cancelEv)
}

func (e *Engine) terminateBudgetExceeded(ctx context.Context, runID string, reason string) error {
	exceededPayload, _ := json.Marshal(map[string]any{"reason": reason})
	ev1 := Event{
		ID:        e.idGen.NewID(),
		RunID:     runID,
		Timestamp: e.clock.Now(),
		Type:      EventBudgetExceeded,
		Payload:   exceededPayload,
	}
	_ = e.store.AppendEvent(ctx, ev1)

	ev2 := Event{
		ID:        e.idGen.NewID(),
		RunID:     runID,
		Timestamp: e.clock.Now(),
		Type:      EventRunBudgetExceeded,
		Payload:   exceededPayload,
	}
	return e.store.AppendEvent(ctx, ev2)
}

func (e *Engine) checkPostCallRunBudgets(ctx context.Context, runID string, g *graph.WorkflowGraph) error {
	state, err := e.store.GetRunState(ctx, runID)
	if err != nil {
		return err
	}
	if err := CheckRunBudgetPostCall(state.Usage, g.Budgets, state.Usage.StartedAt, e.clock.Now()); err != nil {
		return e.terminateBudgetExceeded(ctx, runID, err.Error())
	}
	return nil
}
