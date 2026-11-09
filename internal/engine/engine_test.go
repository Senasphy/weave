package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"weave/internal/graph"
)

func loadTestGraph(t *testing.T, relPath string) *graph.WorkflowGraph {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("..", "..", relPath))
	if err != nil {
		t.Fatalf("failed to read test graph %s: %v", relPath, err)
	}
	var g graph.WorkflowGraph
	if err := json.Unmarshal(data, &g); err != nil {
		t.Fatalf("failed to parse test graph %s: %v", relPath, err)
	}
	return &g
}

func setupTestEngine(t *testing.T) (*Engine, *MemStore, *FakeLLM, *FakeToolRunner, *FakeClock) {
	t.Helper()
	store := NewMemStore()
	fakeLLM := NewFakeLLM()
	fakeTools := NewFakeToolRunner()
	fakeClock := NewFakeClock(time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC))

	eng, err := NewEngine(store, fakeLLM, fakeTools, fakeClock, DefaultIDGen{})
	if err != nil {
		t.Fatalf("failed to create engine: %v", err)
	}
	return eng, store, fakeLLM, fakeTools, fakeClock
}

func TestEngine_LinearAgentRun(t *testing.T) {
	eng, store, fakeLLM, fakeTools, _ := setupTestEngine(t)
	g := loadTestGraph(t, "testdata/validator/valid_triage.json")

	// Queue responses:
	// 1. Classifier calls tool 'kb_search'
	fakeLLM.Enqueue(&LLMResponse{
		Content: "Checking KB...",
		ToolCalls: []ToolCall{
			{ID: "call_1", ToolName: "kb_search", Arguments: `{"query": "refund"}`},
		},
		InputTokens:  50,
		OutputTokens: 20,
		CostUSD:      0.002,
	})
	// 2. Classifier finishes turn with valid schema output (amount 50 -> goes to standard_reply)
	fakeLLM.Enqueue(&LLMResponse{
		Content:      `{"category": "refund", "amount": 50}`,
		InputTokens:  100,
		OutputTokens: 30,
		CostUSD:      0.003,
	})
	// 3. standard_reply completes
	fakeLLM.Enqueue(&LLMResponse{
		Content:      `{"status": "standard_reply_sent"}`,
		InputTokens:  40,
		OutputTokens: 10,
		CostUSD:      0.001,
	})

	ctx := context.Background()
	runState, err := eng.CreateRun(ctx, g, "v1", map[string]any{"ticket_id": "T-100"})
	if err != nil {
		t.Fatalf("CreateRun failed: %v", err)
	}

	if err := eng.StartRun(ctx, runState.RunID); err != nil {
		t.Fatalf("StartRun failed: %v", err)
	}

	finalState, err := store.GetRunState(ctx, runState.RunID)
	if err != nil {
		t.Fatalf("GetRunState failed: %v", err)
	}

	if finalState.Status != RunStatusSucceeded {
		t.Fatalf("expected run status %s, got %s (error: %s)", RunStatusSucceeded, finalState.Status, finalState.Error)
	}

	// Verify tool was called
	if len(fakeTools.requests) != 1 || fakeTools.requests[0].ToolName != "kb_search" {
		t.Fatalf("expected 1 call to kb_search, got: %+v", fakeTools.requests)
	}

	// Verify events were logged
	events, err := store.GetEvents(ctx, runState.RunID, 0)
	if err != nil {
		t.Fatalf("GetEvents failed: %v", err)
	}
	if len(events) < 8 {
		t.Fatalf("expected at least 8 events, got %d", len(events))
	}
}

