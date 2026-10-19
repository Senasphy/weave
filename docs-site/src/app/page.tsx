"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DocsLayout } from "@/components/DocsLayout";
import { FoundationsCard } from "@/components/FeatureCard";
import { CodeBlock } from "@/components/CodeBlock";
import { WeaveLogo } from "@/components/WeaveLogo";

const sampleWorkflowJson = `{
  "id": "customer_support_triage",
  "name": "Customer Support Triage",
  "version": 1,
  "nodes": [
    {
      "id": "classify_ticket",
      "type": "agent",
      "config": {
        "model": "gemini-3.8-flash",
        "system_prompt": "Classify incoming support request and extract refund amount.",
        "output_schema": { "type": "object", "required": ["category", "refund_amount"] }
      }
    },
    {
      "id": "check_threshold",
      "type": "router",
      "config": {
        "rules": [
          { "condition": "out.refund_amount > 100", "target": "manager_approval_gate" },
          { "condition": "out.refund_amount <= 100", "target": "auto_refund" }
        ]
      }
    },
    {
      "id": "manager_approval_gate",
      "type": "gate",
      "config": {
        "timeout_seconds": 86400,
        "on_timeout": "fail"
      }
    }
  ],
  "budgets": {
    "max_steps": 25,
    "max_cost_usd": 0.50,
    "max_tokens": 8000
  }
}`;

