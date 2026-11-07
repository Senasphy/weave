'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Coins,
  Wrench,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { ModelPrice } from '@/lib/types';

export default function SettingsPage() {
  const { data: models = [], isLoading } = useQuery<ModelPrice[]>({
    queryKey: ['model-pricing'],
    queryFn: api.listModels,
  });

  const tools = [
    { id: 'web_search', kind: 'builtin', side_effect: false, desc: 'Performs live web queries for research agents.' },
    { id: 'stripe_refund', kind: 'integration', side_effect: true, desc: 'Issues financial chargebacks via Stripe API.' },
    { id: 'kb_search', kind: 'builtin', side_effect: false, desc: 'Vector search in knowledge base documents.' },
    { id: 'email_dispatch', kind: 'notification', side_effect: true, desc: 'Sends external notification emails to customers.' },
  ];

  return (
    <div className="flex-1 overflow-y-auto w-full bg-background">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Settings &amp; Tools
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Workspace configuration, LLM token pricing tables, and tool execution sandboxing
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-mono text-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Engine: Operational</span>
            </div>
          </div>
        </div>

        {/* 2. Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="group relative flex min-h-[130px] flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/25 hover:bg-accent/40 shadow-sm">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5 flex items-center justify-between">
                <span>CONFIGURED MODELS</span>
                <Coins className="w-4 h-4 text-muted-foreground/60" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                {models.length}
              </div>
            </div>
            <div className="flex items-end justify-between pt-3">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Configured model rates
              </p>
              <span className="font-mono text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border tabular-nums">
                {models.length} models
              </span>
            </div>
          </div>

          <div className="group relative flex min-h-[130px] flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/25 hover:bg-accent/40 shadow-sm">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5 flex items-center justify-between">
                <span>AGENT TOOLS</span>
                <Wrench className="w-4 h-4 text-muted-foreground/60" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                {tools.length}
              </div>
            </div>
            <div className="flex items-end justify-between pt-3">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Sandboxed builtin tools
              </p>
              <span className="font-mono text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border tabular-nums">
                {tools.length} tools
              </span>
            </div>
          </div>

          <div className="group relative flex min-h-[130px] flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/25 hover:bg-accent/40 shadow-sm">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5 flex items-center justify-between">
                <span>PERMISSION GATING</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground">
                Enforced
              </div>
            </div>
            <div className="flex items-end justify-between pt-3">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Side-effect authorization
              </p>
              <span className="font-mono text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
                Gated
              </span>
            </div>
          </div>

          <div className="group relative flex min-h-[130px] flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/25 hover:bg-accent/40 shadow-sm">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5 flex items-center justify-between">
                <span>STORAGE BACKEND</span>
                <Cpu className="w-4 h-4 text-muted-foreground/60" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground">
                Postgres
              </div>
            </div>
            <div className="flex items-end justify-between pt-3">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Durable state &amp; checkpoints
              </p>
              <span className="font-mono text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
                Connected
              </span>
            </div>
          </div>
        </div>

        {/* 3. Model Pricing Table */}
        <section className="space-y-3">
          <div>
            <h2 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">
              Model Pricing Rates
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live pricing rates used to enforce USD budgets in runtime workflows.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-muted-foreground text-[11px] font-mono uppercase tracking-wider select-none">
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Model Name</th>
                    <th className="py-3 px-4 text-right">Input / MTok</th>
                    <th className="py-3 px-4 text-right">Output / MTok</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                        Loading model rates...
                      </td>
                    </tr>
                  ) : models.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                        No model pricing configured.
                      </td>
                    </tr>
                  ) : (
                    models.map((m) => (
                      <tr
                        key={`${m.provider}:${m.model}`}
                        className="hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="py-3.5 px-4 text-xs font-semibold text-foreground">
                          {m.provider}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-muted-foreground">
                          {m.model}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-foreground font-semibold text-right tabular-nums">
                          ${m.input_per_mtok.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-foreground font-semibold text-right tabular-nums">
                          ${m.output_per_mtok.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[11px] font-medium font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 4. Tool Registry Table */}
        <section className="space-y-3 pt-2">
          <div>
            <h2 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">
              Tool Registry
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sandboxed tool functions available to agents with explicit permission tracking.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-muted-foreground text-[11px] font-mono uppercase tracking-wider select-none">
                    <th className="py-3 px-4">Tool Identifier</th>
                    <th className="py-3 px-4">Kind</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-center">Permission</th>
                    <th className="py-3 px-4 text-center">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {tools.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-xs font-mono text-foreground">
                        {t.id}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        <span className="px-2 py-0.5 rounded-md bg-secondary border border-border text-muted-foreground text-[11px] font-mono">
                          {t.kind}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        {t.desc}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {t.side_effect ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[11px] font-medium font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Side-Effects
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-border bg-secondary text-muted-foreground text-[11px] font-medium font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
                            Read-Only
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[11px] font-medium font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Ready
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
