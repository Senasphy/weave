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

export function resolveApiBase(): string {
  // In the browser, always use the same-origin Next.js proxy route /api/v1.
  // Better Auth sessions are stored in HttpOnly cookies, which browser JavaScript
  // cannot read and browsers cannot send cross-origin to weave-backend.
  // The Next.js API proxy receives HttpOnly credentials and forwards the
  // Authorization: Bearer token directly to the Go backend.
  if (typeof window !== 'undefined') {
    return '/api/v1';
  }

  // Server-side (SSR / Node / Docker): communicate directly with the Go backend
  const backendUrl =
    process.env.BACKEND_URL?.trim() ||
    process.env.API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();

  if (backendUrl) {
    let raw = backendUrl.replace(/\/+$/, '');
    if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
      raw = `https://${raw}`;
    }
    return raw.endsWith('/v1') ? raw : `${raw}/v1`;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api/v1`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/v1`;
  }
  return 'http://localhost:8080/v1';
}

export const API_BASE = resolveApiBase();

function getSessionToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  return null;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const base = resolveApiBase();
  const url = `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = getSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || errorBody.message || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Identity
  getMe: () =>
    request<{
      authenticated: boolean;
      user_id?: string;
      user_name?: string;
      user_email?: string;
      active_organization_id?: string;
      workspace_id: string;
      workspace_name?: string;
      expires_at?: string;
    }>('/me'),

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
