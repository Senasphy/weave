"use client";

import { DocsLayout } from "@/components/DocsLayout";
import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/Callout";

export default function DeploymentPage() {
  const toc = [
    { id: "overview", title: "Cloud Architecture" },
    { id: "endpoints", title: "Service Endpoints" },
    { id: "durability", title: "Durable Execution" },
    { id: "security", title: "Security & Isolation" },
    { id: "webhooks", title: "API & Webhooks" },
  ];

  return (
    <DocsLayout
      toc={toc}
      currentSection="Reference"
      currentPage="Cloud Platform"
      previousPage={{ title: "Visual Editor", href: "/visual-editor" }}
    >
      <h1>Cloud Platform &amp; Architecture</h1>
      <p className="text-lg !mt-0 text-muted-foreground">
        Weave is fully hosted and managed in the cloud. Deploy multi-agent workflows with zero server management or database maintenance.
      </p>

      <section id="overview">
        <h2>Managed Cloud Architecture</h2>
        <p>
          Weave runs on distributed cloud infrastructure with automated state durability, edge delivery, and live streaming.
          You do not need to install databases, configure queue workers, or maintain server fleets.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <div className="font-medium text-foreground">Studio Web App</div>
            <p className="!mt-1 text-sm">Visual workflow builder, real-time telemetry, human gates dashboard.</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="font-medium text-foreground">Cloud Engine</div>
            <p className="!mt-1 text-sm">Validates semantics, executes agents, evaluates CEL conditions, and runs tools.</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="font-medium text-foreground">Durable State Log</div>
            <p className="!mt-1 text-sm">Append-only event checkpoints, real-time SSE broadcast, immutable run audits.</p>
          </div>
        </div>
      </section>

      <section id="endpoints">
        <h2>Official Service Endpoints</h2>
        <p>
          Weave services are mapped to production domains:
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Service</th>
                <th className="px-4 py-2 text-left font-semibold">URL</th>
                <th className="px-4 py-2 text-left font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              <tr>
                <td className="px-4 py-2.5 font-medium text-foreground">Studio Console</td>
                <td className="px-4 py-2.5 font-mono text-muted-foreground">
                  <a href="https://weave-orchestrator-main.vercel.app" target="_blank" rel="noreferrer" className="underline">
                    weave-orchestrator-main.vercel.app
                  </a>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">Visual editor, run inspection, human gate queue.</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-foreground">Documentation</td>
                <td className="px-4 py-2.5 font-mono text-muted-foreground">
                  <a href="https://weave-documentation.vercel.app" target="_blank" rel="noreferrer" className="underline">
                    weave-documentation.vercel.app
                  </a>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">Guides, core concepts, and API reference.</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-foreground">Marketing &amp; Overview</td>
                <td className="px-4 py-2.5 font-mono text-muted-foreground">
                  <a href="https://weave-orchestrator.vercel.app" target="_blank" rel="noreferrer" className="underline">
                    weave-orchestrator.vercel.app
                  </a>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">Product overview, feature benchmarks, and use cases.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="durability">
        <h2>Durable Execution &amp; Crash Recovery</h2>
        <p>
          Unlike in-memory Python scripts that forfeit execution progress if a process terminates, Weave saves immutable checkpoints after every step:
        </p>
        <ul>
          <li><strong>Step-level durability</strong>: Each finished step output is committed before triggering subsequent nodes.</li>
          <li><strong>Zero-thread pauses</strong>: Workflows waiting for human approval or external webhooks sleep safely without consuming CPU or memory.</li>
          <li><strong>Automatic failover</strong>: If an upstream model provider experiences a transient 500 error, Weave recovers from the last checkpoint rather than re-running the entire workflow.</li>
        </ul>
      </section>

      <section id="security">
        <h2>Security &amp; Network Isolation</h2>
        <p>
          Weave applies security best practices across all multi-tenant and external network integrations:
        </p>
        <ul>
          <li><strong>Encrypted credential storage</strong>: Model provider API keys (OpenAI, Anthropic, Gemini) are securely scoped to your workspace.</li>
          <li><strong>SSRF filtering</strong>: External tool calls automatically block requests to private subnets, localhost, and cloud metadata services (e.g. <code>169.254.169.254</code>).</li>
          <li><strong>Deterministic CEL evaluation</strong>: Conditional router expressions evaluate with Google CEL in a sandboxed, non-Turing complete runtime.</li>
        </ul>
      </section>

      <section id="webhooks">
        <h2>API &amp; Webhooks</h2>
        <p>
          Trigger workflow executions and stream results directly into your backend applications:
        </p>
        <CodeBlock
          code={`curl -X POST https://weave-orchestrator-main.vercel.app/api/v1/runs \\
  -H "Content-Type: application/json" \\
  -d '{
    "workflow_id": "wf_finance_review",
    "input": {
      "transaction_id": "tx_90123",
      "amount": 2500
    }
  }'`}
          language="bash"
          filename="Trigger Execution"
        />
        <Callout type="tip" title="Real-time event streaming">
          Listen to step events in real time by connecting an EventSource to <code>/api/v1/runs/:id/stream</code>.
        </Callout>
      </section>
    </DocsLayout>
  );
}
