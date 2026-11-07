"use client";

import { DocsLayout } from "@/components/DocsLayout";
import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/Callout";
import { TopicCard } from "@/components/FeatureCard";

const cloudArchDiagram = `Weave Studio (Web Console at weave-orchestrator-main.vercel.app)
      │
      │ HTTPS REST (OpenAPI 3.1) + Real-Time SSE Streams
      ▼
Weave Managed Cloud Engine
├── Visual Graph Compiler & Pure Semantic Validator
├── Multi-Provider Model Hub (Gemini, Claude, GPT, Mock)
├── Hard Spending Limiter (Tokens, Cost, Wall-Clock, Steps)
├── Human Approval Gate Coordinator
├── Sandboxed CEL Router & Reducer Pipeline
└── Durable Checkpoint & Execution Event Stream`;

export default function GettingStartedPage() {
  const toc = [
    { id: "introduction", title: "What is Weave?" },
    { id: "architecture", title: "Cloud Architecture" },
    { id: "prerequisites", title: "Prerequisites" },
    { id: "quickstart", title: "Quickstart" },
    { id: "step-1-studio", title: "1. Open Studio", level: 3 },
    { id: "step-2-keys", title: "2. Configure Providers", level: 3 },
    { id: "step-3-workflow", title: "3. Build Workflow", level: 3 },
    { id: "step-4-execute", title: "4. Run & Monitor", level: 3 },
    { id: "step-5-gates", title: "5. Human Gates", level: 3 },
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
        Build, test, and deploy production multi-agent workflows in the cloud with zero infrastructure setup.
      </p>

      <section id="introduction">
        <h2>What is Weave?</h2>
        <p>
          Weave is a hosted visual builder and execution platform for multi-step AI workflows.
          Instead of writing fragile scripts that lose state on server restarts or rack up runaway API bills from infinite loops, Weave gives you:
        </p>
        <ul>
          <li><strong>Visual workflow canvas</strong>: connect AI prompts, decisions, and tools without messy glue code</li>
          <li><strong>Durable state checkpoints</strong>: every step saves automatically so workflows can pause, resume, and recover from failures</li>
          <li><strong>Built-in human approvals</strong>: pause before sensitive actions (like refunds or outbound emails) until a person signs off</li>
          <li><strong>Hard spending limits</strong>: set strict caps on tokens, steps, execution time, and USD cost</li>
          <li><strong>Full execution traces</strong>: inspect every prompt, tool call, and state change in real time via live streaming</li>
        </ul>
      </section>

      <section id="architecture">
        <h2>Cloud Architecture</h2>
        <p>
          Weave runs as a fully managed cloud platform. Workflows execute in an isolated, sandboxed runtime with automatic durable checkpoints and live event streaming.
        </p>
        <CodeBlock code={cloudArchDiagram} language="text" filename="Cloud platform architecture" />
        <Callout type="tip" title="Testing without API keys">
          The platform includes a built-in mock LLM provider. You can test and validate workflow graphs immediately with zero external API costs.
        </Callout>
      </section>

      <section id="prerequisites">
        <h2>Prerequisites</h2>
        <ul>
          <li>
            <strong>Web Browser</strong>: Chrome, Safari, Edge, or Firefox to access the visual studio
          </li>
          <li>
            <strong>API Keys (Optional)</strong>: Google AI Studio (Gemini), Anthropic (Claude), or OpenAI keys for live model execution
          </li>
          <li>
            <strong>Weave Account</strong>: sign in at{" "}
            <a href="https://weave-orchestrator-main.vercel.app" target="_blank" rel="noreferrer">
              weave-orchestrator-main.vercel.app
            </a>
          </li>
        </ul>
      </section>

      <section id="quickstart">
        <h2>Quickstart</h2>
        <p>Follow these steps to launch and execute your first workflow in Weave Cloud.</p>

        <div id="step-1-studio">
          <h3>1. Open Weave Studio</h3>
          <p>
            Navigate to{" "}
            <a href="https://weave-orchestrator-main.vercel.app" target="_blank" rel="noreferrer" className="font-medium text-foreground underline">
              weave-orchestrator-main.vercel.app
            </a>{" "}
            and sign in. You will land directly in your workspace console with instant access to the visual canvas, run history, and human approval queue.
          </p>
        </div>

        <div id="step-2-keys">
          <h3>2. Configure Model Providers</h3>
          <p>
            Go to <strong>Settings</strong> to connect your model providers. Weave supports Google Gemini, Anthropic Claude, and OpenAI models. If you prefer to test workflows without spending tokens, select the built-in <code>mock</code> provider.
          </p>
        </div>

        <div id="step-3-workflow">
          <h3>3. Build or Select a Workflow</h3>
          <p>
            On the <strong>Workflows</strong> page, click <strong>Create workflow</strong> or choose the bundled <strong>Support Triage</strong> starter template. You can drag and drop nodes, configure prompts in the right-hand Inspector, and specify type-safe JSON schemas.
          </p>
          <Callout type="note" title="Automatic semantic validation">
            As you edit, Weave continuously validates graph reachability, edge compatibility, and CEL expressions to ensure your workflow is structurally sound before publishing.
          </Callout>
        </div>

        <div id="step-4-execute">
          <h3>4. Run and Monitor</h3>
          <p>
            Click <strong>Run</strong> in the visual editor to trigger execution interactively, or invoke your workflow via the Cloud REST API:
          </p>
          <CodeBlock
            code={`curl -X POST https://weave-orchestrator-main.vercel.app/api/v1/runs \\
  -H "Content-Type: application/json" \\
  -d '{
    "workflow_id": "wf_support_triage",
    "input": {
      "ticket": "Customer requesting $150 refund for defective unit"
    }
  }'`}
            language="bash"
            filename="Terminal / HTTP Client"
          />
          <p>
            Execution streams live events directly to your screen, displaying budget consumption (tokens, cost, wall-clock time) and step outputs in real time.
          </p>
        </div>

        <div id="step-5-gates">
          <h3>5. Review Human Approval Gates</h3>
          <p>
            When a workflow hits a sensitive threshold (such as a refund exceeding $100), execution safely suspends at a Human Gate. Visit the <strong>Approvals</strong> page (`/gates`) to inspect the pending payload and approve, reject, or edit the transition.
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
