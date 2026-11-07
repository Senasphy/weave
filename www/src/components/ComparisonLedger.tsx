"use client";

import React from "react";
import { Check, X, Minus } from "lucide-react";

const comparisons = [
  {
    feature: "Crash recovery",
    script: "Lost on restart; must re-run all steps",
    heavy: "Requires custom Redis/DB setup",
    temporal: "Durable, but code-only",
    weave: "Automatic; resumes last step from cloud checkpoints",
    weaveHighlight: true,
  },
  {
    feature: "Hard spending caps",
    script: "None; runs until API quota depleted",
    heavy: "Soft logging; no engine-level halt",
    temporal: "Requires building custom token meters",
    weave: "Hard limits on tokens, seconds & exact USD spend",
    weaveHighlight: true,
  },
  {
    feature: "Human approvals",
    script: "Blocks thread or drops state",
    heavy: "Complex custom state transitions",
    temporal: "Supported via custom signals",
    weave: "Built-in; 0 CPU resources while waiting",
    weaveHighlight: true,
  },
  {
    feature: "Visual canvas & JSON",
    script: "None; code only",
    heavy: "Code-centric, hard for PMs to audit",
    temporal: "Developer dashboards only",
    weave: "Interactive canvas editor + clean JSON in Git",
    weaveHighlight: true,
  },
  {
    feature: "Zero-cost local testing",
    script: "Must pay for real LLM API calls",
    heavy: "Requires mocking libraries",
    temporal: "Mocking external services manually",
    weave: "Built-in deterministic mock provider",
    weaveHighlight: true,
  },
  {
    feature: "Deployment simplicity",
    script: "Unmanaged script processes",
    heavy: "Heavy Python runtime & dependencies",
    temporal: "Complex multi-cluster setup",
    weave: "Hosted Cloud Platform (Zero Ops / Instant Deploy)",
    weaveHighlight: true,
  },
];

export function ComparisonLedger() {
  return (
    <section id="comparison" className="py-20 md:py-28 border-b border-cloud-200 dark:border-cloud-50/10 bg-cloud-50 dark:bg-umber-900">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        {/* Header */}
        <div className="max-w-[780px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-mono uppercase tracking-wider text-mid-brown dark:text-cloud-300 border border-cloud-300 dark:border-cloud-50/20 rounded-full mb-4">
            Clear Advantages
          </span>
          <h2 className="font-display text-[32px] sm:text-[44px] lg:text-[52px] leading-[1.08] tracking-[-0.025em] text-umber-800 dark:text-cloud-50">
            How Weave compares to other solutions.
          </h2>
          <p className="mt-4 text-[16px] sm:text-[17px] leading-[1.6] text-mid-brown dark:text-cloud-300">
            You don't need a heavy framework that breaks in production or a generic orchestrator that knows nothing about AI. Here is what makes Weave different.
          </p>
        </div>

        {/* Mobile scroll hint */}
        <p className="mt-6 text-[12px] font-mono uppercase tracking-wider text-mid-brown dark:text-cloud-400 sm:hidden flex items-center gap-1">
          <span>&larr; Swipe table horizontally &rarr;</span>
        </p>

        {/* Comparison Table */}
        <div className="mt-4 sm:mt-12 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="min-w-[800px] border border-cloud-200 dark:border-cloud-50/15 bg-cloud-100 dark:bg-umber-800">
            {/* Table Header */}
            <div className="grid grid-cols-5 p-5 border-b border-cloud-200 dark:border-cloud-50/15 font-mono text-[12px] uppercase text-mid-brown dark:text-cloud-300 font-medium">
              <div className="col-span-1">Capability</div>
              <div className="col-span-1">Ad-Hoc Scripts</div>
              <div className="col-span-1">LangChain / CrewAI</div>
              <div className="col-span-1">Temporal / Inngest</div>
              <div className="col-span-1 text-umber-800 dark:text-cloud-100 font-bold">Weave Engine</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-cloud-200 dark:divide-cloud-50/10">
              {comparisons.map((row) => (
                <div
                  key={row.feature}
                  className="grid grid-cols-5 p-5 items-center text-[13.5px] leading-snug hover:bg-cloud-50/50 dark:hover:bg-umber-700/50 transition-colors"
                >
                  <div className="col-span-1 font-medium text-umber-800 dark:text-cloud-50 font-display">
                    {row.feature}
                  </div>
                  <div className="col-span-1 text-mid-brown dark:text-cloud-300 pr-4">
                    {row.script}
                  </div>
                  <div className="col-span-1 text-mid-brown dark:text-cloud-300 pr-4">
                    {row.heavy}
                  </div>
                  <div className="col-span-1 text-mid-brown dark:text-cloud-300 pr-4">
                    {row.temporal}
                  </div>
                  <div className="col-span-1 text-umber-800 dark:text-cloud-50 font-medium flex items-start gap-1.5 pr-2">
                    <Check className="size-4 text-umber-800 dark:text-cloud-200 shrink-0 mt-0.5" />
                    <span>{row.weave}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
