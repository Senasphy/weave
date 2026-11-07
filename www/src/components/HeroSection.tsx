"use client";

import React, { useState } from "react";
import { ArrowRight, Bot, ShieldCheck, Check, CornerDownRight } from "lucide-react";

const providers = [
  "Google Gemini 3.8",
  "Anthropic Claude 3.7",
  "OpenAI GPT-4.5 / o3",
  "Type-Safe CEL",
  "Custom HTTP Tools",
];

export function HeroSection() {
  const [gateApproved, setGateApproved] = useState<boolean>(false);

  return (
    <div className="relative pt-24 md:pt-28 pb-12 overflow-hidden border-b border-cloud-200 dark:border-cloud-50/10">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        {/* Main Hero Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
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

          {/* Right Preview Card - Clean & Minimal */}
          <div className="lg:col-span-7">
            <div className="rounded-xl border border-cloud-200 dark:border-cloud-50/15 bg-cloud-50 dark:bg-umber-800/90 shadow-xl overflow-hidden">
              {/* Window Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-cloud-200 dark:border-cloud-50/10 bg-cloud-100/60 dark:bg-umber-900/60 text-xs">
                <div className="flex items-center gap-2 font-mono text-mid-brown dark:text-cloud-300">
                  <span className="flex gap-1.5">
                    <span className="size-2.5 rounded-full bg-cloud-300 dark:bg-cloud-50/20" />
                    <span className="size-2.5 rounded-full bg-cloud-300 dark:bg-cloud-50/20" />
                    <span className="size-2.5 rounded-full bg-cloud-300 dark:bg-cloud-50/20" />
                  </span>
                  <span className="ml-2 font-medium text-umber-800 dark:text-cloud-100">support_triage.json</span>
                </div>
                <div className="font-mono text-[11px] text-mid-brown dark:text-cloud-400">
                  interactive preview
                </div>
              </div>

              {/* Connected Steps */}
              <div className="p-5 space-y-3.5">
                {/* Step 1: Extract Ticket */}
                <div className="rounded-lg border border-cloud-200 dark:border-cloud-50/10 bg-cloud-100/40 dark:bg-umber-900/50 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-7 rounded-md bg-cloud-200/60 dark:bg-cloud-50/10 flex items-center justify-center text-umber-800 dark:text-cloud-100">
                      <Bot className="size-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-umber-800 dark:text-cloud-100">
                        1. extract_ticket
                      </div>
                      <div className="text-[11px] font-mono text-mid-brown dark:text-cloud-400">
                        gemini-3.8-flash • parsed refund amount ($150.00)
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-cloud-200 dark:border-cloud-50/15 text-mid-brown dark:text-cloud-300 font-medium">
                    Passed
                  </span>
                </div>

                {/* Step 2: Human Review Gate */}
                <div className="rounded-lg border border-cloud-300 dark:border-cloud-50/20 bg-cloud-50 dark:bg-umber-900 p-3.5 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-7 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <ShieldCheck className="size-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-umber-800 dark:text-cloud-100">
                          2. manager_approval_gate
                        </div>
                        <div className="text-[11px] font-mono text-mid-brown dark:text-cloud-400">
                          policy: require human approval for refund &gt; $100
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-medium ${
                        gateApproved
                          ? "border-cloud-300 dark:border-cloud-50/20 text-umber-800 dark:text-cloud-200"
                          : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {gateApproved ? "Approved" : "Needs Review"}
                    </span>
                  </div>

                  {!gateApproved && (
                    <div className="flex items-center justify-between pt-2 border-t border-cloud-200 dark:border-cloud-50/10 text-xs">
                      <span className="text-[11px] text-mid-brown dark:text-cloud-300">
                        Paused safely • 0 compute wasted
                      </span>
                      <button
                        type="button"
                        onClick={() => setGateApproved(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-umber-800 dark:bg-cloud-100 text-cloud-50 dark:text-umber-900 text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                      >
                        <Check className="size-3" />
                        <span>Approve $150 Refund</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Step 3: Execute Action */}
                <div
                  className={`rounded-lg border transition-opacity p-3.5 flex items-center justify-between ${
                    gateApproved
                      ? "border-cloud-200 dark:border-cloud-50/10 bg-cloud-100/40 dark:bg-umber-900/50 opacity-100"
                      : "border-cloud-200/50 dark:border-cloud-50/5 bg-cloud-100/20 dark:bg-umber-900/20 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="size-7 rounded-md bg-cloud-200/60 dark:bg-cloud-50/10 flex items-center justify-center text-umber-800 dark:text-cloud-100">
                      <CornerDownRight className="size-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-umber-800 dark:text-cloud-100">
                        3. stripe_refund_tool
                      </div>
                      <div className="text-[11px] font-mono text-mid-brown dark:text-cloud-400">
                        {gateApproved ? "succeeded • charge_id: ch_3N8..." : "waiting for upstream approval"}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-cloud-300 dark:border-cloud-50/20 text-mid-brown dark:text-cloud-400 font-medium">
                    {gateApproved ? "Executed" : "Queued"}
                  </span>
                </div>
              </div>

              {/* Bottom Telemetry Bar */}
              <div className="px-5 py-3 border-t border-cloud-200 dark:border-cloud-50/10 bg-cloud-100/50 dark:bg-umber-900/60 flex items-center justify-between text-[11px] font-mono text-mid-brown dark:text-cloud-300">
                <div className="flex items-center gap-1.5">
                  <span className="text-cloud-400 dark:text-cloud-500">Spend:</span>
                  <span className="font-semibold text-umber-800 dark:text-cloud-100">$0.013 / $0.50 cap</span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="text-cloud-400 dark:text-cloud-500">Duration:</span>
                  <span className="text-umber-800 dark:text-cloud-100">1.2s</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-cloud-400 dark:text-cloud-500">Persistence:</span>
                  <span className="text-umber-800 dark:text-cloud-100">Cloud checkpoint</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Supported Ecosystem Bar */}
        <div className="mt-12 pt-6 border-t border-cloud-200 dark:border-cloud-50/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-mid-brown dark:text-cloud-400">
          <span className="font-mono text-[11px] uppercase tracking-wider text-cloud-500 dark:text-cloud-400 font-medium">
            Multi-Provider Support
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {providers.map((p) => (
              <span
                key={p}
                className="px-2.5 py-1 rounded border border-cloud-200 dark:border-cloud-50/15 bg-cloud-100/60 dark:bg-umber-800 text-[11px] font-mono text-umber-800 dark:text-cloud-200"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
