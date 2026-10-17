package engine

import (
	"context"
	"encoding/json"
	"sort"

	"weave/internal/graph"
)

func (e *Engine) executeRouterNode(ctx context.Context, g *graph.WorkflowGraph, runID, stepID string, node *graph.Node, step *StepState) error {
	succPayload, _ := json.Marshal(map[string]any{"output": step.Input})
	succEv := Event{
		ID:        e.idGen.NewID(),
		RunID:     runID,
		StepID:    stepID,
		NodeID:    node.ID,
		Timestamp: e.clock.Now(),
		Type:      EventStepSucceeded,
		Payload:   succPayload,
	}
	if err := e.store.AppendEvent(ctx, succEv); err != nil {
		return err
	}

	return e.progressOutgoingEdges(ctx, g, runID, stepID, node, step.Input, true)
}

func (e *Engine) executeFanOutNode(ctx context.Context, g *graph.WorkflowGraph, runID, stepID string, node *graph.Node, step *StepState) error {
	succPayload, _ := json.Marshal(map[string]any{"output": step.Input})
	succEv := Event{
		ID:        e.idGen.NewID(),
		RunID:     runID,
		StepID:    stepID,
		NodeID:    node.ID,
		Timestamp: e.clock.Now(),
		Type:      EventStepSucceeded,
		Payload:   succPayload,
	}
	if err := e.store.AppendEvent(ctx, succEv); err != nil {
		return err
	}

	return e.progressOutgoingEdges(ctx, g, runID, stepID, node, step.Input, true)
}

func (e *Engine) executeJoinNode(ctx context.Context, g *graph.WorkflowGraph, runID, stepID string, node *graph.Node, step *StepState) error {
	succPayload, _ := json.Marshal(map[string]any{"output": step.Input})
	succEv := Event{
		ID:        e.idGen.NewID(),
		RunID:     runID,
		StepID:    stepID,
		NodeID:    node.ID,
		Timestamp: e.clock.Now(),
		Type:      EventStepSucceeded,
		Payload:   succPayload,
	}
	if err := e.store.AppendEvent(ctx, succEv); err != nil {
		return err
	}

	return e.progressOutgoingEdges(ctx, g, runID, stepID, node, step.Input, true)
}

func (e *Engine) progressOutgoingEdges(ctx context.Context, g *graph.WorkflowGraph, runID, sourceStepID string, sourceNode *graph.Node, output any, isSuccess bool) error {
	state, err := e.store.GetRunState(ctx, runID)
	if err != nil {
		return err
	}

	// 1. Collect all outgoing edges from sourceNode
	var outgoing []*graph.Edge
	for i := range g.Edges {
		if g.Edges[i].From == sourceNode.ID {
			outgoing = append(outgoing, &g.Edges[i])
		}
	}

	// Sort by priority (higher priority first or lowest index first)
	sort.Slice(outgoing, func(i, j int) bool {
		return outgoing[i].Priority > outgoing[j].Priority
	})

	var firedEdges []*graph.Edge
	isRouter := sourceNode.Type == graph.NodeTypeRouter

	if isRouter {
		// Router semantics
		matchedWhen := false
		var defaultEdge *graph.Edge

		for _, edge := range outgoing {
			if edge.Kind == graph.EdgeKindDefault || edge.Kind == graph.EdgeKindAlways {
				defaultEdge = edge
				continue
			}

			if edge.Kind == graph.EdgeKindWhen {
				fired, err := e.evaluateEdgeCondition(edge, output, state.State)
				recordEdgeEvaluation(e, ctx, runID, sourceStepID, edge.ID, fired, err)
				if fired && err == nil {
					firedEdges = append(firedEdges, edge)
					matchedWhen = true
					if sourceNode.RouterMode != graph.RouterModeAllMatching {
						// Only first matching fires
						break
					}
				}
			}
		}

		if !matchedWhen && defaultEdge != nil {
			firedEdges = append(firedEdges, defaultEdge)
			recordEdgeEvaluation(e, ctx, runID, sourceStepID, defaultEdge.ID, true, nil)
		}
	} else {
		// Standard node outgoing edges
		for _, edge := range outgoing {
			// Check traversal limit
			if edge.MaxTraversals > 0 && state.EdgeTraversals[edge.ID] >= edge.MaxTraversals {
				continue
			}

			fired := false
			var evalErr error

			switch edge.Kind {
			case graph.EdgeKindAlways:
				fired = true
			case graph.EdgeKindOnSuccess:
				fired = isSuccess
			case graph.EdgeKindOnFailure:
				fired = !isSuccess
			case graph.EdgeKindWhen:
				if isSuccess {
					fired, evalErr = e.evaluateEdgeCondition(edge, output, state.State)
				}
			case graph.EdgeKindDefault:
				fired = true
			}

			recordEdgeEvaluation(e, ctx, runID, sourceStepID, edge.ID, fired, evalErr)
			if fired && evalErr == nil {
				firedEdges = append(firedEdges, edge)
			}
		}
	}

	// If no edges fired and no other steps are running or pending or gates waiting
	if len(firedEdges) == 0 {
		return e.checkRunCompletion(ctx, runID, output)
	}

	// For each fired edge, prepare target node input and fire step
	for _, edge := range firedEdges {
		targetInput := output
		if edge.Map != nil && edge.Map.ToInput != "" {
			mappedInput, mapErr := e.evaluateEdgeMapping(edge.Map.ToInput, output, state.State)
			if mapErr == nil && mappedInput != nil {
				targetInput = mappedInput
			}
		}

		// Find target node in graph
		var targetNode *graph.Node
		for i := range g.Nodes {
			if g.Nodes[i].ID == edge.To {
				targetNode = &g.Nodes[i]
				break
			}
		}
		if targetNode == nil {
			continue
		}

		// Check if target is a join node
		if targetNode.Type == graph.NodeTypeJoin {
			ready, combinedInput := e.checkJoinReadiness(g, state, targetNode, targetInput)
			if !ready {
				continue
			}
			targetInput = combinedInput
		}

		// Target node is ready to execute!
		stepID := e.idGen.NewID()
		readyPayload, _ := json.Marshal(map[string]any{
			"node_id": targetNode.ID,
			"attempt": 1,
			"input":   targetInput,
		})
		readyEv := Event{
			ID:        e.idGen.NewID(),
			RunID:     runID,
			StepID:    stepID,
			NodeID:    targetNode.ID,
			Timestamp: e.clock.Now(),
			Type:      EventStepReady,
			Payload:   readyPayload,
		}
		if err := e.store.AppendEvent(ctx, readyEv); err != nil {
			return err
		}

		// Execute target step synchronously or via scheduler
		if err := e.ExecuteStep(ctx, runID, stepID); err != nil {
			return err
		}
	}

	return nil
}

