"use client";

import React from "react";
import { Code2, ShieldCheck, DollarSign, LayoutDashboard, Check } from "lucide-react";

const personas = [
  {
    icon: Code2,
    role: "Backend & AI Engineers",
    badge: "Reliability",
    color: "text-umber-800 dark:text-cloud-100",
    bgColor: "bg-umber-800/10 dark:bg-cloud-100/10",
    summary:
      "Resume crashed workflows instantly from cloud checkpoints without repeating expensive model calls. Eliminate home-grown retry logic and queue bloat.",
    features: [
      "Zero duplicate model calls on crash",
      "Type-safe schema validation",
    ],
  },
  {
    icon: ShieldCheck,
    role: "Support & Operations",
    badge: "Oversight",
    color: "text-status-live",
    bgColor: "bg-status-live/10",
    summary:
      "Pause sensitive actions like refunds or customer emails for human sign-off. Workflows wait safely in team queues with zero idle compute cost.",
    features: [
      "1-click approve, reject, or edit",
      "Full audit trail for compliance",
    ],
  },
  {
    icon: DollarSign,
    role: "Engineering Leads & FinOps",
    badge: "Cost Caps",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    summary:
      "Prevent surprise API bills and runaway loops with strict dollar and token limits that immediately halt execution when triggered.",
    features: [
      "Hard spending circuit breakers",
      "Live token & USD cost tracking",
    ],
  },
  {
    icon: LayoutDashboard,
    role: "Product Builders",
    badge: "Speed",
    color: "text-lilac-400",
    bgColor: "bg-lilac-400/10",
    summary:
      "Build logic visually on an interactive canvas or edit portable JSON in Git. Test workflows offline for free using mock models.",
    features: [
      "Visual canvas + Git-tracked JSON",
      "Free offline testing with mock models",
    ],
  },
];

export function WhoUsesWeaveSection() {
  return (
    <section id="use-cases" className="py-16 md:py-24 border-b border-cloud-200 dark:border-cloud-50/10 bg-cloud-100 dark:bg-umber-900">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        {/* Header */}
        <div className="max-w-[680px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wider text-mid-brown dark:text-cloud-300 border border-cloud-300 dark:border-cloud-50/20 rounded-full mb-3">
            Built for Real Teams
          </span>
          <h2 className="font-display text-[28px] sm:text-[38px] lg:text-[44px] leading-[1.1] tracking-[-0.025em] text-umber-800 dark:text-cloud-50">
            Who uses Weave, and why?
          </h2>
          <p className="mt-3 text-[15px] sm:text-[16px] leading-[1.5] text-mid-brown dark:text-cloud-300">
            Dependable execution, human sign-offs, and spend governance for teams putting AI into production.
          </p>
        </div>

        {/* 4 Persona Cards */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          {personas.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.role}
                className="flex flex-col justify-between border border-cloud-200 dark:border-cloud-50/15 bg-cloud-50 dark:bg-umber-800 p-5 sm:p-6"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-[4px] ${p.bgColor} ${p.color}`}>
                        <Icon className="size-4" />
                      </div>
                      <h3 className="font-display text-[18px] sm:text-[19px] font-medium text-umber-800 dark:text-cloud-50">
                        {p.role}
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 border border-cloud-300 dark:border-cloud-50/20 text-mid-brown dark:text-cloud-300 rounded-[2px]">
                      {p.badge}
                    </span>
                  </div>

                  <p className="text-[14px] leading-[1.5] text-mid-brown dark:text-cloud-300 mb-4">
                    {p.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-cloud-200 dark:border-cloud-50/10 space-y-1.5">
                  {p.features.map((feat) => (
                    <div key={feat} className="flex items-center gap-2 text-[12.5px] text-mid-brown dark:text-cloud-300">
                      <Check className="size-3.5 text-status-live shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
