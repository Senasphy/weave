"use client";

import React from "react";
import { ArrowRight, BookOpen, Github } from "lucide-react";

export function FinalCtaSection() {
  return (
    <section className="py-24 md:py-32 border-b border-cloud-200 dark:border-cloud-50/10 bg-cloud-50 dark:bg-umber-900">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <div className="max-w-[780px]">
          <h2 className="font-display text-[36px] sm:text-[50px] lg:text-[64px] leading-[1.04] tracking-[-0.03em] text-umber-800 dark:text-cloud-50">
            Find out how durable{" "}
            <span className="block text-mid-brown dark:text-cloud-300">
              your workflows actually are.
            </span>
          </h2>

          <p className="mt-6 max-w-[540px] text-[16px] sm:text-[18px] leading-[1.6] text-mid-brown dark:text-cloud-300">
            Stop debugging lost runs, runaway API bills, and fragile Python loops. Connect your models, tools, and human approvals into structured workflows backed by PostgreSQL.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a
              href="https://weave-orchestrator-main.vercel.app"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-[4px] bg-umber-800 px-6 text-[15px] font-medium tracking-[0.01em] text-cloud-50 hover:bg-umber-700 dark:bg-cloud-100 dark:text-umber-900 dark:hover:bg-cloud-50 transition-colors"
            >
              <span>Launch Visual Editor</span>
              <ArrowRight className="size-[14px]" />
            </a>

            <a
              href="https://weave-documentation.vercel.app"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center rounded-[4px] border border-umber-400 bg-transparent px-6 text-[15px] font-medium tracking-[0.01em] text-umber-800 hover:border-current hover:bg-current/5 dark:border-cloud-100/40 dark:text-cloud-100 transition-colors"
            >
              Read Documentation
            </a>

            <a
              href="https://github.com/senasphy/weave"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-[4px] border border-cloud-300 bg-transparent px-5 text-[15px] font-medium tracking-[0.01em] text-mid-brown hover:text-umber-800 dark:border-cloud-50/20 dark:text-cloud-300 dark:hover:text-cloud-50 transition-colors"
            >
              <Github className="size-4 opacity-75" />
              <span>GitHub</span>
            </a>
          </div>

          {/* Quick CLI command */}
          <div className="mt-8 flex items-center gap-2 font-mono text-[12px] text-cloud-600 dark:text-cloud-400">
            <span className="text-cloud-400 dark:text-cloud-600">$</span>
            <code>go run ./cmd/weave run examples/support_triage.json</code>
          </div>
        </div>
      </div>
    </section>
  );
}
