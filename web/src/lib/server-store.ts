import {
  WorkflowRecord,
  WorkflowGraph,
  VersionRecord,
  RunRecord,
  RunEvent,
  GateRecord,
  ModelPrice,
  Diagnostic,
} from './types';
import { Pool } from 'pg';

const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

// Seed Workflows
const SEED_WORKFLOW_1: WorkflowRecord = {
  id: 'wf_support_triage',
  workspace_id: DEFAULT_WORKSPACE_ID,
  name: 'Customer Support Triage & High-Value Refund Gate',
  description: 'Classify tickets with Gemini Flash, route high-value refunds through human approvals, and issue automatic refunds for small amounts.',
  draft_graph: {
    schema_version: '1',
    name: 'Customer Support Triage & High-Value Refund Gate',
    description: 'Classify tickets with Gemini Flash, route high-value refunds through human approvals, and issue automatic refunds for small amounts.',
    nodes: [
      {
        id: 'classifier',
        type: 'agent',
        label: 'Extract & Classify Ticket',
        is_entry: true,
        position: { x: 80, y: 160 },
        model: { provider: 'gemini', name: 'gemini-1.5-flash', temperature: 0.1 },
        system_prompt: 'Extract the user sentiment, issue summary, and refund amount in USD from the customer ticket.',
      },
      {
        id: 'router',
        type: 'router',
        label: 'Evaluate Spend Threshold',
        position: { x: 380, y: 160 },
        router_mode: 'first_matching',
      },
      {
        id: 'approval_gate',
        type: 'gate',
        label: 'Manager Approval Gate',
        position: { x: 680, y: 80 },
        prompt: 'Refund amount exceeds $100.00. Requires manager review before Stripe chargeback dispatch.',
        timeout_seconds: 86400,
        allow_edit: true,
        on_timeout: 'fail',
      },
      {
        id: 'refund_agent',
        type: 'agent',
        label: 'Stripe Refund Tool',
        position: { x: 980, y: 80 },
        model: { provider: 'openai', name: 'gpt-4o-mini' },
        system_prompt: 'Execute Stripe API refund with customer card reference and dispatch email notification.',
        tools: ['stripe_refund'],
      },
      {
        id: 'standard_reply',
        type: 'agent',
        label: 'Auto Resolve & Reply',
        position: { x: 680, y: 260 },
        model: { provider: 'gemini', name: 'gemini-1.5-flash' },
        system_prompt: 'Draft standard polite resolution email confirming small adjustment.',
      },
    ],
    edges: [
      { id: 'e1', from: 'classifier', to: 'router', kind: 'always' },
      { id: 'e2', from: 'router', to: 'approval_gate', kind: 'when', expr: 'out.amount_usd > 100', priority: 1 },
      { id: 'e3', from: 'router', to: 'standard_reply', kind: 'default' },
      { id: 'e4', from: 'approval_gate', to: 'refund_agent', kind: 'on_success' },
    ],
    budgets: {
      max_steps: 15,
      max_cost_usd: 0.50,
      max_tokens: 6000,
    },
  },
  created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
};

const SEED_WORKFLOW_2: WorkflowRecord = {
  id: 'wf_document_synthesis',
  workspace_id: DEFAULT_WORKSPACE_ID,
  name: 'Multi-Model Document Synthesis with Parallel Joins',
  description: 'Concurrently fan out research queries across Gemini Flash and Claude Sonnet, then join and summarize outputs.',
  draft_graph: {
    schema_version: '1',
    name: 'Multi-Model Document Synthesis with Parallel Joins',
    description: 'Concurrently fan out research queries across Gemini Flash and Claude Sonnet, then join and summarize outputs.',
    nodes: [
      {
        id: 'fan_out',
        type: 'fan_out',
        label: 'Broadcast Query',
        is_entry: true,
        position: { x: 80, y: 160 },
      },
      {
        id: 'gemini_agent',
        type: 'agent',
        label: 'Gemini 1.5 Flash Worker',
        position: { x: 380, y: 80 },
        model: { provider: 'gemini', name: 'gemini-1.5-flash' },
        system_prompt: 'Analyze document from technical architecture perspective.',
      },
      {
        id: 'claude_agent',
        type: 'agent',
        label: 'Claude 3.5 Sonnet Worker',
        position: { x: 380, y: 240 },
        model: { provider: 'anthropic', name: 'claude-3-5-sonnet' },
        system_prompt: 'Analyze document from risk and compliance perspective.',
      },
      {
        id: 'join_node',
        type: 'join',
        label: 'Consensus Join',
        position: { x: 680, y: 160 },
        join_policy: 'wait_all',
      },
      {
        id: 'summarizer',
        type: 'agent',
        label: 'Final Synthesis Agent',
        position: { x: 980, y: 160 },
        model: { provider: 'openai', name: 'gpt-4o' },
        system_prompt: 'Reconcile viewpoints into unified executive brief.',
      },
    ],
    edges: [
      { id: 'e1', from: 'fan_out', to: 'gemini_agent', kind: 'always' },
      { id: 'e2', from: 'fan_out', to: 'claude_agent', kind: 'always' },
      { id: 'e3', from: 'gemini_agent', to: 'join_node', kind: 'always' },
      { id: 'e4', from: 'claude_agent', to: 'join_node', kind: 'always' },
      { id: 'e5', from: 'join_node', to: 'summarizer', kind: 'always' },
    ],
    budgets: {
      max_steps: 20,
      max_cost_usd: 0.80,
      max_tokens: 12000,
    },
  },
  created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
};

