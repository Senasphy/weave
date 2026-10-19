'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import {
  ShieldAlert,
  Clock,
  Check,
  X,
  ArrowRight,
  UserCheck,
  Sparkles,
  Loader2,
  FileCode,
} from 'lucide-react';

export default function GatesPage() {
  const queryClient = useQueryClient();

  const { data: gates = [], isLoading } = useQuery({
    queryKey: ['gates'],
    queryFn: api.listGates,
    refetchInterval: 3000,
  });

  const resolveMutation = useMutation({
    mutationFn: ({
      gateId,
      resolution,
    }: {
      gateId: string;
      resolution: 'approve' | 'reject';
    }) => api.resolveGate(gateId, { resolution }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gates'] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
    },
  });

  const formatExpiry = (isoString?: string) => {
    if (!isoString) return null;
    const diff = new Date(isoString).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `in ${hours}h ${mins}m`;
    return `in ${mins}m`;
  };

  return (
    <div className="flex-1 overflow-y-auto w-full bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* 1. Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Human Approvals</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review and resolve workflow steps that require human sign-off before continuing.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(gates, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute('href', dataStr);
                downloadAnchor.setAttribute('download', `gates-export-${Date.now()}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
              }}
              className="px-3 py-1.5 rounded bg-white border border-border text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Queue</span>
            </button>
          </div>
        </div>

        {/* 2. Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded bg-white border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded border border-border bg-slate-50 flex items-center justify-center text-slate-600">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-border tabular-nums">
                {gates.length} pending
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {gates.length}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Pending approvals
              </div>
            </div>
          </div>

          <div className="p-4 rounded bg-white border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded border border-border bg-slate-50 flex items-center justify-center text-slate-600">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-border">
                {gates.length === 0 ? 'Clear' : 'Active'}
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold tracking-tight text-slate-900">
                {gates.length === 0 ? 'Inbox Zero' : 'Active'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Queue state
              </div>
            </div>
          </div>

          <div className="p-4 rounded bg-white border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded border border-border bg-slate-50 flex items-center justify-center text-slate-600">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-border">
                24h
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold tracking-tight text-slate-900">
                Default
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Default timeout
              </div>
            </div>
          </div>

          <div className="p-4 rounded bg-white border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded border border-border bg-slate-50 flex items-center justify-center text-slate-600">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-border">
                Strict
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold tracking-tight text-slate-900">
                Atomic
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Safety concurrency
              </div>
            </div>
          </div>
        </div>

        {/* 3. Content Section */}
        <div>
          {isLoading ? (
            <div className="space-y-2.5">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded bg-white border border-border p-4 flex items-center justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded bg-slate-100" />
                    <div className="space-y-1.5">
                      <div className="w-56 h-3.5 bg-slate-100 rounded" />
                      <div className="w-40 h-3 bg-slate-50 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-8 bg-slate-100 rounded" />
                    <div className="w-16 h-8 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : gates.length === 0 ? (
            <div className="rounded border border-dashed border-border bg-white p-14 text-center">
              <div className="w-10 h-10 rounded border border-border bg-slate-50 flex items-center justify-center mx-auto mb-3 text-slate-600">
                <UserCheck className="w-5 h-5 text-slate-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Inbox Zero</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
                No human gates are currently waiting for review or approval. All workflows are proceeding autonomously.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <AnimatePresence mode="popLayout">
                {gates.map((g) => {
                  const isCurrentPending =
                    resolveMutation.isPending && resolveMutation.variables?.gateId === g.gate_id;
                  const isApprovePending =
                    isCurrentPending && resolveMutation.variables?.resolution === 'approve';
                  const isRejectPending =
                    isCurrentPending && resolveMutation.variables?.resolution === 'reject';

                  return (
                    <motion.div
                      key={g.gate_id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="group rounded border border-border bg-white hover:border-slate-300 p-4 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded border border-border bg-slate-50 flex items-center justify-center shrink-0 text-slate-600">
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <StatusBadge status="waiting_human" label="Review Required" pulse={false} />
                              <h3 className="text-xs text-slate-900 font-semibold leading-relaxed break-words">
                                &quot;{g.prompt || 'Action requires approval'}&quot;
                              </h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1.5">
                              <span>run: <span className="underline decoration-slate-200">{g.run_id.slice(0, 12)}</span></span>
                              <span>•</span>
                              <span>node: {g.node_id}</span>
                              {g.expires_at && (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1 text-slate-700">
                                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>expires {formatExpiry(g.expires_at)}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          <Link
                            href={`/runs/${g.run_id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors px-2.5 py-1.5 rounded hover:bg-slate-100"
                          >
                            <span>View Trace</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>

                          <button
                            type="button"
                            disabled={resolveMutation.isPending}
                            onClick={() =>
                              resolveMutation.mutate({ gateId: g.gate_id, resolution: 'reject' })
                            }
                            className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isRejectPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            <span>Reject</span>
                          </button>

                          <button
                            type="button"
                            disabled={resolveMutation.isPending}
                            onClick={() =>
                              resolveMutation.mutate({ gateId: g.gate_id, resolution: 'approve' })
                            }
                            className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isApprovePending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            <span>Approve</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
