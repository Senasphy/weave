package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"weave/internal/graph"
)

func (e *Engine) executeGateNode(ctx context.Context, g *graph.WorkflowGraph, runID, stepID string, node *graph.Node, step *StepState) error {
	gateID := e.idGen.NewID()
	timeoutSec := 86400
	if node.TimeoutSeconds > 0 {
		timeoutSec = node.TimeoutSeconds
	}
	expiresAt := e.clock.Now().Add(time.Duration(timeoutSec) * time.Second)

	gateRecord := GateRecord{
		GateID:    gateID,
		RunID:     runID,
		StepID:    stepID,
		NodeID:    node.ID,
		Prompt:    node.Prompt,
		Status:    "waiting",
		ExpiresAt: expiresAt,
	}

	if err := e.store.SaveGate(ctx, gateRecord); err != nil {
		return fmt.Errorf("failed to save gate: %w", err)
	}

	gateOpenedPayload, _ := json.Marshal(map[string]any{
		"gate_id":    gateID,
		"prompt":     node.Prompt,
		"allow_edit": node.AllowEdit,
		"expires_at": expiresAt,
	})
	openedEv := Event{
		ID:        e.idGen.NewID(),
		RunID:     runID,
		StepID:    stepID,
		NodeID:    node.ID,
		Timestamp: e.clock.Now(),
		Type:      EventGateOpened,
		Payload:   gateOpenedPayload,
	}

	return e.AppendEvent(ctx, openedEv)
}

// ResolveGate handles human approval, rejection, or edit-and-approval of a gate.
func (e *Engine) ResolveGate(ctx context.Context, gateID string, resolution string, actor string, payload any) error {
	gate, err := e.store.GetGate(ctx, gateID)
	if err != nil {
		return err
	}

	if gate.Status != "waiting" {
		return fmt.Errorf("conflict: gate '%s' is already in status '%s'", gateID, gate.Status)
	}

	// Update gate atomically in store
	if err := e.store.UpdateGate(ctx, gateID, resolution, resolution, actor, payload); err != nil {
		return err
	}

	// Emit EventGateResolved
	resPayload, _ := json.Marshal(map[string]any{
		"gate_id":     gateID,
		"resolution":  resolution,
		"resolved_by": actor,
		"payload":     payload,
	})
	resolvedEv := Event{
		ID:        e.idGen.NewID(),
		RunID:     gate.RunID,
		StepID:    gate.StepID,
		NodeID:    gate.NodeID,
		Timestamp: e.clock.Now(),
		Type:      EventGateResolved,
		Payload:   resPayload,
	}
	if err := e.AppendEvent(ctx, resolvedEv); err != nil {
		return err
	}

	g, err := e.getGraph(ctx, gate.RunID)
	if err != nil {
		return err
	}

	var node *graph.Node
	for i := range g.Nodes {
		if g.Nodes[i].ID == gate.NodeID {
			node = &g.Nodes[i]
			break
		}
	}
	if node == nil {
		return fmt.Errorf("node '%s' not found in graph", gate.NodeID)
	}

	if resolution == "approve" || resolution == "edit" {
		// Gate step succeeded
		outVal := payload
		if outVal == nil {
			outVal = map[string]any{"gate_approved": true}
		}

		succPayload, _ := json.Marshal(map[string]any{"output": outVal})
		succEv := Event{
			ID:        e.idGen.NewID(),
			RunID:     gate.RunID,
			StepID:    gate.StepID,
			NodeID:    gate.NodeID,
			Timestamp: e.clock.Now(),
			Type:      EventStepSucceeded,
			Payload:   succPayload,
		}
		if err := e.AppendEvent(ctx, succEv); err != nil {
			return err
		}

		return e.progressOutgoingEdges(ctx, g, gate.RunID, gate.StepID, node, outVal, true)
	}

	// Rejection
	failPayload, _ := json.Marshal(map[string]any{"error": "gate rejected by human reviewer"})
	failEv := Event{
		ID:        e.idGen.NewID(),
		RunID:     gate.RunID,
		StepID:    gate.StepID,
		NodeID:    gate.NodeID,
		Timestamp: e.clock.Now(),
		Type:      EventStepFailed,
		Payload:   failPayload,
	}
	_ = e.AppendEvent(ctx, failEv)

	return e.handleStepFailure(ctx, g, gate.RunID, gate.StepID, node, &StepState{
		StepID:  gate.StepID,
		NodeID:  gate.NodeID,
		Attempt: 1,
	}, "gate rejected by human reviewer")
}

// CheckTimeouts scans pending gates and handles timeouts.
func (e *Engine) CheckTimeouts(ctx context.Context) error {
	pending, err := e.store.GetPendingGates(ctx)
	if err != nil {
		return err
	}

	now := e.clock.Now()
	for _, gate := range pending {
		if now.After(gate.ExpiresAt) {
			_ = e.store.UpdateGate(ctx, gate.GateID, "timed_out", "timed_out", "system_scheduler", nil)

			timeoutEv := Event{
				ID:        e.idGen.NewID(),
				RunID:     gate.RunID,
				StepID:    gate.StepID,
				NodeID:    gate.NodeID,
				Timestamp: now,
				Type:      EventGateTimedOut,
				Payload:   json.RawMessage(fmt.Sprintf(`{"gate_id": %q}`, gate.GateID)),
			}
			_ = e.AppendEvent(ctx, timeoutEv)

			// Terminate run with timeout failure
			runFailPayload, _ := json.Marshal(map[string]any{
				"gate_id": gate.GateID,
				"error":   "gate timed out waiting for human approval",
			})
			runFailEv := Event{
				ID:        e.idGen.NewID(),
				RunID:     gate.RunID,
				Timestamp: now,
				Type:      EventRunFailed,
				Payload:   runFailPayload,
			}
			_ = e.AppendEvent(ctx, runFailEv)
		}
	}
	return nil
}
