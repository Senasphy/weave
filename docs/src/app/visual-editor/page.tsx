"use client";

import { DocsLayout } from "@/components/DocsLayout";
import { Callout } from "@/components/Callout";
import { Kbd } from "@/components/ui/kbd";

export default function VisualEditorPage() {
  const toc = [
    { id: "overview", title: "Overview" },
    { id: "canvas", title: "Canvas" },
    { id: "inspector", title: "Inspector" },
    { id: "outline-view", title: "Outline view" },
    { id: "keyboard-shortcuts", title: "Shortcuts" },
  ];

  return (
    <DocsLayout
      toc={toc}
      currentSection="Reference"
      currentPage="Visual Editor"
      previousPage={{ title: "CLI", href: "/cli" }}
      nextPage={{ title: "Cloud Platform", href: "/deployment" }}
    >
      <h1>Visual editor</h1>
      <p className="text-lg !mt-0 text-muted-foreground">
        Design workflows on an interactive visual canvas with live error checking, step inspector, and full keyboard navigation.
      </p>

      <section id="overview">
        <h2>Canvas overview</h2>
        <p>
          The visual editor provides an intuitive drag-and-drop workspace for building multi-step AI workflows. It allows you to visualize branches, connect outputs to inputs, and test steps interactively.
        </p>
      </section>

      <section id="canvas">
        <h2>Connecting steps on the canvas</h2>
        <p>The canvas supports the four primary step types:</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Agent", desc: "AI prompt & tools" },
            { label: "Gate", desc: "Human approval" },
            { label: "Router", desc: "If / Else branching" },
            { label: "Parallel", desc: "Concurrent branches" }
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border px-3 py-3 text-center">
              <div className="text-sm font-semibold text-foreground">{item.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="inspector">
        <h2>Step inspector</h2>
        <p>
          Selecting any node opens the inspector panel on the right. Here you can configure:
        </p>
        <ul>
          <li><strong>Model config</strong>: provider (Gemini, Claude, GPT, Mock), model name, and temperature.</li>
          <li><strong>System prompt</strong>: clear instructions and contextual guidelines for the AI agent.</li>
          <li><strong>Tools</strong>: enable specific tools like web search or internal HTTP APIs.</li>
          <li><strong>Output schema</strong>: specify required JSON fields for reliable structured data extraction.</li>
        </ul>
        <Callout type="tip" title="Live error checking">
          As you edit, Weave automatically validates connections, expressions, and schemas in the background, displaying helpful remediation hints right next to the affected fields.
        </Callout>
      </section>

      <section id="outline-view">
        <h2>Outline view</h2>
        <p>
          For linear navigation and screen readers, the outline tree exposes every canvas
          operation: adding nodes, connecting edges, configuring tools, and resolving gates.
        </p>
      </section>

      <section id="keyboard-shortcuts">
        <h2>Keyboard shortcuts</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table>
            <thead>
              <tr>
                <th>Shortcut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <Kbd>⌘</Kbd> <Kbd>K</Kbd>
                </td>
                <td>Search / quick switch</td>
              </tr>
              <tr>
                <td>
                  <Kbd>Tab</Kbd> / <Kbd>⇧ Tab</Kbd>
                </td>
                <td>Cycle canvas nodes in topological order</td>
              </tr>
              <tr>
                <td>
                  <Kbd>⌘</Kbd> <Kbd>S</Kbd>
                </td>
                <td>Save draft</td>
              </tr>
              <tr>
                <td>
                  <Kbd>⌘</Kbd> <Kbd>Enter</Kbd>
                </td>
                <td>Validate and publish</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </DocsLayout>
  );
}
