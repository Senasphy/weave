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
          icon: <Bot className="w-3.5 h-3.5 text-slate-700" />,
        };
      case 'gate':
        return {
          icon: <UserCheck className="w-3.5 h-3.5 text-slate-700" />,
        };
      case 'router':
        return {
          icon: <GitFork className="w-3.5 h-3.5 text-slate-700" />,
        };
      case 'fan_out':
        return {
          icon: <Network className="w-3.5 h-3.5 text-slate-700" />,
        };
      case 'join':
        return {
          icon: <GitMerge className="w-3.5 h-3.5 text-slate-700" />,
        };
      default:
        return {
          icon: <Code2 className="w-3.5 h-3.5 text-slate-700" />,
        };
    }
  };

  const getEdgeBadgeStyle = (kind: string) => {
    switch (kind) {
      case 'on_success':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'on_failure':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'when':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'default':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div
      role="region"
      aria-label="Workflow Outline View"
      className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-4"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Graph Structural Outline</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Linear step-by-step representation of nodes, branches, and edge conditions.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
          <span className="px-2 py-0.5 rounded bg-white border border-border">
            {graph.nodes.length} nodes
          </span>
          <span className="px-2 py-0.5 rounded bg-white border border-border">
            {graph.edges.length} edges
          </span>
        </div>
      </div>

      {/* Nodes list */}
      {graph.nodes.length === 0 ? (
        <div className="rounded border border-dashed border-border bg-white p-12 text-center">
          <p className="text-xs text-muted-foreground">
            Workflow graph has no nodes. Use the palette toolbar above to add your first agent.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {graph.nodes.map((node, index) => {
            const visual = getNodeVisual(node.type);
            const isSelected = selectedNodeId === node.id;
            const outgoing = graph.edges.filter((e) => e.from === node.id);

            return (
              <div
                key={node.id}
                role="button"
                tabIndex={0}
                onClick={() => selectNode(node.id)}
                className={cn(
                  'rounded border p-3.5 transition-colors text-left group bg-white',
                  isSelected
                    ? 'border-slate-900 ring-1 ring-slate-900'
                    : 'border-border hover:border-slate-300'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-slate-400 w-5 tabular-nums">
                      #{index + 1}
                    </span>
                    <div className="w-6 h-6 rounded border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                      {visual.icon}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {node.label || node.id}
                        </span>
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                          {node.type}
                        </span>
                        {node.is_entry && (
                          <span className="rounded bg-slate-900 text-white px-1.5 py-0.5 text-[10px] flex items-center gap-1 font-medium">
                            entry
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
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
                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors opacity-60 group-hover:opacity-100 shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Prompt summary */}
                {node.system_prompt && (
                  <p className="italic text-xs text-slate-600 mt-2 bg-slate-50 border border-slate-100 rounded p-2 line-clamp-2">
                    &ldquo;{node.system_prompt}&rdquo;
                  </p>
                )}
                {node.prompt && (
                  <p className="italic text-xs text-slate-600 mt-2 bg-slate-50 border border-slate-100 rounded p-2 line-clamp-2">
                    <span className="text-slate-700 not-italic font-semibold mr-1.5 text-[11px]">
                      [Review Gate]
                    </span>
                    &ldquo;{node.prompt}&rdquo;
                  </p>
                )}

                {/* Outgoing Connections */}
                <div className="mt-2.5 pt-2 border-t border-slate-100">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1.5 font-semibold">
                    Outgoing Connections ({outgoing.length}):
                  </span>
                  {outgoing.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">
                      Terminal node (no outgoing edges)
                    </span>
                  ) : (
                    <div className="space-y-1">
                      {outgoing.map((edge) => {
                        const targetNode = graph.nodes.find((n) => n.id === edge.to);
                        return (
                          <div
                            key={edge.id}
                            className="flex items-center gap-2 text-xs text-slate-600 flex-wrap"
                          >
                            <span className="text-slate-400">└─</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="font-semibold text-slate-900">
                              {targetNode?.label || edge.to}
                            </span>
                            <span
                              className={cn(
                                'text-[10px] px-1.5 py-0.2 rounded border font-medium',
                                getEdgeBadgeStyle(edge.kind)
                              )}
                            >
                              {edge.kind}
                            </span>
                            {edge.expr && (
                              <code className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
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
