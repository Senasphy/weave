"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DocsHeader } from "./DocsHeader";
import { DocsSidebar } from "./DocsSidebar";
import { WeaveLogo } from "./WeaveLogo";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";

export interface TocItem {
  id: string;
  title: string;
  level?: number;
}

interface DocsLayoutProps {
  children: React.ReactNode;
  toc?: TocItem[];
  currentSection?: string;
  currentPage?: string;
  previousPage?: { title: string; href: string };
  nextPage?: { title: string; href: string };
}

export function DocsLayout({
  children,
  toc = [],
  currentSection,
  currentPage,
  previousPage,
  nextPage,
}: DocsLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (toc.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0% -60% 0%" }
    );

    for (const item of toc) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [toc]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DocsHeader onToggleMobileMenu={() => setMobileOpen(true)} />

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent className="w-72 bg-card border-border p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <Link href="/" onClick={() => setMobileOpen(false)} className="hover:opacity-90">
              <WeaveLogo className="h-5 w-auto" />
            </Link>
          </div>
          <DocsSidebar onItemClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="mx-auto flex w-full max-w-[1440px]">
        {/* Left Sidebar */}
        <aside className="sticky top-[5.75rem] hidden h-[calc(100vh-5.75rem)] w-64 shrink-0 border-r border-border lg:block bg-background">
          <DocsSidebar />
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl">
            {(currentSection || currentPage) && (
              <nav
                aria-label="Breadcrumb"
                className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <Link href="/" className="hover:text-foreground transition-colors">
                  Docs
                </Link>
                {currentSection && (
                  <>
                    <ChevronRight className="h-3 w-3 opacity-60" />
                    <span>{currentSection}</span>
                  </>
                )}
                {currentPage && (
                  <>
                    <ChevronRight className="h-3 w-3 opacity-60" />
                    <span className="text-foreground font-medium">{currentPage}</span>
                  </>
                )}
              </nav>
            )}

            <article className="docs-prose">{children}</article>

            {/* Pagination Cards at Bottom */}
            {(previousPage || nextPage) && (
              <div className="mt-16 grid gap-3 border-t border-border pt-8 sm:grid-cols-2">
                {previousPage ? (
                  <Link
                    href={previousPage.href}
                    className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-accent/50"
                  >
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Previous</div>
                    <div className="mt-1 text-sm font-medium text-foreground group-hover:text-foreground transition-colors">
                      ← {previousPage.title}
                    </div>
                  </Link>
                ) : (
                  <div />
                )}
                {nextPage && (
                  <Link
                    href={nextPage.href}
                    className="group rounded-xl border border-border bg-card p-4 text-right transition-colors hover:border-foreground/20 hover:bg-accent/50"
                  >
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Next</div>
                    <div className="mt-1 text-sm font-medium text-foreground group-hover:text-foreground transition-colors">
                      {nextPage.title} →
                    </div>
                  </Link>
                )}
              </div>
            )}

            {/* Subtle Documentation Footer */}
            <footer className="mt-16 border-t border-border pt-6 pb-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <WeaveLogo variant="mark" className="h-3.5 w-auto opacity-70" />
                <span className="font-medium text-foreground/80">Weave</span>
                <span className="opacity-40">·</span>
                <span>Deterministic multi-agent graph orchestration</span>
              </div>
              <p className="opacity-70">© 2026 Weave. All rights reserved.</p>
            </footer>
          </div>
        </main>

        {/* Right Sidebar: Table of Contents on wide screens */}
        {toc.length > 0 && (
          <aside className="sticky top-[5.75rem] hidden h-[calc(100vh-5.75rem)] w-56 shrink-0 xl:block py-8 pr-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              On this page
            </div>
            <nav className="space-y-1">
              {toc.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={cn(
                      "block text-xs py-1 transition-colors hover:text-foreground",
                      item.level === 3 ? "pl-3 text-muted-foreground/80" : "text-muted-foreground",
                      isActive ? "text-foreground font-medium" : ""
                    )}
                  >
                    {item.title}
                  </a>
                );
              })}
            </nav>
          </aside>
        )}
      </div>
    </div>
  );
}
