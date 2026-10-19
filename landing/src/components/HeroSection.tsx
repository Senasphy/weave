"use client";

import React, { useState } from "react";
import { ArrowRight, Bot, GitBranch, ShieldAlert, Wrench, CheckCircle2 } from "lucide-react";

const stackItems = [
  { name: "Google Gemini 3.8", sub: "Flash & Pro Reasoning" },
  { name: "Anthropic Claude 3.7", sub: "Agentic Tool Calling" },
  { name: "OpenAI GPT-4.1", sub: "Structured Outputs" },
  { name: "PostgreSQL 15+", sub: "Durable Event Store" },
  { name: "Google CEL", sub: "Type-Safe Conditions" },
  { name: "React Flow", sub: "Visual Graph Canvas" },
];

export function HeroSection() {
  const [activeNode, setActiveNode] = useState<number>(2); // Gate node selected by default
  const [gateApproved, setGateApproved] = useState<boolean>(false);

  const nodes = [
    {
      id: "01",
      title: "extract_ticket",
      type: "agent",
      model: "gemini-3.8-flash",
      status: "committed",
      output: '{"category": "refund", "amount_usd": 150.00}',
    },
    {
      id: "02",
      title: "check_spending_cap",
      type: "router",
      model: "CEL: out.amount_usd > 100",
      status: "committed",
      output: 'Route selected: "manager_approval_gate"',
    },
    {
      id: "03",
      title: "manager_approval_gate",
      type: "gate",
      model: "timeout: 86400s",
      status: gateApproved ? "resolved" : "waiting_human",
      output: gateApproved
        ? 'Approved by Lead • Resumed via Postgres lease'
        : 'Run suspended • 0 thread cost • Awaiting sign-off',
    },
    {
      id: "04",
      title: "stripe_refund_tool",
      type: "tool",
      model: "POST /v1/refunds",
      status: gateApproved ? "executed" : "queued",
      output: gateApproved ? '{"charge_id": "ch_3N8...", "status": "succeeded"}' : 'Awaiting upstream gate resolution',
    },
  ];

  return (
    <div className="relative pt-24 md:pt-28 pb-12 overflow-hidden border-b border-cloud-200 dark:border-cloud-50/10">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        {/* Main Hero Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center min-h-[520px]">
          {/* Copy Column */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <h1 className="font-display font-medium text-[42px] sm:text-[60px] lg:text-[72px] leading-[1.0] tracking-[-0.03em] text-umber-800 dark:text-cloud-50">
              <span className="block">Build AI workflows</span>
              <span className="block">that don't crash</span>
              <span className="block text-mid-brown dark:text-cloud-300">or blow your budget.</span>
            </h1>

            <p className="mt-6 max-w-[480px] text-[16px] sm:text-[18px] leading-[1.55] tracking-[0.01em] text-mid-brown dark:text-cloud-300">
              Connect AI models, internal tools, and human approvals into reliable production workflows. Every step saves to PostgreSQL, runaway loops get stopped by hard spending limits, and sensitive actions pause safely for human sign-off.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="http://localhost:3000"
                className="inline-flex h-12 items-center justify-center gap-1.5 rounded-[4px] bg-umber-800 px-6 text-[15px] font-medium tracking-[0.01em] text-cloud-50 hover:bg-umber-700 dark:bg-cloud-100 dark:text-umber-900 dark:hover:bg-cloud-50 transition-colors"
              >
                <span>Launch Visual Editor</span>
                <ArrowRight className="size-[14px]" />
              </a>

              <a
                href="#use-cases"
                className="inline-flex h-12 items-center justify-center rounded-[4px] border border-umber-400 bg-transparent px-6 text-[15px] font-medium tracking-[0.01em] text-umber-800 hover:border-current hover:bg-current/5 dark:border-cloud-100/40 dark:text-cloud-100 transition-colors"
              >
                Who uses Weave?
              </a>
            </div>
          </div>

          {/* Architectural Axis & Scrubber (Zaro Hero Visual) */}
          <div className="lg:col-span-6">
            <div className="relative rounded-none border border-cloud-200 dark:border-cloud-50/15 bg-cloud-100 dark:bg-umber-800 p-5 md:p-7">
              {/* CAD coordinate top bar */}
              <div className="flex items-center justify-between border-b border-dashed border-cloud-300 dark:border-cloud-50/20 pb-3 mb-5 font-mono text-[11px] text-mid-brown dark:text-cloud-300">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-status-live animate-pulse" />
                  <span>LIVE DEMO RUN</span>
                </span>
                <span>SAVED TO POSTGRESQL</span>
                <span className="text-umber-800 dark:text-cloud-100 font-semibold">$0.0134 / $0.500 SPEND CAP</span>
              </div>

              {/* Step Scrubber Line */}
              <div className="relative mb-6">
                <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 border-t border-dashed border-cloud-400 dark:border-cloud-50/20" />
                <div className="relative flex justify-between">
                  {nodes.map((n, i) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setActiveNode(i)}
                      className={`relative z-10 flex size-9 items-center justify-center rounded-[2px] font-mono text-[12px] font-medium transition-all ${
                        activeNode === i
                          ? "border border-umber-800 bg-umber-800 text-cloud-50 dark:border-cloud-50 dark:bg-cloud-50 dark:text-umber-900 shadow-sm"
                          : "border border-cloud-300 bg-cloud-50 text-mid-brown dark:border-cloud-50/30 dark:bg-umber-900 dark:text-cloud-300 hover:border-umber-800"
                      }`}
                    >
                      {n.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Node Detail Card */}
              <div className="border border-cloud-200 bg-cloud-50 p-4 dark:border-cloud-50/10 dark:bg-umber-900">
                <div className="flex items-center justify-between border-b border-cloud-200 dark:border-cloud-50/10 pb-2 mb-3">
                  <div>
                    <div className="font-display font-medium text-[16px] text-charcoal dark:text-cloud-50">
                      {nodes[activeNode].title}
                    </div>
                    <div className="font-mono text-[11px] text-mid-brown dark:text-cloud-400">
                      {nodes[activeNode].model}
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center rounded-[2px] px-2 py-0.5 font-mono text-[10px] font-medium uppercase border ${
                      nodes[activeNode].status === "waiting_human"
                        ? "border-amber-500 text-amber-700 bg-amber-500/10"
                        : "border-status-live text-status-live bg-status-live/10"
                    }`}
                  >
                    {nodes[activeNode].status}
                  </span>
                </div>

                <div className="font-mono text-[11px] text-cloud-700 dark:text-cloud-400 mb-1">
                  EVENT LOG PAYLOAD:
                </div>
                <pre className="overflow-x-auto rounded-[2px] bg-cloud-950 p-3 font-mono text-[12px] text-lilac-300">
                  <code>{nodes[activeNode].output}</code>
                </pre>

                {/* Human gate resolution button when on gate */}
                {activeNode === 2 && !gateApproved && (
                  <div className="mt-3.5 flex items-center justify-between border-t border-cloud-200 dark:border-cloud-50/10 pt-3">
                    <span className="font-display text-[13px] text-charcoal dark:text-cloud-200">
                      Human Review: Amount &gt; $100
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setGateApproved(true);
                        setActiveNode(3);
                      }}
                      className="inline-flex h-8 items-center gap-1 rounded-[2px] bg-umber-800 px-3 font-mono text-[11px] font-medium text-cloud-50 hover:bg-umber-700 dark:bg-cloud-100 dark:text-umber-900"
                    >
                      <span>Approve Step</span>
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BUILT FOR PRODUCTION BAND (Zaro Section 2 style) */}
        <div className="mt-14 pt-6 border-t border-umber-800/10 dark:border-cloud-50/12">
          <span className="block font-mono text-[11px] font-normal uppercase tracking-[0.01em] text-cloud-500 dark:text-cloud-300 mb-3">
            ENGINEERED FOR MULTI-PROVIDER RELIABILITY
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {stackItems.map((item, idx) => (
              <div
                key={idx}
                className="flex h-[56px] flex-col justify-center px-3 rounded-[4px] border border-dashed border-cloud-200 dark:border-cloud-50/18 hover:border-cloud-400 transition-colors"
              >
                <span className="font-display text-[13px] font-medium tracking-tight text-umber-800 dark:text-cloud-100">
                  {item.name}
                </span>
                <span className="font-mono text-[10px] text-cloud-500 dark:text-cloud-400">
                  {item.sub}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
