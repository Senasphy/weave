"use client";

import React, { useState } from "react";
import { Code2, Network, Copy, Check, Terminal, ExternalLink } from "lucide-react";

const sampleWorkflow = `{
  "id": "enterprise_triage_v2",
  "name": "Enterprise Support Triage",
  "version": 2,
  "nodes": [
    {
      "id": "classify_intent",
      "type": "agent",
      "config": {
        "model": "gemini-3.8-flash",
        "system_prompt": "Classify ticket urgency and extract financial values.",
        "output_schema": {
          "type": "object",
          "required": ["urgency", "refund_requested_usd"]
        }
      }
    },
    {
      "id": "evaluate_risk",
      "type": "router",
      "config": {
        "rules": [
          { "condition": "out.refund_requested_usd > 100", "target": "manager_gate" },
          { "condition": "out.refund_requested_usd <= 100", "target": "auto_process" }
        ]
      }
    },
    {
      "id": "manager_gate",
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
    "max_tokens": 12000
  }
}`;

export function CodeShowcaseSection() {
  const [activeTab, setActiveTab] = useState<"visual" | "json">("visual");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleWorkflow);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="code-showcase" className="py-20 md:py-28 border-b border-umber-800/10 dark:border-cloud-100/10 bg-cloud-100/20 dark:bg-umber-950/20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="text-[12px] font-mono uppercase tracking-widest text-umber-500 dark:text-cloud-400 mb-3">
            06 &bull; Dual Authorship
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-[46px] font-normal leading-[1.1] tracking-tight text-umber-900 dark:text-cloud-50">
            Build visually on canvas.
            <span className="block italic text-umber-700 dark:text-cloud-200 mt-1">
              Version cleanly in Git.
            </span>
          </h2>
          <p className="mt-4 text-[16px] leading-[1.6] text-umber-600 dark:text-cloud-300">
            No proprietary lock-in. Workflows are simple, portable JSON documents backed by an authoritative JSON Schema. Edit them via our React Flow canvas or commit them straight to your repository.
          </p>
        </div>

        {/* Tab Switcher & Code Box */}
        <div className="mt-12 rounded-2xl border border-umber-800/12 dark:border-cloud-100/12 bg-cloud-50 dark:bg-umber-900 overflow-hidden shadow-card dark:shadow-card-dark">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-umber-800/10 dark:border-cloud-100/10 px-6 py-4 bg-cloud-100/50 dark:bg-umber-950/50">
            {/* View Mode Pills */}
            <div className="flex items-center gap-1.5 rounded-full border border-umber-800/10 dark:border-cloud-100/10 bg-cloud-50 dark:bg-umber-900 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("visual")}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[12px] font-medium transition-all ${
                  activeTab === "visual"
                    ? "bg-umber-900 text-cloud-50 dark:bg-cloud-50 dark:text-umber-900 shadow-2xs"
                    : "text-umber-600 dark:text-cloud-400 hover:text-umber-900 dark:hover:text-cloud-100"
                }`}
              >
                <Network className="size-3.5" />
                <span>Visual Topology</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("json")}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[12px] font-medium transition-all ${
                  activeTab === "json"
                    ? "bg-umber-900 text-cloud-50 dark:bg-cloud-50 dark:text-umber-900 shadow-2xs"
                    : "text-umber-600 dark:text-cloud-400 hover:text-umber-900 dark:hover:text-cloud-100"
                }`}
              >
                <Code2 className="size-3.5" />
                <span>Declarative JSON</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-[11px] font-mono text-umber-500 dark:text-cloud-400">
                schema/workflow.schema.json
              </span>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-md border border-umber-800/15 dark:border-cloud-100/15 bg-cloud-50 dark:bg-umber-800 px-2.5 py-1 text-[11px] font-mono text-umber-800 dark:text-cloud-100 hover:bg-umber-800/5 transition-colors"
              >
                {copied ? <Check className="size-3 text-status-live" /> : <Copy className="size-3" />}
                <span>{copied ? "Copied" : "Copy JSON"}</span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "visual" ? (
            <div className="p-8 md:p-12 relative overflow-hidden bg-cloud-50 dark:bg-umber-900">
              {/* Visual Node Diagram simulation */}
              <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 py-6">
                {/* Node 1 */}
                <div className="w-full md:w-56 p-4 rounded-xl border border-lilac-500/40 bg-lilac-500/5 dark:bg-lilac-500/10 shadow-xs text-left">
                  <div className="text-[10px] font-mono uppercase text-lilac-600 dark:text-lilac-300 mb-1">
                    AGENT NODE
                  </div>
                  <div className="font-semibold text-[14px] text-umber-900 dark:text-cloud-50">
                    classify_intent
                  </div>
                  <div className="text-[11px] font-mono text-umber-500 dark:text-cloud-400 mt-1">
                    gemini-3.8-flash
                  </div>
                </div>

                <div className="text-umber-400 dark:text-cloud-600 font-mono text-lg font-bold">
                  &rarr;
                </div>

                {/* Node 2 */}
                <div className="w-full md:w-56 p-4 rounded-xl border border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 shadow-xs text-left">
                  <div className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-300 mb-1">
                    ROUTER NODE
                  </div>
                  <div className="font-semibold text-[14px] text-umber-900 dark:text-cloud-50">
                    evaluate_risk
                  </div>
                  <div className="text-[11px] font-mono text-umber-500 dark:text-cloud-400 mt-1">
                    CEL condition
                  </div>
                </div>

                <div className="text-umber-400 dark:text-cloud-600 font-mono text-lg font-bold">
                  &rarr;
                </div>

                {/* Node 3 */}
                <div className="w-full md:w-56 p-4 rounded-xl border border-rose-500/40 bg-rose-500/5 dark:bg-rose-500/10 shadow-xs text-left">
                  <div className="text-[10px] font-mono uppercase text-rose-600 dark:text-rose-300 mb-1">
                    HUMAN GATE
                  </div>
                  <div className="font-semibold text-[14px] text-umber-900 dark:text-cloud-50">
                    manager_gate
                  </div>
                  <div className="text-[11px] font-mono text-umber-500 dark:text-cloud-400 mt-1">
                    timeout: 86400s
                  </div>
                </div>
              </div>

              <div className="text-center mt-6">
                <a
                  href="https://weave-orchestrator-main.vercel.app"
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-lilac-600 dark:text-lilac-400 hover:underline"
                >
                  <span>Open interactive visual editor</span>
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-umber-950 overflow-x-auto text-[13px] font-mono text-lilac-200 leading-relaxed max-h-[460px]">
              <pre>
                <code>{sampleWorkflow}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
