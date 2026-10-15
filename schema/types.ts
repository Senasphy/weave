/**
 * Authoritative TypeScript interfaces matching schema/workflow.schema.json
 */

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
