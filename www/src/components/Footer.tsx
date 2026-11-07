"use client";

import React from "react";
import Link from "next/link";
import { WeaveLogo } from "./WeaveLogo";

export function Footer() {
  return (
    <footer className="bg-cloud-950 text-cloud-200 py-16 md:py-20 border-t border-cloud-900">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 sm:gap-10">
          {/* Logo & Manifesto */}
          <div className="sm:col-span-2">
            <WeaveLogo variant="full" textClassName="text-[20px] text-cloud-50" />
            <p className="mt-4 max-w-sm text-[14px] leading-[1.6] text-cloud-400">
              One current, attributable runtime for your business workflows. Backed by durable cloud state and hard budget governance.
            </p>
          </div>

          {/* Links: Engine */}
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-cloud-400 mb-4">
              Architecture
            </div>
            <ul className="space-y-2.5 text-[14px] text-cloud-300">
              <li>
                <Link href="#knowledge" className="hover:text-cloud-50 transition-colors">
                  Durable State
                </Link>
              </li>
              <li>
                <Link href="#roi" className="hover:text-cloud-50 transition-colors">
                  Compounding ROI
                </Link>
              </li>
              <li>
                <Link href="#security" className="hover:text-cloud-50 transition-colors">
                  Security &amp; Redaction
                </Link>
              </li>
              <li>
                <Link href="#workflows" className="hover:text-cloud-50 transition-colors">
                  Production Workflows
                </Link>
              </li>
            </ul>
          </div>

          {/* Links: Platform */}
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-cloud-400 mb-4">
              Platform
            </div>
            <ul className="space-y-2.5 text-[14px] text-cloud-300">
              <li>
                <a href="https://weave-orchestrator-main.vercel.app" className="hover:text-cloud-50 transition-colors">
                  Visual Canvas
                </a>
              </li>
              <li>
                <a href="https://weave-orchestrator-main.vercel.app/runs" className="hover:text-cloud-50 transition-colors">
                  Live Run Viewer
                </a>
              </li>
              <li>
                <a href="https://weave-orchestrator-main.vercel.app/gates" className="hover:text-cloud-50 transition-colors">
                  Human Approvals
                </a>
              </li>
            </ul>
          </div>

          {/* Links: Developer Docs */}
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-cloud-400 mb-4">
              Developer Docs
            </div>
            <ul className="space-y-2.5 text-[14px] text-cloud-300">
              <li>
                <a href="https://weave-documentation.vercel.app/getting-started" target="_blank" rel="noreferrer" className="hover:text-cloud-50 transition-colors">
                  Quickstart Guide
                </a>
              </li>
              <li>
                <a href="https://weave-documentation.vercel.app/api-reference" target="_blank" rel="noreferrer" className="hover:text-cloud-50 transition-colors">
                  OpenAPI Spec
                </a>
              </li>
              <li>
                <a href="https://github.com/senasphy/weave" target="_blank" rel="noreferrer" className="hover:text-cloud-50 transition-colors">
                  GitHub Repository
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-8 border-t border-cloud-900 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[12px] text-cloud-500">
          <div>&copy; {new Date().getFullYear()} Weave Systems. Apache 2.0 Open Source.</div>
        </div>
      </div>
    </footer>
  );
}
