package engine

import (
	"encoding/json"
	"time"
)

// RunStatus represents the lifecycle phase of a run.
type RunStatus string

const (
	RunStatusQueued         RunStatus = "queued"
	RunStatusRunning        RunStatus = "running"
	RunStatusWaitingHuman   RunStatus = "waiting_human"
	RunStatusSucceeded      RunStatus = "succeeded"
	RunStatusFailed         RunStatus = "failed"
	RunStatusCancelled      RunStatus = "cancelled"
	RunStatusBudgetExceeded RunStatus = "budget_exceeded"
	RunStatusTimedOut       RunStatus = "timed_out"
)

func (s RunStatus) IsTerminal() bool {
	switch s {
	case RunStatusSucceeded, RunStatusFailed, RunStatusCancelled, RunStatusBudgetExceeded, RunStatusTimedOut:
		return true
	default:
		return false
	}
}

// StepStatus represents the status of a step execution attempt.
type StepStatus string

const (
	StepStatusPending   StepStatus = "pending"
	StepStatusRunning   StepStatus = "running"
	StepStatusSucceeded StepStatus = "succeeded"
	StepStatusFailed    StepStatus = "failed"
	StepStatusRetried   StepStatus = "retried"
	StepStatusSkipped   StepStatus = "skipped"
)

// EventType defines valid event names in the append-only event stream.
type EventType string

const (
	EventRunCreated        EventType = "run.created"
	EventRunStarted        EventType = "run.started"
	EventRunSucceeded      EventType = "run.succeeded"
	EventRunFailed         EventType = "run.failed"
	EventRunCancelled      EventType = "run.cancelled"
	EventRunBudgetExceeded EventType = "run.budget_exceeded"

	EventStepReady     EventType = "step.ready"
	EventStepStarted   EventType = "step.started"
	EventStepSucceeded EventType = "step.succeeded"
	EventStepFailed    EventType = "step.failed"
	EventStepRetried   EventType = "step.retried"
	EventStepSkipped   EventType = "step.skipped"

	EventLLMRequested EventType = "llm.requested"
	EventLLMResponded EventType = "llm.responded"

	EventToolRequested EventType = "tool.requested"
	EventToolResponded EventType = "tool.responded"

	EventStateWritten EventType = "state.written"
	EventEdgeEvaluated EventType = "edge.evaluated"

	EventGateOpened   EventType = "gate.opened"
	EventGateResolved EventType = "gate.resolved"
	EventGateTimedOut EventType = "gate.timed_out"

	EventBudgetWarning  EventType = "budget.warning"
	EventBudgetExceeded EventType = "budget.exceeded"

	EventValidationOutputInvalid EventType = "validation.output_invalid"
)

// Event is an immutable record in the run log.
type Event struct {
	ID        string          `json:"id"`
	RunID     string          `json:"run_id"`
	Seq       int64           `json:"seq"`
	Timestamp time.Time       `json:"timestamp"`
	Type      EventType       `json:"type"`
	StepID    string          `json:"step_id,omitempty"`
	NodeID    string          `json:"node_id,omitempty"`
	Payload   json.RawMessage `json:"payload"`
}

// RunUsage tracks aggregate resources consumed by the run.
type RunUsage struct {
	TotalSteps   int       `json:"total_steps"`
	TotalTokens  int       `json:"total_tokens"`
	TotalCostUSD float64   `json:"total_cost_usd"`
	StartedAt    time.Time `json:"started_at"`
	EndedAt      time.Time `json:"ended_at,omitempty"`
}

// StepState tracks the status of a specific node step within a run.
type StepState struct {
	StepID    string     `json:"step_id"`
	NodeID    string     `json:"node_id"`
	Attempt   int        `json:"attempt"`
	Status    StepStatus `json:"status"`
	Input     any        `json:"input,omitempty"`
	Output    any        `json:"output,omitempty"`
	Error     string     `json:"error,omitempty"`
	StartedAt time.Time  `json:"started_at"`
	EndedAt   time.Time  `json:"ended_at,omitempty"`
}

