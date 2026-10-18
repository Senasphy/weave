package trace

import (
	"encoding/json"
	"fmt"
	"strings"

	"weave/internal/engine"
)

// GenerateHumanNarration formats an append-only event stream into readable chronological log narration.
func GenerateHumanNarration(events []engine.Event) string {
	var sb strings.Builder

	for _, ev := range events {
		timeStr := ev.Timestamp.Format("15:04:05")

		switch ev.Type {
		case engine.EventRunCreated:
			sb.WriteString(fmt.Sprintf("[%s] run created\n", timeStr))

		case engine.EventRunStarted:
			sb.WriteString(fmt.Sprintf("[%s] run started\n", timeStr))

		case engine.EventRunSucceeded:
			sb.WriteString(fmt.Sprintf("[%s] ✓ run succeeded\n", timeStr))

		case engine.EventRunFailed:
			var p struct{ Error string }
			_ = json.Unmarshal(ev.Payload, &p)
			sb.WriteString(fmt.Sprintf("[%s] ❌ run failed: %s\n", timeStr, p.Error))

		case engine.EventRunBudgetExceeded:
			var p struct{ Reason string }
			_ = json.Unmarshal(ev.Payload, &p)
			sb.WriteString(fmt.Sprintf("[%s] ⛔ budget exceeded: %s\n", timeStr, p.Reason))

		case engine.EventRunCancelled:
			sb.WriteString(fmt.Sprintf("[%s] ⏹ run cancelled\n", timeStr))

		case engine.EventStepReady:
			sb.WriteString(fmt.Sprintf("[%s] step ready → %s\n", timeStr, ev.NodeID))

		case engine.EventStepStarted:
			sb.WriteString(fmt.Sprintf("[%s] step started → %s\n", timeStr, ev.NodeID))

		case engine.EventStepSucceeded:
			sb.WriteString(fmt.Sprintf("[%s] step succeeded → %s\n", timeStr, ev.NodeID))

		case engine.EventStepFailed:
			var p struct{ Error string }
			_ = json.Unmarshal(ev.Payload, &p)
			sb.WriteString(fmt.Sprintf("[%s] step failed → %s: %s\n", timeStr, ev.NodeID, p.Error))

		case engine.EventStepRetried:
			var p struct {
				Attempt int
				Error   string
			}
			_ = json.Unmarshal(ev.Payload, &p)
			sb.WriteString(fmt.Sprintf("[%s] step retried (attempt %d) → %s: %s\n", timeStr, p.Attempt, ev.NodeID, p.Error))

		case engine.EventLLMResponded:
			var p struct {
				InputTokens  int     `json:"input_tokens"`
				OutputTokens int     `json:"output_tokens"`
				CostUSD      float64 `json:"cost_usd"`
			}
			_ = json.Unmarshal(ev.Payload, &p)
			sb.WriteString(fmt.Sprintf("[%s]   llm turn completed (%d tokens, $%.4f)\n", timeStr, p.InputTokens+p.OutputTokens, p.CostUSD))

		case engine.EventToolResponded:
			var p struct {
				Name  string
				Error string
			}
			_ = json.Unmarshal(ev.Payload, &p)
			if p.Error != "" {
				sb.WriteString(fmt.Sprintf("[%s]   tool %s failed: %s\n", timeStr, p.Name, p.Error))
			} else {
				sb.WriteString(fmt.Sprintf("[%s]   tool %s returned output\n", timeStr, p.Name))
			}

		case engine.EventGateOpened:
			var p struct{ Prompt string }
			_ = json.Unmarshal(ev.Payload, &p)
			sb.WriteString(fmt.Sprintf("[%s] ⏸ human gate opened: %q (paused for review)\n", timeStr, p.Prompt))

		case engine.EventGateResolved:
			var p struct {
				Resolution string
				ResolvedBy string
			}
			_ = json.Unmarshal(ev.Payload, &p)
			sb.WriteString(fmt.Sprintf("[%s] ▶ gate resolved: %s by %s\n", timeStr, p.Resolution, p.ResolvedBy))

		case engine.EventGateTimedOut:
			sb.WriteString(fmt.Sprintf("[%s] ⌛ gate timed out waiting for human\n", timeStr))

		case engine.EventEdgeEvaluated:
			var p struct {
				EdgeID string `json:"edge_id"`
				Fired  bool   `json:"fired"`
			}
			_ = json.Unmarshal(ev.Payload, &p)
			if p.Fired {
				sb.WriteString(fmt.Sprintf("[%s] edge fired → %s\n", timeStr, p.EdgeID))
			}

		case engine.EventStateWritten:
			var p struct {
				Key string `json:"key"`
			}
			_ = json.Unmarshal(ev.Payload, &p)
			sb.WriteString(fmt.Sprintf("[%s] state updated → %s\n", timeStr, p.Key))
		}
	}

	return sb.String()
}
