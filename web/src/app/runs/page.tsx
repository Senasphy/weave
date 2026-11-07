'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  Play,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileCode,
  Activity,
  Sparkles,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

const FILTER_TABS = [
  { label: 'All runs', value: '' },
  { label: 'Running', value: 'running' },
  { label: 'Awaiting Approval', value: 'waiting_human' },
  { label: 'Succeeded', value: 'succeeded' },
  { label: 'Failed', value: 'failed' },
] as const;

function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

function formatDateFull(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  } catch {
    return isoString;
  }
}

export default function RunsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['runs'],
    queryFn: () => api.listRuns(),
    refetchInterval: 3000,
  });

  const runningCount = runs.filter((r) => r.status === 'running').length;
  const waitingCount = runs.filter((r) => r.status === 'waiting_human').length;
  const succeededCount = runs.filter((r) => r.status === 'succeeded').length;

  const filtered = runs.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      r.id.toLowerCase().includes(term) ||
      (r.version_id && r.version_id.toLowerCase().includes(term))
    );
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 overflow-y-auto w-full bg-background">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Runs
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Track multi-agent workflow executions, streaming token telemetry, and run history
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(runs, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute('href', dataStr);
                downloadAnchor.setAttribute('download', `runs-export-${Date.now()}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs sm:text-sm font-medium text-foreground transition-colors hover:bg-accent cursor-pointer"
            >
              <FileCode className="h-4 w-4 text-muted-foreground" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* 2. Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="group relative flex min-h-[130px] flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/25 hover:bg-accent/40 shadow-sm">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5 flex items-center justify-between">
                <span>TOTAL EXECUTIONS</span>
                <Activity className="w-4 h-4 text-muted-foreground/60" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                {runs.length}
              </div>
            </div>
            <div className="flex items-end justify-between pt-3">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                All engine workflow invocations
              </p>
              <span className="font-mono text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border tabular-nums">
                {runs.length} total
              </span>
            </div>
          </div>

          <div className="group relative flex min-h-[130px] flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/25 hover:bg-accent/40 shadow-sm">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5 flex items-center justify-between">
                <span>ACTIVE EXECUTIONS</span>
                <Play className="w-4 h-4 text-muted-foreground/60" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                {runningCount}
              </div>
            </div>
            <div className="flex items-end justify-between pt-3">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Currently stepping through graph
              </p>
              <StatusBadge
                status={runningCount > 0 ? 'running' : 'idle'}
                label={runningCount > 0 ? `${runningCount} active` : 'Idle'}
                pulse={runningCount > 0}
              />
            </div>
          </div>

          <div className="group relative flex min-h-[140px] flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/25 hover:bg-accent/40 shadow-sm">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5 flex items-center justify-between">
                <span>AWAITING APPROVAL</span>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                {waitingCount}
              </div>
            </div>
            <div className="flex items-end justify-between pt-3">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Paused at human approval gate
              </p>
              <StatusBadge
                status={waitingCount > 0 ? 'waiting_human' : 'idle'}
                label={waitingCount > 0 ? `${waitingCount} pending` : 'All clear'}
                pulse={waitingCount > 0}
              />
            </div>
          </div>

          <div className="group relative flex min-h-[140px] flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/25 hover:bg-accent/40 shadow-sm">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5 flex items-center justify-between">
                <span>SUCCEEDED RUNS</span>
                <CheckCircle2 className="w-4 h-4 text-muted-foreground/60" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                {succeededCount}
              </div>
            </div>
            <div className="flex items-end justify-between pt-3">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Completed with full artifact output
              </p>
              <StatusBadge
                status={succeededCount > 0 ? 'succeeded' : 'idle'}
                label={succeededCount > 0 ? `${succeededCount} done` : '0 done'}
              />
            </div>
          </div>
        </div>

        {/* 3. Subheader: Filter Tabs & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div className="p-1 rounded-xl bg-secondary/60 border border-border inline-flex items-center gap-1 overflow-x-auto max-w-full">
            {FILTER_TABS.map((tab) => {
              const isActive = statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
                    isActive
                      ? 'bg-card text-foreground border border-border shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative min-w-[260px]">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by run or workflow ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-white/20 transition-all shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* 4. Runs Table View */}
        {isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 animate-pulse">
            <div className="h-4 bg-secondary rounded w-1/4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-secondary/50 rounded-xl" />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center">
            <div className="w-12 h-12 rounded-2xl border border-border bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <Play className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mt-3">
              {statusFilter ? 'No runs matching filter' : 'No execution traces yet'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
              {statusFilter
                ? `No runs found with status "${statusFilter}". Try choosing another category.`
                : 'Trigger a workflow run from the visual canvas editor to start tracing executions.'}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-muted-foreground text-[11px] font-mono uppercase tracking-wider select-none">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filtered.length && filtered.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-border bg-secondary accent-foreground cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">
                      <span>Execution Run ID</span>
                    </th>
                    <th className="py-3 px-4">
                      <span>Version / Target</span>
                    </th>
                    <th className="py-3 px-4">
                      <span>Started Time</span>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <span>Status</span>
                    </th>
                    <th className="py-3 px-4 w-12 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.map((run) => {
                    const isSelected = selectedIds.includes(run.id);
                    return (
                      <tr
                        key={run.id}
                        className={cn(
                          'group hover:bg-white/[0.03] transition-colors',
                          isSelected && 'bg-accent/40'
                        )}
                      >
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(run.id)}
                            className="rounded border-border bg-secondary accent-foreground cursor-pointer"
                          />
                        </td>

                        {/* Run ID */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl border border-border bg-secondary flex items-center justify-center shrink-0 text-foreground shadow-sm">
                              <Play className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/runs/${run.id}`}
                                className="text-xs font-semibold text-foreground hover:underline font-mono transition-colors block truncate"
                              >
                                {run.id}
                              </Link>
                              {run.error && (
                                <span className="text-[11px] text-rose-400 truncate block max-w-sm mt-0.5 font-mono">
                                  {run.error}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Version */}
                        <td className="py-3.5 px-4">
                          <span className="text-xs text-muted-foreground font-mono">
                            {run.version_id ? `v_${run.version_id.slice(0, 8)}` : 'draft_latest'}
                          </span>
                        </td>

                        {/* Start Time */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-foreground tabular-nums">
                              {formatTimestamp(run.created_at)}
                            </span>
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {formatDateFull(run.created_at)}
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          <StatusBadge status={run.status} />
                        </td>

                        {/* Action link */}
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/runs/${run.id}`}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors inline-block"
                            title="Open Trace Viewer"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="border-t border-border px-4 py-3 bg-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs select-none">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-card text-foreground text-xs font-medium">
                  <span>10 records</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </div>
              </div>

              <div className="flex items-center gap-1 self-center">
                <button
                  type="button"
                  disabled
                  className="p-1 rounded-lg border border-border text-muted-foreground bg-card disabled:opacity-40 cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className="w-6 h-6 rounded-lg bg-foreground text-background font-semibold text-xs flex items-center justify-center shadow-sm"
                >
                  1
                </button>
                <button
                  type="button"
                  className="p-1 rounded-lg border border-border text-foreground bg-card hover:bg-secondary transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-muted-foreground font-mono tabular-nums text-[11px] self-end sm:self-auto">
                1 - {filtered.length} of {runs.length}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