func TestEngine_HumanGatePauseAndResume(t *testing.T) {
	eng, store, fakeLLM, _, _ := setupTestEngine(t)
	g := loadTestGraph(t, "testdata/validator/valid_triage.json")

	// Classifier returns amount > 100, which routes to gate 'approve'
	fakeLLM.Enqueue(&LLMResponse{
		Content:      `{"category": "refund", "amount": 250}`,
		InputTokens:  50,
		OutputTokens: 25,
		CostUSD:      0.002,
	})

	ctx := context.Background()
	runState, err := eng.CreateRun(ctx, g, "v1", map[string]any{"ticket_id": "T-999"})
	if err != nil {
		t.Fatalf("CreateRun failed: %v", err)
	}

	if err := eng.StartRun(ctx, runState.RunID); err != nil {
		t.Fatalf("StartRun failed: %v", err)
	}

	// The run must now be paused waiting for human gate approval!
	pausedState, err := store.GetRunState(ctx, runState.RunID)
	if err != nil {
		t.Fatalf("GetRunState failed: %v", err)
	}
	if pausedState.Status != RunStatusWaitingHuman {
		t.Fatalf("expected status %s, got %s", RunStatusWaitingHuman, pausedState.Status)
	}
	if len(pausedState.ActiveGates) != 1 {
		t.Fatalf("expected 1 active gate, got %d", len(pausedState.ActiveGates))
	}

	var gateID string
	for id := range pausedState.ActiveGates {
		gateID = id
		break
	}

	// Script refund_exec agent response after gate approval
	fakeLLM.Enqueue(&LLMResponse{
		Content:      `{"status": "refund_processed_successfully"}`,
		InputTokens:  60,
		OutputTokens: 20,
		CostUSD:      0.002,
	})

	// Resolve the gate
	err = eng.ResolveGate(ctx, gateID, "approve", "reviewer@example.com", map[string]any{"approved_amount": 250})
	if err != nil {
		t.Fatalf("ResolveGate failed: %v", err)
	}

	// Verify idempotency / race safety: second resolve call should fail with conflict
	errDuplicate := eng.ResolveGate(ctx, gateID, "approve", "reviewer2@example.com", nil)
	if errDuplicate == nil {
		t.Fatalf("expected conflict on duplicate resolve, got nil")
	}

	// Verify run continued and completed
	resumedState, err := store.GetRunState(ctx, runState.RunID)
	if err != nil {
		t.Fatalf("GetRunState failed: %v", err)
	}
	if resumedState.Status != RunStatusSucceeded {
		t.Fatalf("expected run status %s after approval, got %s", RunStatusSucceeded, resumedState.Status)
	}
}

func TestEngine_BudgetEnforcement_WallSeconds(t *testing.T) {
	eng, store, fakeLLM, _, fakeClock := setupTestEngine(t)
	g := loadTestGraph(t, "testdata/validator/valid_triage.json")
	// Set strict budget of 10 wall seconds
	g.Budgets.MaxWallSeconds = 10

	ctx := context.Background()
	runState, err := eng.CreateRun(ctx, g, "v1", map[string]any{"ticket_id": "T-1"})
	if err != nil {
		t.Fatalf("CreateRun failed: %v", err)
	}

	fakeLLM.SetOnCall(func(req LLMRequest) {
		// Simulate long-running LLM call exceeding 10s budget
		fakeClock.Advance(15 * time.Second)
	})

	fakeLLM.Enqueue(&LLMResponse{
		Content: `{"category": "test", "amount": 10}`,
	})

	_ = eng.StartRun(ctx, runState.RunID)

	finalState, err := store.GetRunState(ctx, runState.RunID)
	if err != nil {
		t.Fatalf("GetRunState failed: %v", err)
	}

	if finalState.Status != RunStatusBudgetExceeded {
		t.Fatalf("expected %s, got %s", RunStatusBudgetExceeded, finalState.Status)
	}
}

