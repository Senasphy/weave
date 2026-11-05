'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Network, Play, ShieldAlert, Settings, ArrowUpRight, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { WeaveLogo } from '@/components/WeaveLogo';
import { StatusBadge } from '@/components/StatusBadge';
import { UserNav } from '@/components/auth/UserNav';

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Workflows', icon: Network },
    { href: '/runs', label: 'Runs', icon: Play },
    { href: '/gates', label: 'Gates', icon: ShieldAlert },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full h-14 shrink-0 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 select-none transition-all duration-200">
      {/* Left: Logo, Separator, Nav Items */}
      <div className="flex items-center gap-4 sm:gap-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          aria-label="Weave home"
        >
          <WeaveLogo className="h-6 w-auto" />
          <span className="text-[10px] tabular-nums font-medium px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground leading-none tracking-wide">
            v1.0
          </span>
        </Link>

        {/* Separator between logo and nav items */}
        <div className="h-4 w-px bg-border shrink-0" aria-hidden="true" />

        {/* Navigation links matching docs */}
        <nav className="flex items-center gap-1" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-2 select-none outline-none',
                  isActive
                    ? 'text-foreground font-semibold bg-accent/80'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                )}
              >
                <Icon
                  className={cn(
                    'w-3.5 h-3.5 transition-colors duration-200',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right side: Docs Link & System Status indicator */}
      <div className="flex items-center gap-3">
        <a
          href="http://localhost:3010"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-slate-100 border border-transparent hover:border-border transition-colors"
          title="Open Weave Documentation"
        >
          <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Docs</span>
          <ArrowUpRight className="w-3 h-3 text-muted-foreground/60" />
        </a>

        <StatusBadge status="active" label="System Active" pulse={false} />

        <div className="h-4 w-px bg-border shrink-0" aria-hidden="true" />

        <UserNav />
      </div>
    </header>
  );
}
