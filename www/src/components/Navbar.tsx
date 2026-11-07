"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { WeaveLogo } from "./WeaveLogo";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-3 md:pt-4 transition-all duration-200">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <div
          className={`flex h-14 items-center justify-between rounded-[8px] px-4 sm:px-6 transition-all duration-200 ${
            scrolled
              ? "border border-cloud-200/80 bg-cloud-50/90 shadow-sm backdrop-blur-md dark:border-cloud-50/10 dark:bg-umber-900/90"
              : "border border-transparent bg-transparent"
          }`}
        >
          {/* Brand */}
          <Link href="/" className="inline-flex items-center gap-2">
            <WeaveLogo variant="full" textClassName="text-[18px] font-medium tracking-[-0.02em]" />
          </Link>

          {/* Center Links */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              href="#use-cases"
              className="inline-flex items-center rounded-[8px] px-3.5 py-1.5 text-[14px] font-medium tracking-[0.01em] text-mid-brown hover:text-umber-800 dark:text-cloud-300 dark:hover:text-cloud-50 transition-colors"
            >
              Who It's For
            </Link>
            <Link
              href="#problem"
              className="inline-flex items-center rounded-[8px] px-3.5 py-1.5 text-[14px] font-medium tracking-[0.01em] text-mid-brown hover:text-umber-800 dark:text-cloud-300 dark:hover:text-cloud-50 transition-colors"
            >
              The Problem
            </Link>
            <Link
              href="#comparison"
              className="inline-flex items-center rounded-[8px] px-3.5 py-1.5 text-[14px] font-medium tracking-[0.01em] text-mid-brown hover:text-umber-800 dark:text-cloud-300 dark:hover:text-cloud-50 transition-colors"
            >
              Comparison
            </Link>
            <Link
              href="#security"
              className="inline-flex items-center rounded-[8px] px-3.5 py-1.5 text-[14px] font-medium tracking-[0.01em] text-mid-brown hover:text-umber-800 dark:text-cloud-300 dark:hover:text-cloud-50 transition-colors"
            >
              Safety &amp; Costs
            </Link>
            <Link
              href="#workflows"
              className="inline-flex items-center rounded-[8px] px-3.5 py-1.5 text-[14px] font-medium tracking-[0.01em] text-mid-brown hover:text-umber-800 dark:text-cloud-300 dark:hover:text-cloud-50 transition-colors"
            >
              Workflows
            </Link>
            <a
              href="https://weave-documentation.vercel.app"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-[8px] px-3.5 py-1.5 text-[14px] font-medium tracking-[0.01em] text-mid-brown hover:text-umber-800 dark:text-cloud-300 dark:hover:text-cloud-50 transition-colors"
            >
              Docs
            </a>
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <a
              href="https://weave-orchestrator-main.vercel.app"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[4px] bg-umber-800 px-2.5 sm:px-3.5 text-[13px] sm:text-[14px] font-medium tracking-[0.01em] text-cloud-50 hover:bg-umber-700 dark:bg-cloud-100 dark:text-umber-900 dark:hover:bg-cloud-50 transition-colors"
            >
              <span className="hidden sm:inline">Launch Weave</span>
              <span className="sm:hidden">Studio</span>
              <ArrowRight className="size-[13px]" />
            </a>

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="inline-flex size-9 items-center justify-center rounded-[4px] border border-cloud-200 text-umber-800 dark:border-cloud-50/15 dark:text-cloud-100 lg:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="mt-2 rounded-[8px] border border-cloud-200 bg-cloud-50 p-4 shadow-md dark:border-cloud-50/15 dark:bg-umber-900 lg:hidden flex flex-col gap-2">
            <Link
              href="#use-cases"
              onClick={() => setMobileOpen(false)}
              className="py-1.5 text-[14px] font-medium text-mid-brown dark:text-cloud-300"
            >
              Who It's For
            </Link>
            <Link
              href="#problem"
              onClick={() => setMobileOpen(false)}
              className="py-1.5 text-[14px] font-medium text-mid-brown dark:text-cloud-300"
            >
              The Problem
            </Link>
            <Link
              href="#comparison"
              onClick={() => setMobileOpen(false)}
              className="py-1.5 text-[14px] font-medium text-mid-brown dark:text-cloud-300"
            >
              Comparison
            </Link>
            <Link
              href="#security"
              onClick={() => setMobileOpen(false)}
              className="py-1.5 text-[14px] font-medium text-mid-brown dark:text-cloud-300"
            >
              Safety &amp; Costs
            </Link>
            <Link
              href="#workflows"
              onClick={() => setMobileOpen(false)}
              className="py-1.5 text-[14px] font-medium text-mid-brown dark:text-cloud-300"
            >
              Workflows
            </Link>
            <a
              href="https://weave-documentation.vercel.app"
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileOpen(false)}
              className="py-1.5 text-[14px] font-medium text-mid-brown dark:text-cloud-300"
            >
              Docs &rarr;
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
