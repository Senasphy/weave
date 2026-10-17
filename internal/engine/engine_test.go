package engine

import (
	"context"
	"encoding/json"
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

