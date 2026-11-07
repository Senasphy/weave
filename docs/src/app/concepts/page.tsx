"use client";

import { DocsLayout } from "@/components/DocsLayout";
import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/Callout";

export default function ConceptsPage() {
  const toc = [
    { id: "workflow-graphs", title: "Workflow graphs" },
    { id: "node-types", title: "Node types" },
    { id: "agent-node", title: "Agent", level: 3 },
    { id: "gate-node", title: "Gate", level: 3 },
    { id: "router-node", title: "Router", level: 3 },
    { id: "fan-out-join", title: "Fan-out & join", level: 3 },
    { id: "edge-routing", title: "Edge routing" },
    { id: "state-reducers", title: "State & reducers" },
    { id: "budgets", title: "Budgets" },
  ];

  return (
    <DocsLayout
      toc={toc}
      currentSection="Foundations"
      currentPage="Concepts"
      previousPage={{ title: "Getting Started", href: "/getting-started" }}
      nextPage={{ title: "Engine", href: "/engine" }}
    >
      <h1>Core concepts</h1>
      <p className="text-lg !mt-0 text-muted-foreground">
        Learn how workflows, step types, data passing, and spending limits work in Weave.
      </p>

      <section id="workflow-graphs">
        <h2>How workflows work</h2>
        <p>
          A workflow is a series of connected steps that run in order. You start with an entry step
          (such as receiving a customer ticket or processing a file) and connect it to AI agents,
          conditional checks, and human review steps.
        </p>
        <p>
          When you publish a workflow, Weave validates that all connections and schemas are correct
          and gives it a version number. Moving nodes around on the visual canvas won&apos;t trigger
          an unnecessary new version: only changes to prompts, models, rules, or connections will.
        </p>
      </section>

      <section id="node-types">
        <h2>The 4 step types</h2>
        <p>You can build any workflow by combining four simple step types:</p>

        <div id="agent-node" className="scroll-mt-24 rounded-lg border border-border p-5">
          <h3 className="!mt-0">1. AI Agent</h3>
          <p className="font-mono text-xs text-muted-foreground">type: &quot;agent&quot;</p>
          <p>
            Calls an LLM with your prompt instructions. It can use tools (like web search or external
            APIs) and guarantees its final response matches the JSON schema you expect.
          </p>
          <ul>
            <li>
              <strong>Model selection</strong>: choose any supported model (Gemini, Claude, GPT, or a local mock for zero-cost testing).
            </li>
            <li>
              <strong>Tool access</strong>: grant access to safe tools or HTTP endpoints.
            </li>
            <li>
              <strong>Structured output</strong>: automatically validates that the AI output adheres to your requested fields.
            </li>
          </ul>
          <CodeBlock
            code={`{
  "id": "researcher",
  "type": "agent",
  "config": {
    "model": "gemini-3.8-flash",
    "system_prompt": "You are a research analyst. Summarize findings and extract key metrics.",
    "tools": ["web_search"],
    "output_schema": {
      "type": "object",
      "required": ["summary", "citations", "sentiment"],
      "properties": {
        "summary": { "type": "string" },
        "citations": { "type": "array", "items": { "type": "string" } },
        "sentiment": { "type": "string", "enum": ["bullish", "neutral", "bearish"] }
      }
    }
  }
}`}
            language="json"
            filename="Agent step"
          />
        </div>

        <div id="gate-node" className="mt-4 scroll-mt-24 rounded-lg border border-border p-5">
          <h3 className="!mt-0">2. Human Approval Gate</h3>
          <p className="font-mono text-xs text-muted-foreground">type: &quot;gate&quot;</p>
          <p>
            Pauses the workflow and waits for a human to review and sign off before high-stakes
            actions (like issuing refunds, sending emails, or executing external changes).
          </p>
          <ul>
            <li>
              <strong>Resource-safe</strong>: the workflow safely releases compute resources while waiting; no workers stay blocked.
            </li>
            <li>
              <strong>Three resolution options</strong>: a reviewer can <code>approve</code>, <code>reject</code>, or <code>edit</code> the data.
            </li>
            <li>
              <strong>Timeouts</strong>: set an expiration time (e.g., 24 hours) with a fallback policy if no one responds.
            </li>
          </ul>
        </div>

        <div id="router-node" className="mt-4 scroll-mt-24 rounded-lg border border-border p-5">
          <h3 className="!mt-0">3. Conditional Router (If / Else)</h3>
          <p className="font-mono text-xs text-muted-foreground">type: &quot;router&quot;</p>
          <p>
            Inspects data from previous steps and chooses which path the workflow should follow next.
          </p>
          <CodeBlock
            code={`{
  "id": "triage_router",
  "type": "router",
  "config": {
    "mode": "first_match",
    "rules": [
      { "condition": "out.priority == 'urgent' && out.tier == 'enterprise'", "target": "pagerduty_alert" },
      { "condition": "out.priority == 'urgent'", "target": "senior_support" },
      { "condition": "true", "target": "standard_queue" }
    ]
  }
}`}
            language="json"
            filename="Router step"
          />
        </div>

        <div id="fan-out-join" className="mt-4 scroll-mt-24 rounded-lg border border-border p-5">
          <h3 className="!mt-0">4. Parallel Execution &amp; Join</h3>
          <p className="font-mono text-xs text-muted-foreground">
            type: &quot;fan_out&quot; &amp; &quot;join&quot;
          </p>
          <p>
            Runs multiple independent steps simultaneously (like searching three databases at once)
            and then waits to combine their results:
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border p-3">
              <div className="font-medium text-foreground">wait_all</div>
              <p className="!mt-1 text-sm text-muted-foreground">
                Wait for all parallel branches to finish before moving forward.
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="font-medium text-foreground">fail_fast</div>
              <p className="!mt-1 text-sm text-muted-foreground">
                Stop immediately if any parallel step encounters an error.
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="font-medium text-foreground">allow_partial</div>
              <p className="!mt-1 text-sm text-muted-foreground">
                Proceed as soon as enough branches complete successfully.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="edge-routing">
        <h2>Connecting steps and conditions</h2>
        <p>Edges connect one step to another and define when the next step should run:</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border p-3">
            <span className="font-semibold text-foreground">always</span>
            <p className="!mt-1 text-sm text-muted-foreground">Runs immediately when the previous step finishes.</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <span className="font-semibold text-foreground">on_success</span>
            <p className="!mt-1 text-sm text-muted-foreground">
              Runs only if the previous step completed successfully.
            </p>
          </div>
          <div className="rounded-md border border-border p-3">
            <span className="font-semibold text-foreground">on_failure</span>
            <p className="!mt-1 text-sm text-muted-foreground">Runs only if the previous step failed (useful for fallbacks or error alerts).</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <span className="font-semibold text-foreground">when (condition)</span>
            <p className="!mt-1 text-sm text-muted-foreground">
              Runs only when a specific expression is true, such as <code>out.amount &gt; 100</code>.
            </p>
          </div>
        </div>

        <h3 className="mt-6">Passing data between steps</h3>
        <p>
          Edges can also reshape data on the fly using <code>map.to_input</code> so downstream steps receive exactly the fields they need:
        </p>
        <CodeBlock
          code={`{
  "source": "triage_agent",
  "target": "billing_agent",
  "kind": "when",
  "condition": "out.amount > 0",
  "map": {
    "to_input": "{ 'account_id': state.user_id, 'charge_amount': out.amount * 100 }"
  }
}`}
          language="json"
          filename="Data mapping example"
        />
      </section>

      <section id="state-reducers">
        <h2>Shared state</h2>
        <p>
          Workflows maintain a shared state dictionary throughout a run. When a step writes a value, it chooses how to update that key:
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table>
            <thead>
              <tr>
                <th>Strategy</th>
                <th>Applies to</th>
                <th>How it works</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>overwrite</code>
                </td>
                <td>
                  Any value
                </td>
                <td>Replaces the existing value with the new value.</td>
              </tr>
              <tr>
                <td>
                  <code>append</code>
                </td>
                <td>
                  Array
                </td>
                <td>Appends the new item to the end of the existing list.</td>
              </tr>
              <tr>
                <td>
                  <code>merge</code>
                </td>
                <td>
                  Object
                </td>
                <td>Combines keys into the existing dictionary.</td>
              </tr>
              <tr>
                <td>
                  <code>error_on_conflict</code>
                </td>
                <td>
                  Any value
                </td>
                <td>Stops the run if the key already exists with a different value.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="budgets">
        <h2>Budgets and safety limits</h2>
        <p>
          Autonomous AI agents can sometimes get stuck in loops or make excessive tool calls. Weave enforces strict limits so your workflows never run away with your budget:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border p-4">
            <span className="font-mono text-xs font-semibold text-foreground">max_cost_usd</span>
            <p className="!mt-1 text-sm text-muted-foreground">Hard cap on estimated dollar spend across LLM calls.</p>
          </div>
          <div className="rounded-md border border-border p-4">
            <span className="font-mono text-xs font-semibold text-foreground">max_tokens</span>
            <p className="!mt-1 text-sm text-muted-foreground">Total prompt and completion tokens allowed across the entire run.</p>
          </div>
          <div className="rounded-md border border-border p-4">
            <span className="font-mono text-xs font-semibold text-foreground">max_steps</span>
            <p className="!mt-1 text-sm text-muted-foreground">Maximum number of step executions before halting.</p>
          </div>
          <div className="rounded-md border border-border p-4">
            <span className="font-mono text-xs font-semibold text-foreground">max_wall_seconds</span>
            <p className="!mt-1 text-sm text-muted-foreground">Total elapsed time deadline from start to finish.</p>
          </div>
        </div>
        <Callout type="warning" title="Automatic safety cutoff">
          If any step exceeds a budget limit, Weave immediately stops the run and marks it as <code>budget_exceeded</code>, preventing further API charges.
        </Callout>
      </section>
    </DocsLayout>
  );
}
