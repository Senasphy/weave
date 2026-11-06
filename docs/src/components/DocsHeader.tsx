"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, ExternalLink, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { SearchDialog } from "@/components/SearchDialog";
import { headerLinks, secondaryNavDropdowns } from "@/lib/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WeaveLogo } from "@/components/WeaveLogo";
import { cn } from "@/lib/cn";

interface NavDropdownProps {
  dropdown: {
    title: string;
    items: { title: string; href: string }[];
  };
}

function NavHoverDropdown({ dropdown }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Close dropdown on navigation when pathname changes
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  const hasActiveItem = dropdown.items.some(
    (item) => pathname === item.href.split("#")[0]
  );

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className={cn(
          "flex items-center gap-1 py-1 text-xs font-medium transition-colors outline-none cursor-pointer select-none",
          open || hasActiveItem
            ? "text-foreground font-semibold"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-expanded={open}
      >
        <span>{dropdown.title}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 opacity-50 transition-transform duration-200",
            open && "rotate-180 opacity-100 text-foreground"
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full pt-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="w-56 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl shadow-black/10 dark:shadow-black/60">
            <div className="px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {dropdown.title}
            </div>
            <div className="mt-1 space-y-0.5">
              {dropdown.items.map((item) => {
                const isItemActive = pathname === item.href.split("#")[0];
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                      isItemActive
                        ? "bg-accent text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <span>{item.title}</span>
                    <ChevronRight className="h-3 w-3 opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-60 group-hover:translate-x-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface DocsHeaderProps {
  onToggleMobileMenu?: () => void;
}

export function DocsHeader({ onToggleMobileMenu }: DocsHeaderProps) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        {/* Main Top Bar */}
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onToggleMobileMenu}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Brand Logo */}
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <WeaveLogo className="h-6 w-auto" />
            </Link>

            {/* Top Primary Tabs */}
            <nav className="ml-2 hidden items-center gap-1 sm:flex">
              {headerLinks.map((link) => {
                const active =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                      active && "text-foreground font-semibold bg-accent/60"
                    )}
                  >
                    {link.title}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action & Search */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden h-8 w-60 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground sm:flex"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1 text-left">Search documentation...</span>
              <Kbd>⌘K</Kbd>
            </button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Theme Toggle */}
            <ThemeToggle />

            <Button
              variant="outline"
              size="sm"
              className="hidden border-border text-xs font-medium text-foreground hover:bg-accent md:inline-flex"
              asChild
            >
              <a href="https://weave-orchestrator-main.vercel.app" target="_blank" rel="noreferrer">
                Visual editor
                <ExternalLink className="ml-1 h-3 w-3 opacity-60" />
              </a>
            </Button>
          </div>
        </div>

        {/* Secondary Sub-Navigation Bar with hover dropdowns */}
        <div className="hidden h-9 items-center border-t border-border px-4 text-xs font-medium text-muted-foreground lg:flex lg:px-6">
          <div className="flex items-center gap-5">
            {secondaryNavDropdowns.map((dropdown) => (
              <NavHoverDropdown key={dropdown.title} dropdown={dropdown} />
            ))}

            <Link
              href="/concepts"
              className="py-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
            </Link>
          </div>
        </div>
      </header>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
