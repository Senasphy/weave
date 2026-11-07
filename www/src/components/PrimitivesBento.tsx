"use client";

import React, { useState } from "react";
import { Bot, GitBranch, ShieldAlert, Layers, CheckCircle2, ArrowRight } from "lucide-react";

const primitives = [
  {
    id: "agent",
    number: "01",
    name: "AI Agent Steps",
    icon: Bot,
    subtitle: "Frontier LLM reasoning with typed JSON schemas",
    description: "Invokes frontier models (Google Gemini 3.8 Flash, Anthropic Opus 5.5, OpenAI GPT-6.1 Sol) or an offline zero-cost test mock. Automatically forces and validates JSON outputs against your strict JSON Schema.",
    code: `{
  "id": "classify_ticket",
  "type": "agent",
  "config": {
    "model": "gemini-3.8-flash",
    "system_prompt": "Classify support request and extract refund amount.",
    "output_schema": {
      "type": "object",
      "required": ["category", "refund_amount"]
    }
  }
}`,
    highlights: ["Automatic Schema Validation", "Reasoning Token Accounting", "Safe Tool Sandboxing"],
  },
  {
    id: "router",
    number: "02",
    name: "Conditional Routers",
    icon: GitBranch,
    subtitle: "Sandboxed Google CEL edge branching",
    description: "Branches execution dynamically based on step outputs or shared run state. Uses Google's Common Expression Language (CEL), non-Turing complete, sandboxed, and evaluated in microseconds.",
    code: `{
  "id": "check_threshold",
  "type": "router",
  "config": {
    "rules": [
      {
        "condition": "out.refund_amount > 100",
        "target": "manager_approval_gate"
      },
      {
        "condition": "out.refund_amount <= 100",
        "target": "auto_refund"
      }
    ]
  }
}`,
    highlights: ["Sub-millisecond Evaluation", "No Python Eval Vulnerabilities", "Full State Inspection"],
  },
  {
    id: "gate",
    number: "03",
    name: "Human Approval Gates",
    icon: ShieldAlert,
    subtitle: "Zero-cost safe pausing with human sign-off",
    description: "Suspends the run when high-stakes operations require human review. The engine releases compute resources immediately so zero server threads are wasted. Resumes seamlessly via API or the visual Studio console.",
    code: `{
  "id": "manager_approval_gate",
  "type": "gate",
  "config": {
    "timeout_seconds": 86400,
    "on_timeout": "fail",
    "metadata": {
      "requires_role": "tier_2_lead",
      "action_description": "Approve $150.00 refund"
    }
  }
}`,
    highlights: ["Zero Server Resource Burn", "Survives Multi-day Pauses", "Optimistic Concurrency"],
  },
  {
    id: "parallel",
    number: "04",
    name: "Parallel Steps & Joins",
    icon: Layers,
    subtitle: "Concurrent fan-out & deterministic merge",
    description: "Dispatches multiple independent tasks simultaneously, such as querying knowledge stores or running multiple models in parallel, and cleanly merges their outputs into downstream state.",
    code: `{
  "id": "parallel_research",
  "type": "parallel",
  "config": {
    "branches": [
      "query_knowledge_base",
      "fetch_crm_history",
      "check_stripe_balance"
    ],
    "join_mode": "wait_all"
  }
}`,
    highlights: ["Parallel Speedup", "Deterministic Aggregation", "Individual Step Timeouts"],
  },
];

