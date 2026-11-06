'use client';

import React from 'react';
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
import { useSession, useActiveOrganization } from '@/lib/auth-client';

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

  const { data: session } = useSession();
  const { data: activeOrg } = useActiveOrganization();

  const workspaceName =
    activeOrg?.name ||
    (session?.user ? `${session.user.name || 'Personal'} Workspace` : 'Weave Workspace');
  const workspaceInitial = (workspaceName.charAt(0) || 'W').toUpperCase();

  const isWorkflowsActive = pathname === '/' || pathname.startsWith('/workflows');
  const isRunsActive = pathname.startsWith('/runs');
  const isGatesActive = pathname.startsWith('/gates');
  const isSettingsActive = pathname.startsWith('/settings');

  return (
    <aside
      className={cn(
        'h-full bg-background border-r border-border flex flex-col justify-between shrink-0 transition-all duration-200 z-30 select-none',
        collapsed ? 'w-16' : 'w-64'
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
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
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
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search Bar - opens global command / search dialog */}
        {!collapsed && (
          <div className="px-3 pt-3.5 pb-1">
            <button
              type="button"
              onClick={onOpenSearch}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-card/60 hover:bg-card hover:border-white/20 text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer text-left shadow-sm group"
            >
              <span className="flex items-center gap-2.5">
                <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="truncate">Search...</span>
              </span>
              <kbd className="px-1.5 py-0.5 rounded-md text-[10px] text-muted-foreground bg-secondary border border-border leading-none font-mono">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {/* Main Navigation Group */}
          <div>
            {!collapsed && (
              <div className="px-2 mb-2 text-[10.5px] font-mono font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">
                Navigation
              </div>
            )}
            <nav className="space-y-1">
              {/* Workflows */}
              <Link
                href="/"
                className={cn(
                  'group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all select-none',
                  isWorkflowsActive
                    ? 'bg-accent/80 text-foreground font-semibold border border-white/[0.08] shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]',
                  collapsed && 'justify-center px-0'
                )}
                title="Workflows"
              >
                <Network
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    isWorkflowsActive ? 'text-indigo-400' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="truncate">Workflows</span>
                    {workflows.length > 0 && (
                      <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-secondary/80 border border-border text-muted-foreground">
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
                  'group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all select-none',
                  isRunsActive
                    ? 'bg-accent/80 text-foreground font-semibold border border-white/[0.08] shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]',
                  collapsed && 'justify-center px-0'
                )}
                title="Runs"
              >
                <Play
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    isRunsActive ? 'text-indigo-400' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="truncate">Runs</span>
                    {activeRunsCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tabular-nums px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/15 text-indigo-300 font-mono">
                        <span className="inline-flex rounded-full h-1.5 w-1.5 bg-indigo-400" />
                        {activeRunsCount}
                      </span>
                    ) : (
                      runs.length > 0 && (
                        <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-secondary/80 border border-border text-muted-foreground">
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
                  'group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all select-none',
                  isGatesActive
                    ? 'bg-accent/80 text-foreground font-semibold border border-white/[0.08] shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]',
                  collapsed && 'justify-center px-0'
                )}
                title="Approvals"
              >
                <ShieldAlert
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    isGatesActive ? 'text-amber-400' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="truncate">Approvals</span>
                    {pendingGatesCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tabular-nums px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-300 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
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
              <div className="px-2 mb-2 text-[10.5px] font-mono font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">
                System
              </div>
            )}
            <nav className="space-y-1">
              <Link
                href="/settings"
                className={cn(
                  'group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all select-none',
                  isSettingsActive
                    ? 'bg-accent/80 text-foreground font-semibold border border-white/[0.08] shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]',
                  collapsed && 'justify-center px-0'
                )}
                title="Settings"
              >
                <Settings
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    isSettingsActive ? 'text-indigo-400' : 'text-muted-foreground group-hover:text-foreground'
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
                  'group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all select-none',
                  collapsed && 'justify-center px-0'
                )}
                title="Open Documentation Site"
              >
                <BookOpen className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between">
                    <span>Documentation</span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                  </div>
                )}
              </a>
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom Footer: Workspace card (Removed 'Active' label & green pulse as requested) */}
      <div className="p-3 border-t border-border bg-background">
        {collapsed ? (
          <div className="flex justify-center" title={workspaceName}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-xs flex items-center justify-center shadow-sm">
              {workspaceInitial}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border hover:border-white/20 hover:bg-accent/40 transition-all cursor-pointer group shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                {workspaceInitial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-foreground truncate">
                  {workspaceName}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {activeOrg ? 'Team Workspace' : 'Personal Workspace'}
                </div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 ml-1" />
          </div>
        )}
      </div>
    </aside>
  );
}
