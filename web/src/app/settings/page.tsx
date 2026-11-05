'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Coins,
  Wrench,
  ShieldCheck,
  Cpu,
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
    <div className="flex-1 overflow-y-auto w-full bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* 1. Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Settings</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Workspace configuration, model pricing tables, and tool permissions.
            </p>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-white border border-border text-xs font-medium text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>System: Operational (v1.0)</span>
          </div>
        </div>

        {/* 2. Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded bg-white border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded border border-border bg-slate-50 flex items-center justify-center text-slate-600">
                <Coins className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-border tabular-nums">
                {models.length} models
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {models.length}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Configured model rates
              </div>
            </div>
          </div>

          <div className="p-4 rounded bg-white border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded border border-border bg-slate-50 flex items-center justify-center text-slate-600">
                <Wrench className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-border tabular-nums">
                {tools.length} tools
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {tools.length}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Registered agent tools
              </div>
            </div>
          </div>

          <div className="p-4 rounded bg-white border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded border border-border bg-slate-50 flex items-center justify-center text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-border">
                Protected
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold tracking-tight text-slate-900">
                Gated
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Sensitive actions require approval
              </div>
            </div>
          </div>

          <div className="p-4 rounded bg-white border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded border border-border bg-slate-50 flex items-center justify-center text-slate-600">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-border tabular-nums">
                Standard
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold tracking-tight text-slate-900">
                Reasoning
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Token budget model
              </div>
            </div>
          </div>
        </div>

        {/* 3. Model Pricing Table */}
        <section className="space-y-2.5">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Model Pricing</h2>
            <p className="text-xs text-muted-foreground">
              Versioned pricing table used to enforce USD cost caps during run execution.
            </p>
          </div>

          <div className="rounded border border-border bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-slate-50 text-slate-500 text-[11px] font-semibold tracking-tight select-none">
                    <th className="py-2.5 px-3.5">Provider</th>
                    <th className="py-2.5 px-3.5">Model Name</th>
                    <th className="py-2.5 px-3.5 text-right">Input / MTok</th>
                    <th className="py-2.5 px-3.5 text-right">Output / MTok</th>
                    <th className="py-2.5 px-3.5 text-center">Status</th>
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
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3 px-3.5 text-xs font-semibold text-slate-900">
                          {m.provider}
                        </td>
                        <td className="py-3 px-3.5 text-xs text-slate-700 underline decoration-slate-200 underline-offset-4">
                          {m.model}
                        </td>
                        <td className="py-3 px-3.5 text-xs text-slate-900 font-semibold text-right tabular-nums">
                          ${m.input_per_mtok.toFixed(2)}
                        </td>
                        <td className="py-3 px-3.5 text-xs text-slate-900 font-semibold text-right tabular-nums">
                          ${m.output_per_mtok.toFixed(2)}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
        <section className="space-y-2.5 pt-2">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Tool Registry</h2>
            <p className="text-xs text-muted-foreground">
              Sandboxed tool functions available to agents with explicit permission tracking.
            </p>
          </div>

          <div className="rounded border border-border bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-slate-50 text-slate-500 text-[11px] font-semibold tracking-tight select-none">
                    <th className="py-2.5 px-3.5">Tool Identifier</th>
                    <th className="py-2.5 px-3.5">Kind</th>
                    <th className="py-2.5 px-3.5">Description</th>
                    <th className="py-2.5 px-3.5 text-center">Permission</th>
                    <th className="py-2.5 px-3.5 text-center">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {tools.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-3.5 font-semibold text-xs text-slate-900 underline decoration-slate-200 underline-offset-4">
                        {t.id}
                      </td>
                      <td className="py-3 px-3.5 text-xs text-slate-600">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">
                          {t.kind}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-xs text-slate-600">
                        {t.desc}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {t.side_effect ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Side-Effects
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Read-Only
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
