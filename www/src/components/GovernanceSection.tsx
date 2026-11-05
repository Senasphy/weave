"use client";

import React from "react";
import { ArrowRight } from "lucide-react";

export function GovernanceSection() {
  return (
    <section
      id="security"
      className="py-20 md:py-24 border-b border-cloud-200 dark:border-cloud-50/10 bg-cloud-50 dark:bg-umber-800"
    >
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        {/* Dossier Polygon Card */}
        <div
          className="relative overflow-hidden rounded-none bg-cloud-950 text-cloud-50"
          style={{
            clipPath:
              "polygon(0px 0px, 360px 0px, 420px 56px, 100% 56px, 100% 100%, 0px 100%)",
          }}
        >
          {/* Top Dossier Tab Label */}
          <div className="absolute top-0 left-0 z-10 flex items-start px-6 pt-5 pb-2 md:px-8">
            <span className="inline-flex items-center font-display text-[12px] font-medium tracking-[0.01em] text-cloud-50">
              Security &amp; Governance
            </span>
          </div>

          <div className="px-6 pt-24 pb-8 md:px-10 md:pt-28 md:pb-12">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-8">
              {/* Left Column */}
              <div className="flex flex-col items-start justify-center">
                <h2 className="max-w-[620px] font-display text-[32px] sm:text-[44px] lg:text-[54px] leading-[1.08] tracking-[-0.025em] text-cloud-50">
                  <span className="block text-cloud-50">Safety &amp; cost limits</span>
                  <span className="block text-cloud-300">
                    built right into the engine.
                  </span>
                </h2>

                <p className="mt-6 max-w-[480px] text-[15px] sm:text-[17px] leading-[1.55] tracking-[0.01em] text-cloud-300">
                  Weave protects your API keys, database, and budget at the execution level. Sensitive tokens are automatically scrubbed from event logs, internal networks are safeguarded, and hard spend caps halt runaway loops before your card gets charged.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a
                    href="http://localhost:3010/engine#event-sourcing"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[2px] bg-blue-200 px-4 text-[14px] font-medium tracking-[0.01em] text-umber-800 hover:bg-blue-100 transition-colors"
                  >
                    <span>Read Engine Documentation</span>
                    <ArrowRight className="size-[13px]" />
                  </a>
                </div>
              </div>

              {/* Right Column: Architectural CAD Grid with Security Telemetry */}
              <div className="border border-cloud-900 bg-cloud-950 p-6 relative font-mono text-[11px] text-cloud-50">
                {/* CAD Grid Lines */}
                <div className="absolute inset-0 cad-grid opacity-25 pointer-events-none" />

                <div className="relative space-y-4">
                  <div className="border-b border-cloud-900 pb-3 flex justify-between text-cloud-300 font-medium">
                    <span>SAFETY ENGINE</span>
                    <span className="text-status-live">STATUS: ENFORCING</span>
                  </div>

                  <div className="border border-cloud-900 p-3 bg-cloud-900/40 text-cloud-300 space-y-1">
                    <div className="text-cloud-50 font-medium text-[12px]">
                      01 Automatic Secret Redaction
                    </div>
                    <div className="text-[11px] text-cloud-300">
                      Scrubbing strings against pattern: &#36;&#123;secret:NAME&#125;
                    </div>
                    <div className="text-[11px] text-status-live font-medium">
                      Result: Zero API keys or secrets leaked to logs
                    </div>
                  </div>

                  <div className="border border-cloud-900 p-3 bg-cloud-900/40 text-cloud-300 space-y-1">
                    <div className="text-cloud-50 font-medium text-[12px]">
                      02 Hard Spending Caps
                    </div>
                    <div className="text-[11px] text-cloud-300">
                      Maximum budget per run: max_cost_usd = $0.50
                    </div>
                    <div className="text-[11px] text-status-live font-medium">
                      Result: Immediate halt if cost exceeds threshold
                    </div>
                  </div>

                  <div className="border border-cloud-900 p-3 bg-cloud-900/40 text-cloud-300 space-y-1">
                    <div className="text-cloud-50 font-medium text-[12px]">
                      03 Internal Network Defense
                    </div>
                    <div className="text-[11px] text-cloud-300">
                      Blocklist: localhost (127.0.0.1) &amp; AWS metadata (169.254.169.254)
                    </div>
                    <div className="text-[11px] text-status-live font-medium">
                      Result: Models blocked from reaching private company networks
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