// GateRecord tracks a pending or resolved human gate.
type GateRecord struct {
	GateID     string    `json:"gate_id"`
	RunID      string    `json:"run_id"`
	StepID     string    `json:"step_id"`
	NodeID     string    `json:"node_id"`
	Prompt     string    `json:"prompt"`
	Status     string    `json:"status"` // "waiting", "approved", "rejected", "timed_out"
	ResolvedBy string    `json:"resolved_by,omitempty"`
	Resolution string    `json:"resolution,omitempty"` // "approve", "reject", "edit"
	Payload    any       `json:"payload,omitempty"`
	ExpiresAt  time.Time `json:"expires_at"`
}

// RunState is the folded in-memory representation of a run derived purely from events.
type RunState struct {
	RunID           string                 `json:"run_id"`
	VersionID       string                 `json:"version_id"`
	Status          RunStatus              `json:"status"`
	Input           any                    `json:"input"`
	Output          any                    `json:"output"`
	Error           string                 `json:"error,omitempty"`
	State           map[string]any         `json:"state"`
	Usage           RunUsage               `json:"usage"`
	Steps           map[string]*StepState  `json:"steps"` // key: step_id or node_id
	ActiveGates     map[string]*GateRecord `json:"active_gates"`
	EdgeTraversals  map[string]int         `json:"edge_traversals"` // key: edge_id -> count
	LastSeq         int64                  `json:"last_seq"`
}

// NewRunState initializes an empty RunState.
func NewRunState(runID, versionID string, input any) *RunState {
	return &RunState{
		RunID:          runID,
		VersionID:      versionID,
		Status:         RunStatusQueued,
		Input:          input,
		State:          make(map[string]any),
		Steps:          make(map[string]*StepState),
		ActiveGates:    make(map[string]*GateRecord),
		EdgeTraversals: make(map[string]int),
	}
}