func TestEngine_BudgetEnforcement_MaxCost(t *testing.T) {
	eng, store, fakeLLM, _, _ := setupTestEngine(t)
	g := loadTestGraph(t, "testdata/validator/valid_triage.json")
	// Set strict cost budget of $0.05
	g.Budgets.MaxCostUSD = 0.05

	ctx := context.Background()
	runState, err := eng.CreateRun(ctx, g, "v1", map[string]any{"ticket_id": "T-1"})
	if err != nil {
		t.Fatalf("CreateRun failed: %v", err)
	}

	// First call exceeds cost budget
	fakeLLM.Enqueue(&LLMResponse{
		Content: `{"category": "test", "amount": 10}`,
		CostUSD: 0.10, // Exceeds $0.05
	})

	_ = eng.StartRun(ctx, runState.RunID)

	finalState, err := store.GetRunState(ctx, runState.RunID)
	if err != nil {
		t.Fatalf("GetRunState failed: %v", err)
	}

	if finalState.Status != RunStatusBudgetExceeded {
		t.Fatalf("expected %s, got %s", RunStatusBudgetExceeded, finalState.Status)
	}
}

func TestEngine_GateTimeout(t *testing.T) {
	eng, store, fakeLLM, _, fakeClock := setupTestEngine(t)
	g := loadTestGraph(t, "testdata/validator/valid_triage.json")

	// Route to gate
	fakeLLM.Enqueue(&LLMResponse{
		Content: `{"category": "refund", "amount": 500}`,
	})

	ctx := context.Background()
	runState, err := eng.CreateRun(ctx, g, "v1", map[string]any{"ticket_id": "T-1"})
	if err != nil {
		t.Fatalf("CreateRun failed: %v", err)
	}
	if err := eng.StartRun(ctx, runState.RunID); err != nil {
		t.Fatalf("StartRun failed: %v", err)
	}

	// Advance clock past gate timeout (86400s)
	fakeClock.Advance(90000 * time.Second)

	if err := eng.CheckTimeouts(ctx); err != nil {
		t.Fatalf("CheckTimeouts failed: %v", err)
	}

	state, err := store.GetRunState(ctx, runState.RunID)
	if err != nil {
		t.Fatalf("GetRunState failed: %v", err)
	}

	if state.Status != RunStatusFailed {
		t.Fatalf("expected run status %s after gate timeout, got %s", RunStatusFailed, state.Status)
	}
}

func TestEngine_DeterministicReducers(t *testing.T) {
	// Test overwrite
	v1, err := ApplyReducer(graph.ReducerOverwrite, "initial", "updated")
	if err != nil || v1 != "updated" {
		t.Fatalf("overwrite failed: %v", err)
	}

	// Test append
	v2, err := ApplyReducer(graph.ReducerAppend, []any{"a"}, "b")
	if err != nil {
		t.Fatalf("append failed: %v", err)
	}
	slice2, ok := v2.([]any)
	if !ok || len(slice2) != 2 || slice2[1] != "b" {
		t.Fatalf("unexpected append result: %+v", v2)
	}

	// Test merge
	v3, err := ApplyReducer(graph.ReducerMerge, map[string]any{"k1": "v1"}, map[string]any{"k2": "v2"})
	if err != nil {
		t.Fatalf("merge failed: %v", err)
	}
	map3, ok := v3.(map[string]any)
	if !ok || map3["k1"] != "v1" || map3["k2"] != "v2" {
		t.Fatalf("unexpected merge result: %+v", v3)
	}

	// Test error_on_conflict
	_, errConflict := ApplyReducer(graph.ReducerErrorOnConflict, "value_a", "value_b")
	if errConflict == nil {
		t.Fatalf("expected error on conflict, got nil")
	}
}

