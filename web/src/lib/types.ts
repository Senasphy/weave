export type NodeType = 'agent' | 'gate' | 'router' | 'fan_out' | 'join';
export type EdgeKind = 'always' | 'on_success' | 'on_failure' | 'when' | 'default';
export type StateReducer = 'overwrite' | 'append' | 'merge' | 'error_on_conflict';
export type BackoffStrategy = 'constant' | 'linear' | 'exponential';
export type RouterMode = 'first_matching' | 'all_matching';
export type JoinPolicy = 'wait_all' | 'fail_fast' | 'allow_partial';

export interface Budgets {
  max_steps?: number;
  max_tokens?: number;
  max_cost_usd?: number;
  max_wall_seconds?: number;
  max_turns?: number;
}

export interface RetryPolicy {
  max_attempts?: number;
  backoff?: BackoffStrategy;
  initial_interval_seconds?: number;
  retry_on?: ('rate_limit' | 'timeout' | 'invalid_output' | 'tool_error' | 'server_error')[];
}

export interface Permissions {
  network: boolean;
  side_effects: boolean;
}

export interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'mock';
  name: string;
  temperature?: number;
  max_tokens?: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface StateDeclaration {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  schema?: Record<string, unknown>;
  reducer: StateReducer;
  default?: unknown;
}

export interface Node {
  id: string;
  type: NodeType;
  label?: string;
  position?: Position;
  is_entry?: boolean;

  // Agent fields
  model?: ModelConfig;
  system_prompt?: string;
  tools?: string[];
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  reads?: string[];
  writes?: string[];
  budgets?: Budgets;
  retry?: RetryPolicy;
  permissions?: Permissions;

  // Gate fields
  prompt?: string;
  allow_edit?: boolean;
  timeout_seconds?: number;
  on_timeout?: 'fail' | 'reject';

  // Router fields
  router_mode?: RouterMode;

  // Join fields
  join_policy?: JoinPolicy;
}

export interface EdgeMap {
  to_input?: string;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  expr?: string;
  priority?: number;
  max_traversals?: number;
  map?: EdgeMap;
}

export interface WorkflowGraph {
  schema_version: '1';
  name: string;
  description?: string;
  state?: Record<string, StateDeclaration>;
  defaults?: {
    budgets?: Budgets;
    retry?: RetryPolicy;
  };
  budgets?: Budgets;
  nodes: Node[];
  edges: Edge[];
}

export type DiagnosticSeverity = 'error' | 'warning';

export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  node_id?: string;
  edge_id?: string;
  json_pointer?: string;
}

// API DTOs
export interface WorkflowRecord {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  draft_graph?: WorkflowGraph;
  created_at: string;
  updated_at: string;
}

export interface VersionRecord {
  id: string;
  workflow_id: string;
  version_number: number;
  graph: WorkflowGraph;
  semantic_hash: string;
  status: 'draft' | 'published';
  created_by?: string;
  created_at: string;
}

export type RunStatus = 'queued' | 'running' | 'waiting_human' | 'succeeded' | 'failed' | 'cancelled' | 'budget_exceeded' | 'timed_out';

export interface RunUsage {
  total_steps: number;
  total_tokens: number;
  total_cost_usd: number;
  started_at?: string;
  ended_at?: string;
}

export interface RunRecord {
  id: string;
  workspace_id: string;
  version_id: string;
  status: RunStatus;
  input?: unknown;
  output?: unknown;
  error?: string;
  budgets?: Budgets;
  usage?: RunUsage;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface RunEvent {
  id: string;
  run_id: string;
  seq: number;
  timestamp: string;
  type: string;
  step_id?: string;
  node_id?: string;
  payload: Record<string, any>;
}

export interface GateRecord {
  gate_id: string;
  run_id: string;
  step_id: string;
  node_id: string;
  prompt: string;
  status: string;
  expires_at: string;
  resolved_by?: string;
  resolution?: string;
  payload?: unknown;
}

export interface ModelPrice {
  provider: string;
  model: string;
  input_per_mtok: number;
  output_per_mtok: number;
}
