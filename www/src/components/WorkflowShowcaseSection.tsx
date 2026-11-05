"use client";

import React, { useState } from "react";
import { ArrowRight, Bot, GitBranch, ShieldAlert, Layers } from "lucide-react";

const workflows = [
  {
    id: "triage",
    pill: "Support & Triage",
    color: "bg-lilac-400",
    title: "Customer Support Triage & High-Value Refund Gate.",
    description:
      "A customer requests a $150.00 refund. Gemini 3.8 Flash extracts the dollar amount into typed JSON. A CEL router evaluates out.amount_usd > 100 and pauses execution at a human approval gate. The worker releases its database lease and safely sleeps until a manager signs off.",
    meta: "Primitives: Agent -> CEL Router -> Human Gate -> Stripe Tool",
  },
  {
    id: "research",
    pill: "Parallel Synthesis",
    color: "bg-blue-200",
    title: "Multi-Model Document Synthesis with Parallel Joins.",
    description:
      "Fan-out simultaneous queries across Google Gemini 3.8 Flash, Anthropic Sonnet 5.5, and private company embeddings. Collect independent outputs concurrently, evaluate consensus with a Join step, and enforce a strict $0.25 total cost cap.",
    meta: "Primitives: Parallel Fan-Out -> Gemini + Sonnet -> Join Reducer",
  },
  {
    id: "sre",
    pill: "Automated Ops",
    color: "bg-status-live",
    title: "Autonomous Incident Diagnostics with Hard Ceilings.",
    description:
      "When a production service alerts, Weave invokes an agent with scoped kubectl and SQL tools. Hard ceilings on steps (15) and spend ($0.30) guarantee that autonomous exploration never enters recursive cost loops.",
    meta: "Primitives: Agent Loop -> Scoped Tools -> Budget Circuit Breaker",
  },
];

export function WorkflowShowcaseSection() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section id="workflows" className="py-20 md:py-28 border-b border-cloud-200 dark:border-cloud-50/10 bg-cloud-100 dark:bg-umber-900">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-[780px] mx-auto mb-14">
          <h2 className="font-display text-[34px] md:text-[50px] lg:text-[60px] leading-[1.08] tracking-[-0.025em] text-charcoal dark:text-cloud-50">
            <span className="block">Three workflows Weave</span>
            <span className="block">can run.</span>
          </h2>
          <p className="mt-4 text-[16px] text-mid-brown dark:text-cloud-300">
            From customer operations to high-throughput research, here is how durable orchestration works in production.
          </p>
        </div>

        {/* 3 High-density Architectural Workflow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {workflows.map((wf, idx) => (
            <div
              key={wf.id}
              className="flex flex-col justify-between border border-cloud-200 bg-cloud-50 p-6 md:p-8 dark:border-cloud-50/15 dark:bg-umber-800"
            >
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`size-2.5 rounded-full ${wf.color}`} />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal dark:text-cloud-300 font-medium">
                    {wf.pill}
                  </span>
                </div>

                <h3 className="font-display text-[22px] font-medium leading-[1.2] text-charcoal dark:text-cloud-50 mb-3">
                  {wf.title}
                </h3>

                <p className="text-[14.5px] leading-[1.6] text-mid-brown dark:text-cloud-300">
                  {wf.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-cloud-200 dark:border-cloud-50/10 font-mono text-[11px] text-cloud-600 dark:text-cloud-400">
                {wf.meta}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