func TestEngine_RouterBranchingCEL(t *testing.T) {
	eng, store, fakeLLM, _, _ := setupTestEngine(t)
	g := loadTestGraph(t, "testdata/validator/valid_triage.json")

	// Amount is 50, so when "out.amount > 100" is false. Should route to standard_reply.
	fakeLLM.Enqueue(&LLMResponse{
		Content:      `{"category": "general", "amount": 50}`,
		InputTokens:  20,
		OutputTokens: 20,
		CostUSD:      0.001,
	})
	fakeLLM.Enqueue(&LLMResponse{
		Content:      `{"status": "standard_reply_processed"}`,
		InputTokens:  20,
		OutputTokens: 20,
		CostUSD:      0.001,
	})

	ctx := context.Background()
	runState, err := eng.CreateRun(ctx, g, "v1", map[string]any{"ticket_id": "T-50"})
	if err != nil {
		t.Fatalf("CreateRun failed: %v", err)
	}

	if err := eng.StartRun(ctx, runState.RunID); err != nil {
		t.Fatalf("StartRun failed: %v", err)
	}

	state, err := store.GetRunState(ctx, runState.RunID)
	if err != nil {
		t.Fatalf("GetRunState failed: %v", err)
	}

	if state.Status != RunStatusSucceeded {
		t.Fatalf("expected run status %s, got %s", RunStatusSucceeded, state.Status)
	}
	// Verify standard_reply step ran
	foundStandardReply := false
	for _, s := range state.Steps {
		if s.NodeID == "standard_reply" && s.Status == StepStatusSucceeded {
			foundStandardReply = true
			break
		}
	}
	if !foundStandardReply {
		t.Fatalf("expected standard_reply step to have executed and succeeded")
	}
}

func TestEngine_RetryAndRepairReprompt(t *testing.T) {
	eng, store, fakeLLM, _, _ := setupTestEngine(t)
	g := loadTestGraph(t, "testdata/validator/valid_triage.json")

	// Set retry policy on classifier
	g.Nodes[0].Retry = &graph.RetryPolicy{
		MaxAttempts: 2,
	}

	// 1. Classifier outputs invalid JSON / schema missing required "category"
	fakeLLM.Enqueue(&LLMResponse{
		Content:      `{"invalid": "data"}`,
		InputTokens:  10,
		OutputTokens: 10,
		CostUSD:      0.001,
	})
	// 2. Classifier repairs output in next turn
	fakeLLM.Enqueue(&LLMResponse{
		Content:      `{"category": "refund", "amount": 20}`,
		InputTokens:  20,
		OutputTokens: 20,
		CostUSD:      0.001,
	})
	// 3. standard_reply completes
	fakeLLM.Enqueue(&LLMResponse{
		Content:      `{"status": "ok"}`,
		InputTokens:  10,
		OutputTokens: 10,
		CostUSD:      0.001,
	})

	ctx := context.Background()
	runState, err := eng.CreateRun(ctx, g, "v1", map[string]any{"ticket_id": "T-repair"})
	if err != nil {
		t.Fatalf("CreateRun failed: %v", err)
	}

	if err := eng.StartRun(ctx, runState.RunID); err != nil {
		t.Fatalf("StartRun failed: %v", err)
	}

	state, err := store.GetRunState(ctx, runState.RunID)
	if err != nil {
		t.Fatalf("GetRunState failed: %v", err)
	}

	if state.Status != RunStatusSucceeded {
		t.Fatalf("expected run status %s after repair re-prompt, got %s (error: %s)", RunStatusSucceeded, state.Status, state.Error)
	}

	// Check that validation.output_invalid was logged
	events, _ := store.GetEvents(ctx, runState.RunID, 0)
	hasInvalidEvent := false
	for _, ev := range events {
		if ev.Type == EventValidationOutputInvalid {
			hasInvalidEvent = true
			break
		}
	}
	if !hasInvalidEvent {
		t.Fatalf("expected EventValidationOutputInvalid to be logged during repair")
	}
}

