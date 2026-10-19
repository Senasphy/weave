'use client';

import React, { useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { cn } from '@/lib/cn';
import {
  Trash2,
  X,
  Code2,
  Clock,
  Cpu,
  Wrench,
  Bot,
  UserCheck,
  GitFork,
  GitMerge,
  Network,
  ArrowRight,
  Database,
  ShieldAlert,
} from 'lucide-react';
import { EdgeKind, NodeType } from '@/lib/types';

interface ToggleSwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

function ToggleSwitch({ checked, onChange, label, description, disabled }: ToggleSwitchProps) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className={cn(
        'flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border hover:bg-accent/40 transition-colors cursor-pointer select-none group',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex flex-col min-w-0 pr-2">
        <span className="text-xs font-medium text-foreground transition-colors">
          {label}
        </span>
        {description && (
          <span className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
            {description}
          </span>
        )}
      </div>
      <div
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out border border-border',
          checked ? 'bg-foreground border-foreground' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-sm ring-0 transition-transform duration-200 ease-in-out',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          )}
        />
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded bg-white border border-border focus:border-slate-400 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none';

const selectClass =
  'w-full rounded bg-white border border-border focus:border-slate-400 px-3 py-1.5 text-xs text-foreground transition-colors focus:outline-none [&>option]:bg-card [&>option]:text-foreground';

const textareaClass =
  'w-full rounded bg-white border border-border focus:border-slate-400 p-2.5 text-xs font-mono min-h-[80px] text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none resize-y';

export function InspectorPanel() {
  const {
    graph,
    selectedNodeId,
    selectedEdgeId,
    selectNode,
    selectEdge,
    updateNode,
    deleteNode,
    updateEdge,
    deleteEdge,
  } = useEditorStore();

  const [newToolInput, setNewToolInput] = useState('');

  const selectedNode = graph.nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = graph.edges.find((e) => e.id === selectedEdgeId);

  const getNodeBadge = (type: NodeType) => {
    switch (type) {
      case 'agent':
        return {
          icon: <Bot className="w-3.5 h-3.5 text-slate-700" />,
          color: 'text-slate-800 bg-slate-100 border-slate-200',
          label: 'Agent Node',
        };
      case 'gate':
        return {
          icon: <UserCheck className="w-3.5 h-3.5 text-slate-700" />,
          color: 'text-slate-800 bg-slate-100 border-slate-200',
          label: 'Gate Node',
        };
      case 'router':
        return {
          icon: <GitFork className="w-3.5 h-3.5 text-slate-700" />,
          color: 'text-slate-800 bg-slate-100 border-slate-200',
          label: 'Router Node',
        };
      case 'fan_out':
        return {
          icon: <Network className="w-3.5 h-3.5 text-slate-700" />,
          color: 'text-slate-800 bg-slate-100 border-slate-200',
          label: 'Fan Out',
        };
      case 'join':
        return {
          icon: <GitMerge className="w-3.5 h-3.5 text-slate-700" />,
          color: 'text-slate-800 bg-slate-100 border-slate-200',
          label: 'Join Node',
        };
      default:
        return {
          icon: <Code2 className="w-3.5 h-3.5 text-[#878da0]" />,
          color: 'text-foreground-muted bg-white/[0.04] border-white/[0.08]',
          label: 'Node',
        };
    }
  };

  const handleAddTool = () => {
    if (!newToolInput.trim() || !selectedNode) return;
    const incoming = newToolInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const existing = selectedNode.tools || [];
    const merged = Array.from(new Set([...existing, ...incoming]));
    updateNode(selectedNode.id, { tools: merged });
    setNewToolInput('');
  };

  const handleRemoveTool = (toolToRemove: string) => {
    if (!selectedNode) return;
    const updated = (selectedNode.tools || []).filter((t) => t !== toolToRemove);
    updateNode(selectedNode.id, { tools: updated });
  };

  // Empty State
  if (!selectedNode && !selectedEdge) {
    return (
      <aside
        aria-label="Property Inspector"
        className="w-80 bg-card border-l border-border p-6 flex flex-col items-center justify-center text-center select-none"
      >
        <div className="w-8 h-8 rounded border border-border bg-slate-50 flex items-center justify-center mb-3 text-slate-500">
          <Code2 className="w-4 h-4" />
        </div>
        <h4 className="text-xs font-semibold text-foreground mb-1">No Element Selected</h4>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
          Select any node or edge on the canvas or outline to inspect and configure properties.
        </p>
        <div className="mt-3 px-2 py-0.5 rounded bg-slate-100 border border-border text-[10px] text-muted-foreground">
          Press <kbd className="text-foreground">Delete</kbd> to remove selection
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Property Inspector"
      className="w-80 bg-card border-l border-border flex flex-col h-full overflow-hidden select-none"
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-card">
        <div className="min-w-0 pr-2">
          {selectedNode ? (
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded border',
                  getNodeBadge(selectedNode.type).color
                )}
              >
                {getNodeBadge(selectedNode.type).icon}
                {getNodeBadge(selectedNode.type).label}
              </span>
              {selectedNode.is_entry && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  entry
                </span>
              )}
            </div>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Edge Connection
            </span>
          )}
          <h3 className="text-xs font-semibold text-foreground truncate mt-1">
            {selectedNode ? selectedNode.label || selectedNode.id : selectedEdge?.id}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Delete element"
            onClick={() => {
              if (selectedNodeId) deleteNode(selectedNodeId);
              if (selectedEdgeId) deleteEdge(selectedEdgeId);
            }}
            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Close inspector"
            onClick={() => {
              selectNode(null);
              selectEdge(null);
            }}
            className="p-1.5 rounded-lg text-[#878da0] hover:text-foreground hover:bg-white/[0.04] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Panel Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 divide-y divide-white/[0.04]">
        {/* Node Properties */}
        {selectedNode && (
          <>
            {/* General Settings */}
            <div className="py-4 space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-[11px] uppercase tracking-wider text-[#4e5468] font-medium">
                  Node Label
                </label>
                <input
                  type="text"
                  value={selectedNode.label || ''}
                  onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
                  placeholder="Enter descriptive label..."
                  className={inputClass}
                />
              </div>

              <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded bg-slate-50 border border-border">
                <span className="text-slate-500 font-medium">ID</span>
                <span className="text-slate-800 truncate max-w-[180px] font-mono text-[11px]">{selectedNode.id}</span>
              </div>

              <ToggleSwitch
                checked={selectedNode.is_entry || false}
                onChange={(checked) => updateNode(selectedNode.id, { is_entry: checked })}
                label="Entry Point"
                description="Initial node to execute upon workflow trigger"
              />
            </div>

            {/* Agent Node Configuration */}
            {selectedNode.type === 'agent' && (
              <>
                {/* Model Configuration */}
                <div className="py-4 space-y-3">
                  <label className="text-[11px] uppercase tracking-wider text-[#4e5468] font-medium flex items-center gap-1.5">
                    <Cpu className="w-3 h-3 text-zinc-500" />
                    <span>Model Config</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={selectedNode.model?.provider || 'mock'}
                      onChange={(e) => {
                        const prov = e.target.value as any;
                        const defaultModel =
                          prov === 'gemini'
                            ? 'gemini-3.8-flash'
                            : prov === 'anthropic'
                            ? 'opus-5.5'
                            : prov === 'openai'
                            ? 'gpt-6.1-sol'
                            : 'mock-llm';
                        updateNode(selectedNode.id, {
                          model: {
                            provider: prov,
                            name: selectedNode.model?.name || defaultModel,
                          },
                        });
                      }}
                      className={selectClass}
                    >
                      <option value="mock">mock</option>
                      <option value="gemini">gemini</option>
                      <option value="anthropic">anthropic</option>
                      <option value="openai">openai</option>
                    </select>
                    <div>
                      <input
                        type="text"
                        list="model-suggestions"
                        placeholder={
                          selectedNode.model?.provider === 'gemini'
                            ? 'e.g. gemini-3.8-flash'
                            : selectedNode.model?.provider === 'anthropic'
                            ? 'e.g. opus-5.5'
                            : selectedNode.model?.provider === 'openai'
                            ? 'e.g. gpt-6.1-sol'
                            : 'e.g. mock-llm'
                        }
                        value={selectedNode.model?.name || ''}
                        onChange={(e) =>
                          updateNode(selectedNode.id, {
                            model: {
                              provider: selectedNode.model?.provider || 'mock',
                              name: e.target.value,
                            },
                          })
                        }
                        className={cn(inputClass, 'font-mono text-xs')}
                      />
                      <datalist id="model-suggestions">
                        <option value="gpt-6.1-sol" />
                        <option value="gpt-6-astra" />
                        <option value="gpt-6-sol" />
                        <option value="gpt-6-luna" />
                        <option value="opus-5.5" />
                        <option value="sonnet-5.5" />
                        <option value="haiku-5.5" />
                        <option value="gemini-3.8-flash" />
                        <option value="gemini-3.1-pro" />
                        <option value="gemini-3.1-flash-lite" />
                        <option value="claude-4-opus" />
                        <option value="claude-4-sonnet" />
                        <option value="claude-3-7-sonnet" />
                        <option value="o3" />
                        <option value="o3-mini" />
                        <option value="gpt-5" />
                        <option value="mock-llm" />
                      </datalist>
                    </div>
                  </div>
                </div>

                {/* System Prompt */}
                <div className="py-4 space-y-1.5">
                  <label className="block text-[11px] uppercase tracking-wider text-[#4e5468] font-medium">
                    System Prompt
                  </label>
                  <textarea
                    rows={4}
                    value={selectedNode.system_prompt || ''}
                    onChange={(e) => updateNode(selectedNode.id, { system_prompt: e.target.value })}
                    placeholder="You are an autonomous agent responsible for..."
                    className={textareaClass}
                  />
                </div>

                {/* Allowed Tools with Pills */}
                <div className="py-4 space-y-2.5">
                  <label className="text-[11px] uppercase tracking-wider text-[#4e5468] font-medium flex items-center gap-1.5">
                    <Wrench className="w-3 h-3 text-[#4e5468]" />
                    <span>Allowed Tools ({selectedNode.tools?.length || 0})</span>
                  </label>

                  <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2.5 rounded bg-slate-50 border border-border">
                    {(!selectedNode.tools || selectedNode.tools.length === 0) ? (
                      <span className="text-xs text-slate-400 italic self-center">
                        No tools assigned
                      </span>
                    ) : (
                      selectedNode.tools.map((tool) => (
                        <span
                          key={tool}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-border text-xs text-foreground transition-colors"
                        >
                          <span className="font-medium">{tool}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTool(tool)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                            title={`Remove ${tool}`}
                            aria-label={`Remove ${tool}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add tool name... (e.g. echo, refund)"
                      value={newToolInput}
                      onChange={(e) => setNewToolInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTool();
                        }
                      }}
                      className={cn(inputClass, 'text-xs py-1.5')}
                    />
                    <button
                      type="button"
                      onClick={handleAddTool}
                      disabled={!newToolInput.trim()}
                      className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-xs text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* State I/O */}
                <div className="py-4 space-y-3">
                  <label className="text-[11px] uppercase tracking-wider text-[#4e5468] font-medium flex items-center gap-1.5">
                    <Database className="w-3 h-3 text-[#4e5468]" />
                    <span>State Scope</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">State Reads</span>
                      <input
                        type="text"
                        placeholder="ticket, findings"
                        value={selectedNode.reads?.join(', ') || ''}
                        onChange={(e) =>
                          updateNode(selectedNode.id, {
                            reads: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        className={cn(inputClass, 'text-xs font-mono px-2.5 py-1.5')}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">State Writes</span>
                      <input
                        type="text"
                        placeholder="ticket, findings"
                        value={selectedNode.writes?.join(', ') || ''}
                        onChange={(e) =>
                          updateNode(selectedNode.id, {
                            writes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        className={cn(inputClass, 'text-xs font-mono px-2.5 py-1.5')}
                      />
                    </div>
                  </div>
                </div>

                {/* Permissions Switch */}
                <div className="py-4 space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-[#4e5468] font-medium flex items-center gap-1.5">
                    <ShieldAlert className="w-3 h-3 text-[#4e5468]" />
                    <span>Permissions</span>
                  </label>
                  <ToggleSwitch
                    checked={selectedNode.permissions?.side_effects || false}
                    onChange={(checked) =>
                      updateNode(selectedNode.id, {
                        permissions: {
                          network: selectedNode.permissions?.network || false,
                          side_effects: checked,
                        },
                      })
                    }
                    label="Permit Side-Effecting Tools"
                    description="Authorizes stateful or external mutation tools"
                  />
                </div>
              </>
            )}

            {/* Gate Node Configuration */}
            {selectedNode.type === 'gate' && (
              <>
                <div className="py-4 space-y-1.5">
                  <label className="block text-[11px] uppercase tracking-wider text-[#4e5468] font-medium">
                    Human Review Prompt
                  </label>
                  <textarea
                    rows={3}
                    value={selectedNode.prompt || ''}
                    onChange={(e) => updateNode(selectedNode.id, { prompt: e.target.value })}
                    placeholder="Provide context or instructions for human approver..."
                    className={textareaClass}
                  />
                </div>

                <div className="py-4 space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-[#4e5468] font-medium flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Timeout (seconds)</span>
                  </label>
                  <input
                    type="number"
                    value={selectedNode.timeout_seconds ?? 86400}
                    onChange={(e) =>
                      updateNode(selectedNode.id, { timeout_seconds: parseInt(e.target.value) || 86400 })
                    }
                    className={cn(inputClass, 'font-mono')}
                  />
                </div>

                <div className="py-4">
                  <ToggleSwitch
                    checked={selectedNode.allow_edit ?? true}
                    onChange={(checked) => updateNode(selectedNode.id, { allow_edit: checked })}
                    label="Allow Reviewer Edit"
                    description="Permit reviewer to modify input payload before approving"
                  />
                </div>
              </>
            )}

            {/* Router Node Configuration */}
            {selectedNode.type === 'router' && (
              <div className="py-4 space-y-1.5">
                <label className="block text-[11px] uppercase tracking-wider text-[#4e5468] font-medium">
                  Router Evaluation Mode
                </label>
                <select
                  value={selectedNode.router_mode || 'first_matching'}
                  onChange={(e) => updateNode(selectedNode.id, { router_mode: e.target.value as any })}
                  className={selectClass}
                >
                  <option value="first_matching">First Matching When Edge (Priority Order)</option>
                  <option value="all_matching">All Matching When Edges (Concurrent)</option>
                </select>
              </div>
            )}

            {/* Join Node Configuration */}
            {selectedNode.type === 'join' && (
              <div className="py-4 space-y-1.5">
                <label className="block text-[11px] uppercase tracking-wider text-[#4e5468] font-medium">
                  Join Policy
                </label>
                <select
                  value={selectedNode.join_policy || 'wait_all'}
                  onChange={(e) => updateNode(selectedNode.id, { join_policy: e.target.value as any })}
                  className={selectClass}
                >
                  <option value="wait_all">Wait for all incoming branches (wait_all)</option>
                  <option value="fail_fast">Fail immediately if any branch fails (fail_fast)</option>
                  <option value="allow_partial">Allow partial branch completion (allow_partial)</option>
                </select>
              </div>
            )}
          </>
        )}

        {/* Edge Properties */}
        {selectedEdge && (
          <div className="py-4 space-y-4">
            <div className="p-3 rounded bg-slate-50 border border-border space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                Connection Path
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-white border border-border text-foreground truncate max-w-[100px] font-mono text-[11px]">
                  {selectedEdge.from}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="px-2 py-1 rounded bg-white border border-border text-foreground truncate max-w-[100px] font-mono text-[11px]">
                  {selectedEdge.to}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] uppercase tracking-wider text-[#4e5468] font-medium">
                Edge Kind
              </label>
              <select
                value={selectedEdge.kind}
                onChange={(e) => updateEdge(selectedEdge.id, { kind: e.target.value as EdgeKind })}
                className={selectClass}
              >
                <option value="always">always</option>
                <option value="on_success">on_success</option>
                <option value="on_failure">on_failure</option>
                <option value="when">when (CEL expression)</option>
                <option value="default">default (router fallback)</option>
              </select>
            </div>

            {selectedEdge.kind === 'when' && (
              <div className="space-y-1.5">
                <label className="block text-[11px] uppercase tracking-wider text-[#4e5468] font-medium">
                  CEL Expression (bool)
                </label>
                <input
                  type="text"
                  placeholder="e.g. out.amount > 100"
                  value={selectedEdge.expr || ''}
                  onChange={(e) => updateEdge(selectedEdge.id, { expr: e.target.value })}
                  className={cn(inputClass, 'font-mono text-xs')}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] uppercase tracking-wider text-[#4e5468] font-medium">
                Evaluation Priority
              </label>
              <input
                type="number"
                value={selectedEdge.priority || 0}
                onChange={(e) => updateEdge(selectedEdge.id, { priority: parseInt(e.target.value) || 0 })}
                className={cn(inputClass, 'font-mono')}
              />
              <span className="text-[10px] text-[#4e5468]">Higher values are evaluated first</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] uppercase tracking-wider text-[#4e5468] font-medium">
                Max Traversals
              </label>
              <input
                type="number"
                placeholder="Unlimited cycle depth"
                value={selectedEdge.max_traversals ?? ''}
                onChange={(e) =>
                  updateEdge(selectedEdge.id, { max_traversals: parseInt(e.target.value) || undefined })
                }
                className={cn(inputClass, 'font-mono')}
              />
              <span className="text-[10px] text-[#4e5468]">Guard against infinite graph execution cycles</span>
            </div>
          </div>
        )}
      </div>

      {/* Delete Button Footer */}
      <div className="p-4 border-t border-border bg-card">
        <button
          type="button"
          onClick={() => {
            if (selectedNodeId) deleteNode(selectedNodeId);
            if (selectedEdgeId) deleteEdge(selectedEdgeId);
          }}
          className="w-full py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-xs font-medium transition-all flex items-center justify-center gap-2 group"
        >
          <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          <span>{selectedNode ? 'Delete Node' : 'Delete Edge'}</span>
        </button>
      </div>
    </aside>
  );
}
