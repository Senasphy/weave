"use client";

import React from "react";
import { Code2, ShieldCheck, DollarSign, LayoutDashboard, Check } from "lucide-react";

const personas = [
  {
    icon: Code2,
    role: "Backend & AI Engineers",
    badge: "Reliability & Speed",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    pain: "Tired of hand-rolling retry logic, in-memory state, and background queues across fragile Python scripts.",
    benefit:
      "A fast Go engine that saves every step to PostgreSQL. If a container crashes, your workflow resumes from the exact last step without repeating expensive LLM calls.",
    features: [
      "Resume on crash without re-running models",
      "Type-safe JSON schema validation",
      "Single binary deployment (API + Worker)",
    ],
  },
  {
    icon: ShieldCheck,
    role: "Support & Operations Teams",
    badge: "Human Oversight",
    color: "text-status-live",
    bgColor: "bg-status-live/10",
    pain: "Wanting AI to automate customer tasks, but terrified an autonomous agent will issue a \$1,000 refund or send the wrong email.",
    benefit:
      "Built-in approval gates pause sensitive actions. The workflow waits in a team inbox until a human clicks approve, reject, or edits the data directly.",
    features: [
      "Zero server resources while waiting for approval",
      "Approve, reject, or edit outputs in 1-click",
      "Audit trail of every agent and human decision",
    ],
  },
  {
    icon: DollarSign,
    role: "Engineering Leads & FinOps",
    badge: "Cost Control",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    pain: "Losing sleep over surprise API bills when an agent gets stuck in a hallucinated tool loop overnight.",
    benefit:
      "Hard spending caps on every run and step. Define limits in plain dollars (e.g. max \$0.50 per run) or tokens. When a limit is hit, Weave halts immediately.",
    features: [
      "Real-time token & dollar cost tracking",
      "Hard budget circuit breakers (tokens, time, USD)",
      "Supports Gemini 3.8, OpenAI, and Claude 3.7",
    ],
  },
  {
    icon: LayoutDashboard,
    role: "Product Managers & Builders",
    badge: "Fast Iteration",
    color: "text-lilac-400",
    bgColor: "bg-lilac-400/10",
    pain: "Having to ask engineers to redeploy backend microservices just to tweak a prompt or add a conditional branch.",
    benefit:
      "Build visually on an interactive canvas or edit plain JSON. Test workflows offline for free using the built-in mock LLM before rolling out to users.",
    features: [
      "Visual drag-and-drop canvas editor",
      "100% portable JSON files that live in Git",
      "Free offline local testing with mock models",
    ],
  },
];

export function WhoUsesWeaveSection() {
  return (
    <section id="use-cases" className="py-20 md:py-28 border-b border-cloud-200 dark:border-cloud-50/10 bg-cloud-100 dark:bg-umber-900">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        {/* Header */}
        <div className="max-w-[760px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-mono uppercase tracking-wider text-mid-brown dark:text-cloud-300 border border-cloud-300 dark:border-cloud-50/20 rounded-full mb-4">
            Built for Real Teams
          </span>
          <h2 className="font-display text-[32px] sm:text-[44px] lg:text-[52px] leading-[1.08] tracking-[-0.025em] text-umber-800 dark:text-cloud-50">
            Who uses Weave, and why?
          </h2>
          <p className="mt-4 text-[16px] sm:text-[17px] leading-[1.6] text-mid-brown dark:text-cloud-300">
            From solo developers to cross-functional product teams, Weave replaces fragile glue scripts with dependable, cost-capped execution.
          </p>
        </div>

        {/* 4 Persona Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          {personas.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.role}
                className="flex flex-col justify-between border border-cloud-200 dark:border-cloud-50/15 bg-cloud-50 dark:bg-umber-800 p-6 sm:p-8"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-[4px] ${p.bgColor} ${p.color}`}>
                        <Icon className="size-5" />
                      </div>
                      <h3 className="font-display text-[20px] sm:text-[22px] font-medium text-umber-800 dark:text-cloud-50">
                        {p.role}
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 border border-cloud-300 dark:border-cloud-50/20 text-mid-brown dark:text-cloud-300 rounded-[2px]">
                      {p.badge}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="text-[12px] font-mono uppercase text-mid-brown/70 dark:text-cloud-400 mb-1">
                      The Problem
                    </div>
                    <p className="text-[14px] leading-[1.55] text-mid-brown dark:text-cloud-300">
                      {p.pain}
                    </p>
                  </div>

                  <div className="mb-6">
                    <div className="text-[12px] font-mono uppercase text-status-live dark:text-status-live mb-1">
                      Why They Use Weave
                    </div>
                    <p className="text-[14.5px] leading-[1.55] font-normal text-umber-800 dark:text-cloud-50">
                      {p.benefit}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-cloud-200 dark:border-cloud-50/10 space-y-2">
                  {p.features.map((feat) => (
                    <div key={feat} className="flex items-center gap-2 text-[13px] text-mid-brown dark:text-cloud-300">
                      <Check className="size-4 text-status-live shrink-0" />
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