func TestEngine_EventFoldReplay(t *testing.T) {
	_, store, _, _, _ := setupTestEngine(t)
	// Create run and manual events
	runID := "test-run-replay"
	events := []Event{
		{
			ID:        "e1",
			RunID:     runID,
			Seq:       1,
			Timestamp: time.Now(),
			Type:      EventRunCreated,
			Payload:   json.RawMessage(`{"version_id": "v1", "input": {"val": 42}}`),
		},
		{
			ID:        "e2",
			RunID:     runID,
			Seq:       2,
			Timestamp: time.Now(),
			Type:      EventRunStarted,
			Payload:   json.RawMessage(`{}`),
		},
		{
			ID:        "e3",
			RunID:     runID,
			Seq:       3,
			Timestamp: time.Now(),
			Type:      EventStateWritten,
			Payload:   json.RawMessage(`{"key": "ticket", "value": {"id": "123"}}`),
		},
		{
			ID:        "e4",
			RunID:     runID,
			Seq:       4,
			Timestamp: time.Now(),
			Type:      EventRunSucceeded,
			Payload:   json.RawMessage(`{"output": {"resolved": true}}`),
		},
	}

	for _, ev := range events {
		_ = store.AppendEvent(context.Background(), ev)
	}

	folded := FoldEvents(runID, events)
	if folded.Status != RunStatusSucceeded {
		t.Fatalf("expected folded status %s, got %s", RunStatusSucceeded, folded.Status)
	}
	if folded.State["ticket"] == nil {
		t.Fatalf("expected state key 'ticket' to be preserved in fold")
	}
	ticketMap := folded.State["ticket"].(map[string]any)
	if ticketMap["id"] != "123" {
		t.Fatalf("expected ticket.id == '123', got %v", ticketMap["id"])
	}
}

func TestEngine_ToolRunnerNilResponse_NoErrorPanic(t *testing.T) {
	eng, store, fakeLLM, fakeTools, _ := setupTestEngine(t)
	g := loadTestGraph(t, "testdata/validator/valid_triage.json")

	// Register tool handler returning nil, error
	fakeTools.Register("kb_search", func(req ToolRequest) (*ToolResponse, error) {
		return nil, fmt.Errorf("tool service unreachable")
	})

	// 1. Classifier calls kb_search
	fakeLLM.Enqueue(&LLMResponse{
		Content: "Searching...",
		ToolCalls: []ToolCall{
			{ID: "call_fail", ToolName: "kb_search", Arguments: `{"query": "test"}`},
		},
	})
	// 2. Classifier handles tool error and produces final output
	fakeLLM.Enqueue(&LLMResponse{
		Content: `{"category": "refund", "amount": 10}`,
	})
	// 3. standard_reply completes
	fakeLLM.Enqueue(&LLMResponse{
		Content: `{"status": "ok"}`,
	})

	ctx := context.Background()
	runState, err := eng.CreateRun(ctx, g, "v1", map[string]any{"ticket_id": "T-FAIL"})
	if err != nil {
		t.Fatalf("CreateRun failed: %v", err)
	}

	if err := eng.StartRun(ctx, runState.RunID); err != nil {
		t.Fatalf("StartRun failed: %v", err)
	}

	finalState, err := store.GetRunState(ctx, runState.RunID)
	if err != nil {
		t.Fatalf("GetRunState failed: %v", err)
	}
	if finalState.Status != RunStatusSucceeded {
		t.Fatalf("expected success after handling tool error gracefully, got %s: %s", finalState.Status, finalState.Error)
	}
}

func TestEngine_UnauthorizedToolInvocation_Rejected(t *testing.T) {
	eng, store, fakeLLM, fakeTools, _ := setupTestEngine(t)
	g := loadTestGraph(t, "testdata/validator/valid_triage.json")

	// 1. Classifier hallucinates / tries to call an unauthorized tool 'system_shell'
	fakeLLM.Enqueue(&LLMResponse{
		Content: "Running command...",
		ToolCalls: []ToolCall{
			{ID: "call_unauth", ToolName: "system_shell", Arguments: `{"cmd": "rm -rf /"}`},
		},
	})
	// 2. Classifier receives unauth tool response, recovers, and returns valid output
	fakeLLM.Enqueue(&LLMResponse{
		Content: `{"category": "refund", "amount": 20}`,
	})
	// 3. standard_reply completes
	fakeLLM.Enqueue(&LLMResponse{
		Content: `{"status": "handled"}`,
	})

	ctx := context.Background()
	runState, err := eng.CreateRun(ctx, g, "v1", map[string]any{"ticket_id": "T-UNAUTH"})
	if err != nil {
		t.Fatalf("CreateRun failed: %v", err)
	}

	if err := eng.StartRun(ctx, runState.RunID); err != nil {
		t.Fatalf("StartRun failed: %v", err)
	}

	// Verify fakeTools was never called for system_shell
	for _, req := range fakeTools.requests {
		if req.ToolName == "system_shell" {
			t.Fatalf("unauthorized tool 'system_shell' was executed by runner!")
		}
	}

	finalState, err := store.GetRunState(ctx, runState.RunID)
	if err != nil {
		t.Fatalf("GetRunState failed: %v", err)
	}
	if finalState.Status != RunStatusSucceeded {
		t.Fatalf("expected run status %s, got %s", RunStatusSucceeded, finalState.Status)
	}
}

