"use client";

import { DocsLayout } from "@/components/DocsLayout";
import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/Callout";
import { TopicCard } from "@/components/FeatureCard";

const archDiagram = `Next.js 15 App (Editor · Execution Viewer · Workflow Catalog)
      │
      │ REST (OpenAPI 3.1) + SSE Streams (/v1/runs/{id}/stream)
      ▼
Go Orchestration Service (Single binary: api | worker | all)
├── api/        HTTP handlers, OpenAPI router, SSE event bus
├── graph/      Schema types, pure semantic validator, CEL compiler
├── engine/     Scheduler, step executor, state reducers, budget checks, gates
├── llm/        Provider adapters (OpenAI, Anthropic, Mock) + price registry
├── tools/      MCP client, HTTP runner with SSRF filter, built-ins
├── store/      Postgres (pgx), event stream log, durable job queue (SKIP LOCKED)
└── trace/      Projections, event narration, timeline reconstructor
      ▼
PostgreSQL 15+ (The only external state dependency)`;

export default function GettingStartedPage() {
  const toc = [
    { id: "introduction", title: "What is Weave?" },
    { id: "architecture", title: "Architecture" },
    { id: "prerequisites", title: "Prerequisites" },
    { id: "quickstart", title: "Quickstart" },
    { id: "step-1-validate", title: "1. Validate", level: 3 },
    { id: "step-2-run", title: "2. Execute locally", level: 3 },
    { id: "step-3-server", title: "3. Start API", level: 3 },
    { id: "step-4-frontend", title: "4. Launch editor", level: 3 },
    { id: "next-steps", title: "Next steps" },
  ];

  return (
    <DocsLayout
      toc={toc}
      currentSection="Get Started"
      currentPage="Quickstart"
      previousPage={{ title: "Overview", href: "/" }}
      nextPage={{ title: "Core Concepts", href: "/concepts" }}
    >
      <h1>Getting started</h1>
      <p className="text-lg !mt-0 text-muted-foreground">
        Set up, validate, and execute your first durable multi-agent workflow in a few minutes.
      </p>

      <section id="introduction">
        <h2>What is Weave?</h2>
        <p>
          Weave is a visual builder and execution engine for multi-step AI workflows.
          Instead of writing fragile scripts that lose progress if a server restarts or run up huge API bills from runaway loops, Weave gives you:
        </p>
        <ul>
          <li><strong>Visual workflow canvas</strong> — connect AI prompts, decisions, and tools without messy glue code</li>
          <li><strong>Step-by-step state saving</strong> — every step saves to Postgres so workflows can pause, resume, and recover from crashes</li>
          <li><strong>Built-in human approvals</strong> — pause before sensitive actions (like refunds or emails) until a person clicks approve</li>
          <li><strong>Hard spending limits</strong> — set strict caps on tokens, steps, time, and USD cost</li>
          <li><strong>Full execution traces</strong> — inspect every prompt, tool call, and state change in real time</li>
        </ul>
      </section>

      <section id="architecture">
        <h2>Architecture</h2>
        <p>
          Weave is split into a React/Next.js frontend and a unified Go backend backed by Postgres.
          The Go backend can run as <code>weave all</code> for development, or as separate API
          servers and worker pods in production.
        </p>
        <CodeBlock code={archDiagram} language="text" filename="System architecture" />
        <Callout type="tip" title="Local development without API keys">
          The engine includes a mock LLM adapter. You can run graphs locally with no OpenAI or
          Anthropic keys and no outbound network calls.
        </Callout>
      </section>

      <section id="prerequisites">
        <h2>Prerequisites</h2>
        <ul>
          <li>
            <strong>Go 1.23+</strong> — compile and run the orchestration engine
          </li>
          <li>
            <strong>Node.js 20+ & pnpm</strong> — visual editor
          </li>
          <li>
            <strong>PostgreSQL 15+</strong> (or Docker) — durable event storage
          </li>
        </ul>
      </section>

      <section id="quickstart">
        <h2>Quickstart</h2>
        <p>Run the bundled support triage workflow from the repository.</p>

        <div id="step-1-validate">
          <h3>1. Validate workflow semantics</h3>
          <p>
            The semantic validator checks graph reachability, edge compatibility, JSON schemas,
            reducer rules, and CEL expressions:
          </p>
          <CodeBlock
            code="go run ./cmd/weave validate examples/support_triage.json"
            language="bash"
            filename="Terminal"
          />
          <p>
            Add <code>--json</code> for machine-readable output in CI.
          </p>
        </div>

        <div id="step-2-run">
          <h3>2. Execute locally</h3>
          <p>Run in-memory with step-by-step narration:</p>
          <CodeBlock
            code={`go run ./cmd/weave run examples/support_triage.json \\
  --input '{"ticket": "Customer requesting $150 refund for defective unit"}'`}
            language="bash"
            filename="Terminal"
          />
          <Callout type="note" title="Human review gate">
            Because the refund exceeds $100, the graph branches to{" "}
            <code>manager_approval_gate</code> and enters <code>waiting_human</code>.
          </Callout>
        </div>

        <div id="step-3-server">
          <h3>3. Start the API server</h3>
          <CodeBlock
            code={`export DATABASE_URL="postgres://postgres:postgres@localhost:5432/weave?sslmode=disable"
go run ./cmd/weave serve --port 8080`}
            language="bash"
            filename="Terminal"
          />
        </div>

        <div id="step-4-frontend">
          <h3>4. Launch the visual editor</h3>
          <CodeBlock
            code={`cd frontend
pnpm install
pnpm dev`}
            language="bash"
            filename="Terminal"
          />
          <p>
            Open{" "}
            <a href="http://localhost:3000" target="_blank" rel="noreferrer">
              http://localhost:3000
            </a>{" "}
            to inspect graphs, trace runs, and resolve gates.
          </p>
        </div>
      </section>

      <section id="next-steps">
        <h2>Next steps</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <TopicCard
            href="/concepts"
            title="Core concepts"
            description="Learn about the 4 step types, passing data between steps, and setting budgets."
          />
          <TopicCard
            href="/visual-editor"
            title="Visual editor"
            description="Explore the canvas, configure nodes, and test your workflows interactively."
          />
        </div>
      </section>
    </DocsLayout>
  );
}