// FoldEvents derives RunState by applying an ordered sequence of events.
func FoldEvents(runID string, events []Event) *RunState {
	var state *RunState

	for _, ev := range events {
		if state == nil {
			state = &RunState{
				RunID:          runID,
				Status:         RunStatusQueued,
				State:          make(map[string]any),
				Steps:          make(map[string]*StepState),
				ActiveGates:    make(map[string]*GateRecord),
				EdgeTraversals: make(map[string]int),
			}
		}

		if ev.Seq > state.LastSeq {
			state.LastSeq = ev.Seq
		}

		switch ev.Type {
		case EventRunCreated:
			var payload struct {
				VersionID string `json:"version_id"`
				Input     any    `json:"input"`
			}
			_ = json.Unmarshal(ev.Payload, &payload)
			state.VersionID = payload.VersionID
			state.Input = payload.Input
			state.Status = RunStatusQueued

		case EventRunStarted:
			state.Status = RunStatusRunning
			state.Usage.StartedAt = ev.Timestamp

		case EventRunSucceeded:
			state.Status = RunStatusSucceeded
			state.Usage.EndedAt = ev.Timestamp
			var payload struct {
				Output any `json:"output"`
			}
			_ = json.Unmarshal(ev.Payload, &payload)
			state.Output = payload.Output

		case EventRunFailed:
			state.Status = RunStatusFailed
			state.Usage.EndedAt = ev.Timestamp
			var payload struct {
				Error string `json:"error"`
			}
			_ = json.Unmarshal(ev.Payload, &payload)
			state.Error = payload.Error

		case EventRunCancelled:
			state.Status = RunStatusCancelled
			state.Usage.EndedAt = ev.Timestamp

		case EventRunBudgetExceeded:
			state.Status = RunStatusBudgetExceeded
			state.Usage.EndedAt = ev.Timestamp

		case EventStepReady:
			var payload struct {
				NodeID  string `json:"node_id"`
				Attempt int    `json:"attempt"`
				Input   any    `json:"input"`
			}
			_ = json.Unmarshal(ev.Payload, &payload)
			state.Steps[ev.StepID] = &StepState{
				StepID:  ev.StepID,
				NodeID:  payload.NodeID,
				Attempt: payload.Attempt,
				Status:  StepStatusPending,
				Input:   payload.Input,
			}

		case EventStepStarted:
			if step, ok := state.Steps[ev.StepID]; ok {
				step.Status = StepStatusRunning
				step.StartedAt = ev.Timestamp
			}
			state.Usage.TotalSteps++

		case EventStepSucceeded:
			if step, ok := state.Steps[ev.StepID]; ok {
				step.Status = StepStatusSucceeded
				step.EndedAt = ev.Timestamp
				var payload struct {
					Output any `json:"output"`
				}
				_ = json.Unmarshal(ev.Payload, &payload)
				step.Output = payload.Output
			}

		case EventStepFailed:
			if step, ok := state.Steps[ev.StepID]; ok {
				step.Status = StepStatusFailed
				step.EndedAt = ev.Timestamp
				var payload struct {
					Error string `json:"error"`
				}
				_ = json.Unmarshal(ev.Payload, &payload)
				step.Error = payload.Error
			}

		case EventStepRetried:
			if step, ok := state.Steps[ev.StepID]; ok {
				step.Status = StepStatusRetried
			}

		case EventLLMResponded:
			var payload struct {
				InputTokens  int     `json:"input_tokens"`
				OutputTokens int     `json:"output_tokens"`
				CostUSD      float64 `json:"cost_usd"`
			}
			_ = json.Unmarshal(ev.Payload, &payload)
			state.Usage.TotalTokens += payload.InputTokens + payload.OutputTokens
			state.Usage.TotalCostUSD += payload.CostUSD

		case EventToolResponded:
			var payload struct {
				CostUSD float64 `json:"cost_usd"`
			}
			_ = json.Unmarshal(ev.Payload, &payload)
			state.Usage.TotalCostUSD += payload.CostUSD

		case EventStateWritten:
			var payload struct {
				Key   string `json:"key"`
				Value any    `json:"value"`
			}
			_ = json.Unmarshal(ev.Payload, &payload)
			if payload.Key != "" {
				state.State[payload.Key] = payload.Value
			}

		case EventEdgeEvaluated:
			var payload struct {
				EdgeID string `json:"edge_id"`
				Fired  bool   `json:"fired"`
			}
			_ = json.Unmarshal(ev.Payload, &payload)
			if payload.Fired && payload.EdgeID != "" {
				state.EdgeTraversals[payload.EdgeID]++
			}

		case EventGateOpened:
			var payload struct {
				GateID    string    `json:"gate_id"`
				Prompt    string    `json:"prompt"`
				ExpiresAt time.Time `json:"expires_at"`
			}
			_ = json.Unmarshal(ev.Payload, &payload)
			state.Status = RunStatusWaitingHuman
			state.ActiveGates[payload.GateID] = &GateRecord{
				GateID:    payload.GateID,
				RunID:     runID,
				StepID:    ev.StepID,
				NodeID:    ev.NodeID,
				Prompt:    payload.Prompt,
				Status:    "waiting",
				ExpiresAt: payload.ExpiresAt,
			}

		case EventGateResolved:
			var payload struct {
				GateID     string `json:"gate_id"`
				Resolution string `json:"resolution"`
				ResolvedBy string `json:"resolved_by"`
				Payload    any    `json:"payload"`
			}
			_ = json.Unmarshal(ev.Payload, &payload)
			if gate, ok := state.ActiveGates[payload.GateID]; ok {
				gate.Status = payload.Resolution
				gate.Resolution = payload.Resolution
				gate.ResolvedBy = payload.ResolvedBy
				gate.Payload = payload.Payload
				delete(state.ActiveGates, payload.GateID)
			}
			if len(state.ActiveGates) == 0 && state.Status == RunStatusWaitingHuman {
				state.Status = RunStatusRunning
			}

		case EventGateTimedOut:
			var payload struct {
				GateID string `json:"gate_id"`
			}
			_ = json.Unmarshal(ev.Payload, &payload)
			if gate, ok := state.ActiveGates[payload.GateID]; ok {
				gate.Status = "timed_out"
				delete(state.ActiveGates, payload.GateID)
			}
			if len(state.ActiveGates) == 0 && state.Status == RunStatusWaitingHuman {
				state.Status = RunStatusRunning
			}
		}
	}

	return state
}
