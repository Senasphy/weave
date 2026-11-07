"use client";

import { DocsLayout } from "@/components/DocsLayout";
import { CodeBlock } from "@/components/CodeBlock";

export default function CliReferencePage() {
  const toc = [
    { id: "overview", title: "Overview" },
    { id: "validate", title: "validate" },
    { id: "run", title: "run" },
    { id: "serve-worker", title: "serve & worker" },
    { id: "all", title: "all" },
    { id: "env-vars", title: "Environment" },
  ];

  return (
    <DocsLayout
      toc={toc}
      currentSection="Reference"
      currentPage="CLI"
      previousPage={{ title: "API Reference", href: "/api-reference" }}
      nextPage={{ title: "Visual Editor", href: "/visual-editor" }}
    >
      <h1>CLI reference</h1>
      <p className="text-lg !mt-0 text-muted-foreground">
        The <code>weave</code> binary validates workflows, runs them offline, serves the REST/SSE
        API, and processes the durable queue.
      </p>

      <section id="overview">
        <h2>Commands</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table>
            <thead>
              <tr>
                <th>Command</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>weave validate &lt;file&gt;</code>
                </td>
                <td>Semantic validator, schema lint, semantic hash.</td>
              </tr>
              <tr>
                <td>
                  <code>weave run &lt;file&gt;</code>
                </td>
                <td>In-memory execution with terminal narration. No database.</td>
              </tr>
              <tr>
                <td>
                  <code>weave serve</code>
                </td>
                <td>OpenAPI HTTP server and SSE broker.</td>
              </tr>
              <tr>
                <td>
                  <code>weave worker</code>
                </td>
                <td>Background workers leasing jobs with SKIP LOCKED.</td>
              </tr>
              <tr>
                <td>
                  <code>weave all</code>
                </td>
                <td>API and workers in one process.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="validate">
        <h2>weave validate</h2>
        <p>
          Validates JSON Schema, DAG acyclicity, edge connectivity, and pre-compiles CEL.
        </p>
        <CodeBlock
          code={`weave validate <file.json> [flags]

Flags:
  --json     Output diagnostics as machine-readable JSON
  --strict   Treat warnings as validation errors`}
          language="bash"
          filename="Usage"
        />
        <CodeBlock
          code={`✓ Schema structure: VALID
✓ Graph reachability: 4/4 nodes reachable
✓ CEL expressions: 2/2 compiled successfully
✓ Reducer declarations: VALID
✓ Semantic Hash: sha256:08bf4190c4...

Workflow is valid and ready for publishing.`}
          language="text"
          filename="Validation output"
        />
      </section>

      <section id="run">
        <h2>weave run</h2>
        <p>Executes a workflow in memory with narrative traces for every step, tool call, and budget deduction.</p>
        <CodeBlock
          code={`weave run <file.json> [flags]

Flags:
  --input string      JSON string payload provided as initial workflow input
  --input-file string Path to a JSON file containing input parameters
  --mock              Force the use of the Mock LLM provider (zero API keys required)
  --verbose           Enable detailed debug logging of prompts and token math`}
          language="bash"
          filename="Usage"
        />
        <CodeBlock
          code={`$ weave run examples/support_triage.json --input '{"ticket": "Refund request"}'

[11:00:01] RUN_STARTED run_01hx4 (workflow=customer_support_triage v1)
[11:00:01] STEP_STARTED node=classify_ticket model=gemini-3.8-flash
[11:00:02] STEP_SUCCEEDED node=classify_ticket (turns=1, tokens=340, cost=$0.0015)
           Output: {"category": "billing", "refund_amount": 150}
[11:00:02] ROUTER_EVALUATED node=check_threshold -> matched edge to manager_approval_gate
[11:00:02] GATE_WAITING node=manager_approval_gate (timeout=24h)
           Execution suspended. Awaiting human resolution.`}
          language="text"
          filename="Terminal narration"
        />
      </section>

      <section id="serve-worker">
        <h2>weave serve and weave worker</h2>
        <p>In production, scale the HTTP API and workers independently.</p>
        <h3>weave serve</h3>
        <CodeBlock
          code={`weave serve --port 8080 --host 0.0.0.0

Flags:
  --port int    Port to listen on (default 8080, or env PORT)
  --host string Bind host (default "0.0.0.0")`}
          language="bash"
          filename="Serve"
        />
        <h3>weave worker</h3>
        <CodeBlock
          code={`weave worker --concurrency 8 --poll-interval 250ms

Flags:
  --concurrency int      Number of concurrent step workers (default 4)
  --poll-interval string Polling interval for queued leases (default "500ms")`}
          language="bash"
          filename="Worker"
        />
      </section>

      <section id="all">
        <h2>weave all</h2>
        <p>Runs API and workers in one process. Useful for local development and small deployments.</p>
        <CodeBlock code="weave all --port 8080" language="bash" filename="All-in-one" />
      </section>

      <section id="env-vars">
        <h2>Environment variables</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table>
            <thead>
              <tr>
                <th>Variable</th>
                <th>Required</th>
                <th>Default</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>DATABASE_URL</code>
                </td>
                <td>Yes</td>
                <td>None</td>
                <td>PostgreSQL connection string.</td>
              </tr>
              <tr>
                <td>
                  <code>PORT</code>
                </td>
                <td>No</td>
                <td>8080</td>
                <td>HTTP listen port.</td>
              </tr>
              <tr>
                <td>
                  <code>OPENAI_API_KEY</code>
                </td>
                <td>No</td>
                <td>None</td>
                <td>OpenAI API key for gpt-6.1-sol, gpt-6-astra, o3, and o3-mini nodes.</td>
              </tr>
              <tr>
                <td>
                  <code>ANTHROPIC_API_KEY</code>
                </td>
                <td>No</td>
                <td>None</td>
                <td>Anthropic API key for Opus 5.5, Sonnet 5.5, and Claude 4 nodes.</td>
              </tr>
              <tr>
                <td>
                  <code>GEMINI_API_KEY</code>
                </td>
                <td>No</td>
                <td>None</td>
                <td>Google AI Studio API key for Gemini 3.8 Flash and 3.1 Pro nodes.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </DocsLayout>
  );
}
