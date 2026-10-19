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
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
  FileText,
  Copy,
  Check,
  X,
  ArrowLeft,
  Radio,
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
  const { data: run, refetch: refetchRun } = useQuery({
    queryKey: ['run', runId],
    queryFn: () => api.getRun(runId),
  });

  // Fetch initial events
  const { data: initialEvents = [] } = useQuery({
    queryKey: ['run-events', runId],
    queryFn: () => api.getRunEvents(runId, 0),
  });

  useEffect(() => {
    if (initialEvents.length > 0) {
      setEvents(initialEvents);
      if (selectedEventSeq === null) {
        setSelectedEventSeq(initialEvents[initialEvents.length - 1].seq);
      }
    }
  }, [initialEvents, selectedEventSeq]);

  // Tick elapsed time while run is active
  useEffect(() => {
    if (run?.status === 'running') {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [run?.status]);

  // Connect to SSE event stream
  useEffect(() => {
    const sseUrl = `${API_BASE}/runs/${runId}/stream`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (e) => {
      try {
        const ev: RunEvent = JSON.parse(e.data);
        setEvents((prev) => {
          if (prev.some((item) => item.seq === ev.seq)) return prev;
          return [...prev, ev];
        });
        refetchRun();
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
  }, [runId, refetchRun]);

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelRun(runId),
    onSuccess: () => {
      refetchRun();
    },
  });

  const replayMutation = useMutation({
    mutationFn: () => api.replayRun(runId),
    onSuccess: () => {
      alert('Run successfully replayed from stored history.');
      refetchRun();
    },
  });

  const resolveGateMutation = useMutation({
    mutationFn: async (resolution: 'approve' | 'reject' | 'edit') => {
      const gateOpenedEv = events.find((e) => e.type === 'gate.opened');
      const gateId = gateOpenedEv?.payload?.gate_id;
      if (!gateId) throw new Error('No active gate found');

      let payload: unknown = undefined;
      if (resolution === 'edit') {
        payload = JSON.parse(editedPayload);
      }
      return api.resolveGate(gateId, { resolution, actor: 'human_reviewer', payload });
    },
    onSuccess: () => {
      setIsResolveModalOpen(false);
      refetchRun();
    },
  });

  // Calculate live usage from events
  const totalTokens = events.reduce((sum, e) => {
    if (e.type === 'llm.responded') {
      return sum + (e.payload.input_tokens || 0) + (e.payload.output_tokens || 0);
    }
    return sum;
  }, 0);

  const totalCost = events.reduce((sum, e) => {
    if (e.type === 'llm.responded' || e.type === 'tool.responded') {
      return sum + (e.payload.cost_usd || e.payload.cost || 0);
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
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none bg-slate-50">
      {/* Header bar */}
      <header className="h-14 bg-white border-b border-border flex items-center justify-between px-6 select-none shrink-0 z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <Link
            href="/runs"
            className="text-slate-500 hover:text-slate-900 p-1.5 rounded hover:bg-slate-100 transition-colors"
            title="Back to all runs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-slate-500">Run</span>
            <span className="font-semibold text-slate-900 text-xs">
              {runId.slice(0, 16)}...
            </span>
            <StatusBadge status={run?.status} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {run?.status === 'running' && (
            <button
              type="button"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all cursor-pointer"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span>{cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}</span>
            </button>
          )}

          <button
            type="button"
            disabled={replayMutation.isPending}
            onClick={() => replayMutation.mutate()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium bg-white border border-border text-slate-800 hover:bg-slate-50 transition-all cursor-pointer"
            title="Replay from recorded event logs"
          >
            <RotateCcw
              className={cn(
                'w-3.5 h-3.5 text-slate-600 transition-transform duration-300',
                replayMutation.isPending ? 'animate-spin' : 'group-hover:-rotate-45'
              )}
            />
            <span>{replayMutation.isPending ? 'Replaying...' : 'Replay'}</span>
          </button>
        </div>
      </header>

      {/* Budget meters strip */}
      <div className="bg-white border-b border-border px-6 py-3 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
          {/* Steps */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-slate-600 text-xs font-medium">Steps</span>
              </div>
              <div className="flex items-baseline gap-1 tabular-nums">
                <span className="font-semibold text-slate-900 text-xs">{stepCount}</span>
                <span className="text-slate-400 text-xs">/ {maxSteps}</span>
              </div>
            </div>
            <div className="h-1.5 rounded bg-slate-100 overflow-hidden mt-2 w-full">
              <div
                className="h-full rounded bg-slate-900 transition-all duration-500"
                style={{ width: `${stepPct}%` }}
              />
            </div>
          </div>

          {/* Tokens */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-slate-600 text-xs font-medium">Tokens</span>
              </div>
              <div className="flex items-baseline gap-1 tabular-nums">
                <span className="font-semibold text-slate-900 text-xs">
                  {totalTokens.toLocaleString()}
                </span>
                <span className="text-slate-400 text-xs">
                  / {maxTokens.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded bg-slate-100 overflow-hidden mt-2 w-full">
              <div
                className="h-full rounded bg-slate-900 transition-all duration-500"
                style={{ width: `${tokenPct}%` }}
              />
            </div>
          </div>

          {/* Cost */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-slate-600 text-xs font-medium">Cost</span>
              </div>
              <div className="flex items-baseline gap-1 tabular-nums">
                <span className="font-semibold text-slate-900 text-xs">
                  ${totalCost.toFixed(4)}
                </span>
                <span className="text-slate-400 text-xs">/ ${maxCost.toFixed(2)}</span>
              </div>
            </div>
            <div className="h-1.5 rounded bg-slate-100 overflow-hidden mt-2 w-full">
              <div
                className="h-full rounded bg-slate-900 transition-all duration-500"
                style={{ width: `${costPct}%` }}
              />
            </div>
          </div>

          {/* Wall Clock */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-slate-600 text-xs font-medium">Wall Clock</span>
              </div>
              <div className="flex items-baseline gap-1 tabular-nums">
                <span className="font-semibold text-slate-900 text-xs">{wallSeconds}s</span>
                <span className="text-slate-400 text-xs">/ {maxWall}s</span>
              </div>
            </div>
            <div className="h-1.5 rounded bg-slate-100 overflow-hidden mt-2 w-full">
              <div
                className="h-full rounded bg-slate-900 transition-all duration-500"
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
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-8 h-8 rounded bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-amber-800 tracking-wide uppercase block">
                    Human Review Required
                  </span>
                  <p className="text-xs text-amber-900 mt-0.5 line-clamp-2">
                    &ldquo;{gatePrompt || 'Action requires human approval before proceeding.'}&rdquo;
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={resolveGateMutation.isPending}
                  onClick={() => resolveGateMutation.mutate('reject')}
                  className="px-3.5 py-1.5 rounded text-xs font-medium border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={resolveGateMutation.isPending}
                  onClick={() => setIsResolveModalOpen(true)}
                  className="px-3.5 py-1.5 rounded text-xs font-medium bg-white border border-border text-slate-800 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Edit & Approve...
                </button>
                <button
                  type="button"
                  disabled={resolveGateMutation.isPending}
                  onClick={() => resolveGateMutation.mutate('approve')}
                  className="px-4 py-1.5 rounded text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition-all cursor-pointer"
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
        <div className="w-1/2 border-r border-border flex flex-col bg-white min-h-0">
          <div className="h-12 px-4 border-b border-border flex items-center justify-between shrink-0 bg-white">
            <div className="inline-flex p-0.5 rounded border border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer',
                  activeTab === 'timeline'
                    ? 'bg-white text-slate-900 border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Timeline ({events.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('narration')}
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer',
                  activeTab === 'narration'
                    ? 'bg-white text-slate-900 border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Narration
              </button>
            </div>

            {run?.status === 'running' ? (
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-zinc-900">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                <span>Live Stream</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-zinc-500">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                <span>Recorded Stream</span>
              </div>
            )}
          </div>

          {activeTab === 'timeline' ? (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-400">
                  <Clock className="w-6 h-6 mb-2 text-slate-300" />
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
                          ? 'bg-slate-100 border-l-2 border-slate-900'
                          : 'hover:bg-slate-50 border-l-2 border-transparent'
                      )}
                    >
                      <div className="text-[11px] tabular-nums text-slate-400 w-7 text-right shrink-0 mt-0.5 select-none font-medium">
                        #{ev.seq}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              'text-xs font-semibold truncate',
                              isSelected ? 'text-slate-900 font-semibold' : 'text-slate-800 group-hover:text-slate-900'
                            )}
                          >
                            {ev.type}
                          </span>
                          <span className="text-[11px] tabular-nums text-slate-500 shrink-0">
                            {new Date(ev.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {ev.node_id && (
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate flex items-center gap-1">
                            <span className="text-slate-400">node:</span>
                            <span className="text-slate-700 font-medium">{ev.node_id}</span>
                          </div>
                        )}
                      </div>
                      <ChevronRight
                        className={cn(
                          'w-3.5 h-3.5 shrink-0 mt-1 transition-transform',
                          isSelected ? 'text-slate-900' : 'text-slate-400'
                        )}
                      />
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 text-xs leading-relaxed text-slate-700 bg-slate-50/50">
              {events.length === 0 ? (
                <div className="text-slate-400 italic">No narration entries recorded.</div>
              ) : (
                <div className="space-y-1.5 select-text">
                  {events.map((ev) => {
                    const t = new Date(ev.timestamp).toLocaleTimeString();
                    return (
                      <div
                        key={ev.seq}
                        className="flex items-start gap-2.5 hover:bg-white p-1 rounded transition-colors"
                      >
                        <span className="text-slate-400 select-none shrink-0 tabular-nums text-[11px]">
                          [{t}]
                        </span>
                        <span className="text-slate-900 font-medium shrink-0">{ev.type}</span>
                        {ev.node_id && (
                          <span className="text-slate-700 shrink-0">
                            <span className="text-slate-400">→</span> {ev.node_id}
                          </span>
                        )}
                        {ev.payload && Object.keys(ev.payload).length > 0 && (
                          <span className="text-slate-500 truncate font-mono text-[11px]">
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
        <div className="w-1/2 flex flex-col bg-slate-50 overflow-y-auto p-6 text-xs min-h-0">
          {selectedEvent ? (
            <div className="space-y-5">
              <div className="pb-4 border-b border-border flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase block">
                    Event Detail
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900 mt-1 flex items-center gap-2">
                    <span>{selectedEvent.type}</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white text-slate-700 border border-border tabular-nums">
                      seq #{selectedEvent.seq}
                    </span>
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs tabular-nums font-medium text-slate-700">
                    {new Date(selectedEvent.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="block text-[11px] tabular-nums text-slate-400">
                    {new Date(selectedEvent.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {selectedEvent.node_id && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                    Target Node
                  </label>
                  <div className="bg-white border border-border rounded px-3 py-1.5 text-xs text-slate-800 font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    <span>{selectedEvent.node_id}</span>
                  </div>
                </div>
              )}

              {selectedEvent.step_id && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                    Step ID
                  </label>
                  <div className="bg-white border border-border rounded px-3 py-1.5 text-xs text-slate-700">
                    {selectedEvent.step_id}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                    Payload
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedEvent.payload, null, 2));
                      setCopiedPayload(true);
                      setTimeout(() => setCopiedPayload(false), 2000);
                    }}
                    className="text-[11px] text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                  >
                    {copiedPayload ? (
                      <span className="text-emerald-600 flex items-center gap-1 font-medium">
                        <Check className="w-3 h-3" /> Copied
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy className="w-3 h-3" /> Copy JSON
                      </span>
                    )}
                  </button>
                </div>
                <pre className="bg-white border border-border rounded p-3 font-mono text-xs text-slate-800 overflow-x-auto whitespace-pre leading-relaxed select-text">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>

              {Boolean(run?.output) && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Run Final Output</span>
                    </label>
                  </div>
                  <pre className="bg-emerald-50/50 border border-emerald-200 rounded p-3 font-mono text-xs text-emerald-900 overflow-x-auto whitespace-pre leading-relaxed select-text">
                    {JSON.stringify(run?.output, null, 2)}
                  </pre>
                </div>
              )}

              {Boolean(run?.error) && (
                <div className="space-y-1.5 pt-2">
                  <label className="block text-[11px] font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Execution Error</span>
                  </label>
                  <div className="bg-rose-50/60 border border-rose-200 rounded p-3 font-mono text-xs text-rose-900 overflow-x-auto whitespace-pre-wrap select-text">
                    {run?.error}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-8">
              <FileText className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs font-medium">Select an event to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit & Approve Modal */}
      <Dialog.Root open={isResolveModalOpen} onOpenChange={setIsResolveModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white border border-border rounded shadow-modal p-6 focus:outline-none">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <Dialog.Title className="text-sm font-semibold text-slate-900">
                Edit &amp; Approve Parameters
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
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
                className="w-full bg-slate-50 border border-border rounded p-3 text-xs text-slate-900 font-mono focus:border-slate-400 focus:bg-white outline-none resize-none transition-colors"
                placeholder="{\n  &quot;approved&quot;: true\n}"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resolveGateMutation.isPending}
                onClick={() => resolveGateMutation.mutate('edit')}
                className="px-4 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white transition-all disabled:opacity-50 cursor-pointer"
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
