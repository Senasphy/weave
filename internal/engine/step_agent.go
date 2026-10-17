package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"weave/internal/graph"
)

func (e *Engine) executeAgentNode(ctx context.Context, g *graph.WorkflowGraph, runID, stepID string, node *graph.Node, step *StepState) error {
	state, err := e.store.GetRunState(ctx, runID)
	if err != nil {
		return err
	}

	// 1. Gather state reads
	stateReads := make(map[string]any)
	for _, readKey := range node.Reads {
		if val, ok := state.State[readKey]; ok {
			stateReads[readKey] = val
		}
	}

	// 2. Prepare tools definitions
	toolDefs := make([]ToolDefinition, 0, len(node.Tools))
	for _, tName := range node.Tools {
		toolDefs = append(toolDefs, ToolDefinition{
			Name:        tName,
			Description: fmt.Sprintf("Tool %s", tName),
			SideEffects: node.Permissions != nil && node.Permissions.SideEffects,
		})
	}

	maxTurns := 6
	if node.Budgets != nil && node.Budgets.MaxTurns > 0 {
		maxTurns = node.Budgets.MaxTurns
	}

	var history []LLMMessage
	var lastOutput any
	stepTokens := 0
	stepCostUSD := 0.0

	// 3. Agent turn loop
	for turn := 1; turn <= maxTurns; turn++ {
		// Budget pre-call check
		if err := CheckRunBudgetPreCall(state.Usage, g.Budgets, 500, 0.005, state.Usage.StartedAt, e.clock.Now()); err != nil {
			return e.terminateBudgetExceeded(ctx, runID, err.Error())
		}
		if err := CheckStepBudget(turn, stepTokens, stepCostUSD, node.Budgets); err != nil {
			return e.handleStepFailure(ctx, g, runID, stepID, node, step, fmt.Sprintf("step budget exceeded: %v", err))
		}

		modelCfg := graph.ModelConfig{Provider: "mock", Name: "mock-llm"}
		if node.Model != nil {
			modelCfg = *node.Model
		}

		req := LLMRequest{
			Model:         modelCfg,
			SystemPrompt:  node.SystemPrompt,
			Input:         step.Input,
			StateSnapshot: stateReads,
			Tools:         toolDefs,
			History:       history,
		}

		// Emit LLMRequested
		reqPayload, _ := json.Marshal(map[string]any{
			"turn":   turn,
			"model":  modelCfg.Name,
			"prompt": node.SystemPrompt,
		})
		_ = e.store.AppendEvent(ctx, Event{
			ID:        e.idGen.NewID(),
			RunID:     runID,
			StepID:    stepID,
			NodeID:    node.ID,
			Timestamp: e.clock.Now(),
			Type:      EventLLMRequested,
			Payload:   reqPayload,
		})

		resp, err := e.llm.Call(ctx, req)
		if err != nil {
			return e.handleStepFailure(ctx, g, runID, stepID, node, step, fmt.Sprintf("LLM call failed: %v", err))
		}

		stepTokens += resp.InputTokens + resp.OutputTokens
		stepCostUSD += resp.CostUSD

		// Emit LLMResponded
		respPayload, _ := json.Marshal(map[string]any{
			"turn":          turn,
			"input_tokens":  resp.InputTokens,
			"output_tokens": resp.OutputTokens,
			"cost_usd":      resp.CostUSD,
			"content":       resp.Content,
			"tool_calls":    resp.ToolCalls,
		})
		_ = e.store.AppendEvent(ctx, Event{
			ID:        e.idGen.NewID(),
			RunID:     runID,
			StepID:    stepID,
			NodeID:    node.ID,
			Timestamp: e.clock.Now(),
			Type:      EventLLMResponded,
			Payload:   respPayload,
		})

		// Post-call run budget check
		if err := e.checkPostCallRunBudgets(ctx, runID, g); err != nil {
			return err
		}

		// 4. Handle tool calls if returned
		if len(resp.ToolCalls) > 0 {
			history = append(history, LLMMessage{
				Role:      "assistant",
				Content:   resp.Content,
				ToolCalls: resp.ToolCalls,
			})

			for _, tc := range resp.ToolCalls {
				// Tool requested event
				tReqPayload, _ := json.Marshal(tc)
				_ = e.store.AppendEvent(ctx, Event{
					ID:        e.idGen.NewID(),
					RunID:     runID,
					StepID:    stepID,
					NodeID:    node.ID,
					Timestamp: e.clock.Now(),
					Type:      EventToolRequested,
					Payload:   tReqPayload,
				})

				var args map[string]any
				_ = json.Unmarshal([]byte(tc.Arguments), &args)

				toolResp, toolErr := e.toolRunner.Execute(ctx, ToolRequest{
					RunID:          runID,
					StepID:         stepID,
					ToolName:       tc.ToolName,
					Arguments:      args,
					IdempotencyKey: fmt.Sprintf("%s-%s-%s", runID, stepID, tc.ID),
				})

				tRespPayload, _ := json.Marshal(map[string]any{
					"tool_id": tc.ID,
					"name":    tc.ToolName,
					"output":  toolResp.Output,
					"error":   toolErr,
					"cost":    toolResp.CostUSD,
				})
				_ = e.store.AppendEvent(ctx, Event{
					ID:        e.idGen.NewID(),
					RunID:     runID,
					StepID:    stepID,
					NodeID:    node.ID,
					Timestamp: e.clock.Now(),
					Type:      EventToolResponded,
					Payload:   tRespPayload,
				})

				stepCostUSD += toolResp.CostUSD

				outStr, _ := json.Marshal(toolResp.Output)
				history = append(history, LLMMessage{
					Role:       "tool",
					Content:    string(outStr),
					ToolCallID: tc.ID,
				})
			}
			continue
		}

		// 5. Final output handling & schema validation
		var parsedOutput any
		trimmedContent := strings.TrimSpace(resp.Content)
		if strings.HasPrefix(trimmedContent, "{") || strings.HasPrefix(trimmedContent, "[") {
			if err := json.Unmarshal([]byte(trimmedContent), &parsedOutput); err != nil {
				parsedOutput = map[string]any{"raw": trimmedContent}
			}
		} else {
			parsedOutput = map[string]any{"text": trimmedContent}
		}

		lastOutput = parsedOutput

		// Schema validation check
		if len(node.OutputSchema) > 0 {
			if !isOutputSchemaSatisfied(parsedOutput, node.OutputSchema) {
				invalPayload, _ := json.Marshal(map[string]any{
					"turn":   turn,
					"output": parsedOutput,
					"schema": string(node.OutputSchema),
				})
				_ = e.store.AppendEvent(ctx, Event{
					ID:        e.idGen.NewID(),
					RunID:     runID,
					StepID:    stepID,
					NodeID:    node.ID,
					Timestamp: e.clock.Now(),
					Type:      EventValidationOutputInvalid,
					Payload:   invalPayload,
				})

				// If we have turns left, add a repair turn
				if turn < maxTurns {
					history = append(history, LLMMessage{
						Role:    "assistant",
						Content: resp.Content,
					})
					history = append(history, LLMMessage{
						Role:    "user",
						Content: fmt.Sprintf("Your output did not match the required schema: %s. Please fix and output strictly valid JSON matching this schema.", string(node.OutputSchema)),
					})
					continue
				}

				return e.handleStepFailure(ctx, g, runID, stepID, node, step, "invalid_output: schema validation failed after max turns")
			}
		}

		// Valid output reached!
		break
	}

	// 6. Apply state writes
	if outMap, ok := lastOutput.(map[string]any); ok {
		for _, writeKey := range node.Writes {
			if val, exists := outMap[writeKey]; exists {
				stateDecl := g.State[writeKey]
				currentVal := state.State[writeKey]
				newVal, redErr := ApplyReducer(stateDecl.Reducer, currentVal, val)
				if redErr != nil {
					return e.handleStepFailure(ctx, g, runID, stepID, node, step, fmt.Sprintf("reducer error on key '%s': %v", writeKey, redErr))
				}

				writePayload, _ := json.Marshal(map[string]any{
					"key":   writeKey,
					"value": newVal,
				})
				_ = e.store.AppendEvent(ctx, Event{
					ID:        e.idGen.NewID(),
					RunID:     runID,
					StepID:    stepID,
					NodeID:    node.ID,
					Timestamp: e.clock.Now(),
					Type:      EventStateWritten,
					Payload:   writePayload,
				})
			}
		}
	}

	// 7. Mark StepSucceeded
	succPayload, _ := json.Marshal(map[string]any{"output": lastOutput})
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

	// 8. Progress to downstream edges
	return e.progressOutgoingEdges(ctx, g, runID, stepID, node, lastOutput, true)
}