func TestEngine_OutputSchemaValidation_TypesAndEnums(t *testing.T) {
	schema := []byte(`{
		"type": "object",
		"required": ["status", "count", "items"],
		"properties": {
			"status": {"type": "string", "enum": ["active", "archived"]},
			"count": {"type": "integer"},
			"items": {
				"type": "array",
				"items": {"type": "string"}
			}
		}
	}`)

	// Valid payload
	valid := map[string]any{
		"status": "active",
		"count":  float64(5),
		"items":  []any{"item1", "item2"},
	}
	if !isOutputSchemaSatisfied(valid, schema) {
		t.Fatalf("expected valid payload to satisfy schema")
	}

	// Missing required property
	missingReq := map[string]any{
		"count": float64(5),
		"items": []any{"item1"},
	}
	if isOutputSchemaSatisfied(missingReq, schema) {
		t.Fatalf("expected missing required property to fail validation")
	}

	// Invalid enum value
	invalidEnum := map[string]any{
		"status": "unknown_status",
		"count":  float64(5),
		"items":  []any{"item1"},
	}
	if isOutputSchemaSatisfied(invalidEnum, schema) {
		t.Fatalf("expected invalid enum to fail validation")
	}

	// Type mismatch (integer is float with decimal)
	invalidInt := map[string]any{
		"status": "active",
		"count":  5.5,
		"items":  []any{"item1"},
	}
	if isOutputSchemaSatisfied(invalidInt, schema) {
		t.Fatalf("expected float 5.5 to fail integer check")
	}

	// Array items type mismatch (expect string, got number)
	invalidItems := map[string]any{
		"status": "active",
		"count":  float64(1),
		"items":  []any{123},
	}
	if isOutputSchemaSatisfied(invalidItems, schema) {
		t.Fatalf("expected item type mismatch to fail validation")
	}
}

