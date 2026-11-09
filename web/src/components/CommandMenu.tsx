'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Network,
  Play,
  ShieldAlert,
  Settings,
  BookOpen,
  ArrowRight,
  X,
  FileCode,
} from 'lucide-react';
import { api } from '@/lib/api';

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandMenu({ isOpen, onClose }: CommandMenuProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows'],
    queryFn: api.listWorkflows,
    enabled: isOpen,
  });

  const { data: runs = [] } = useQuery({
    queryKey: ['runs'],
    queryFn: () => api.listRuns(),
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setQuery('');
        setSelectedIndex(0);
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const items = useMemo(() => {
    const q = query.toLowerCase().trim();
    const results: Array<{
      id: string;
      title: string;
      subtitle?: string;
      category: 'Workflows' | 'Runs' | 'Navigation';
      href: string;
      icon: React.ComponentType<{ className?: string }>;
    }> = [];

    // Navigation items
    const navItems = [
      { id: 'nav-workflows', title: 'Workflows Dashboard', subtitle: 'Manage agent graphs', category: 'Navigation' as const, href: '/', icon: Network },
      { id: 'nav-runs', title: 'Execution Runs', subtitle: 'Live run traces and logs', category: 'Navigation' as const, href: '/runs', icon: Play },
      { id: 'nav-gates', title: 'Human Gates Inbox', subtitle: 'Pending approvals', category: 'Navigation' as const, href: '/gates', icon: ShieldAlert },
      { id: 'nav-settings', title: 'Settings & Tools', subtitle: 'System config and tool definitions', category: 'Navigation' as const, href: '/settings', icon: Settings },
      { id: 'nav-docs', title: 'Documentation', subtitle: 'Architecture guide and specs', category: 'Navigation' as const, href: 'https://weave-documentation.vercel.app', icon: BookOpen },
    ];

    navItems.forEach((n) => {
      if (!q || n.title.toLowerCase().includes(q) || (n.subtitle && n.subtitle.toLowerCase().includes(q))) {
        results.push(n);
      }
    });

    // Workflows
    workflows.forEach((w) => {
      if (
        !q ||
        w.name.toLowerCase().includes(q) ||
        (w.description && w.description.toLowerCase().includes(q)) ||
        w.id.toLowerCase().includes(q)
      ) {
        results.push({
          id: `wf-${w.id}`,
          title: w.name,
          subtitle: w.description || `ID: ${w.id}`,
          category: 'Workflows',
          href: `/workflows/${w.id}`,
          icon: Network,
        });
      }
    });

    // Recent Runs
    runs.slice(0, 8).forEach((r) => {
      if (!q || r.id.toLowerCase().includes(q) || r.version_id.toLowerCase().includes(q)) {
        results.push({
          id: `run-${r.id}`,
          title: `Run ${r.id.slice(0, 8)} (${r.status})`,
          subtitle: `Version: ${r.version_id.slice(0, 8)}`,
          category: 'Runs',
          href: `/runs/${r.id}`,
          icon: Play,
        });
      }
    });

    return results;
  }, [query, workflows, runs]);

  const handleSelect = (item: (typeof items)[0]) => {
    onClose();
    if (item.href.startsWith('http')) {
      window.open(item.href, '_blank', 'noopener,noreferrer');
    } else {
      router.push(item.href);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        handleSelect(items[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command search menu"
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-24 px-3 sm:px-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border bg-card">
          <Search className="w-4 h-4 text-muted-foreground shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workflows, runs, or navigation..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary mr-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="text-[10px] font-mono text-muted-foreground bg-secondary border border-border rounded-md px-1.5 py-0.5 select-none">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-accent text-foreground border border-white/[0.08] shadow-sm'
                        : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg border border-border bg-secondary flex items-center justify-center text-foreground shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-medium text-foreground truncate">
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div className="text-[11px] text-muted-foreground truncate font-mono">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
                        {item.category}
                      </span>
                      {isSelected && <ArrowRight className="w-3.5 h-3.5 text-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Keyboard Footer */}
        <div className="px-4 py-2.5 border-t border-border bg-secondary/40 flex items-center justify-between text-[11px] text-muted-foreground select-none font-mono">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-card border border-border text-foreground mr-1 text-[10px]">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-card border border-border text-foreground mr-1 text-[10px]">
                ↓
              </kbd>
              Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-card border border-border text-foreground mr-1 text-[10px]">
                ↵
              </kbd>
              Select
            </span>
          </div>
          <span>{items.length} items</span>
        </div>
      </div>
    </div>
  );
}
