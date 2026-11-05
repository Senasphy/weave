'use client';

import React from 'react';
import { DocsLayout } from '@/components/DocsLayout';
import { EndpointCard } from '@/components/EndpointCard';
import { CodeBlock } from '@/components/CodeBlock';

export default function ApiReferencePage() {
  const toc = [
    { id: 'overview', title: 'API Overview' },
    { id: 'workflows', title: 'Workflows' },
    { id: 'drafts-versions', title: 'Drafts & Versions' },
    { id: 'runs', title: 'Runs & Execution' },
    { id: 'sse-streaming', title: 'SSE Real-Time Streaming' },
    { id: 'gates', title: 'Human Review Gates' },
    { id: 'models', title: 'Model Pricing' },
    { id: 'errors', title: 'Error Handling' },
  ];

  return (
    <DocsLayout
      toc={toc}
      currentSection="Reference"
      currentPage="API"
      previousPage={{ title: "Engine", href: "/engine" }}
      nextPage={{ title: "CLI", href: "/cli" }}
    >
      <div className="space-y-10">
        <div>
          <h1>
            API Reference
          </h1>
          <p className="text-lg !mt-0 text-muted-foreground">
            The Weave HTTP server provides a RESTful OpenAPI 3.1 interface and Server-Sent Events (SSE) streaming for durable runs, drafts, versions, and gates.
          </p>
        </div>

        {/* Overview */}
        <section id="overview" className="scroll-mt-24">
          <h2>
            Base URL &amp; Conventions
          </h2>
          <div className="rounded-lg border border-border bg-card p-4 font-mono text-sm">
            <div className="text-muted-foreground">Base Development URL:</div>
            <div className="text-foreground">http://localhost:8080/v1</div>
          </div>
          <p>
            All request bodies must use <code>Content-Type: application/json</code>. All responses return JSON payloads with standard HTTP status codes. Real-time event streaming uses standard <code>text/event-stream</code>.
          </p>
        </section>

        {/* Workflows */}
        <section id="workflows" className="scroll-mt-24">
          <h2>
            Workflows
          </h2>
          <p className="text-muted-foreground">
            Create and inspect workflow containers.
          </p>

          <EndpointCard
            method="GET"
            path="/workflows"
            summary="List workflows"
            description="Retrieve an array of all workflows in the current workspace."
            responseBody={`[
  {
    "id": "wf_support_triage",
    "workspace_id": "ws_default",
    "name": "Customer Support Triage",
    "description": "Multi-agent tier-1 and refund routing",
    "created_at": "2026-10-15T05:00:00Z",
    "updated_at": "2026-10-15T05:30:00Z"
  }
]`}
            statusCodes={[{ code: 200, description: 'Success' }]}
          />

          <EndpointCard
            method="POST"
            path="/workflows"
            summary="Create a new workflow"
            description="Scaffolds a new empty workflow container with initial draft graph."
            requestBody={`{
  "name": "Lead Enrichment Pipeline",
  "description": "Enriches inbound leads using Hunter & LinkedIn tools",
  "workspace_id": "ws_default"
}`}
            responseBody={`{
  "id": "wf_lead_enrichment",
  "workspace_id": "ws_default",
  "name": "Lead Enrichment Pipeline",
  "created_at": "2026-10-15T06:00:00Z",
  "updated_at": "2026-10-15T06:00:00Z"
}`}
            statusCodes={[{ code: 201, description: 'Created' }, { code: 400, description: 'Invalid Name' }]}
          />

          <EndpointCard
            method="GET"
            path="/workflows/{id}"
            summary="Get workflow details"
            description="Returns metadata and current status for a specific workflow."
            parameters={[
              { name: 'id', in: 'path', required: true, type: 'string', description: 'Unique workflow ID' }
            ]}
            responseBody={`{
  "id": "wf_support_triage",
  "workspace_id": "ws_default",
  "name": "Customer Support Triage",
  "created_at": "2026-10-15T05:00:00Z",
  "updated_at": "2026-10-15T05:30:00Z"
}`}
            statusCodes={[{ code: 200, description: 'Success' }, { code: 404, description: 'Workflow Not Found' }]}
          />
        </section>

        {/* Drafts & Versions */}
        <section id="drafts-versions" className="scroll-mt-24">
          <h2>
            Drafts, Validation &amp; Versions
          </h2>
          <p className="text-muted-foreground">
            Iterate on draft graphs, validate them against the semantic compiler, and publish immutable releases.
          </p>

          <EndpointCard
            method="GET"
            path="/workflows/{id}/draft"
            summary="Get workflow draft graph"
            description="Fetches the current mutable graph AST, node layout positions, and edge definitions."
            parameters={[
              { name: 'id', in: 'path', required: true, type: 'string', description: 'Workflow ID' }
            ]}
            responseBody={`{
  "workflow_id": "wf_support_triage",
  "nodes": [
    { "id": "agent_triage", "type": "agent", "config": { "model": "gemini-3.8-flash" } }
  ],
  "edges": [],
  "budgets": { "max_steps": 20 }
}`}
            statusCodes={[{ code: 200, description: 'Success' }]}
          />

          <EndpointCard
            method="PUT"
            path="/workflows/{id}/draft"
            summary="Update workflow draft"
            description="Saves the updated graph JSON draft. Automatically triggers syntactic validation."
            parameters={[
              { name: 'id', in: 'path', required: true, type: 'string', description: 'Workflow ID' }
            ]}
            requestBody={`{
  "nodes": [...],
  "edges": [...],
  "budgets": { "max_steps": 25, "max_tokens": 10000 }
}`}
            statusCodes={[{ code: 200, description: 'Draft Updated' }, { code: 400, description: 'Malformed JSON' }]}
          />

          <EndpointCard
            method="POST"
            path="/workflows/{id}/validate"
            summary="Validate workflow semantics"
            description="Executes pure semantic validation, checking reachability, type compatibility, and CEL formulas."
            parameters={[
              { name: 'id', in: 'path', required: true, type: 'string', description: 'Workflow ID' }
            ]}
            responseBody={`{
  "valid": true,
  "semantic_hash": "sha256:4a81bc7e8912d09...",
  "diagnostics": []
}`}
            statusCodes={[{ code: 200, description: 'Validation Completed' }]}
          />

          <EndpointCard
            method="POST"
            path="/workflows/{id}/publish"
            summary="Publish draft as immutable version"
            description="Validates draft and freezes it as version N. Unpublishable if validation errors exist."
            parameters={[
              { name: 'id', in: 'path', required: true, type: 'string', description: 'Workflow ID' }
            ]}
            responseBody={`{
  "id": "wf_support_triage",
  "version": 3,
  "semantic_hash": "sha256:4a81bc7e8912d09...",
  "published_at": "2026-10-15T06:15:00Z"
}`}
            statusCodes={[{ code: 201, description: 'Published' }, { code: 422, description: 'Validation Errors Blocked Publishing' }]}
          />
        </section>

        {/* Runs */}
        <section id="runs" className="scroll-mt-24">
          <h2>
            Runs &amp; Execution
          </h2>
          <p className="text-muted-foreground">
            Trigger, monitor, cancel, and replay executions.
          </p>

          <EndpointCard
            method="POST"
            path="/workflows/{id}/versions/{n}/runs"
            summary="Trigger workflow run"
            description="Queues a durable execution for a specific immutable workflow version."
            parameters={[
              { name: 'id', in: 'path', required: true, type: 'string', description: 'Workflow ID' },
              { name: 'n', in: 'path', required: true, type: 'integer', description: 'Version number' }
            ]}
            requestBody={`{
  "input": {
    "ticket_id": "TCK-8491",
    "user_email": "jane@example.com",
    "issue": "Requesting immediate $150 credit"
  }
}`}
            responseBody={`{
  "id": "run_01hx48a1c9e",
  "workflow_id": "wf_support_triage",
  "version": 1,
  "status": "queued",
  "created_at": "2026-10-15T06:20:00Z"
}`}
            statusCodes={[{ code: 201, description: 'Run Queued' }]}
          />

          <EndpointCard
            method="GET"
            path="/runs"
            summary="List runs"
            description="Query runs with optional status filters (running, waiting_human, completed, failed)."
            parameters={[
              { name: 'status', in: 'query', required: false, type: 'string', description: 'Filter by run status' }
            ]}
            responseBody={`[
  {
    "id": "run_01hx48a1c9e",
    "workflow_id": "wf_support_triage",
    "version": 1,
    "status": "waiting_human",
    "steps_completed": 3,
    "total_tokens": 1420,
    "total_cost_usd": 0.042
  }
]`}
            statusCodes={[{ code: 200, description: 'Success' }]}
          />

          <EndpointCard
            method="GET"
            path="/runs/{id}"
            summary="Get run details"
            description="Returns current run state, step summary, token usage, and status."
            parameters={[
              { name: 'id', in: 'path', required: true, type: 'string', description: 'Run ID' }
            ]}
            responseBody={`{
  "id": "run_01hx48a1c9e",
  "workflow_id": "wf_support_triage",
  "version": 1,
  "status": "completed",
  "state": { "ticket_priority": "urgent", "refund_approved": true },
  "output": { "ticket_status": "closed", "resolution_notes": "Refund authorized" }
}`}
            statusCodes={[{ code: 200, description: 'Success' }, { code: 404, description: 'Run Not Found' }]}
          />

          <EndpointCard
            method="POST"
            path="/runs/{id}/cancel"
            summary="Cancel in-flight run"
            description="Halts worker execution and marks the run as cancelled."
            parameters={[
              { name: 'id', in: 'path', required: true, type: 'string', description: 'Run ID' }
            ]}
            statusCodes={[{ code: 200, description: 'Run Cancelled' }]}
          />

          <EndpointCard
            method="POST"
            path="/runs/{id}/replay"
            summary="Replay historical run"
            description="Triggers deterministic replay in recorded or live_from_step mode."
            parameters={[
              { name: 'id', in: 'path', required: true, type: 'string', description: 'Run ID' }
            ]}
            requestBody={`{
  "mode": "recorded"
}`}
            responseBody={`{
  "id": "run_01hx48a1c9e_replay_1",
  "replayed_from": "run_01hx48a1c9e",
  "status": "completed"
}`}
            statusCodes={[{ code: 200, description: 'Replay Initiated' }]}
          />
        </section>

        {/* SSE Streaming */}
        <section id="sse-streaming" className="scroll-mt-24">
          <div >
            <h2>
              SSE Real-Time Event Streaming
            </h2>
          </div>
          <p>
            The frontend connects to <code>/v1/runs/{'{id}'}/stream</code> using Server-Sent Events (SSE). As background workers emit events, they are pushed immediately across open HTTP streams.
          </p>

          <EndpointCard
            method="GET"
            path="/runs/{id}/stream"
            summary="Stream run events in real time"
            description="Establishes an HTTP text/event-stream connection to listen for real-time node executions, tool logs, and gate updates."
            parameters={[
              { name: 'id', in: 'path', required: true, type: 'string', description: 'Run ID' }
            ]}
            statusCodes={[{ code: 200, description: 'SSE Stream Opened' }]}
          />

          <CodeBlock
            code={`// Client-side SSE consumption example
const eventSource = new EventSource('http://localhost:8080/v1/runs/run_01hx48a1c9e/stream');

eventSource.onmessage = (event) => {
  const payload = JSON.parse(event.data);
  console.log('Event received:', payload.seq, payload.type, payload.data);
};

eventSource.addEventListener('run.completed', (e) => {
  console.log('Run finished successfully!');
  eventSource.close();
});`}
            language="javascript"
            filename="Client SSE Consumer"
          />
        </section>

        {/* Gates */}
        <section id="gates" className="scroll-mt-24">
          <h2>
            Human Review Gates
          </h2>
          <p className="text-muted-foreground">
            List pending review requests and submit decisions race-safely.
          </p>

          <EndpointCard
            method="GET"
            path="/gates"
            summary="List pending human gates"
            description="Queries all gates currently awaiting reviewer input."
            parameters={[
              { name: 'status', in: 'query', required: false, type: 'string', description: 'Gate status (default: waiting)' }
            ]}
            responseBody={`[
  {
    "id": "gate_89a1bf0",
    "run_id": "run_01hx48a1c9e",
    "node_id": "manager_approval_gate",
    "status": "waiting",
    "payload": { "customer": "Acme Corp", "refund_amount": 150 },
    "created_at": "2026-10-15T06:21:00Z"
  }
]`}
            statusCodes={[{ code: 200, description: 'Success' }]}
          />

          <EndpointCard
            method="POST"
            path="/gates/{id}/resolve"
            summary="Resolve human gate"
            description="Submit an approval, rejection, or edit decision. Optimistic locking returns 409 if already resolved."
            parameters={[
              { name: 'id', in: 'path', required: true, type: 'string', description: 'Gate ID' }
            ]}
            requestBody={`{
  "resolution": "approve",
  "reviewer": "devon@company.com",
  "notes": "Verified defect in attached photo"
}`}
            statusCodes={[
              { code: 200, description: 'Gate Resolved & Run Resumed' },
              { code: 409, description: 'Conflict: Gate was already resolved by another reviewer' }
            ]}
          />
        </section>

        {/* Model Pricing */}
        <section id="models" className="scroll-mt-24">
          <h2>
            Model Pricing Registry
          </h2>
          <EndpointCard
            method="GET"
            path="/models"
            summary="List model price table"
            description="Returns current pricing rules per 1,000,000 prompt and completion tokens used for budget calculations across Google Gemini, Anthropic, and OpenAI."
            responseBody={`[
  { "provider": "anthropic", "model": "opus-5.5", "input_per_mtok": 4.00, "output_per_mtok": 20.00 },
  { "provider": "openai", "model": "gpt-6.1-sol", "input_per_mtok": 2.00, "output_per_mtok": 10.00 },
  { "provider": "gemini", "model": "gemini-3.8-flash", "input_per_mtok": 0.75, "output_per_mtok": 3.75 },
  { "provider": "openai", "model": "o3-mini", "input_per_mtok": 0.55, "output_per_mtok": 2.20 },
  { "provider": "mock", "model": "mock-llm", "input_per_mtok": 0.00, "output_per_mtok": 0.00 }
]`}
            statusCodes={[{ code: 200, description: 'Success' }]}
          />
        </section>

        {/* Error Handling */}
        <section id="errors" className="scroll-mt-24">
          <h2>
            Error Handling
          </h2>
          <p>
            Weave adheres to the RFC 7807 Problem Details specification for structured API error reporting:
          </p>

          <CodeBlock
            code={`{
  "type": "https://weave.dev/errors/validation-failed",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Workflow draft contains 2 semantic validation errors",
  "errors": [
    {
      "node_id": "billing_agent",
      "code": "missing_output_schema",
      "message": "Agent node 'billing_agent' must declare a non-empty output_schema"
    }
  ]
}`}
            language="json"
            filename="RFC 7807 Error Response"
          />
        </section>
      </div>
    </DocsLayout>
  );
}
