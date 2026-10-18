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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || errorBody.message || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Workflows
  listWorkflows: () => request<WorkflowRecord[]>('/workflows'),
  getWorkflow: (id: string) => request<WorkflowRecord>(`/workflows/${id}`),
  createWorkflow: (data: { name: string; description?: string; initial_graph?: WorkflowGraph }) =>
    request<WorkflowRecord>('/workflows', { method: 'POST', body: JSON.stringify(data) }),

  // Draft & Validate & Publish
  getWorkflowDraft: (id: string) => request<WorkflowGraph>(`/workflows/${id}/draft`),
  saveWorkflowDraft: (id: string, graph: WorkflowGraph) =>
    request<{ status: string }>(`/workflows/${id}/draft`, { method: 'PUT', body: JSON.stringify(graph) }),
  validateWorkflow: (id: string, graph?: WorkflowGraph) =>
    request<{ valid: boolean; semantic_hash: string; diagnostics: Diagnostic[] }>(`/workflows/${id}/validate`, {
      method: 'POST',
      body: graph ? JSON.stringify(graph) : undefined,
    }),
  publishWorkflow: (id: string) => request<VersionRecord>(`/workflows/${id}/publish`, { method: 'POST' }),

  // Versions
  listVersions: (workflowId: string) => request<VersionRecord[]>(`/workflows/${workflowId}/versions`),
  getVersion: (workflowId: string, versionNumber: number) =>
    request<VersionRecord>(`/workflows/${workflowId}/versions/${versionNumber}`),

  // Runs
  createRun: (workflowId: string, versionNumber: number, data: { input?: unknown; budget_overrides?: unknown; mock?: boolean }) =>
    request<RunRecord>(`/workflows/${workflowId}/versions/${versionNumber}/runs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  listRuns: (status?: string) => request<RunRecord[]>(`/runs${status ? `?status=${status}` : ''}`),
  getRun: (id: string) => request<RunRecord>(`/runs/${id}`),
  getRunEvents: (id: string, afterSeq: number = 0) =>
    request<RunEvent[]>(`/runs/${id}/events?after_seq=${afterSeq}`),
  cancelRun: (id: string) => request<{ status: string }>(`/runs/${id}/cancel`, { method: 'POST' }),
  replayRun: (id: string) => request<{ replay_mode: string; state: unknown }>(`/runs/${id}/replay`, { method: 'POST' }),

  // Gates
  listGates: () => request<GateRecord[]>('/gates'),
  resolveGate: (gateId: string, data: { resolution: 'approve' | 'reject' | 'edit'; actor?: string; payload?: unknown }) =>
    request<{ status: string; gate_id: string }>(`/gates/${gateId}/resolve`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Models
  listModels: () => request<ModelPrice[]>('/models'),
};
