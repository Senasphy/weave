package graph

import (
	"encoding/json"
)

// NodeType identifies the execution behavior of a node.
type NodeType string

const (
	NodeTypeAgent  NodeType = "agent"
	NodeTypeGate   NodeType = "gate"
	NodeTypeRouter NodeType = "router"
	NodeTypeFanOut NodeType = "fan_out"
	NodeTypeJoin   NodeType = "join"
)

// EdgeKind identifies the condition under which an edge fires.
type EdgeKind string

const (
	EdgeKindAlways    EdgeKind = "always"
	EdgeKindOnSuccess EdgeKind = "on_success"
	EdgeKindOnFailure EdgeKind = "on_failure"
	EdgeKindWhen      EdgeKind = "when"
	EdgeKindDefault   EdgeKind = "default"
)

// StateReducer defines how concurrent or sequential updates to a state key are merged.
type StateReducer string

const (
	ReducerOverwrite       StateReducer = "overwrite"
	ReducerAppend          StateReducer = "append"
	ReducerMerge           StateReducer = "merge"
	ReducerErrorOnConflict StateReducer = "error_on_conflict"
)

// BackoffStrategy for retries.
type BackoffStrategy string

const (
	BackoffConstant    BackoffStrategy = "constant"
	BackoffLinear      BackoffStrategy = "linear"
	BackoffExponential BackoffStrategy = "exponential"
)

// RouterMode defines whether only the first matching when edge fires or all matching edges.
type RouterMode string

const (
	RouterModeFirstMatching RouterMode = "first_matching"
	RouterModeAllMatching   RouterMode = "all_matching"
)

// JoinPolicy defines when a join node resumes execution.
type JoinPolicy string

const (
	JoinPolicyWaitAll      JoinPolicy = "wait_all"
	JoinPolicyFailFast     JoinPolicy = "fail_fast"
	JoinPolicyAllowPartial JoinPolicy = "allow_partial"
)

// Budgets specifies step, token, cost, wall-clock, and turn limits.
type Budgets struct {
	MaxSteps       int     `json:"max_steps,omitempty"`
	MaxTokens      int     `json:"max_tokens,omitempty"`
	MaxCostUSD     float64 `json:"max_cost_usd,omitempty"`
	MaxWallSeconds int     `json:"max_wall_seconds,omitempty"`
	MaxTurns       int     `json:"max_turns,omitempty"`
}

// RetryPolicy specifies retry behavior on failure.
type RetryPolicy struct {
	MaxAttempts            int             `json:"max_attempts,omitempty"`
	Backoff                BackoffStrategy `json:"backoff,omitempty"`
	InitialIntervalSeconds float64         `json:"initial_interval_seconds,omitempty"`
	RetryOn                []string        `json:"retry_on,omitempty"`
}

// Permissions specifies node execution permissions.
type Permissions struct {
	Network     bool `json:"network"`
	SideEffects bool `json:"side_effects"`
}

// ModelConfig specifies LLM parameters.
type ModelConfig struct {
	Provider    string  `json:"provider"`
	Name        string  `json:"name"`
	Temperature float64 `json:"temperature"`
	MaxTokens   int     `json:"max_tokens,omitempty"`
}

// Position represents presentation coordinates on canvas.
type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// StateDeclaration defines a run-scoped state key.
type StateDeclaration struct {
	Type    string          `json:"type"` // "string", "number", "boolean", "object", "array"
	Schema  json.RawMessage `json:"schema,omitempty"`
	Reducer StateReducer    `json:"reducer"`
	Default any             `json:"default,omitempty"`
}

// Node represents a step definition in the workflow graph.
type Node struct {
	ID       string   `json:"id"`
	Type     NodeType `json:"type"`
	Label    string   `json:"label,omitempty"`
	Position Position `json:"position,omitempty"`
	IsEntry  bool     `json:"is_entry,omitempty"`

	// Agent node fields
	Model        *ModelConfig    `json:"model,omitempty"`
	SystemPrompt string          `json:"system_prompt,omitempty"`
	Tools        []string        `json:"tools,omitempty"`
	InputSchema  json.RawMessage `json:"input_schema,omitempty"`
	OutputSchema json.RawMessage `json:"output_schema,omitempty"`
	Reads        []string        `json:"reads,omitempty"`
	Writes       []string        `json:"writes,omitempty"`
	Budgets      *Budgets        `json:"budgets,omitempty"`
	Retry        *RetryPolicy    `json:"retry,omitempty"`
	Permissions  *Permissions    `json:"permissions,omitempty"`

	// Gate node fields
	Prompt         string `json:"prompt,omitempty"`
	AllowEdit      bool   `json:"allow_edit,omitempty"`
	TimeoutSeconds int    `json:"timeout_seconds,omitempty"`
	OnTimeout      string `json:"on_timeout,omitempty"` // "fail", "reject"

	// Router node fields
	RouterMode RouterMode `json:"router_mode,omitempty"`

	// Join node fields
	JoinPolicy JoinPolicy `json:"join_policy,omitempty"`
}

// EdgeMap defines input transformation via CEL.
type EdgeMap struct {
	ToInput string `json:"to_input,omitempty"`
}

// Edge represents a directed connection between nodes.
type Edge struct {
	ID             string   `json:"id"`
	From           string   `json:"from"`
	To             string   `json:"to"`
	Kind           EdgeKind `json:"kind"`
	Expr           string   `json:"expr,omitempty"`
	Priority       int      `json:"priority,omitempty"`
	MaxTraversals  int      `json:"max_traversals,omitempty"`
	Map            *EdgeMap `json:"map,omitempty"`
}

// WorkflowGraph defines the entire workflow graph.
type WorkflowGraph struct {
	SchemaVersion string                      `json:"schema_version"`
	Name          string                      `json:"name"`
	Description   string                      `json:"description,omitempty"`
	State         map[string]StateDeclaration `json:"state,omitempty"`
	Defaults      *struct {
		Budgets *Budgets     `json:"budgets,omitempty"`
		Retry   *RetryPolicy `json:"retry,omitempty"`
	} `json:"defaults,omitempty"`
	Budgets *Budgets `json:"budgets,omitempty"`
	Nodes   []Node   `json:"nodes"`
	Edges   []Edge   `json:"edges"`
}

// WorkspaceConfig represents workspace-level allowances and declarations.
type WorkspaceConfig struct {
	AllowedTools       map[string]ToolDeclaration
	KnownModelPrices   map[string]bool // key: provider:model
	RequireGateForSideEffects bool
	DefaultBudgets     Budgets
}

// ToolDeclaration represents a registered tool in the workspace.
type ToolDeclaration struct {
	ID          string `json:"id"`
	Kind        string `json:"kind"` // "http", "mcp", "builtin"
	SideEffects bool   `json:"side_effects"`
}

// Severity of a diagnostic message.
type DiagnosticSeverity string

const (
	SeverityError   DiagnosticSeverity = "error"
	SeverityWarning DiagnosticSeverity = "warning"
)

// Diagnostic represents a validation error or warning.
type Diagnostic struct {
	Severity    DiagnosticSeverity `json:"severity"`
	Code        string             `json:"code"`
	Message     string             `json:"message"`
	NodeID      string             `json:"node_id,omitempty"`
	EdgeID      string             `json:"edge_id,omitempty"`
	JSONPointer string             `json:"json_pointer,omitempty"`
}