export default function DocsHomePage() {
  const toc = [
    { id: "overview", title: "Overview" },
    { id: "foundations", title: "Foundations" },
    { id: "workflow-anatomy", title: "Workflow anatomy" },
    { id: "reference", title: "Reference" },
  ];

  return (
    <DocsLayout
      toc={toc}
      currentPage="Overview"
      nextPage={{ title: "Getting Started", href: "/getting-started" }}
    >
      {/* Hero Banner */}
      <section id="overview" className="scroll-mt-28">
        <div className="relative mb-10 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Subtle atmospheric ambient glow & perspective grid */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* Top-right ambient radial glow */}
            <div
              className="absolute -right-20 -top-20 h-[380px] w-[380px] rounded-full opacity-40 blur-3xl dark:opacity-25"
              style={{
                background:
                  "radial-gradient(circle, rgba(99, 102, 241, 0.5) 0%, rgba(168, 85, 247, 0.25) 50%, transparent 70%)",
              }}
            />

            {/* Fine architectural technical grid */}
            <svg
              className="absolute right-0 top-0 h-full w-full opacity-[0.06] dark:opacity-[0.14]"
              xmlns="http://www.w3.org/2000/svg"
              width="100%"
              height="100%"
            >
              <defs>
                <pattern id="heroGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1" />
                </pattern>
                <linearGradient id="fadeMask" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="black" stopOpacity="0" />
                  <stop offset="60%" stopColor="black" stopOpacity="1" />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#heroGrid)" mask="url(#fadeMask)" />
            </svg>

            {/* Subtle technical brand mark watermark */}
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden md:block opacity-[0.06] dark:opacity-[0.12] pointer-events-none select-none">
              <WeaveLogo variant="mark" className="h-64 w-auto" />
            </div>
          </div>

          {/* Hero Content Overlay */}
          <div className="relative z-10 px-6 py-10 sm:px-9 sm:py-12 max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Build and run reliable AI workflows
            </h1>

            <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
              Weave lets you visually build, test, and run multi-step AI workflows. Connect LLM
              prompts, tools, conditional branches, and human approvals — with strict spending caps
              and full step-by-step execution history.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/getting-started"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md !bg-foreground !text-background px-4 text-xs font-semibold shadow-sm transition-opacity hover:opacity-90 !no-underline"
              >
                Get started
                <ArrowRight className="h-3.5 w-3.5 !text-background" />
              </Link>
              <Link
                href="/visual-editor"
                className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-4 text-xs font-medium !text-foreground !no-underline transition-colors hover:bg-accent hover:!text-accent-foreground"
              >
                Visual editor guide
              </Link>
            </div>
          </div>
        </div>

        <p className="text-[14px] leading-relaxed text-muted-foreground">
          Writing complex AI systems in custom scripts often leads to lost state on restarts, runaway
          API bills, and unpredictable outputs. Weave gives you a visual editor to design workflows,
          a fast Go engine that runs them reliably step by step, and a unified dashboard to review
          traces and approve critical actions.
        </p>
      </section>

      {/* Core Capabilities */}
      <section id="foundations" className="mt-12 scroll-mt-28">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Core capabilities</h2>
        <p className="mt-1 mb-5 text-[13.5px] text-muted-foreground">
          Everything you need to run AI workflows in production safely.
        </p>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <FoundationsCard
            href="/visual-editor"
            kicker="VISUAL CANVAS"
            title="Design Workflows Visually"
            description="Drag and drop AI steps, conditions, and tool integrations on an interactive canvas, or edit clean JSON directly."
          />
          <FoundationsCard
            href="/engine"
            kicker="STEP-BY-STEP LOGGING"
            title="Resumable & Crash-Safe"
            description="Every step logs its input and output to Postgres. If a worker dies or a server restarts, the workflow resumes seamlessly."
          />
          <FoundationsCard
            href="/engine#human-gates"
            kicker="HUMAN IN THE LOOP"
            title="Human Approvals"
            description="Pause workflows before taking sensitive actions like issuing refunds or sending emails until a human reviews and approves."
          />
          <FoundationsCard
            href="/concepts#budgets"
            kicker="SAFETY LIMITS"
            title="Strict Cost & Token Caps"
            description="Set hard limits on tokens, steps, time, and estimated dollar costs so accidental loops never generate huge bills."
          />
        </div>
      </section>

      {/* How a Workflow Works */}
      <section id="workflow-anatomy" className="mt-12 scroll-mt-28">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Example: Customer Support Triage</h2>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Every workflow is represented as a clean, structured JSON file that you can edit in the visual canvas or in code. Here is how a simple support triage flow works:
        </p>

        <div className="mt-4 mb-6 grid gap-2.5 sm:grid-cols-4 text-xs">
          <div className="rounded-lg border border-border p-3 bg-card">
            <span className="font-semibold text-foreground">1. AI Classifier</span>
            <p className="mt-1 text-muted-foreground">Reads the incoming ticket and extracts the refund amount into structured JSON.</p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <span className="font-semibold text-foreground">2. Router Rule</span>
            <p className="mt-1 text-muted-foreground">Checks if refund &gt; $100. If yes, sends to human approval. Otherwise, auto-refunds.</p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <span className="font-semibold text-foreground">3. Human Review</span>
            <p className="mt-1 text-muted-foreground">Pauses the flow and notifies a manager to approve, reject, or edit the amount.</p>
          </div>
          <div className="rounded-lg border border-border p-3 bg-card">
            <span className="font-semibold text-foreground">4. Hard Budgets</span>
            <p className="mt-1 text-muted-foreground">Enforces a strict $0.50 spending cap and 8,000 max tokens to prevent runaway costs.</p>
          </div>
        </div>

        <CodeBlock
          code={sampleWorkflowJson}
          language="json"
          filename="examples/support_triage.json"
          showLineNumbers
        />
      </section>

      {/* Reference Links Section */}
      <section id="reference" className="mt-12 scroll-mt-28">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Reference</h2>
        <p className="mt-1 mb-5 text-[13.5px] text-muted-foreground">
          Essential tools, CLI binaries, and OpenAPI specifications.
        </p>

        <div className="grid gap-3.5 sm:grid-cols-3">
          <FoundationsCard
            href="/getting-started"
            kicker="GETTING STARTED"
            title="Quickstart Guide"
            description="Install the Go binary, validate schemas, and run a local test in 2 minutes."
          />
          <FoundationsCard
            href="/api-reference"
            kicker="REST & SSE"
            title="API Reference"
            description="OpenAPI 3.1 endpoints, live SSE event streaming, and gate resolution."
          />
          <FoundationsCard
            href="/cli"
            kicker="CLI UTILITY"
            title="Weave CLI"
            description="Validate, run, serve, and worker commands bundled into a single binary."
          />
        </div>
      </section>
    </DocsLayout>
  );
}