const SEED_WORKFLOW_3: WorkflowRecord = {
  id: 'wf_incident_diagnostics',
  workspace_id: DEFAULT_WORKSPACE_ID,
  name: 'Autonomous Incident Diagnostics & Circuit Breaker',
  description: 'Scoped kubectl and PostgreSQL diagnostic agent with hard stop spending caps.',
  draft_graph: {
    schema_version: '1',
    name: 'Autonomous Incident Diagnostics & Circuit Breaker',
    description: 'Scoped kubectl and PostgreSQL diagnostic agent with hard stop spending caps.',
    nodes: [
      {
        id: 'alert_triage',
        type: 'agent',
        label: 'Ingest Sentry / Datadog Alert',
        is_entry: true,
        position: { x: 80, y: 160 },
        model: { provider: 'gemini', name: 'gemini-1.5-flash' },
      },
      {
        id: 'investigate_gate',
        type: 'gate',
        label: 'Approve Scoped Diagnostic Run',
        position: { x: 380, y: 160 },
        prompt: 'Authorizing read-only kubectl cluster queries.',
        timeout_seconds: 3600,
      },
      {
        id: 'diagnostician',
        type: 'agent',
        label: 'Cluster Log Analyzer',
        position: { x: 680, y: 160 },
        model: { provider: 'anthropic', name: 'claude-3-5-sonnet' },
        tools: ['kb_search'],
      },
    ],
    edges: [
      { id: 'e1', from: 'alert_triage', to: 'investigate_gate', kind: 'always' },
      { id: 'e2', from: 'investigate_gate', to: 'diagnostician', kind: 'on_success' },
    ],
    budgets: {
      max_steps: 10,
      max_cost_usd: 0.30,
    },
  },
  created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
};

// Seed Model Prices
const SEED_MODEL_PRICES: ModelPrice[] = [
  { provider: 'gemini', model: 'gemini-1.5-flash', input_per_mtok: 0.075, output_per_mtok: 0.30 },
  { provider: 'gemini', model: 'gemini-1.5-pro', input_per_mtok: 1.25, output_per_mtok: 5.00 },
  { provider: 'anthropic', model: 'claude-3-5-sonnet', input_per_mtok: 3.00, output_per_mtok: 15.00 },
  { provider: 'anthropic', model: 'claude-3-5-haiku', input_per_mtok: 0.80, output_per_mtok: 4.00 },
  { provider: 'openai', model: 'gpt-4o', input_per_mtok: 2.50, output_per_mtok: 10.00 },
  { provider: 'openai', model: 'gpt-4o-mini', input_per_mtok: 0.15, output_per_mtok: 0.60 },
  { provider: 'mock', model: 'deterministic', input_per_mtok: 0.00, output_per_mtok: 0.00 },
];

