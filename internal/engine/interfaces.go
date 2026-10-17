package engine

import (
	"context"
	"time"

	"weave/internal/graph"
)

// Clock provides time abstraction for deterministic testing.
type Clock interface {
	Now() time.Time
	Since(t time.Time) time.Duration
}

// RealClock implements Clock using system time.
type RealClock struct{}

func (RealClock) Now() time.Time                  { return time.Now().UTC() }
func (RealClock) Since(t time.Time) time.Duration { return time.Since(t) }

// IDGen generates unique identifiers for steps, events, and runs.
type IDGen interface {
	NewID() string
}

// LLMRequest represents an invocation request to a model provider.
type LLMRequest struct {
	Model        graph.ModelConfig `json:"model"`
	SystemPrompt string            `json:"system_prompt"`
	Input        any               `json:"input"`
	StateSnapshot map[string]any   `json:"state_snapshot"`
	Tools        []ToolDefinition  `json:"tools,omitempty"`
	History      []LLMMessage      `json:"history,omitempty"`
}

// LLMMessage is a single message turn in the agent conversation.
type LLMMessage struct {
	Role       string     `json:"role"` // "system", "user", "assistant", "tool"
	Content    string     `json:"content"`
	ToolCalls  []ToolCall `json:"tool_calls,omitempty"`
	ToolCallID string     `json:"tool_call_id,omitempty"`
}

// ToolCall represents a model-requested tool invocation.
type ToolCall struct {
	ID        string `json:"id"`
	ToolName  string `json:"name"`
	Arguments string `json:"arguments"`
}

// LLMResponse contains the model output and usage metadata.
type LLMResponse struct {
	Content      string     `json:"content"`
	ToolCalls    []ToolCall `json:"tool_calls,omitempty"`
	InputTokens  int        `json:"input_tokens"`
	OutputTokens int        `json:"output_tokens"`
	CostUSD      float64    `json:"cost_usd"`
	LatencyMs    int64      `json:"latency_ms"`
}

// LLM interface for model providers.
type LLM interface {
	Call(ctx context.Context, req LLMRequest) (*LLMResponse, error)
}

// ToolDefinition for LLM tool calling.
type ToolDefinition struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Parameters  map[string]any `json:"parameters"`
	SideEffects bool           `json:"side_effects"`
}

// ToolRequest to execute a tool.
type ToolRequest struct {
	RunID          string         `json:"run_id"`
	StepID         string         `json:"step_id"`
	ToolName       string         `json:"tool_name"`
	Arguments      map[string]any `json:"arguments"`
	IdempotencyKey string         `json:"idempotency_key"`
}

// ToolResponse returned by a tool execution.
type ToolResponse struct {
	Output  any    `json:"output"`
	Error   string `json:"error,omitempty"`
	CostUSD float64 `json:"cost_usd,omitempty"`
}

// ToolRunner interface executes declared tools.
type ToolRunner interface {
	Execute(ctx context.Context, req ToolRequest) (*ToolResponse, error)
}
