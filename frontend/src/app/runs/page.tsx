'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  Play,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileCode,
  Bell,
  MessageSquare,
  Activity,
} from 'lucide-react';
import type { RunStatus } from '@/lib/types';
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
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: runs = [], isLoading, error } = useQuery({
    queryKey: ['runs', statusFilter],
    queryFn: () => api.listRuns(statusFilter || undefined),
    refetchInterval: 3000,
  });

  const { data: gates = [] } = useQuery({
    queryKey: ['gates'],
    queryFn: api.listGates,
    refetchInterval: 5000,
  });

  const pendingGatesCount = gates.length;
  const runningCount = runs.filter((r) => r.status === 'running').length;
  const waitingCount = runs.filter((r) => r.status === 'waiting_human').length;
  const succeededCount = runs.filter((r) => r.status === 'succeeded').length;

  const filtered = runs.filter((r) => {
    if (!search) return true;
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
    <div className="flex-1 overflow-y-auto w-full bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* 1. Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Execution Runs</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track workflow runs, inspect step-by-step AI outputs, and monitor spending.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="http://localhost:3010"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded bg-white border border-border text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="Documentation"
              aria-label="Documentation"
            >
              <MessageSquare className="w-4 h-4" />
            </a>

            <Link
              href="/gates"
              className="relative p-1.5 rounded bg-white border border-border text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="Notifications / Pending Gates"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {pendingGatesCount > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
              )}
            </Link>

            <button
              onClick={() => {
                const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(runs, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute('href', dataStr);
                downloadAnchor.setAttribute('download', `runs-export-${Date.now()}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
              }}
              className="px-3 py-1.5 rounded bg-white border border-border text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 2. Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded bg-white border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded border border-border bg-slate-50 flex items-center justify-center text-slate-600">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-border tabular-nums">
                {runs.length} total
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {runs.length}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Total executions
              </div>
            </div>
          </div>

          <div className="p-4 rounded bg-white border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded border border-border bg-slate-50 flex items-center justify-center text-slate-600">
                <Play className="w-3.5 h-3.5" />
              </div>
              <StatusBadge
                status={runningCount > 0 ? 'running' : 'idle'}
                label={runningCount > 0 ? `${runningCount} active` : 'Idle'}
                pulse={runningCount > 0}
              />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {runningCount}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Active executions
              </div>
            </div>
          </div>

          <div className="p-4 rounded bg-white border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded border border-border bg-slate-50 flex items-center justify-center text-slate-600">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
              <StatusBadge
                status={waitingCount > 0 ? 'waiting_human' : 'idle'}
                label={waitingCount > 0 ? `${waitingCount} pending` : 'All clear'}
                pulse={false}
              />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {waitingCount}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Awaiting approval
              </div>
            </div>
          </div>

          <div className="p-4 rounded bg-white border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded border border-border bg-slate-50 flex items-center justify-center text-slate-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <StatusBadge
                status={succeededCount > 0 ? 'succeeded' : 'idle'}
                label={succeededCount > 0 ? `${succeededCount} completed` : '0 completed'}
                pulse={false}
              />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {succeededCount}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Succeeded runs
              </div>
            </div>
          </div>
        </div>

        {/* 3. Subheader: Segmented Filter Tabs & Search Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div className="p-0.5 rounded bg-slate-100 border border-border/80 inline-flex items-center self-start gap-0.5 overflow-x-auto max-w-full">
            {FILTER_TABS.map((tab) => {
              const isActive = statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
                  className={cn(
                    'px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap',
                    isActive
                      ? 'bg-white text-slate-900 border border-border/80 font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by run or workflow ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-border rounded pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
              />
            </div>

            <button
              type="button"
              className="px-2.5 py-1.5 rounded bg-white border border-border text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Filter</span>
            </button>

            <button
              type="button"
              className="px-2.5 py-1.5 rounded bg-white border border-border text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Sort</span>
            </button>
          </div>
        </div>

        {/* 4. Runs Table View */}
        {isLoading ? (
          <div className="rounded border border-border bg-white p-6 space-y-4 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-1/4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-slate-50 rounded" />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded border border-dashed border-border bg-white p-14 text-center">
            <div className="w-10 h-10 rounded border border-border bg-slate-50 flex items-center justify-center mx-auto text-slate-600">
              <Play className="w-5 h-5 text-slate-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mt-3">
              {statusFilter ? 'No runs matching filter' : 'No execution traces yet'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
              {statusFilter
                ? `No runs found with status "${statusFilter}". Try choosing another category.`
                : 'Trigger a workflow run from the visual canvas editor to start tracing executions.'}
            </p>
          </div>
        ) : (
          <div className="rounded border border-border bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-slate-50 text-slate-500 text-[11px] font-semibold tracking-tight select-none">
                    <th className="py-2.5 px-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filtered.length && filtered.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3.5">
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                        <span>Execution Run ID</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3.5">
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                        <span>Version / Target</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3.5">
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                        <span>Started Time</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3.5 text-center">
                      <span>Status</span>
                    </th>
                    <th className="py-2.5 px-3.5 w-12 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.map((run) => {
                    const isSelected = selectedIds.includes(run.id);
                    return (
                      <tr
                        key={run.id}
                        className={cn(
                          'group hover:bg-slate-50/80 transition-colors',
                          isSelected && 'bg-slate-50'
                        )}
                      >
                        <td className="py-3 px-3.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(run.id)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                          />
                        </td>

                        {/* Run ID */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0 text-slate-700">
                              <Play className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/runs/${run.id}`}
                                className="text-xs font-semibold text-slate-900 hover:text-slate-600 underline decoration-slate-200 underline-offset-4 transition-colors block truncate"
                              >
                                {run.id}
                              </Link>
                              {run.error && (
                                <span className="text-[11px] text-rose-600 truncate block max-w-sm mt-0.5">
                                  {run.error}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Version */}
                        <td className="py-3 px-3.5">
                          <span className="text-xs text-slate-600">
                            {run.version_id ? `v_${run.version_id.slice(0, 8)}` : 'draft_latest'}
                          </span>
                        </td>

                        {/* Start Time */}
                        <td className="py-3 px-3.5">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-800 tabular-nums">
                              {formatTimestamp(run.created_at)}
                            </span>
                            <span className="text-[11px] text-slate-500 tabular-nums">
                              {formatDateFull(run.created_at)}
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3.5 text-center">
                          <StatusBadge status={run.status} />
                        </td>

                        {/* Action link */}
                        <td className="py-3 px-3.5 text-right">
                          <Link
                            href={`/runs/${run.id}`}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors inline-block"
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
            <div className="border-t border-border px-4 py-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs select-none">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-white text-slate-700 text-xs font-medium">
                  <span>10 records</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
              </div>

              <div className="flex items-center gap-1 self-center">
                <button
                  type="button"
                  disabled
                  className="p-1 rounded border border-border text-slate-400 bg-white disabled:opacity-40 cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className="w-6 h-6 rounded bg-slate-900 text-white font-semibold text-xs flex items-center justify-center"
                >
                  1
                </button>
                <button
                  type="button"
                  className="p-1 rounded border border-border text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-slate-500 tabular-nums text-[11px] self-end sm:self-auto">
                1 - {filtered.length} of {runs.length}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