func TestEngine_FanOutAndJoin_AggregationAndConcurrency(t *testing.T) {
	eng, store, fakeLLM, _, _ := setupTestEngine(t)

	// Create Fan-Out -> [AgentA, AgentB] -> Join graph
	g := &graph.WorkflowGraph{
		SchemaVersion: "weave/v1",
		Name:          "Fan Out Join Test",
		Budgets: &graph.Budgets{
			MaxWallSeconds: 300,
			MaxCostUSD:     1.0,
			MaxSteps:       20,
		},
		Nodes: []graph.Node{
			{
				ID:      "entry_fan",
				Label:   "Entry Fan Out",
				Type:    graph.NodeTypeFanOut,
				IsEntry: true,
			},
			{
				ID:    "agent_a",
				Label: "Agent A",
				Type:  graph.NodeTypeAgent,
				Model: &graph.ModelConfig{
					Provider: "mock",
					Name:     "mock-model",
				},
				Prompt: "Process branch A",
			},
			{
				ID:    "agent_b",
				Label: "Agent B",
				Type:  graph.NodeTypeAgent,
				Model: &graph.ModelConfig{
					Provider: "mock",
					Name:     "mock-model",
				},
				Prompt: "Process branch B",
			},
			{
				ID:         "join_node",
				Label:      "Join Branches",
				Type:       graph.NodeTypeJoin,
				JoinPolicy: graph.JoinPolicyWaitAll,
			},
		},
		Edges: []graph.Edge{
			{ID: "e_fan_a", From: "entry_fan", To: "agent_a", Kind: graph.EdgeKindAlways},
			{ID: "e_fan_b", From: "entry_fan", To: "agent_b", Kind: graph.EdgeKindAlways},
			{ID: "e_a_join", From: "agent_a", To: "join_node", Kind: graph.EdgeKindAlways},
			{ID: "e_b_join", From: "agent_b", To: "join_node", Kind: graph.EdgeKindAlways},
		},
	}

	// Enqueue agent responses (one for agent_a, one for agent_b)
	fakeLLM.Enqueue(&LLMResponse{
		Content: `{"score_a": 95}`,
	})
	fakeLLM.Enqueue(&LLMResponse{
		Content: `{"score_b": 88}`,
	})

	ctx := context.Background()
	runState, err := eng.CreateRun(ctx, g, "v1", map[string]any{"initial": "data"})
	if err != nil {
		t.Fatalf("CreateRun failed: %v", err)
	}

	if err := eng.StartRun(ctx, runState.RunID); err != nil {
		t.Fatalf("StartRun failed: %v", err)
	}

	finalState, err := store.GetRunState(ctx, runState.RunID)
	if err != nil {
		t.Fatalf("GetRunState failed: %v", err)
	}

	if finalState.Status != RunStatusSucceeded {
		t.Fatalf("expected run status %s, got %s (error: %s)", RunStatusSucceeded, finalState.Status, finalState.Error)
	}

	// Find the join node step in finalState
	var joinStep *StepState
	for _, s := range finalState.Steps {
		if s.NodeID == "join_node" {
			joinStep = s
			break
		}
	}
	if joinStep == nil {
		t.Fatalf("expected join_node step to have executed")
	}

	// Verify both branch outputs were aggregated into joinStep input
	joinInput, ok := joinStep.Input.(map[string]any)
	if !ok {
		t.Fatalf("expected joinStep input to be map[string]any, got %T: %+v", joinStep.Input, joinStep.Input)
	}

	branches, hasBranches := joinInput["branches"].(map[string]any)
	if !hasBranches {
		t.Fatalf("expected 'branches' map in join input, got: %+v", joinInput)
	}

	if branches["agent_a"] == nil || branches["agent_b"] == nil {
		t.Fatalf("expected branches to contain outputs for agent_a and agent_b, got: %+v", branches)
	}
}

func TestEngine_GraphHydration_FromStoreOnRestart(t *testing.T) {
	eng, store, fakeLLM, _, _ := setupTestEngine(t)
	g := loadTestGraph(t, "testdata/validator/valid_triage.json")

	fakeLLM.Enqueue(&LLMResponse{
		Content: `{"category": "refund", "amount": 10}`,
	})
	fakeLLM.Enqueue(&LLMResponse{
		Content: `{"status": "ok"}`,
	})

	ctx := context.Background()
	runState, err := eng.CreateRun(ctx, g, "v1", map[string]any{"ticket_id": "T-HYDRATE"})
	if err != nil {
		t.Fatalf("CreateRun failed: %v", err)
	}

	// Simulate crash / restart: Evict graph from in-memory cache
	eng.mu.Lock()
	delete(eng.graphs, runState.RunID)
	eng.mu.Unlock()

	// Ensure graph is gone from memory
	eng.mu.Lock()
	_, inMemory := eng.graphs[runState.RunID]
	eng.mu.Unlock()
	if inMemory {
		t.Fatalf("expected graph to be evicted from in-memory cache")
	}

	// StartRun should now automatically hydrate graph from store.GetVersionGraph
	if err := eng.StartRun(ctx, runState.RunID); err != nil {
		t.Fatalf("StartRun failed to hydrate graph: %v", err)
	}

	finalState, err := store.GetRunState(ctx, runState.RunID)
	if err != nil {
		t.Fatalf("GetRunState failed: %v", err)
	}

	if finalState.Status != RunStatusSucceeded {
		t.Fatalf("expected run status %s, got %s (error: %s)", RunStatusSucceeded, finalState.Status, finalState.Error)
	}
}