func (e *Engine) evaluateEdgeCondition(edge *graph.Edge, out any, state map[string]any) (bool, error) {
	if edge.Expr == "" {
		return true, nil
	}
	prg, err := e.celCompiler.CompileCondition(edge.Expr)
	if err != nil {
		return false, err
	}
	return graph.EvaluateCondition(prg, out, state)
}

func (e *Engine) evaluateEdgeMapping(mappingExpr string, out any, state map[string]any) (any, error) {
	prg, err := e.celCompiler.CompileMapping(mappingExpr)
	if err != nil {
		return nil, err
	}
	return graph.EvaluateMapping(prg, out, state)
}

func recordEdgeEvaluation(e *Engine, ctx context.Context, runID, stepID, edgeID string, fired bool, err error) {
	errMsg := ""
	if err != nil {
		errMsg = err.Error()
	}
	evalPayload, _ := json.Marshal(map[string]any{
		"edge_id": edgeID,
		"fired":   fired,
		"error":   errMsg,
	})
	_ = e.store.AppendEvent(ctx, Event{
		ID:        e.idGen.NewID(),
		RunID:     runID,
		StepID:    stepID,
		Timestamp: e.clock.Now(),
		Type:      EventEdgeEvaluated,
		Payload:   evalPayload,
	})
}

func (e *Engine) checkJoinReadiness(g *graph.WorkflowGraph, state *RunState, joinNode *graph.Node, currentBranchInput any) (bool, any) {
	// Find all incoming edges to this join node
	var incomingEdges []*graph.Edge
	for i := range g.Edges {
		if g.Edges[i].To == joinNode.ID {
			incomingEdges = append(incomingEdges, &g.Edges[i])
		}
	}

	// For wait_all: verify every incoming edge has fired at least once
	allFired := true
	for _, inEdge := range incomingEdges {
		if state.EdgeTraversals[inEdge.ID] == 0 {
			allFired = false
			break
		}
	}

	if !allFired && joinNode.JoinPolicy != graph.JoinPolicyAllowPartial {
		return false, nil
	}

	return true, currentBranchInput
}

func (e *Engine) checkRunCompletion(ctx context.Context, runID string, finalOutput any) error {
	state, err := e.store.GetRunState(ctx, runID)
	if err != nil {
		return err
	}

	// If there are any pending or running steps or waiting gates, run is not complete yet
	if len(state.ActiveGates) > 0 {
		return nil
	}
	for _, step := range state.Steps {
		if step.Status == StepStatusPending || step.Status == StepStatusRunning {
			return nil
		}
	}

	// All work done!
	succPayload, _ := json.Marshal(map[string]any{"output": finalOutput})
	succEv := Event{
		ID:        e.idGen.NewID(),
		RunID:     runID,
		Timestamp: e.clock.Now(),
		Type:      EventRunSucceeded,
		Payload:   succPayload,
	}
	return e.store.AppendEvent(ctx, succEv)
}
