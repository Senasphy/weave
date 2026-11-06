'use client';

import React, { useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { cn } from '@/lib/cn';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from 'lucide-react';

export function ValidationPanel() {
  const [isExpanded, setIsExpanded] = useState(true);
  const { diagnostics, selectNode, selectEdge } = useEditorStore();

  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');
  const isValid = errors.length === 0;

  return (
    <section
      aria-label="Validation diagnostics"
      className="border-t border-border bg-card select-none z-20 shrink-0"
    >
      {/* Title Bar */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        className="h-10 px-4 flex items-center justify-between cursor-pointer hover:bg-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className="text-xs font-semibold text-foreground tracking-tight">Diagnostics</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 text-[10px] tabular-nums font-medium">
              {errors.length} {errors.length === 1 ? 'error' : 'errors'}
            </span>
            <span className="rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[10px] tabular-nums font-medium">
              {warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'}
            </span>
          </div>
        </div>

        <button
          type="button"
          aria-label={isExpanded ? 'Collapse validation panel' : 'Expand validation panel'}
          className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent transition-colors"
        >
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform duration-200',
              isExpanded ? 'rotate-180' : 'rotate-0'
            )}
          />
        </button>
      </div>

      {/* Diagnostics List Content */}
      {isExpanded && (
        <div className="max-h-48 overflow-y-auto divide-y divide-border border-t border-border">
          {diagnostics.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground font-medium flex items-center justify-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70" />
              <span>Graph validation passing with no diagnostics</span>
            </div>
          ) : (
            diagnostics.map((d, i) => {
              const isErr = d.severity === 'error';
              return (
                <div
                  key={`${d.code}-${d.node_id || ''}-${d.edge_id || ''}-${i}`}
                  onClick={() => {
                    if (d.node_id) selectNode(d.node_id);
                    else if (d.edge_id) selectEdge(d.edge_id);
                  }}
                  className="p-3 flex items-start gap-3 hover:bg-accent/40 cursor-pointer transition-colors"
                >
                  {isErr ? (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-foreground">
                        {d.code}
                      </span>
                      {d.node_id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectNode(d.node_id!);
                          }}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted hover:bg-accent text-foreground border border-border transition-colors cursor-pointer"
                          title={`Select node ${d.node_id}`}
                        >
                          node:{d.node_id}
                        </button>
                      )}
                      {d.edge_id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectEdge(d.edge_id!);
                          }}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted hover:bg-accent text-foreground border border-border transition-colors cursor-pointer"
                          title={`Select edge ${d.edge_id}`}
                        >
                          edge:{d.edge_id}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{d.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
