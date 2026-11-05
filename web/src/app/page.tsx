'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { motion, type Variants } from 'framer-motion';
import {
  Plus,
  Search,
  Network,
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
  X,
  Loader2,
  SlidersHorizontal,
  ArrowUpDown,
  MoreVertical,
  Bell,
  MessageSquare,
  FileCode,
  LayoutGrid,
  Table as TableIcon,
  Play,
  ShieldAlert,
  Bot,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Copy,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { WorkflowGraph } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/cn';

function formatDate(dateString: string) {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  } catch {
    return dateString;
  }
}

const cardContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const cardItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: 'easeOut',
    },
  },
};

export default function WorkflowsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'templates'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'triage' | 'blank'>('triage');

  const { data: workflows = [], isLoading, error } = useQuery({
    queryKey: ['workflows'],
    queryFn: api.listWorkflows,
  });

  const { data: runs = [] } = useQuery({
    queryKey: ['runs'],
    queryFn: () => api.listRuns(),
  });

  const { data: gates = [] } = useQuery({
    queryKey: ['gates'],
    queryFn: api.listGates,
  });

  const activeRunsCount = runs.filter((r) => r.status === 'running').length;
  const failedRunsCount = runs.filter((r) => r.status === 'failed').length;
  const pendingGatesCount = gates.length;

  const createMutation = useMutation({
    mutationFn: async () => {
      let initialGraph: WorkflowGraph | undefined;
      if (selectedTemplate === 'triage') {
        initialGraph = {
          schema_version: '1',
          name: name.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
          budgets: { max_wall_seconds: 600, max_cost_usd: 2.0, max_tokens: 150000 },
          nodes: [
            {
              id: 'classifier',
              type: 'agent',
              label: 'Classifier Agent',
              position: { x: 80, y: 150 },
              is_entry: true,
              model: { provider: 'mock', name: 'mock-llm' },
              system_prompt: 'Classify user support tickets into billing or general inquiry.',
              output_schema: {
                type: 'object',
                properties: { category: { type: 'string' }, amount: { type: 'number' } },
                required: ['category'],
              },
            },
            {
              id: 'router',
              type: 'router',
              label: 'Decision Router',
              position: { x: 380, y: 160 },
              router_mode: 'first_matching',
            },
            {
              id: 'approval_gate',
              type: 'gate',
              label: 'Refund Approval Gate',
              position: { x: 650, y: 80 },
              prompt: 'Review and approve high-value refund request ($100+)?',
              allow_edit: true,
              timeout_seconds: 86400,
            },
            {
              id: 'refund_agent',
              type: 'agent',
              label: 'Refund Executor',
              position: { x: 950, y: 80 },
              model: { provider: 'mock', name: 'mock-llm' },
              system_prompt: 'Execute refund transaction via Stripe tool.',
              tools: ['stripe_refund'],
              permissions: { network: true, side_effects: true },
              output_schema: { type: 'object', properties: { status: { type: 'string' } } },
            },
            {
              id: 'standard_reply',
              type: 'agent',
              label: 'Auto Responder',
              position: { x: 650, y: 260 },
              model: { provider: 'mock', name: 'mock-llm' },
              system_prompt: 'Generate automated helpful response to user query.',
              output_schema: { type: 'object', properties: { reply: { type: 'string' } } },
            },
          ],
          edges: [
            { id: 'e1', from: 'classifier', to: 'router', kind: 'always' },
            { id: 'e2', from: 'router', to: 'approval_gate', kind: 'when', expr: 'out.amount > 100', priority: 1 },
            { id: 'e3', from: 'router', to: 'standard_reply', kind: 'default' },
            { id: 'e4', from: 'approval_gate', to: 'refund_agent', kind: 'on_success' },
          ],
        };
      }
      return api.createWorkflow({ name, description, initial_graph: initialGraph });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setIsModalOpen(false);
      setName('');
      setDescription('');
    },
  });

  const filtered = workflows.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.description && w.description.toLowerCase().includes(search.toLowerCase())) ||
      w.id.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || createMutation.isPending) return;
    createMutation.mutate();
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map((w) => w.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto w-full bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* 1. Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Workflows</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Build and manage multi-step AI workflows with automated routing, spending limits, and human approvals.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Documentation icon button */}
            <a
              href="http://localhost:3010"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded bg-white border border-border text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="Documentation"
              aria-label="Documentation"
            >
              <MessageSquare className="w-4 h-4" />
            </a>

            {/* Notification Bell */}
            <Link
              href="/gates"
              className="relative p-1.5 rounded bg-white border border-border text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="Notifications / Pending Gates"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {pendingGatesCount > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
              )}
            </Link>

            {/* Secondary Action: Export JSON */}
            <button
              onClick={() => {
                const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(workflows, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute('href', dataStr);
                downloadAnchor.setAttribute('download', `workflows-export-${Date.now()}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
              }}
              className="px-3 py-1.5 rounded bg-white border border-border text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
              <span>Export JSON</span>
            </button>

            {/* Primary Action: Add new */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add new</span>
            </button>
          </div>
        </div>

        {/* 2. Stat / Metric Cards - Flat, neutral iconography, tabular-nums */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Total Workflows */}
          <div className="p-4 rounded bg-white border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded border border-border bg-slate-50 flex items-center justify-center text-slate-600">
                <Network className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-border tabular-nums">
                {workflows.length} total
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {workflows.length}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Total workflows
              </div>
            </div>
          </div>

          {/* Card 2: Active Runs */}
          <div className="p-4 rounded bg-white border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded border border-border bg-slate-50 flex items-center justify-center text-slate-600">
                <Play className="w-3.5 h-3.5" />
              </div>
              <StatusBadge
                status={activeRunsCount > 0 ? 'running' : 'idle'}
                label={activeRunsCount > 0 ? `${activeRunsCount} active` : 'Idle'}
              />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {activeRunsCount}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Active executions
              </div>
            </div>
          </div>

          {/* Card 3: Failed Runs */}
          <div className="p-4 rounded bg-white border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded border border-border bg-slate-50 flex items-center justify-center text-slate-600">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <StatusBadge
                status={failedRunsCount > 0 ? 'failed' : 'idle'}
                label={failedRunsCount > 0 ? `${failedRunsCount} failed` : '0 issues'}
              />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {failedRunsCount}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Failed executions
              </div>
            </div>
          </div>

          {/* Card 4: Gates Awaiting Review */}
          <div className="p-4 rounded bg-white border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded border border-border bg-slate-50 flex items-center justify-center text-slate-600">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
              <StatusBadge
                status={pendingGatesCount > 0 ? 'waiting_human' : 'idle'}
                label={pendingGatesCount > 0 ? `${pendingGatesCount} pending` : 'All clear'}
              />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {pendingGatesCount}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Pending approvals
              </div>
            </div>
          </div>
        </div>

        {/* 3. Subheader: Segmented Tabs (Left) + Search & Filter & View Toggle (Right) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Segmented Tabs */}
          <div className="p-0.5 rounded bg-slate-100 border border-border/80 inline-flex items-center self-start gap-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer',
                activeTab === 'all'
                  ? 'bg-white text-slate-900 border border-border/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Workflow list
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer',
                activeTab === 'active'
                  ? 'bg-white text-slate-900 border border-border/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer',
                activeTab === 'templates'
                  ? 'bg-white text-slate-900 border border-border/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Templates
            </button>
          </div>

          {/* Right Controls: Filter Search, Filter, Sort, View Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter workflows by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-border rounded pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                  aria-label="Clear filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <button
              type="button"
              className="px-2.5 py-1.5 rounded bg-white border border-border text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Filter</span>
            </button>

            {/* Sort Button */}
            <button
              type="button"
              className="px-2.5 py-1.5 rounded bg-white border border-border text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Sort</span>
            </button>

            {/* Table / Grid Mode Switcher */}
            <div className="p-0.5 rounded bg-slate-100 inline-flex items-center border border-border">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'p-1 rounded transition-colors cursor-pointer',
                  viewMode === 'table' ? 'bg-white text-slate-900 border border-border/80' : 'text-slate-500 hover:text-slate-900'
                )}
                title="Table view"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1 rounded transition-colors cursor-pointer',
                  viewMode === 'grid' ? 'bg-white text-slate-900 border border-border/80' : 'text-slate-500 hover:text-slate-900'
                )}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            Failed to load workflows: {(error as Error).message}
          </div>
        )}

        {/* 4. Main Content: Table or Grid */}
        {isLoading ? (
          /* Loading Skeleton */
          <div className="rounded border border-border bg-white p-6 space-y-4 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-1/4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-slate-50 rounded" />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty State */
          <div className="rounded border border-dashed border-border bg-white p-14 text-center">
            <div className="w-10 h-10 rounded border border-border bg-slate-50 flex items-center justify-center mx-auto text-slate-600">
              <Network className="w-5 h-5 text-slate-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mt-3">
              {search ? 'No matching workflows' : 'No workflows yet'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
              {search
                ? `No workflows matched "${search}". Try clearing your filters.`
                : 'Create your first AI workflow to connect prompts, tools, and human review steps.'}
            </p>
            <div className="mt-4">
              {search ? (
                <button
                  onClick={() => setSearch('')}
                  className="px-3 py-1.5 rounded text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Clear filter
                </button>
              ) : (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Workflow</span>
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="rounded border border-border bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-slate-50 text-slate-500 text-[11px] font-semibold tracking-tight select-none">
                    <th className="py-2.5 px-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filtered.length && filtered.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3.5">
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                        <span>Workflow name</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3.5">
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                        <span>Workflow ID</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3.5">
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                        <span>Steps</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3.5">
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                        <span>Updated date</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3.5 text-center">
                      <span>Status</span>
                    </th>
                    <th className="py-2.5 px-3.5 w-12 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.map((wf) => {
                    const isSelected = selectedIds.includes(wf.id);
                    return (
                      <tr
                        key={wf.id}
                        className={cn(
                          'group hover:bg-slate-50/80 transition-colors',
                          isSelected && 'bg-slate-50'
                        )}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-3.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(wf.id)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                          />
                        </td>

                        {/* Name + Description */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0 text-slate-700 font-semibold text-xs">
                              {wf.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/workflows/${wf.id}`}
                                className="text-xs font-semibold text-slate-900 hover:text-slate-600 transition-colors truncate block"
                              >
                                {wf.name}
                              </Link>
                              <span className="text-[11px] text-muted-foreground truncate block max-w-xs">
                                {wf.description || 'No description provided'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* ID */}
                        <td className="py-3 px-3.5">
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(wf.id, e)}
                            className="group/id inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 underline decoration-slate-200 underline-offset-4 cursor-pointer"
                            title="Click to copy ID"
                          >
                            <span>{wf.id.length > 16 ? `${wf.id.substring(0, 16)}...` : wf.id}</span>
                            {copiedId === wf.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-0 group-hover/id:opacity-100 text-slate-400 transition-opacity" />
                            )}
                          </button>
                        </td>

                        {/* Steps */}
                        <td className="py-3 px-3.5">
                          <span className="text-xs text-slate-600">
                            {wf.draft_graph?.nodes?.length ? `${wf.draft_graph.nodes.length} steps` : '5 steps'}
                          </span>
                        </td>

                        {/* Updated Date */}
                        <td className="py-3 px-3.5">
                          <span className="text-xs text-slate-600 tabular-nums">
                            {formatDate(wf.updated_at)}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3.5 text-center">
                          <StatusBadge status="active" label="Active" pulse={false} />
                        </td>

                        {/* Action 3-dots */}
                        <td className="py-3 px-3.5 text-right">
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <button
                                type="button"
                                className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                                aria-label="Row actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content
                                align="end"
                                className="z-50 min-w-[140px] rounded bg-white border border-border p-1 text-xs shadow-modal"
                              >
                                <DropdownMenu.Item asChild>
                                  <Link
                                    href={`/workflows/${wf.id}`}
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer outline-none"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Open Editor</span>
                                  </Link>
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  onClick={(e) => handleCopyId(wf.id, e as any)}
                                  className="flex items-center gap-2 px-2.5 py-1.5 rounded text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer outline-none"
                                >
                                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Copy ID</span>
                                </DropdownMenu.Item>
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="border-t border-border px-4 py-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs select-none">
              {/* Left: Records selector */}
              <div className="flex items-center gap-2 text-slate-600">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-white text-slate-700 text-xs font-medium">
                  <span>10 records</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
              </div>

              {/* Center: Pagination Buttons */}
              <div className="flex items-center gap-1 self-center">
                <button
                  type="button"
                  disabled
                  className="p-1 rounded border border-border text-slate-400 bg-white disabled:opacity-40 cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className="w-6 h-6 rounded bg-slate-900 text-white font-semibold text-xs flex items-center justify-center"
                >
                  1
                </button>
                <button
                  type="button"
                  className="w-6 h-6 rounded hover:bg-slate-100 text-slate-600 font-medium text-xs flex items-center justify-center transition-colors cursor-pointer"
                >
                  2
                </button>
                <button
                  type="button"
                  className="w-6 h-6 rounded hover:bg-slate-100 text-slate-600 font-medium text-xs flex items-center justify-center transition-colors cursor-pointer"
                >
                  3
                </button>
                <span className="px-1 text-slate-400">...</span>
                <button
                  type="button"
                  className="p-1 rounded border border-border text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Right: Counter */}
              <div className="text-slate-500 tabular-nums text-[11px] self-end sm:self-auto">
                1 - {filtered.length} of {workflows.length}
              </div>
            </div>
          </div>
        ) : (
          /* Grid View */
          <motion.div
            variants={cardContainerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5"
          >
            {filtered.map((wf) => (
              <motion.div
                key={wf.id}
                variants={cardItemVariants}
                className="rounded border border-border bg-white hover:border-slate-300 transition-colors p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded border border-slate-200 bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-800">
                        {wf.name.substring(0, 2).toUpperCase()}
                      </div>
                      <Link
                        href={`/workflows/${wf.id}`}
                        className="text-xs font-semibold text-slate-900 hover:text-slate-600 transition-colors line-clamp-1"
                      >
                        {wf.name}
                      </Link>
                    </div>
                    <StatusBadge status="active" label="Active" pulse={false} />
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 mt-2.5 leading-relaxed">
                    {wf.description || 'No description provided.'}
                  </p>
                </div>

                <div className="border-t border-border mt-3.5 pt-2.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDate(wf.updated_at)}</span>
                  </span>
                  <Link
                    href={`/workflows/${wf.id}`}
                    className="inline-flex items-center gap-1 font-medium text-slate-900 hover:text-slate-600 transition-colors"
                  >
                    <span>Open Editor</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* 'New Workflow' Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[2px] animate-in fade-in-0 duration-150" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg rounded bg-white border border-border shadow-modal p-5 focus:outline-none animate-in fade-in-0 zoom-in-95 duration-150">
                  <div className="flex items-start justify-between">
                    <div>
                      <Dialog.Title className="text-base font-bold tracking-tight text-slate-900">
                        Create New Workflow
                      </Dialog.Title>
                      <Dialog.Description className="text-xs text-muted-foreground mt-0.5">
                        Set up a multi-agent workflow graph with strict budgets and review gates.
                      </Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors cursor-pointer"
                        aria-label="Close dialog"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </Dialog.Close>
                  </div>

                  <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5">
                    <div>
                      <label htmlFor="workflow-name" className="block text-xs font-semibold text-slate-700 mb-1">
                        Workflow Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="workflow-name"
                        type="text"
                        placeholder="e.g. customer-refund-triage"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-50 border border-border rounded px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-slate-400 focus:bg-white placeholder:text-muted-foreground transition-colors"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label htmlFor="workflow-description" className="block text-xs font-semibold text-slate-700 mb-1">
                        Description
                      </label>
                      <textarea
                        id="workflow-description"
                        placeholder="Briefly describe the purpose of this workflow..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-50 border border-border rounded px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-slate-400 focus:bg-white placeholder:text-muted-foreground transition-colors resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Starter Template
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedTemplate('triage')}
                          className={cn(
                            'p-3 rounded border text-left transition-colors cursor-pointer relative',
                            selectedTemplate === 'triage'
                              ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                              : 'border-border bg-white hover:bg-slate-50'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded border border-slate-200 bg-slate-100 text-slate-700 flex items-center justify-center">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="font-semibold text-xs text-slate-900 block">Support Triage</span>
                              <span className="text-[10px] text-muted-foreground">Recommended</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                            Classifier + Router + Approval Gate + Refund Agent
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedTemplate('blank')}
                          className={cn(
                            'p-3 rounded border text-left transition-colors cursor-pointer relative',
                            selectedTemplate === 'blank'
                              ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                              : 'border-border bg-white hover:bg-slate-50'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded border border-slate-200 bg-slate-100 text-slate-700 flex items-center justify-center">
                              <Layers className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="font-semibold text-xs text-slate-900 block">Blank Canvas</span>
                              <span className="text-[10px] text-muted-foreground">Empty graph</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                            Start fresh with an empty workflow graph
                          </p>
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!name.trim() || createMutation.isPending}
                        className="inline-flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800 font-medium px-3.5 py-1.5 rounded text-xs transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {createMutation.isPending ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Creating...</span>
                          </>
                        ) : (
                          <span>Create Workflow</span>
                        )}
                      </button>
                    </div>
                  </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
