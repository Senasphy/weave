'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { api, API_BASE } from '@/lib/api';
import { RunRecord, RunEvent, GateRecord, RunStatus } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/cn';
import {
  RotateCcw,
  StopCircle,
  Clock,
  Coins,
  Cpu,
  Layers,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ChevronRight,
  FileText,
  Copy,
  Check,
  X,
  ArrowLeft,
} from 'lucide-react';

export default function RunViewerPage() {
  const params = useParams();
  const runId = params.id as string;
  const queryClient = useQueryClient();

  const [events, setEvents] = useState<RunEvent[]>([]);
  const [selectedEventSeq, setSelectedEventSeq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'narration'>('timeline');

  // Gate resolve state
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [editedPayload, setEditedPayload] = useState('{\n  "approved": true\n}');
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Live timer for elapsed wall clock when running
  const [now, setNow] = useState<number>(Date.now());

  // Fetch initial run record
  const { data: run } = useQuery<RunRecord>({
    queryKey: ['run', runId],
    queryFn: () => api.getRun(runId),
    refetchInterval: (query) => {
      const current = query.state.data;
      return current?.status === 'running' || current?.status === 'waiting_human' ? 2000 : false;
    },
  });

  // Fetch active gates to find gateId if in waiting_human state
  const { data: gates = [] } = useQuery<GateRecord[]>({
    queryKey: ['gates'],
    queryFn: api.listGates,
    enabled: run?.status === 'waiting_human',
    refetchInterval: 2000,
  });

  // Tick elapsed time while run is active
  useEffect(() => {
    if (run?.status === 'running') {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [run?.status]);

  // Connect to Server-Sent Events (SSE) for live streaming events
  useEffect(() => {
    const sseUrl = `${API_BASE}/runs/${runId}/events`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data) as RunEvent;
        setEvents((prev) => {
          if (prev.some((item) => item.seq === parsed.seq)) return prev;
          return [...prev, parsed].sort((a, b) => a.seq - b.seq);
        });
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [runId]);

  // Cancel execution mutation
  const cancelMutation = useMutation({
    mutationFn: () => api.cancelRun(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['run', runId] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
    },
  });

  // Replay execution mutation
  const replayMutation = useMutation({
    mutationFn: () => api.replayRun(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      queryClient.invalidateQueries({ queryKey: ['run', runId] });
      queryClient.invalidateQueries({ queryKey: ['run-events', runId] });
    },
  });

  // Resolve gate mutation
  const resolveGateMutation = useMutation({
    mutationFn: async (action: 'approve' | 'reject' | 'edit') => {
      const activeGate = gates.find((g) => g.run_id === runId);
      const gateId = activeGate?.gate_id;
      if (!gateId) throw new Error('No active gate found');

      if (action === 'approve') {
        return api.resolveGate(gateId, { resolution: 'approve' });
      } else if (action === 'reject') {
        return api.resolveGate(gateId, { resolution: 'reject' });
      } else {
        let parsed = {};
        try {
          parsed = JSON.parse(editedPayload);
        } catch {
          throw new Error('Edited payload must be valid JSON');
        }
        return api.resolveGate(gateId, {
          resolution: 'approve',
          payload: parsed,
        });
      }
    },
    onSuccess: () => {
      setIsResolveModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['run', runId] });
      queryClient.invalidateQueries({ queryKey: ['gates'] });
    },
  });

  // Aggregate stats from events
  const totalTokens = events.reduce((sum, e) => {
    if (e.type === 'step.completed' && e.payload?.usage?.total_tokens) {
      return sum + Number(e.payload.usage.total_tokens);
    }
    return sum;
  }, 0);

  const totalCost = events.reduce((sum, e) => {
    if (e.type === 'step.completed' && e.payload?.cost_usd) {
      return sum + Number(e.payload.cost_usd);
    }
    return sum;
  }, 0);

  const stepCount = events.filter((e) => e.type === 'step.started').length;
  const isWaitingGate =
    run?.status === 'waiting_human' ||
    events.some(
      (e) =>
        e.type === 'gate.opened' &&
        !events.some((r) => r.type === 'gate.resolved' || r.type === 'gate.timed_out')
    );
  const gatePrompt = events.find((e) => e.type === 'gate.opened')?.payload?.prompt;

  const selectedEvent = events.find((e) => e.seq === selectedEventSeq) || events[events.length - 1];

  // Budget calculations
  const maxSteps = run?.budgets?.max_steps || 50;
  const stepPct = Math.min(100, Math.max(0, Math.round((stepCount / maxSteps) * 100)));

  const maxTokens = run?.budgets?.max_tokens || 200000;
  const tokenPct = Math.min(100, Math.max(0, Math.round((totalTokens / maxTokens) * 100)));

  const maxCost = run?.budgets?.max_cost_usd || 2.0;
  const costPct = Math.min(100, Math.max(0, Math.round((totalCost / maxCost) * 100)));

  const maxWall = run?.budgets?.max_wall_seconds || 900;
  const wallSeconds = run?.started_at
    ? Math.max(
        0,
        Math.round(
          ((run.ended_at ? new Date(run.ended_at).getTime() : now) -
            new Date(run.started_at).getTime()) /
            1000
        )
      )
    : 0;
  const wallPct = Math.min(100, Math.max(0, Math.round((wallSeconds / maxWall) * 100)));

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none bg-background text-foreground">
      {/* Header bar */}
      <header className="h-14 bg-card/90 backdrop-blur-md border-b border-border flex items-center justify-between px-6 select-none shrink-0 z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <Link
            href="/runs"
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors"
            title="Back to all runs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono text-muted-foreground">Run</span>
            <span className="font-semibold text-foreground text-xs font-mono">
              {runId.slice(0, 16)}...
            </span>
            <StatusBadge status={run?.status} />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {run?.status === 'running' && (
            <button
              type="button"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span>{cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}</span>
            </button>
          )}

          <button
            type="button"
            disabled={replayMutation.isPending}
            onClick={() => replayMutation.mutate()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-card border border-border text-foreground hover:bg-secondary transition-all cursor-pointer shadow-sm"
            title="Replay from recorded event logs"
          >
            <RotateCcw
              className={cn(
                'w-3.5 h-3.5 text-muted-foreground transition-transform duration-300',
                replayMutation.isPending ? 'animate-spin' : 'group-hover:-rotate-45'
              )}
            />
            <span>{replayMutation.isPending ? 'Replaying...' : 'Replay'}</span>
          </button>
        </div>
      </header>

      {/* Budget meters strip */}
      <div className="bg-card border-b border-border px-6 py-4 shrink-0 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
          {/* Steps */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                <span className="text-muted-foreground text-xs font-medium">Steps</span>
              </div>
              <div className="flex items-baseline gap-1 tabular-nums font-mono">
                <span className="font-semibold text-foreground text-xs">{stepCount}</span>
                <span className="text-muted-foreground/60 text-xs">/ {maxSteps}</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-2 w-full">
              <div
                className="h-full rounded-full bg-foreground transition-all duration-500"
                style={{ width: `${stepPct}%` }}
              />
            </div>
          </div>

          {/* Tokens */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                <span className="text-muted-foreground text-xs font-medium">Tokens</span>
              </div>
              <div className="flex items-baseline gap-1 tabular-nums font-mono">
                <span className="font-semibold text-foreground text-xs">
                  {totalTokens.toLocaleString()}
                </span>
                <span className="text-muted-foreground/60 text-xs">
                  / {maxTokens.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-2 w-full">
              <div
                className="h-full rounded-full bg-foreground transition-all duration-500"
                style={{ width: `${tokenPct}%` }}
              />
            </div>
          </div>

          {/* Cost */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                <span className="text-muted-foreground text-xs font-medium">Cost</span>
              </div>
              <div className="flex items-baseline gap-1 tabular-nums font-mono">
                <span className="font-semibold text-foreground text-xs">
                  ${totalCost.toFixed(4)}
                </span>
                <span className="text-muted-foreground/60 text-xs">/ ${maxCost.toFixed(2)}</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-2 w-full">
              <div
                className="h-full rounded-full bg-foreground transition-all duration-500"
                style={{ width: `${costPct}%` }}
              />
            </div>
          </div>

          {/* Wall Clock */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                <span className="text-muted-foreground text-xs font-medium">Wall Clock</span>
              </div>
              <div className="flex items-baseline gap-1 tabular-nums font-mono">
                <span className="font-semibold text-foreground text-xs">{wallSeconds}s</span>
                <span className="text-muted-foreground/60 text-xs">/ {maxWall}s</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-2 w-full">
              <div
                className="h-full rounded-full bg-foreground transition-all duration-500"
                style={{ width: `${wallPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Human Gate banner */}
      <AnimatePresence>
        {isWaitingGate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-mono font-semibold text-amber-300 tracking-wide uppercase block">
                    Human Review Required
                  </span>
                  <p className="text-xs text-foreground mt-0.5 line-clamp-2">
                    &ldquo;{gatePrompt || 'Action requires human approval before proceeding.'}&rdquo;
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  disabled={resolveGateMutation.isPending}
                  onClick={() => resolveGateMutation.mutate('reject')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={resolveGateMutation.isPending}
                  onClick={() => setIsResolveModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-card border border-border text-foreground hover:bg-secondary transition-all cursor-pointer shadow-sm"
                >
                  Edit &amp; Approve...
                </button>
                <button
                  type="button"
                  disabled={resolveGateMutation.isPending}
                  onClick={() => resolveGateMutation.mutate('approve')}
                  className="px-4 py-1.5 rounded-xl text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  Approve
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main split content area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left pane: Timeline and Narration */}
        <div className="w-1/2 border-r border-border flex flex-col bg-card min-h-0">
          <div className="h-12 px-4 border-b border-border flex items-center justify-between shrink-0 bg-card">
            <div className="inline-flex p-1 rounded-xl border border-border bg-secondary/60 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer',
                  activeTab === 'timeline'
                    ? 'bg-card text-foreground border border-border shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Timeline ({events.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('narration')}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer',
                  activeTab === 'narration'
                    ? 'bg-card text-foreground border border-border shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Narration
              </button>
            </div>

            {run?.status === 'running' ? (
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
                <span>Live Stream</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                <span>Recorded Stream</span>
              </div>
            )}
          </div>

          {activeTab === 'timeline' ? (
            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
                  <Clock className="w-6 h-6 mb-2 text-muted-foreground/60" />
                  <p className="text-xs font-medium">No events recorded yet</p>
                </div>
              ) : (
                events.map((ev) => {
                  const isSelected = selectedEventSeq === ev.seq;
                  return (
                    <div
                      key={ev.seq}
                      onClick={() => setSelectedEventSeq(ev.seq)}
                      className={cn(
                        'py-3 px-4 flex items-start gap-3 cursor-pointer transition-colors group',
                        isSelected
                          ? 'bg-accent/80 border-l-2 border-foreground'
                          : 'hover:bg-white/[0.02] border-l-2 border-transparent'
                      )}
                    >
                      <div className="text-[11px] tabular-nums font-mono text-muted-foreground w-7 text-right shrink-0 mt-0.5 select-none font-medium">
                        #{ev.seq}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              'text-xs font-mono font-semibold truncate',
                              isSelected ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'
                            )}
                          >
                            {ev.type}
                          </span>
                          <span className="text-[11px] font-mono tabular-nums text-muted-foreground shrink-0">
                            {new Date(ev.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {ev.node_id && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                            <span className="text-muted-foreground/60">node:</span>
                            <span className="text-foreground font-medium font-mono">{ev.node_id}</span>
                          </div>
                        )}
                      </div>
                      <ChevronRight
                        className={cn(
                          'w-3.5 h-3.5 shrink-0 mt-1 transition-transform',
                          isSelected ? 'text-foreground' : 'text-muted-foreground/60'
                        )}
                      />
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 text-xs leading-relaxed text-foreground bg-background/50 font-mono">
              {events.length === 0 ? (
                <div className="text-muted-foreground italic">No narration entries recorded.</div>
              ) : (
                <div className="space-y-1.5 select-text">
                  {events.map((ev) => {
                    const t = new Date(ev.timestamp).toLocaleTimeString();
                    return (
                      <div
                        key={ev.seq}
                        className="flex items-start gap-2.5 hover:bg-card p-1.5 rounded-lg transition-colors"
                      >
                        <span className="text-muted-foreground select-none shrink-0 tabular-nums text-[11px]">
                          [{t}]
                        </span>
                        <span className="text-foreground font-medium shrink-0">{ev.type}</span>
                        {ev.node_id && (
                          <span className="text-foreground shrink-0">
                            <span className="text-muted-foreground">→</span> {ev.node_id}
                          </span>
                        )}
                        {ev.payload && Object.keys(ev.payload).length > 0 && (
                          <span className="text-muted-foreground truncate text-[11px]">
                            {JSON.stringify(ev.payload)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right pane: Event detail inspector */}
        <div className="w-1/2 flex flex-col bg-background overflow-y-auto p-6 text-xs min-h-0">
          {selectedEvent ? (
            <div className="space-y-5">
              <div className="pb-4 border-b border-border flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-semibold tracking-wider text-muted-foreground uppercase block">
                    Event Detail
                  </span>
                  <h3 className="text-sm font-semibold text-foreground mt-1 flex items-center gap-2">
                    <span className="font-mono text-foreground">{selectedEvent.type}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border tabular-nums">
                      seq #{selectedEvent.seq}
                    </span>
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs tabular-nums font-mono font-medium text-foreground">
                    {new Date(selectedEvent.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="block text-[11px] tabular-nums text-muted-foreground">
                    {new Date(selectedEvent.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {selectedEvent.node_id && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                    Target Node
                  </label>
                  <div className="bg-card border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-mono flex items-center gap-2 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
                    <span>{selectedEvent.node_id}</span>
                  </div>
                </div>
              )}

              {selectedEvent.step_id && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                    Step ID
                  </label>
                  <div className="bg-card border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-mono shadow-sm">
                    {selectedEvent.step_id}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                    Payload
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedEvent.payload, null, 2));
                      setCopiedPayload(true);
                      setTimeout(() => setCopiedPayload(false), 2000);
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer font-medium"
                  >
                    {copiedPayload ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-medium">
                        <Check className="w-3 h-3" /> Copied
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy className="w-3 h-3" /> Copy JSON
                      </span>
                    )}
                  </button>
                </div>
                <pre className="bg-card border border-border rounded-xl p-4 font-mono text-xs text-foreground overflow-x-auto whitespace-pre leading-relaxed select-text shadow-sm">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>

              {Boolean(run?.output) && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-mono font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Run Final Output</span>
                    </label>
                  </div>
                  <pre className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed select-text">
                    {JSON.stringify(run?.output, null, 2)}
                  </pre>
                </div>
              )}

              {Boolean(run?.error) && (
                <div className="space-y-1.5 pt-2">
                  <label className="block text-[11px] font-mono font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Execution Error</span>
                  </label>
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 font-mono text-xs text-rose-300 overflow-x-auto whitespace-pre-wrap select-text">
                    {run?.error}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center p-8">
              <FileText className="w-8 h-8 mb-2 opacity-40 text-muted-foreground" />
              <p className="text-xs font-medium">Select an event to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit & Approve Modal */}
      <Dialog.Root open={isResolveModalOpen} onOpenChange={setIsResolveModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md animate-in fade-in-0 duration-150" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 focus:outline-none animate-in fade-in-0 zoom-in-95 duration-150 text-foreground">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <Dialog.Title className="text-sm font-semibold text-foreground">
                Edit &amp; Approve Parameters
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>

            <Dialog.Description className="text-xs text-muted-foreground mt-3">
              Modify the downstream payload parameters before resuming execution. Must be valid JSON.
            </Dialog.Description>

            <div className="mt-4">
              <textarea
                rows={7}
                value={editedPayload}
                onChange={(e) => setEditedPayload(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl p-3 text-xs text-foreground font-mono focus:border-white/20 outline-none resize-none transition-colors"
                placeholder="{\n  &quot;approved&quot;: true\n}"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resolveGateMutation.isPending}
                onClick={() => resolveGateMutation.mutate('edit')}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-md"
              >
                {resolveGateMutation.isPending ? 'Submitting...' : 'Submit Edited Approval'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