func isOutputSchemaSatisfied(output any, schemaBytes []byte) bool {
	var schemaMap map[string]any
	if err := json.Unmarshal(schemaBytes, &schemaMap); err != nil {
		return true
	}

	outMap, isMap := output.(map[string]any)
	if required, ok := schemaMap["required"].([]any); ok && isMap {
		for _, req := range required {
			reqStr, ok := req.(string)
			if ok {
				if _, exists := outMap[reqStr]; !exists {
					return false
				}
			}
		}
	}
	return true
}

func (e *Engine) handleStepFailure(ctx context.Context, g *graph.WorkflowGraph, runID, stepID string, node *graph.Node, step *StepState, errMsg string) error {
	// Check retry policy
	maxAttempts := 1
	if node.Retry != nil && node.Retry.MaxAttempts > 1 {
		maxAttempts = node.Retry.MaxAttempts
	}

	if step.Attempt < maxAttempts {
		// Emit StepRetried
		retryEv := Event{
			ID:        e.idGen.NewID(),
			RunID:     runID,
			StepID:    stepID,
			NodeID:    node.ID,
			Timestamp: e.clock.Now(),
			Type:      EventStepRetried,
			Payload:   json.RawMessage(fmt.Sprintf(`{"attempt": %d, "error": %q}`, step.Attempt, errMsg)),
		}
		_ = e.store.AppendEvent(ctx, retryEv)

		// Create new step ready attempt
		nextStepID := e.idGen.NewID()
		readyPayload, _ := json.Marshal(map[string]any{
			"node_id": node.ID,
			"attempt": step.Attempt + 1,
			"input":   step.Input,
		})
		readyEv := Event{
			ID:        e.idGen.NewID(),
			RunID:     runID,
			StepID:    nextStepID,
			NodeID:    node.ID,
			Timestamp: e.clock.Now(),
			Type:      EventStepReady,
			Payload:   readyPayload,
		}
		_ = e.store.AppendEvent(ctx, readyEv)

		return e.ExecuteStep(ctx, runID, nextStepID)
	}

	// Retries exhausted: emit StepFailed
	failPayload, _ := json.Marshal(map[string]any{
		"error":   errMsg,
		"attempt": step.Attempt,
	})
	failEv := Event{
		ID:        e.idGen.NewID(),
		RunID:     runID,
		StepID:    stepID,
		NodeID:    node.ID,
		Timestamp: e.clock.Now(),
		Type:      EventStepFailed,
		Payload:   failPayload,
	}
	_ = e.store.AppendEvent(ctx, failEv)

	// Check on_failure edges
	hasFailureEdge := false
	for _, edge := range g.Edges {
		if edge.From == node.ID && edge.Kind == graph.EdgeKindOnFailure {
			hasFailureEdge = true
			break
		}
	}

	if hasFailureEdge {
		return e.progressOutgoingEdges(ctx, g, runID, stepID, node, map[string]any{"error": errMsg}, false)
	}

	// Terminate run as failed
	runFailPayload, _ := json.Marshal(map[string]any{
		"step_id": stepID,
		"node_id": node.ID,
		"error":   errMsg,
	})
	runFailEv := Event{
		ID:        e.idGen.NewID(),
		RunID:     runID,
		Timestamp: e.clock.Now(),
		Type:      EventRunFailed,
		Payload:   runFailPayload,
	}
	return e.store.AppendEvent(ctx, runFailEv)
}