// Seed Versions
const SEED_VERSIONS: VersionRecord[] = [
  {
    id: 'ver_01_triage',
    workflow_id: 'wf_support_triage',
    version_number: 1,
    graph: SEED_WORKFLOW_1.draft_graph!,
    semantic_hash: 'sha256:7f8bc2a831e',
    status: 'published',
    created_by: 'system',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

// Seed Runs
const SEED_RUNS: RunRecord[] = [
  {
    id: 'run_01hx48a1c9e',
    workspace_id: DEFAULT_WORKSPACE_ID,
    version_id: 'ver_01_triage',
    status: 'succeeded',
    input: { ticket_id: 'TCK-8491', amount_usd: 45.0, user_email: 'jane@example.com' },
    output: { status: 'refund_skipped', decision: 'standard_reply_sent' },
    usage: {
      total_steps: 3,
      total_tokens: 1840,
      total_cost_usd: 0.045,
      started_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      ended_at: new Date(Date.now() - 3600000 * 2 + 15000).toISOString(),
    },
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'run_029f82b7c4a',
    workspace_id: DEFAULT_WORKSPACE_ID,
    version_id: 'ver_01_triage',
    status: 'waiting_human',
    input: { ticket_id: 'TCK-9902', amount_usd: 150.0, user_email: 'alex@enterprise.io' },
    usage: {
      total_steps: 2,
      total_tokens: 1210,
      total_cost_usd: 0.038,
      started_at: new Date(Date.now() - 1800000).toISOString(),
    },
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'run_03ab49e01df',
    workspace_id: DEFAULT_WORKSPACE_ID,
    version_id: 'ver_01_triage',
    status: 'running',
    input: { ticket_id: 'TCK-9915', amount_usd: 80.0, user_email: 'sarah@domain.com' },
    usage: {
      total_steps: 1,
      total_tokens: 650,
      total_cost_usd: 0.015,
      started_at: new Date(Date.now() - 120000).toISOString(),
    },
    created_at: new Date(Date.now() - 120000).toISOString(),
  },
];

// Seed Gates
const SEED_GATES: GateRecord[] = [
  {
    gate_id: 'gate_029f82b7',
    run_id: 'run_029f82b7c4a',
    step_id: 'step_approval_gate',
    node_id: 'approval_gate',
    prompt: 'Refund request of $150.00 for ticket TCK-9902 exceeds the $100 auto-approval threshold. Approve or reject Stripe credit.',
    status: 'waiting',
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    payload: { ticket_id: 'TCK-9902', amount_usd: 150.0, user_email: 'alex@enterprise.io' },
  },
];

// Seed Run Events
const SEED_EVENTS: RunEvent[] = [
  {
    id: 'ev_01',
    run_id: 'run_01hx48a1c9e',
    seq: 1,
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    type: 'run.started',
    payload: { version_id: 'ver_01_triage' },
  },
  {
    id: 'ev_02',
    run_id: 'run_01hx48a1c9e',
    seq: 2,
    timestamp: new Date(Date.now() - 3600000 * 2 + 2000).toISOString(),
    type: 'step.completed',
    step_id: 'classifier',
    node_id: 'classifier',
    payload: { model: 'gemini-1.5-flash', tokens: 450, cost_usd: 0.01 },
  },
  {
    id: 'ev_03',
    run_id: 'run_01hx48a1c9e',
    seq: 3,
    timestamp: new Date(Date.now() - 3600000 * 2 + 5000).toISOString(),
    type: 'run.completed',
    payload: { duration_seconds: 5.2 },
  },
];

// In-Memory Fallback State (persists across warm serverless invocations)
class MemoryStore {
  workflows: WorkflowRecord[] = [SEED_WORKFLOW_1, SEED_WORKFLOW_2, SEED_WORKFLOW_3];
  versions: VersionRecord[] = [...SEED_VERSIONS];
  runs: RunRecord[] = [...SEED_RUNS];
  gates: GateRecord[] = [...SEED_GATES];
  events: RunEvent[] = [...SEED_EVENTS];
  models: ModelPrice[] = [...SEED_MODEL_PRICES];

  listWorkflows(workspaceId: string = DEFAULT_WORKSPACE_ID): WorkflowRecord[] {
    return this.workflows.filter((w) => w.workspace_id === workspaceId);
  }

  getWorkflow(workspaceId: string = DEFAULT_WORKSPACE_ID, id: string): WorkflowRecord | null {
    return this.workflows.find((w) => w.id === id) || null;
  }

  getWorkflowDraft(workspaceId: string = DEFAULT_WORKSPACE_ID, id: string): WorkflowGraph | null {
    const wf = this.getWorkflow(workspaceId, id);
    return wf?.draft_graph || null;
  }

  createWorkflow(
    workspaceId: string = DEFAULT_WORKSPACE_ID,
    name: string,
    description?: string,
    initialGraph?: WorkflowGraph
  ): WorkflowRecord {
    const id = `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const wf: WorkflowRecord = {
      id,
      workspace_id: workspaceId,
      name,
      description: description || '',
      draft_graph: initialGraph || {
        schema_version: '1',
        name,
        nodes: [
          {
            id: 'entry_agent',
            type: 'agent',
            label: 'Start Agent',
            is_entry: true,
            position: { x: 100, y: 150 },
            model: { provider: 'gemini', name: 'gemini-1.5-flash' },
          },
        ],
        edges: [],
      },
      created_at: now,
      updated_at: now,
    };
    this.workflows.unshift(wf);
    return wf;
  }

  updateWorkflowDraft(workspaceId: string = DEFAULT_WORKSPACE_ID, id: string, draft: WorkflowGraph): boolean {
    const wf = this.getWorkflow(workspaceId, id);
    if (!wf) return false;
    wf.draft_graph = draft;
    wf.updated_at = new Date().toISOString();
    return true;
  }

  validateWorkflow(graph: WorkflowGraph): { valid: boolean; semantic_hash: string; diagnostics: Diagnostic[] } {
    const diagnostics: Diagnostic[] = [];

    if (!graph.nodes || graph.nodes.length === 0) {
      diagnostics.push({
        severity: 'error',
        code: 'empty_graph',
        message: 'Workflow graph must contain at least one node',
      });
    }

    const entryNodes = (graph.nodes || []).filter((n) => n.is_entry);
    if (entryNodes.length === 0 && (graph.nodes || []).length > 0) {
      diagnostics.push({
        severity: 'error',
        code: 'no_entry_node',
        message: 'Workflow requires an entry node (mark is_entry: true)',
      });
    }

    // Check edge references
    const nodeIds = new Set((graph.nodes || []).map((n) => n.id));
    for (const edge of graph.edges || []) {
      if (!nodeIds.has(edge.from)) {
        diagnostics.push({
          severity: 'error',
          code: 'invalid_edge_source',
          message: `Edge ${edge.id} references non-existent source node "${edge.from}"`,
          edge_id: edge.id,
        });
      }
      if (!nodeIds.has(edge.to)) {
        diagnostics.push({
          severity: 'error',
          code: 'invalid_edge_target',
          message: `Edge ${edge.id} references non-existent target node "${edge.to}"`,
          edge_id: edge.id,
        });
      }
    }

    const hasErrors = diagnostics.some((d) => d.severity === 'error');
    const hash = `sha256:${Math.random().toString(36).substring(2, 12)}`;

    return {
      valid: !hasErrors,
      semantic_hash: hash,
      diagnostics,
    };
  }

  publishWorkflow(workspaceId: string = DEFAULT_WORKSPACE_ID, workflowId: string): VersionRecord | null {
    const wf = this.getWorkflow(workspaceId, workflowId);
    if (!wf || !wf.draft_graph) return null;

    const validation = this.validateWorkflow(wf.draft_graph);
    if (!validation.valid) return null;

    const currentVersions = this.versions.filter((v) => v.workflow_id === workflowId);
    const nextVersion = currentVersions.length + 1;

    const ver: VersionRecord = {
      id: `ver_${workflowId}_v${nextVersion}`,
      workflow_id: workflowId,
      version_number: nextVersion,
      graph: JSON.parse(JSON.stringify(wf.draft_graph)),
      semantic_hash: validation.semantic_hash,
      status: 'published',
      created_by: 'developer',
      created_at: new Date().toISOString(),
    };

    this.versions.unshift(ver);
    return ver;
  }

  listVersions(workflowId: string): VersionRecord[] {
    return this.versions.filter((v) => v.workflow_id === workflowId);
  }

  getVersion(workflowId: string, versionNumber: number): VersionRecord | null {
    return this.versions.find((v) => v.workflow_id === workflowId && v.version_number === versionNumber) || null;
  }

  createRun(
    workspaceId: string = DEFAULT_WORKSPACE_ID,
    workflowId: string,
    versionNumber: number,
    options: { input?: unknown; budget_overrides?: unknown; mock?: boolean } = {}
  ): RunRecord {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const ver = this.getVersion(workflowId, versionNumber);
    const verId = ver ? ver.id : `ver_${workflowId}_v${versionNumber}`;

    const newRun: RunRecord = {
      id: runId,
      workspace_id: workspaceId,
      version_id: verId,
      status: 'running',
      input: options.input || {},
      usage: {
        total_steps: 1,
        total_tokens: 350,
        total_cost_usd: 0.012,
        started_at: now,
      },
      created_at: now,
    };

    this.runs.unshift(newRun);

    // Create execution started event
    this.events.push({
      id: `ev_${Date.now()}_1`,
      run_id: runId,
      seq: 1,
      timestamp: now,
      type: 'run.started',
      payload: { workflow_id: workflowId, version_number: versionNumber },
    });

    // Check if the workflow has a gate; if so, create a gate after a short interval
    const hasGate = ver?.graph?.nodes?.some((n) => n.type === 'gate');
    if (hasGate) {
      setTimeout(() => {
        newRun.status = 'waiting_human';
        const gateId = `gate_${Date.now()}`;
        this.gates.unshift({
          gate_id: gateId,
          run_id: runId,
          step_id: 'approval_gate',
          node_id: 'approval_gate',
          prompt: 'Approval gate triggered during pipeline execution. Review payload to continue.',
          status: 'waiting',
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          payload: options.input,
        });
        this.events.push({
          id: `ev_${Date.now()}_2`,
          run_id: runId,
          seq: 2,
          timestamp: new Date().toISOString(),
          type: 'gate.waiting',
          step_id: 'approval_gate',
          node_id: 'approval_gate',
          payload: { gate_id: gateId },
        });
      }, 500);
    } else {
      setTimeout(() => {
        newRun.status = 'succeeded';
        newRun.output = { result: 'Workflow executed cleanly' };
        if (newRun.usage) {
          newRun.usage.ended_at = new Date().toISOString();
        }
        this.events.push({
          id: `ev_${Date.now()}_3`,
          run_id: runId,
          seq: 2,
          timestamp: new Date().toISOString(),
          type: 'run.completed',
          payload: { result: 'success' },
        });
      }, 1000);
    }

    return newRun;
  }

  listRuns(workspaceId: string = DEFAULT_WORKSPACE_ID, status?: string): RunRecord[] {
    return this.runs.filter((r) => {
      if (status && r.status !== status) return false;
      return true;
    });
  }

  getRun(id: string): RunRecord | null {
    return this.runs.find((r) => r.id === id) || null;
  }

  getRunEvents(runId: string, afterSeq: number = 0): RunEvent[] {
    return this.events.filter((e) => e.run_id === runId && e.seq > afterSeq).sort((a, b) => a.seq - b.seq);
  }

  cancelRun(id: string): boolean {
    const run = this.getRun(id);
    if (!run) return false;
    run.status = 'cancelled';
    this.events.push({
      id: `ev_${Date.now()}`,
      run_id: id,
      seq: this.events.filter((e) => e.run_id === id).length + 1,
      timestamp: new Date().toISOString(),
      type: 'run.cancelled',
      payload: { reason: 'User initiated cancellation' },
    });
    return true;
  }

  replayRun(id: string): RunRecord | null {
    const original = this.getRun(id);
    if (!original) return null;
    const version = this.versions.find((v) => v.id === original.version_id);
    const workflowId = version ? version.workflow_id : 'wf_support_triage';
    const versionNumber = version ? version.version_number : 1;
    return this.createRun(original.workspace_id, workflowId, versionNumber, { input: original.input });
  }

  listGates(): GateRecord[] {
    return this.gates.filter((g) => g.status === 'waiting');
  }

  resolveGate(gateId: string, resolution: 'approve' | 'reject' | 'edit', actor: string = 'user', payload?: unknown): boolean {
    const gate = this.gates.find((g) => g.gate_id === gateId);
    if (!gate) return false;

    gate.status = resolution === 'approve' ? 'approved' : resolution === 'reject' ? 'rejected' : 'edited';
    gate.resolved_by = actor;
    gate.resolution = resolution;
    if (payload) gate.payload = payload;

    const run = this.getRun(gate.run_id);
    if (run && run.status === 'waiting_human') {
      run.status = resolution === 'reject' ? 'failed' : 'succeeded';
      if (run.usage) {
        run.usage.ended_at = new Date().toISOString();
      }
      this.events.push({
        id: `ev_${Date.now()}`,
        run_id: gate.run_id,
        seq: this.events.filter((e) => e.run_id === gate.run_id).length + 1,
        timestamp: new Date().toISOString(),
        type: 'gate.resolved',
        step_id: gate.step_id,
        node_id: gate.node_id,
        payload: { gate_id: gateId, resolution, actor },
      });
    }

    return true;
  }

  listModels(): ModelPrice[] {
    return this.models;
  }
}

// Global Singleton to maintain state across hot-reloads and requests
const globalForStore = globalThis as unknown as { serverStore?: MemoryStore };
export const serverStore = globalForStore.serverStore || new MemoryStore();
if (process.env.NODE_ENV !== 'production') {
  globalForStore.serverStore = serverStore;
}
