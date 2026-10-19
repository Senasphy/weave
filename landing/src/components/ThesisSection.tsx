"use client";

import React from "react";

const problemCards = [
  {
    num: "01",
    folderTitle: "The Python Script.",
    headline: "Solved the prototype.\nNot production durability.",
    description: "It made API calls runnable from a terminal. But runs hold state in volatile memory. A worker reboot or connection drop discards hours of upstream reasoning, forcing costly restarts.",
    tags: ["Celery", "LangChain", "FastAPI"],
  },
  {
    num: "02",
    folderTitle: "The Unbounded Loop.",
    headline: "Solved agent autonomy.\nCreated financial landmines.",
    description: "Autonomous tool loops sound magical in demos until a subtle prompt hallucination or recursion trap burns $400 in API tokens in under three minutes while your team sleeps.",
    tags: ["AutoGPT", "ReAct Loops", "Raw SDKs"],
  },
  {
    num: "03",
    folderTitle: "The Automation Gap.",
    headline: "Solved speed.\nSacrificed operational safety.",
    description: "High-stakes operations — issuing refunds, deleting records, emailing clients — should never execute without human sign-off. Traditional scripts either block expensive threads for days or drop state entirely.",
    tags: ["Webhooks", "Ad-Hoc Crons", "Poll Loops"],
  },
];

export function ThesisSection() {
  return (
    <section id="problem" className="py-20 md:py-28 border-b border-cloud-200 dark:border-cloud-50/10">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        {/* SVG clip-path for folder tab */}
        <svg aria-hidden="true" focusable="false" className="h-0 w-0 absolute">
          <defs>
            <clipPath id="folder-tab-clip" clipPathUnits="objectBoundingBox">
              <path d="M 0,0 L 0.690722,0 L 0.814433,0.14 L 1,0.14 L 1,1 L 0,1 Z" />
            </clipPath>
          </defs>
        </svg>

        {/* Header */}
        <div className="max-w-[780px]">
          <h2 className="font-display text-[30px] sm:text-[38px] lg:text-[44px] leading-[1.08] tracking-[-0.025em] text-umber-800 dark:text-cloud-50">
            <span>You have already bought the frontier models.</span>
            <span className="block text-mid-brown dark:text-cloud-300">
              They cannot run production workflows alone.
            </span>
          </h2>
          <p className="mt-4 text-[15px] sm:text-[16px] leading-[1.55] text-mid-brown dark:text-cloud-300 max-w-[620px]">
            Frontier LLMs excel at reasoning, but brittle glue scripts turn them into operational liabilities.
          </p>
        </div>

        {/* 3 Manila / Technical Folder Dossiers */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {problemCards.map((card) => (
            <article
              key={card.num}
              className="flex flex-col overflow-hidden rounded-none border border-cloud-200 dark:border-cloud-50/15 bg-cloud-100 dark:bg-umber-800"
            >
              {/* Folder Header Tab with Cutout */}
              <div
                className="relative h-20 bg-cloud-200 dark:bg-umber-700 flex items-center px-5"
                style={{ clipPath: "polygon(0 0, 72% 0, 84% 100%, 0 100%)" }}
              >
                <div className="flex items-center gap-2.5 font-display text-[15px] font-medium tracking-[-0.01em] text-umber-800 dark:text-cloud-50">
                  <span className="flex size-[18px] shrink-0 items-center justify-center border-[0.75px] border-current text-[9px] leading-none font-mono tabular-nums">
                    {card.num}
                  </span>
                  <span>{card.folderTitle}</span>
                </div>
              </div>

              {/* Dossier Content Area */}
              <div className="flex flex-1 flex-col gap-4 p-6 bg-cloud-50 dark:bg-umber-900 border-t border-cloud-200 dark:border-cloud-50/10">
                <p className="font-display text-[19px] font-medium leading-[1.25] tracking-[-0.01em] text-charcoal dark:text-cloud-50 whitespace-pre-line">
                  {card.headline}
                </p>

                <p className="text-[14px] leading-[1.55] text-mid-brown dark:text-cloud-300">
                  {card.description}
                </p>

                {/* Technical Integration Tags */}
                <ul className="mt-auto flex flex-wrap items-center gap-1.5 pt-4 border-t border-cloud-200 dark:border-cloud-50/10">
                  {card.tags.map((tag) => (
                    <li key={tag}>
                      <span className="inline-flex h-5 items-center gap-1 rounded-[2px] border-[0.5px] border-cloud-400 dark:border-cloud-50/25 px-2 font-display text-[11px] text-cloud-700 dark:text-cloud-300">
                        {tag}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
