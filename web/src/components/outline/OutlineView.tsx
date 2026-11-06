'use client';

import React from 'react';
import {
  Bot,
  UserCheck,
  GitFork,
  Network,
  GitMerge,
  ArrowRight,
  Code2,
  Trash2,
} from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { cn } from '@/lib/cn';
import { NodeType } from '@/lib/types';

export function OutlineView() {
  const graph = useEditorStore((state) => state.graph);
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const selectNode = useEditorStore((state) => state.selectNode);
  const deleteNode = useEditorStore((state) => state.deleteNode);

  const getNodeVisual = (type: NodeType) => {
    switch (type) {
      case 'agent':
        return {
          icon: <Bot className="w-3.5 h-3.5 text-indigo-400" />,
        };
      case 'gate':
        return {
          icon: <UserCheck className="w-3.5 h-3.5 text-amber-400" />,
        };
      case 'router':
        return {
          icon: <GitFork className="w-3.5 h-3.5 text-cyan-400" />,
        };
      case 'fan_out':
        return {
          icon: <Network className="w-3.5 h-3.5 text-purple-400" />,
        };
      case 'join':
        return {
          icon: <GitMerge className="w-3.5 h-3.5 text-purple-400" />,
        };
      default:
        return {
          icon: <Code2 className="w-3.5 h-3.5 text-muted-foreground" />,
        };
    }
  };

  const getEdgeBadgeStyle = (kind: string) => {
    switch (kind) {
      case 'on_success':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
      case 'on_failure':
        return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
      case 'when':
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
      case 'default':
        return 'bg-secondary text-muted-foreground border-border';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  };

  return (
    <div
      role="region"
      aria-label="Workflow Outline View"
      className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-4 text-foreground"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground tracking-tight">Graph Structural Outline</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Linear step-by-step representation of nodes, branches, and edge conditions.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground tabular-nums">
          <span className="px-2.5 py-1 rounded-lg bg-card border border-border">
            {graph.nodes.length} nodes
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-card border border-border">
            {graph.edges.length} edges
          </span>
        </div>
      </div>

      {/* Nodes list */}
      {(graph?.nodes || []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-xs text-muted-foreground">
            Workflow graph has no nodes. Use the palette toolbar above to add your first agent.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(graph?.nodes || []).map((node, index) => {
            const visual = getNodeVisual(node.type);
            const isSelected = selectedNodeId === node.id;
            const outgoing = (graph?.edges || []).filter((e) => e.from === node.id);

            return (
              <div
                key={node.id}
                role="button"
                tabIndex={0}
                onClick={() => selectNode(node.id)}
                className={cn(
                  'rounded-2xl border p-4 transition-all text-left group bg-card shadow-sm cursor-pointer',
                  isSelected
                    ? 'border-indigo-500/80 ring-2 ring-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.25)]'
                    : 'border-border hover:border-white/20'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-semibold text-muted-foreground w-6 tabular-nums">
                      #{index + 1}
                    </span>
                    <div className="w-7 h-7 rounded-lg border border-border bg-secondary flex items-center justify-center shrink-0 shadow-sm">
                      {visual.icon}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {node.label || node.id}
                        </span>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border font-medium">
                          {node.type}
                        </span>
                        {node.is_entry && (
                          <span className="rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 text-[10px] flex items-center gap-1 font-mono font-medium">
                            entry
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground block mt-0.5">
                        id: {node.id}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    title="Delete node"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNode(node.id);
                    }}
                    className="text-muted-foreground hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors opacity-60 group-hover:opacity-100 shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Prompt summary */}
                {node.system_prompt && (
                  <p className="italic text-xs text-muted-foreground mt-3 bg-secondary/60 border border-border rounded-xl p-2.5 line-clamp-2 leading-relaxed">
                    &ldquo;{node.system_prompt}&rdquo;
                  </p>
                )}
                {node.prompt && (
                  <p className="italic text-xs text-muted-foreground mt-3 bg-secondary/60 border border-border rounded-xl p-2.5 line-clamp-2 leading-relaxed">
                    <span className="text-amber-400 not-italic font-semibold mr-1.5 text-[11px] font-mono">
                      [Review Gate]
                    </span>
                    &ldquo;{node.prompt}&rdquo;
                  </p>
                )}

                {/* Outgoing Connections */}
                <div className="mt-3 pt-2.5 border-t border-border">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-2 font-semibold">
                    Outgoing Connections ({outgoing.length}):
                  </span>
                  {outgoing.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground/60 italic font-mono">
                      Terminal node (no outgoing edges)
                    </span>
                  ) : (
                    <div className="space-y-1.5">
                      {(outgoing || []).map((edge) => {
                        const targetNode = (graph?.nodes || []).find((n) => n.id === edge.to);
                        return (
                          <div
                            key={edge.id}
                            className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap font-mono"
                          >
                            <span className="text-muted-foreground/60">└─</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground/60" />
                            <span className="font-semibold text-foreground">
                              {targetNode?.label || edge.to}
                            </span>
                            <span
                              className={cn(
                                'text-[10px] px-2 py-0.5 rounded-full border font-medium',
                                getEdgeBadgeStyle(edge.kind)
                              )}
                            >
                              {edge.kind}
                            </span>
                            {edge.expr && (
                              <code className="text-[10px] bg-secondary border border-border text-foreground px-2 py-0.5 rounded-lg">
                                {edge.expr}
                              </code>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
