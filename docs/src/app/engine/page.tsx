"use client";

import { DocsLayout } from "@/components/DocsLayout";
import { CodeBlock } from "@/components/CodeBlock";

export default function EnginePage() {
  const toc = [
    { id: "execution-semantics", title: "Execution" },
    { id: "turn-loop", title: "Turn loop", level: 3 },
    { id: "event-sourcing", title: "Event sourcing" },
    { id: "event-types-table", title: "Event types", level: 3 },
    { id: "human-gates", title: "Human gates" },
    { id: "gate-lifecycle", title: "Gate lifecycle", level: 3 },
    { id: "cel-expressions", title: "CEL" },
    { id: "replay", title: "Replay" },
    { id: "crash-recovery", title: "Crash recovery" },
  ];

  return (
    <DocsLayout
      toc={toc}
      currentSection="Engine"
      currentPage="Execution"
      previousPage={{ title: "Core Concepts", href: "/concepts" }}
      nextPage={{ title: "API Reference", href: "/api-reference" }}
    >
      <h1>Engine and execution</h1>
      <p className="text-lg !mt-0 text-muted-foreground">
        How the Weave Go engine runs steps, saves progress, pauses for human approval, and recovers from crashes.
      </p>

      <section id="execution-semantics">
        <h2>How steps execute</h2>
        <p>
          Weave executes workflows step by step. The engine schedules each step as soon as its prerequisite steps finish, keeping an immutable log in durable cloud storage.
        </p>
        <div id="turn-loop">
          <h3>The agent step execution cycle</h3>
          <p>
            When an AI agent step runs, it follows a clean, predictable cycle:
          </p>
          <ol>
            <li>
              <strong>Assemble prompt</strong>: combines the system instructions with incoming data from previous steps.
            </li>
            <li>
              <strong>Check spending caps</strong>: verifies that remaining tokens, cost, and time are within your declared budget.
            </li>
            <li>
              <strong>Call the LLM</strong>: invokes the selected provider (Gemini, Claude, GPT, or local Mock).
            </li>
            <li>
              <strong>Execute tools</strong>: if the model requests tools (e.g. web search), runs them with network safety checks.
            </li>
            <li>
              <strong>Validate schema</strong>: ensures the output matches your requested JSON format. If invalid, re-prompts boundedly.
            </li>
            <li>
              <strong>Save step output</strong>: writes the result to shared state and durable storage, then triggers the next steps.
            </li>
          </ol>
        </div>
      </section>

      <section id="event-sourcing">
        <h2>Step-by-step progress logging</h2>
        <p>
          Weave logs every action as an append-only event in durable storage rather than overwriting mutable records. This design provides three major guarantees:
        </p>
        <ul>
          <li><strong>Auditability:</strong> You can inspect every prompt, tool call, latency, and cost for any run in history.</li>
          <li><strong>Crash resilience:</strong> If a server restarts or a worker crashes, the engine resumes from the last completed step without duplicating external actions.</li>
          <li><strong>Zero-resource pauses:</strong> When waiting on a human approval, all memory and worker threads are released. The workflow safely pauses for days without consuming server resources.</li>
        </ul>
        <div id="event-types-table">
          <h3>Event type registry</h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Phase</th>
                  <th>Payload</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>run.started</code>
                  </td>
                  <td>Lifecycle</td>
                  <td>Workflow version, initial input, actor</td>
                </tr>
                <tr>
                  <td>
                    <code>step.scheduled</code>
                  </td>
                  <td>Scheduling</td>
                  <td>Node ID, resolved input, dependencies</td>
                </tr>
                <tr>
                  <td>
                    <code>step.started</code>
                  </td>
                  <td>Lease</td>
                  <td>Worker host ID, lease expiry</td>
                </tr>
                <tr>
                  <td>
                    <code>tool.requested</code>
                  </td>
                  <td>Execution</td>
                  <td>Tool name, parameters, call ID</td>
                </tr>
                <tr>
                  <td>
                    <code>tool.responded</code>
                  </td>
                  <td>Execution</td>
                  <td>Call ID, output, latency_ms</td>
                </tr>
                <tr>
                  <td>
                    <code>step.succeeded</code>
                  </td>
                  <td>Execution</td>
                  <td>Output, state delta, tokens, cost</td>
                </tr>
                <tr>
                  <td>
                    <code>step.failed</code>
                  </td>
                  <td>Execution</td>
                  <td>Error code, message, retry attempt</td>
                </tr>
                <tr>
                  <td>
                    <code>gate.waiting</code>
                  </td>
                  <td>Gate</td>
                  <td>Gate ID, schema, timeout</td>
                </tr>
                <tr>
                  <td>
                    <code>gate.resolved</code>
                  </td>
                  <td>Gate</td>
                  <td>
                    Resolution (<code>approve</code>/<code>reject</code>/<code>edit</code>)
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>run.completed</code>
                  </td>
                  <td>Lifecycle</td>
                  <td>Final output, steps, tokens, USD</td>
                </tr>
                <tr>
                  <td>
                    <code>run.failed</code>
                  </td>
                  <td>Lifecycle</td>
                  <td>Abort reason and diagnostics</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="human-gates">
        <h2>Human review gates</h2>
        <p>
          When execution reaches a gate, the run moves from <code>running</code> to{" "}
          <code>waiting_human</code>.
        </p>
        <div id="gate-lifecycle">
          <h3>Lifecycle and race-safety</h3>
          <ul>
            <li>
              <strong>Zero active leases.</strong> The worker surrenders its lease immediately.
            </li>
            <li>
              <strong>Optimistic concurrency.</strong> The first valid resolution appends{" "}
              <code>gate.resolved</code>; later attempts receive <code>409 Conflict</code>.
            </li>
            <li>
              <strong>Payload editing.</strong> Edited payloads are re-validated before continuing.
            </li>
            <li>
              <strong>Timeouts.</strong> Gates never auto-approve. Timeout policy is fail or
              auto-reject.
            </li>
          </ul>
          <CodeBlock
            code={`# Resolving a gate via API
curl -X POST https://weave-orchestrator-main.vercel.app/api/v1/gates/gate_9f82bc/resolve \\
  -H "Content-Type: application/json" \\
  -d '{
    "resolution": "edit",
    "reviewer": "sarah@company.com",
    "edited_payload": { "refund_amount": 75, "reason": "Customer loyalty concession" }
  }'`}
            language="bash"
            filename="Gate resolution"
          />
        </div>
      </section>

      <section id="cel-expressions">
        <h2>CEL expressions</h2>
        <p>
          Google&apos;s Common Expression Language is a fast, non-Turing-complete evaluator. Weave
          compiles CEL during graph validation so syntax and types are checked before publish.
        </p>
        <div className="space-y-2">
          <div className="rounded-md border border-border p-3 font-mono text-xs">
            out.category == &apos;billing&apos; &amp;&amp; out.confidence &gt;= 0.90
          </div>
          <div className="rounded-md border border-border p-3 font-mono text-xs">
            state.retry_count &lt; 3 &amp;&amp; out.status == &apos;transient_error&apos;
          </div>
          <div className="rounded-md border border-border p-3 font-mono text-xs">
            {`{ 'user_id': state.user_id, 'tickets': out.items.filter(x, x.resolved == false) }`}
          </div>
        </div>
      </section>

      <section id="replay">
        <h2>Deterministic replay</h2>
        <p>
          LLM completions, tool inputs, and tool outputs are recorded as events, so historical
          executions can be replayed faithfully.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <code>recorded</code>
            <p className="!mt-1 text-sm">
              Re-fold stored events with no network calls. For debugging, audit, and regressions.
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <code>live_from_step</code>
            <p className="!mt-1 text-sm">
              Restore state up to a breakpoint, then continue with live worker calls.
            </p>
          </div>
        </div>
      </section>

      <section id="crash-recovery">
        <h2>Durable recovery &amp; automatic retries</h2>
        <p>
          Weave processes steps through an atomic, distributed queue. Each claimed step holds a durable execution lease.
        </p>
        <p>If a worker or network request times out:</p>
        <ul>
          <li>The execution lease expires safely.</li>
          <li>A healthy runner resumes the step from the last recorded checkpoint.</li>
          <li>Recorded tool and LLM events are verified before re-executing any external side effects.</li>
        </ul>
      </section>
    </DocsLayout>
  );
}
