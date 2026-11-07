"use client";

import React from "react";
import { Cpu, Database, Network, ShieldCheck, Zap, Lock, Terminal } from "lucide-react";

const techStack = [
  { name: "Google Gemini 3.8 Flash", desc: "Frontier multimodal & reasoning" },
  { name: "Anthropic Opus 5.5", desc: "Long-horizon agentic synthesis" },
  { name: "OpenAI GPT-6.1 Sol & o3", desc: "Complex tool calling" },
  { name: "Durable Checkpoints", desc: "Zero lost workflow state" },
  { name: "Google CEL", desc: "Sandboxed deterministic routing" },
  { name: "OpenAPI 3.1", desc: "Strict typed client & server contract" },
  { name: "SSE Streams", desc: "Sub-millisecond real-time execution" },
  { name: "React Flow", desc: "Interactive visual canvas editor" },
];

export function SocialProofTicker() {
  return (
    <section className="border-y border-umber-800/10 dark:border-cloud-100/10 bg-cloud-100/30 dark:bg-umber-950/30 py-6 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 mb-3">
        <p className="text-center text-[11px] font-mono uppercase tracking-widest text-umber-500 dark:text-cloud-400">
          Engineered for Multi-Provider Reliability &bull; Built on Open Production Standards
        </p>
      </div>

      <div className="relative flex overflow-x-hidden">
        <div className="flex animate-ticker whitespace-nowrap gap-8 items-center py-2">
          {[...techStack, ...techStack].map((item, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-2.5 rounded-full border border-umber-800/10 dark:border-cloud-100/10 bg-cloud-50 dark:bg-umber-900 px-4 py-1.5 text-[13px] text-umber-800 dark:text-cloud-200 shadow-2xs"
            >
              <span className="size-1.5 rounded-full bg-lilac-500" />
              <span className="font-semibold">{item.name}</span>
              <span className="text-umber-400 dark:text-cloud-500 font-mono text-[11px]">
                {item.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
