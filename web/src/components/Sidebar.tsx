'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Network,
  Play,
  ShieldAlert,
  Settings,
  BookOpen,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { WeaveLogo } from '@/components/WeaveLogo';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenSearch?: () => void;
}

export function Sidebar({
  collapsed = false,
  onToggleCollapse,
  onOpenSearch,
}: SidebarProps) {
  const pathname = usePathname();

  // Quick stats for badges
  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows'],
    queryFn: api.listWorkflows,
  });

  const { data: runs = [] } = useQuery({
    queryKey: ['runs'],
    queryFn: () => api.listRuns(),
    refetchInterval: 5000,
  });

  const { data: gates = [] } = useQuery({
    queryKey: ['gates'],
    queryFn: api.listGates,
    refetchInterval: 5000,
  });

  const activeRunsCount = runs.filter((r) => r.status === 'running').length;
  const pendingGatesCount = gates.length;

  return (
    <aside
      className={cn(
        'h-full bg-white border-r border-border flex flex-col justify-between shrink-0 transition-all duration-200 z-30 select-none',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Top Part: Brand + Search + Main Navigation */}
      <div className="flex flex-col min-h-0">
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
          <Link
            href="/"
            className={cn(
              'flex items-center gap-2 overflow-hidden transition-opacity hover:opacity-90',
              collapsed && 'justify-center w-full'
            )}
            title="Weave Home"
          >
            <WeaveLogo variant={collapsed ? 'mark' : 'full'} />
          </Link>

          {!collapsed && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapsed Toggle Button when collapsed */}
        {collapsed && onToggleCollapse && (
          <div className="p-2 border-b border-border flex justify-center">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search Bar - opens global command / search dialog */}
        {!collapsed && (
          <div className="px-3 pt-3 pb-1">
            <button
              type="button"
              onClick={onOpenSearch}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded border border-border bg-slate-50 hover:bg-slate-100/80 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer text-left"
            >
              <span className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>Search...</span>
              </span>
              <kbd className="px-1.5 py-0.5 rounded text-[10px] text-slate-500 bg-white border border-border leading-none">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {/* Main Navigation Group */}
          <div>
            {!collapsed && (
              <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Navigation
              </div>
            )}
            <nav className="space-y-0.5">
              {/* Workflows */}
              <Link
                href="/"
                className={cn(
                  'group relative flex items-center gap-3 px-2.5 py-2 rounded text-xs font-medium transition-colors select-none',
                  pathname === '/' || pathname.startsWith('/workflows')
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
                  collapsed && 'justify-center px-0'
                )}
                title="Workflows"
              >
                {(pathname === '/' || pathname.startsWith('/workflows')) && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-slate-900" />
                )}
                <Network
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    pathname === '/' || pathname.startsWith('/workflows')
                      ? 'text-slate-900'
                      : 'text-slate-500 group-hover:text-slate-900'
                  )}
                />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="truncate">Workflows</span>
                    {workflows.length > 0 && (
                      <span className="text-[11px] tabular-nums px-1.5 py-0.2 rounded bg-white border border-border text-slate-500">
                        {workflows.length}
                      </span>
                    )}
                  </div>
                )}
              </Link>

              {/* Runs */}
              <Link
                href="/runs"
                className={cn(
                  'group relative flex items-center gap-3 px-2.5 py-2 rounded text-xs font-medium transition-colors select-none',
                  pathname.startsWith('/runs')
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
                  collapsed && 'justify-center px-0'
                )}
                title="Runs"
              >
                {pathname.startsWith('/runs') && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-slate-900" />
                )}
                <Play
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    pathname.startsWith('/runs')
                      ? 'text-slate-900'
                      : 'text-slate-500 group-hover:text-slate-900'
                  )}
                />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="truncate">Runs</span>
                    {activeRunsCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded border border-zinc-300 bg-zinc-100 text-zinc-900 font-mono">
                        <span className="inline-flex rounded-full h-1.5 w-1.5 bg-zinc-800" />
                        {activeRunsCount}
                      </span>
                    ) : (
                      runs.length > 0 && (
                        <span className="text-[11px] tabular-nums px-1.5 py-0.5 rounded bg-slate-100 border border-border text-slate-500">
                          {runs.length}
                        </span>
                      )
                    )}
                  </div>
                )}
              </Link>

              {/* Approvals */}
              <Link
                href="/gates"
                className={cn(
                  'group relative flex items-center gap-3 px-2.5 py-2 rounded text-xs font-medium transition-colors select-none',
                  pathname.startsWith('/gates')
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
                  collapsed && 'justify-center px-0'
                )}
                title="Approvals"
              >
                {pathname.startsWith('/gates') && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-slate-900" />
                )}
                <ShieldAlert
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    pathname.startsWith('/gates')
                      ? 'text-slate-900'
                      : 'text-slate-500 group-hover:text-slate-900'
                  )}
                />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="truncate">Approvals</span>
                    {pendingGatesCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded border border-amber-200/80 bg-amber-50 text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {pendingGatesCount}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            </nav>
          </div>

          {/* System & Configuration Group */}
          <div>
            {!collapsed && (
              <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                System
              </div>
            )}
            <nav className="space-y-0.5">
              <Link
                href="/settings"
                className={cn(
                  'group relative flex items-center gap-3 px-2.5 py-2 rounded text-xs font-medium transition-colors select-none',
                  pathname.startsWith('/settings')
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
                  collapsed && 'justify-center px-0'
                )}
                title="Settings"
              >
                {pathname.startsWith('/settings') && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-slate-900" />
                )}
                <Settings
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    pathname.startsWith('/settings')
                      ? 'text-slate-900'
                      : 'text-slate-500 group-hover:text-slate-900'
                  )}
                />
                {!collapsed && <span className="truncate">Settings</span>}
              </Link>

              {/* Documentation External Link */}
              <a
                href="http://localhost:3010"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'group flex items-center gap-3 px-2.5 py-2 rounded text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors select-none',
                  collapsed && 'justify-center px-0'
                )}
                title="Open Documentation Site"
              >
                <BookOpen className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-slate-900 transition-colors" />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between">
                    <span>Documentation</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </div>
                )}
              </a>
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom Footer: Workspace card */}
      <div className="p-3 border-t border-border bg-white">
        {collapsed ? (
          <div className="flex justify-center" title="Weave">
            <div className="w-8 h-8 rounded bg-slate-900 text-white font-semibold text-xs flex items-center justify-center">
              W
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2 rounded bg-slate-50 hover:bg-slate-100 border border-border transition-colors cursor-pointer group">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                W
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-900 truncate">
                  Weave Workspace
                </div>
                <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>v1.0 • Ready</span>
                </div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0 ml-1" />
          </div>
        )}
      </div>
    </aside>
  );
}
