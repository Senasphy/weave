"use client";

import React from "react";

export function ComparisonLedger() {
  return (
    <section id="knowledge" className="py-20 md:py-28 border-b border-cloud-200 dark:border-cloud-50/10 bg-cloud-50 dark:bg-umber-900">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        {/* Header */}
        <div className="max-w-[780px]">
          <h2 className="font-display text-[28px] md:text-[42px] leading-[1.06] tracking-[-0.025em] text-umber-800 dark:text-cloud-50">
            A fragile script tells you what crashed.{" "}
            <span className="text-mid-brown dark:text-cloud-300">
              Weave tells you what is true.
            </span>
          </h2>
          <p className="mt-5 max-w-[620px] text-[15px] md:text-[16px] leading-[1.55] text-mid-brown dark:text-cloud-300">
            Your workflow state lives committed to PostgreSQL after every step. Recovery is free, state updates are instant, and every decision names the schema that validated it.
          </p>
        </div>

        {/* Side-by-side Architectural Ledger */}
        <div className="mt-12 md:mt-16 rounded-none border border-cloud-200 p-3 dark:border-cloud-50/10">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {/* Left Card: Ad-Hoc Scripts */}
            <article className="flex flex-col gap-6 overflow-clip rounded-none p-6 md:p-8 bg-cloud-100 dark:bg-umber-800">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-1.5">
                  <h3 className="inline-flex h-5 shrink-0 items-center justify-center border-[0.5px] border-cloud-500 px-2 font-display text-[12px] font-medium leading-[1.6] tracking-[0.005em] dark:border-cloud-300/40 rounded-full text-cloud-700 dark:text-cloud-300">
                    Ad-Hoc Scripts
                  </h3>
                  <span className="inline-flex h-5 shrink-0 items-center justify-center gap-1 border-[0.5px] border-cloud-500 px-2 font-display text-[12px] font-medium leading-[1.6] tracking-[0.005em] dark:border-cloud-300/40 rounded-[2px] text-cloud-700 dark:text-cloud-300">
                    <span className="size-1.5 rounded-full bg-orange-500" />
                    Fragile
                  </span>
                </div>

                <div>
                  <p className="font-display text-[24px] font-medium leading-[1.2] text-charcoal dark:text-cloud-50">
                    A script runs in ephemeral memory.
                  </p>
                  <p className="mt-1 text-[14.5px] leading-[1.6] text-mid-brown dark:text-cloud-300">
                    Accurate only until a connection resets or a container reboots.
                  </p>
                </div>
              </div>

              {/* Technical Indicator Metric */}
              <div className="rounded-[4px] border border-cloud-200 bg-cloud-50/80 p-5 dark:border-cloud-50/10 dark:bg-umber-900/60 mt-auto">
                <div className="flex items-center justify-between border-b border-cloud-200 dark:border-cloud-50/10 pb-3 mb-3">
                  <span className="font-sans text-[14px] text-charcoal dark:text-cloud-50">
                    Survives worker restart:
                  </span>
                  <span className="inline-flex items-center justify-center font-display font-medium border border-dashed border-cloud-500 text-cloud-700 dark:border-cloud-300/40 dark:text-cloud-300 px-3 py-1 text-[18px] rounded-[2px]">
                    0%
                  </span>
                </div>
                <div className="space-y-1.5 font-mono text-[11px] text-cloud-700 dark:text-cloud-400">
                  <div className="flex justify-between">
                    <span>Financial spend cap:</span>
                    <span className="text-orange-500">Unbounded ($$$)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Human review pause:</span>
                    <span className="text-orange-500">Blocks CPU thread</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Condition safety:</span>
                    <span className="text-orange-500">Unsafe eval()</span>
                  </div>
                </div>
              </div>
            </article>

            {/* Right Card: Weave Engine */}
            <article className="flex flex-col gap-6 overflow-clip rounded-none p-6 md:p-8 bg-cloud-100 dark:bg-umber-800">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-1.5">
                  <h3 className="inline-flex h-5 shrink-0 items-center justify-center border-[0.5px] border-cloud-500 px-2 font-display text-[12px] font-medium leading-[1.6] tracking-[0.005em] dark:border-cloud-300/40 rounded-full text-cloud-700 dark:text-cloud-300">
                    Weave Engine
                  </h3>
                  <span className="inline-flex h-5 shrink-0 items-center justify-center gap-1 border-[0.5px] border-cloud-500 px-2 font-display text-[12px] font-medium leading-[1.6] tracking-[0.005em] dark:border-cloud-300/40 rounded-[2px] text-cloud-700 dark:text-cloud-300">
                    <span className="size-1.5 rounded-full bg-status-live" />
                    Durable
                  </span>
                </div>

                <div>
                  <p className="font-display text-[24px] font-medium leading-[1.2] text-charcoal dark:text-cloud-50">
                    Weave commits state step by step.
                  </p>
                  <p className="mt-1 text-[14.5px] leading-[1.6] text-mid-brown dark:text-cloud-300">
                    Resumes from the exact last completed node without re-running models.
                  </p>
                </div>
              </div>

              {/* Technical Indicator Metric */}
              <div className="rounded-[4px] border border-cloud-200 bg-cloud-50/80 p-5 dark:border-cloud-50/10 dark:bg-umber-900/60 mt-auto">
                <div className="flex items-center justify-between border-b border-cloud-200 dark:border-cloud-50/10 pb-3 mb-3">
                  <span className="font-sans text-[14px] text-charcoal dark:text-cloud-50">
                    Survives worker restart:
                  </span>
                  <span className="inline-flex items-center justify-center font-display font-medium border border-dashed border-status-live text-status-live px-3 py-1 text-[18px] rounded-[2px]">
                    100%
                  </span>
                </div>
                <div className="space-y-1.5 font-mono text-[11px] text-cloud-700 dark:text-cloud-400">
                  <div className="flex justify-between">
                    <span>Financial spend cap:</span>
                    <span className="text-status-live">Hard Engine Limit</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Human review pause:</span>
                    <span className="text-status-live">Zero Thread Cost</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Condition safety:</span>
                    <span className="text-status-live">Google CEL Sandbox</span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