export function PrimitivesBento() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const activePrimitive = primitives[selectedIdx];
  const Icon = activePrimitive.icon;

  return (
    <section id="primitives" className="py-20 md:py-28 border-b border-umber-800/10 dark:border-cloud-100/10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="text-[12px] font-mono uppercase tracking-widest text-umber-500 dark:text-cloud-400 mb-3">
            03 &bull; Building Blocks
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-[46px] font-normal leading-[1.1] tracking-tight text-umber-900 dark:text-cloud-50">
            Four simple primitives.
            <span className="block italic text-umber-700 dark:text-cloud-200 mt-1">
              Infinite workflow topology.
            </span>
          </h2>
          <p className="mt-4 text-[16px] leading-[1.6] text-umber-600 dark:text-cloud-300">
            Every resilient workflow in Weave is constructed by combining four well-defined step types.
          </p>
        </div>

        {/* Interactive Primitive Tabs & Showcase */}
        <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Selector List */}
          <div className="lg:col-span-5 space-y-3">
            {primitives.map((item, idx) => {
              const isSelected = idx === selectedIdx;
              const ItemIcon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedIdx(idx)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 flex items-start gap-4 ${
                    isSelected
                      ? "border-lilac-500 bg-cloud-50 dark:bg-umber-900 shadow-sm ring-1 ring-lilac-500/50"
                      : "border-umber-800/10 dark:border-cloud-100/10 bg-cloud-50/50 dark:bg-umber-950/40 opacity-75 hover:opacity-100 hover:border-umber-800/20"
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl mt-0.5 ${
                      isSelected
                        ? "bg-lilac-500 text-cloud-50"
                        : "bg-umber-800/5 dark:bg-cloud-100/5 text-umber-600 dark:text-cloud-300"
                    }`}
                  >
                    <ItemIcon className="size-4.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-semibold text-umber-900 dark:text-cloud-50">
                        {item.name}
                      </span>
                      <span className="text-[11px] font-mono text-umber-400 dark:text-cloud-600">
                        {item.number}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-umber-600 dark:text-cloud-400 line-clamp-2">
                      {item.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Code & Architecture Card */}
          <div className="lg:col-span-7 rounded-2xl border border-umber-800/12 dark:border-cloud-100/12 bg-cloud-50 dark:bg-umber-900 p-6 md:p-8 shadow-card dark:shadow-card-dark">
            <div className="flex items-center justify-between border-b border-umber-800/10 dark:border-cloud-100/10 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-lilac-500/15 text-lilac-700 dark:text-lilac-300">
                  <Icon className="size-5" />
                </div>
                <div>
                  <h3 className="text-xl font-medium font-display text-umber-900 dark:text-cloud-50">
                    {activePrimitive.name}
                  </h3>
                  <div className="text-[12px] font-mono text-umber-500 dark:text-cloud-400">
                    primitive_type: "{activePrimitive.id}"
                  </div>
                </div>
              </div>

              <span className="rounded-full bg-cloud-200/60 dark:bg-cloud-50/10 text-umber-800 dark:text-cloud-200 px-3 py-1 text-[11px] font-mono font-medium">
                Production Ready
              </span>
            </div>

            <p className="text-[15px] leading-relaxed text-umber-700 dark:text-cloud-200 mb-6">
              {activePrimitive.description}
            </p>

            {/* Declarative Spec Preview */}
            <div className="rounded-xl overflow-hidden border border-umber-800/10 dark:border-cloud-100/10">
              <div className="bg-umber-950 px-4 py-2 text-[11px] font-mono text-cloud-400 flex items-center justify-between">
                <span>workflow.schema.json &bull; node definition</span>
                <span className="text-lilac-400">Strictly Typed</span>
              </div>
              <pre className="p-4 bg-umber-950 overflow-x-auto text-[12.5px] font-mono text-lilac-200 leading-relaxed">
                <code>{activePrimitive.code}</code>
              </pre>
            </div>

            {/* Bullet Highlights */}
            <div className="mt-6 flex flex-wrap gap-2.5">
              {activePrimitive.highlights.map((h, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border border-umber-800/10 dark:border-cloud-100/10 bg-cloud-100/50 dark:bg-umber-950/50 px-3 py-1 text-[12px] text-umber-800 dark:text-cloud-300 font-mono"
                >
                  <CheckCircle2 className="size-3 text-mid-brown dark:text-cloud-400" />
                  <span>{h}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
