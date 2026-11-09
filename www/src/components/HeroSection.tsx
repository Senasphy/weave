"use client";

import React, { useState } from "react";
import { ArrowRight, Bot, ShieldCheck, Check, CornerDownRight } from "lucide-react";

const stackItems = [
  { name: "Google Gemini 3.8", sub: "Flash & Pro Reasoning" },
  { name: "Anthropic Opus 5.5", sub: "Agentic Tool Calling" },
  { name: "OpenAI GPT-6.1 Sol", sub: "Structured Outputs & Reasoning" },
  { name: "PostgreSQL 15+", sub: "Durable Event Store" },
  { name: "Google CEL", sub: "Type-Safe Conditions" },
  { name: "React Flow", sub: "Visual Graph Canvas" },
];

export function HeroSection() {
  const [gateApproved, setGateApproved] = useState<boolean>(false);

  return (
    <div className="relative pt-24 md:pt-28 pb-8 lg:pb-10 overflow-hidden border-b border-cloud-200 dark:border-cloud-50/10 lg:min-h-screen lg:flex lg:flex-col lg:justify-between">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 w-full lg:flex-1 lg:flex lg:flex-col lg:justify-between">
        {/* Main Hero Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center lg:flex-1 lg:my-auto py-6 lg:py-8">
          {/* Copy Column */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <h1 className="font-display font-medium text-[38px] sm:text-[48px] lg:text-[56px] leading-[1.05] tracking-[-0.03em] text-umber-800 dark:text-cloud-50">
              <span className="block">Reliable AI workflows.</span>
              <span className="block text-mid-brown dark:text-cloud-300">Zero setup.</span>
            </h1>

            <p className="mt-4 text-[15px] sm:text-[16px] leading-relaxed text-mid-brown dark:text-cloud-300 max-w-md">
              Design, test, and run multi-agent workflows in the cloud. Guard against runaway costs with hard budget caps and human approval gates.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="https://weave-orchestrator-main.vercel.app"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-umber-800 px-5 text-[13px] font-medium text-cloud-50 hover:bg-umber-700 dark:bg-cloud-100 dark:text-umber-900 dark:hover:bg-cloud-50 transition-colors shadow-sm"
              >
                <span>Launch Studio</span>
                <ArrowRight className="size-3.5" />
              </a>

              <a
                href="https://weave-documentation.vercel.app"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-md border border-cloud-300 bg-transparent px-5 text-[13px] font-medium text-umber-800 hover:bg-cloud-100/60 dark:border-cloud-50/20 dark:text-cloud-200 dark:hover:bg-cloud-50/5 transition-colors"
              >
                Documentation
              </a>
            </div>
          </div>

          {/* Right Preview Card - Clean & Spacious */}
          <div className="lg:col-span-7">
            <div className="rounded-xl border border-cloud-200 dark:border-cloud-50/15 bg-cloud-50 dark:bg-umber-800/90 shadow-xl overflow-hidden">
              {/* Window Header */}
              <div className="flex items-center justify-between px-6 py-3.5 border-b border-cloud-200 dark:border-cloud-50/10 bg-cloud-100/50 dark:bg-umber-900/50 text-xs">
                <div className="flex items-center gap-2.5 font-mono text-mid-brown dark:text-cloud-300">
                  <span className="flex gap-1.5">
                    <span className="size-2 rounded-full bg-cloud-300 dark:bg-cloud-50/20" />
                    <span className="size-2 rounded-full bg-cloud-300 dark:bg-cloud-50/20" />
                    <span className="size-2 rounded-full bg-cloud-300 dark:bg-cloud-50/20" />
                  </span>
                  <span className="ml-1.5 font-medium text-umber-800 dark:text-cloud-100">
                    support_triage.json
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-mid-brown dark:text-cloud-400">
                  <span className="size-1.5 rounded-full bg-status-live animate-pulse" />
                  <span>cloud lease active</span>
                </div>
              </div>

              {/* Connected Steps */}
              <div className="p-6 sm:p-7 space-y-4">
                {/* Step 1: Extract Ticket */}
                <div className="rounded-lg border border-cloud-200 dark:border-cloud-50/10 bg-cloud-100/30 dark:bg-umber-900/40 p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                    <div className="size-9 rounded-md bg-cloud-200/60 dark:bg-cloud-50/10 flex items-center justify-center text-umber-800 dark:text-cloud-100 shrink-0">
                      <Bot className="size-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[13px] font-semibold text-umber-800 dark:text-cloud-100">
                        1. extract_ticket
                      </div>
                      <div className="text-[12.5px] text-mid-brown dark:text-cloud-300 mt-0.5 truncate">
                        Gemini 3.8 Flash parsed refund amount ($150.00)
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-mid-brown dark:text-cloud-400 shrink-0">
                    <Check className="size-3.5 text-status-live" />
                    <span className="hidden sm:inline">Passed</span>
                  </div>
                </div>

                {/* Vertical Connector */}
                <div className="flex justify-center -my-2">
                  <div className="w-px h-3.5 bg-cloud-300/70 dark:bg-cloud-50/15" />
                </div>

                {/* Step 2: Human Review Gate */}
                <div
                  className={`rounded-lg border transition-all p-4 sm:p-5 ${
                    gateApproved
                      ? "border-cloud-200 dark:border-cloud-50/10 bg-cloud-100/30 dark:bg-umber-900/40"
                      : "border-amber-500/40 bg-amber-500/[0.04] dark:bg-amber-500/[0.06] shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
                      <div
                        className={`size-9 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                          gateApproved
                            ? "bg-cloud-200/60 dark:bg-cloud-50/10 text-umber-800 dark:text-cloud-100"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        <ShieldCheck className="size-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-[13px] font-semibold text-umber-800 dark:text-cloud-100">
                          2. manager_approval_gate
                        </div>
                        <div className="text-[12.5px] text-mid-brown dark:text-cloud-300 mt-0.5">
                          {gateApproved
                            ? "Approved by Manager • Thread resumed safely"
                            : "Policy triggered: refunds > $100 require sign-off"}
                        </div>
                      </div>
                    </div>

                    {gateApproved ? (
                      <button
                        type="button"
                        onClick={() => setGateApproved(false)}
                        className="flex items-center gap-1.5 text-xs font-mono text-mid-brown dark:text-cloud-400 hover:text-umber-800 dark:hover:text-cloud-200 transition-colors shrink-0 cursor-pointer"
                        title="Reset step preview"
                      >
                        <Check className="size-3.5 text-status-live" />
                        <span className="hidden sm:inline">Approved</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 shrink-0 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        Paused
                      </span>
                    )}
                  </div>

                  {!gateApproved && (
                    <div className="mt-4 pt-3.5 border-t border-amber-500/20 dark:border-amber-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-xs text-mid-brown dark:text-cloud-300">
                        Zero compute billed while awaiting decision
                      </span>
                      <button
                        type="button"
                        onClick={() => setGateApproved(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-md bg-umber-800 dark:bg-cloud-100 text-cloud-50 dark:text-umber-900 text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-sm shrink-0"
                      >
                        <Check className="size-3.5" />
                        <span>Approve $150 Refund</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Vertical Connector */}
                <div className="flex justify-center -my-2">
                  <div className="w-px h-3.5 bg-cloud-300/70 dark:bg-cloud-50/15" />
                </div>

                {/* Step 3: Execute Action */}
                <div
                  className={`rounded-lg border transition-all p-4 sm:p-5 flex items-center justify-between gap-4 ${
                    gateApproved
                      ? "border-cloud-200 dark:border-cloud-50/10 bg-cloud-100/30 dark:bg-umber-900/40 opacity-100"
                      : "border-cloud-200/60 dark:border-cloud-50/5 bg-cloud-100/10 dark:bg-umber-900/10 opacity-50"
                  }`}
                >
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                    <div className="size-9 rounded-md bg-cloud-200/60 dark:bg-cloud-50/10 flex items-center justify-center text-umber-800 dark:text-cloud-100 shrink-0">
                      <CornerDownRight className="size-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[13px] font-semibold text-umber-800 dark:text-cloud-100">
                        3. stripe_refund_tool
                      </div>
                      <div className="text-[12.5px] text-mid-brown dark:text-cloud-300 mt-0.5 truncate">
                        {gateApproved
                          ? "Refund of $150.00 executed • charge_id: ch_3N8x7..."
                          : "Waiting for upstream gate sign-off"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-mid-brown dark:text-cloud-400 shrink-0">
                    {gateApproved ? (
                      <>
                        <Check className="size-3.5 text-status-live" />
                        <span className="hidden sm:inline">Executed</span>
                      </>
                    ) : (
                      <span className="text-[11px] font-mono text-mid-brown dark:text-cloud-400">
                        Queued
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Telemetry Bar */}
              <div className="px-6 py-3.5 border-t border-cloud-200 dark:border-cloud-50/10 bg-cloud-100/50 dark:bg-umber-900/50 flex items-center justify-between text-xs font-mono text-mid-brown dark:text-cloud-400">
                <div className="flex items-center gap-2">
                  <span className="text-cloud-400 dark:text-cloud-500">Spend:</span>
                  <span className="font-medium text-umber-800 dark:text-cloud-100">$0.013 / $0.50 cap</span>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-cloud-400 dark:text-cloud-500">Latency:</span>
                  <span className="text-umber-800 dark:text-cloud-100">1.2s</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cloud-400 dark:text-cloud-500">State:</span>
                  <span className="text-umber-800 dark:text-cloud-100">Postgres checkpoint</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BUILT FOR PRODUCTION BAND (Multi-Provider Support) */}
        <div className="mt-8 lg:mt-12 pt-6 border-t border-cloud-200 dark:border-cloud-50/10">
          <span className="block font-mono text-[11px] font-normal uppercase tracking-[0.01em] text-cloud-500 dark:text-cloud-400 mb-3">
            ENGINEERED FOR MULTI-PROVIDER RELIABILITY
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {stackItems.map((item, idx) => (
              <div
                key={idx}
                className="flex h-[56px] flex-col justify-center px-3 rounded-[4px] border border-dashed border-cloud-200 dark:border-cloud-50/18 hover:border-cloud-400 dark:hover:border-cloud-50/40 transition-colors"
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
