"use client";

import React from "react";

export function MetricsSection() {
  return (
    <section id="roi" className="py-20 md:py-28 border-b border-cloud-200 dark:border-cloud-50/10 bg-cloud-50 dark:bg-umber-800">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Copy Column */}
          <div>
            <h2 className="font-display text-[32px] md:text-[48px] leading-[1.08] tracking-[-0.025em] text-charcoal dark:text-cloud-50">
              <span className="block opacity-65">The first workflow pays for itself.</span>
              <span className="block">The fifth is nearly free.</span>
            </h2>
            <p className="mt-5 max-w-[500px] text-[16px] md:text-[17px] leading-[1.65] text-mid-brown dark:text-cloud-300">
              Define your JSON schemas, register your tools, configure your spending boundaries. Do that once in Weave and no team pays to re-solve durability again.
            </p>
          </div>

          {/* Technical CAD Curve Figure */}
          <div className="border border-cloud-200 bg-cloud-100 p-6 dark:border-cloud-50/15 dark:bg-umber-900 rounded-none">
            {/* Legend */}
            <div className="flex items-center gap-6 font-mono text-[11px] text-mid-brown dark:text-cloud-300 pb-4 mb-4 border-b border-cloud-200 dark:border-cloud-50/10">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-status-live" />
                <span>Effort per Workflow (Drops)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-lilac-400" />
                <span>Reliability &amp; Value (Climbs)</span>
              </div>
            </div>

            {/* SVG Plot */}
            <svg
              viewBox="0 0 500 240"
              className="w-full h-auto overflow-visible font-mono text-[10px]"
              aria-hidden="true"
            >
              {/* CAD Vertical Grid Lines */}
              {[50, 150, 250, 350, 450].map((x) => (
                <line
                  key={x}
                  x1={x}
                  y1={20}
                  x2={x}
                  y2={200}
                  stroke="currentColor"
                  strokeOpacity="0.12"
                  strokeDasharray="2 2"
                />
              ))}

              {/* CAD Horizontal Grid Lines */}
              {[40, 90, 140, 190].map((y) => (
                <line
                  key={y}
                  x1={30}
                  y1={y}
                  x2={470}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.12"
                  strokeDasharray="2 2"
                />
              ))}

              {/* Effort Curve (Dropping green curve) */}
              <path
                d="M 50 40 Q 150 180, 450 190"
                fill="none"
                stroke="#00bb7f"
                strokeWidth="2.5"
              />

              {/* Value Curve (Rising lilac curve) */}
              <path
                d="M 50 190 Q 200 170, 450 40"
                fill="none"
                stroke="#a392f3"
                strokeWidth="2.5"
              />

              {/* X Labels */}
              <text x="50" y="220" textAnchor="middle" fill="currentColor" fillOpacity="0.6">
                Run 01
              </text>
              <text x="150" y="220" textAnchor="middle" fill="currentColor" fillOpacity="0.6">
                Run 02
              </text>
              <text x="250" y="220" textAnchor="middle" fill="currentColor" fillOpacity="0.6">
                Run 05
              </text>
              <text x="350" y="220" textAnchor="middle" fill="currentColor" fillOpacity="0.6">
                Run 10
              </text>
              <text x="450" y="220" textAnchor="middle" fill="currentColor" fillOpacity="0.6">
                Run 50+
              </text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
