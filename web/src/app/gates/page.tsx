'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { WeaveLogo } from '@/components/WeaveLogo';
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
    <div className="flex-1 overflow-y-auto w-full bg-background">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* 1. Header Banner */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute -right-20 -top-20 h-[380px] w-[380px] rounded-full opacity-35 blur-3xl"
              style={{
                background:
                  'radial-gradient(circle, rgba(245, 158, 11, 0.4) 0%, rgba(99, 102, 241, 0.2) 50%, transparent 70%)',
              }}
            />
            <svg
              className="absolute right-0 top-0 h-full w-full opacity-[0.12]"
              xmlns="http://www.w3.org/2000/svg"
              width="100%"
              height="100%"
            >
              <defs>
                <pattern id="gatesGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1" />
                </pattern>
                <linearGradient id="gatesFadeMask" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="black" stopOpacity="0" />
                  <stop offset="60%" stopColor="black" stopOpacity="1" />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#gatesGrid)" mask="url(#gatesFadeMask)" />
            </svg>
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden md:block opacity-[0.10] pointer-events-none select-none">
              <WeaveLogo variant="mark" className="h-64 w-auto" />
            </div>
          </div>

          <div className="relative z-10 max-w-2xl">
            <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-400 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Human-In-The-Loop</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Approvals Inbox
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Review and resolve critical workflow actions before they execute. Inspect parameters,
              edit payload variables, or reject unsafe steps.
            </p>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(gates, null, 2));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute('href', dataStr);
                  downloadAnchor.setAttribute('download', `gates-export-${Date.now()}.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/60 px-4 py-2 text-xs sm:text-sm font-medium text-foreground transition-colors hover:bg-secondary cursor-pointer"
              >
                <FileCode className="h-4 w-4 text-muted-foreground" />
                <span>Export Queue</span>
              </button>
            </div>
          </div>
        </section>

        {/* 2. Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="group relative flex min-h-[140px] flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/25 hover:bg-accent/40 shadow-sm">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5 flex items-center justify-between">
                <span>PENDING GATES</span>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                {gates.length}
              </div>
            </div>
            <div className="flex items-end justify-between pt-3">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Decisions awaiting approval
              </p>
              <StatusBadge
                status={gates.length > 0 ? 'waiting_human' : 'idle'}
                label={gates.length > 0 ? `${gates.length} active` : 'All clear'}
                pulse={gates.length > 0}
              />
            </div>
          </div>

          <div className="group relative flex min-h-[140px] flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/25 hover:bg-accent/40 shadow-sm">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5 flex items-center justify-between">
                <span>QUEUE STATUS</span>
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground">
                {gates.length === 0 ? 'Inbox Zero' : 'Review Active'}
              </div>
            </div>
            <div className="flex items-end justify-between pt-3">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Operator intervention state
              </p>
              <span className="font-mono text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
                {gates.length === 0 ? 'Clear' : 'Pending'}
              </span>
            </div>
          </div>

          <div className="group relative flex min-h-[140px] flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/25 hover:bg-accent/40 shadow-sm">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5 flex items-center justify-between">
                <span>DEFAULT TIMEOUT</span>
                <Clock className="w-4 h-4 text-muted-foreground/60" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground">
                24h
              </div>
            </div>
            <div className="flex items-end justify-between pt-3">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Automatic fallback expiration
              </p>
              <span className="font-mono text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
                Configured
              </span>
            </div>
          </div>

          <div className="group relative flex min-h-[140px] flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/25 hover:bg-accent/40 shadow-sm">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5 flex items-center justify-between">
                <span>CONCURRENCY</span>
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground">
                Atomic
              </div>
            </div>
            <div className="flex items-end justify-between pt-3">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Strict single-resolution gate
              </p>
              <span className="font-mono text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
                Guaranteed
              </span>
            </div>
          </div>
        </div>

        {/* 3. Content Section */}
        <div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-card border border-border p-5 flex items-center justify-between animate-pulse"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-secondary" />
                    <div className="space-y-2">
                      <div className="w-56 h-4 bg-secondary rounded-lg" />
                      <div className="w-40 h-3 bg-secondary/50 rounded-lg" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-9 bg-secondary rounded-xl" />
                    <div className="w-20 h-9 bg-secondary rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : gates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center">
              <div className="w-12 h-12 rounded-2xl border border-border bg-secondary flex items-center justify-center mx-auto mb-3 text-emerald-400">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">Inbox Zero</h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
                No human gates are currently waiting for review or approval. All workflows are proceeding autonomously.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
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
                      className="group rounded-2xl border border-border bg-card hover:border-foreground/25 hover:bg-accent/40 p-5 transition-all shadow-sm"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-xl border border-amber-500/30 bg-amber-500/15 flex items-center justify-center shrink-0 text-amber-300 shadow-sm">
                            <ShieldAlert className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2.5">
                              <StatusBadge status="waiting_human" label="Review Required" pulse={false} />
                              <h3 className="text-xs text-foreground font-semibold leading-relaxed break-words">
                                &quot;{g.prompt || 'Action requires approval'}&quot;
                              </h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2 font-mono">
                              <span>run: <span className="text-foreground">{g.run_id.slice(0, 12)}</span></span>
                              <span>•</span>
                              <span>node: <span className="text-foreground">{g.node_id}</span></span>
                              {g.expires_at && (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1 text-amber-400">
                                    <Clock className="w-3 h-3 shrink-0" />
                                    <span>expires {formatExpiry(g.expires_at)}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                          <Link
                            href={`/runs/${g.run_id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-secondary border border-border"
                          >
                            <span>View Trace</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            type="button"
                            disabled={resolveMutation.isPending}
                            onClick={() =>
                              resolveMutation.mutate({ gateId: g.gate_id, resolution: 'reject' })
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isRejectPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                            <span>Reject</span>
                          </button>

                          <button
                            type="button"
                            disabled={resolveMutation.isPending}
                            onClick={() =>
                              resolveMutation.mutate({ gateId: g.gate_id, resolution: 'approve' })
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-500/20"
                          >
                            {isApprovePending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
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
