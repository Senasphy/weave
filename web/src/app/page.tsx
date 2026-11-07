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
  ArrowUpRight,
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Copy,
  ExternalLink,
  BookOpen,
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
    <div className="flex-1 overflow-y-auto w-full bg-background">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Workflows
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Build, orchestrate, and manage multi-agent execution graphs
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-xs sm:text-sm font-semibold text-background transition-opacity hover:opacity-90 shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create workflow</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(workflows, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute('href', dataStr);
                downloadAnchor.setAttribute('download', `workflows-export-${Date.now()}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs sm:text-sm font-medium text-foreground transition-colors hover:bg-accent cursor-pointer"
            >
              <FileCode className="h-4 w-4 text-muted-foreground" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* 2. Stat / Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Workflows */}
          <div className="group relative flex min-h-[130px] flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/25 hover:bg-accent/40 shadow-sm">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5 flex items-center justify-between">
                <span>TOTAL WORKFLOWS</span>
                <Network className="w-4 h-4 text-muted-foreground/60" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                {workflows.length}
              </div>
            </div>
            <div className="flex items-end justify-between pt-3">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Configured pipeline graphs
              </p>
              <span className="font-mono text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border tabular-nums">
                {workflows.length} active
              </span>
            </div>
          </div>

          {/* Card 2: Active Runs */}
          <div className="group relative flex min-h-[130px] flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/25 hover:bg-accent/40 shadow-sm">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5 flex items-center justify-between">
                <span>ACTIVE EXECUTIONS</span>
                <Play className="w-4 h-4 text-muted-foreground/60" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                {activeRunsCount}
              </div>
            </div>
            <div className="flex items-end justify-between pt-3">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Currently running in engine
              </p>
              <StatusBadge
                status={activeRunsCount > 0 ? 'running' : 'idle'}
                label={activeRunsCount > 0 ? `${activeRunsCount} active` : 'Idle'}
                pulse={activeRunsCount > 0}
              />
            </div>
          </div>

          {/* Card 3: Failed Runs */}
          <div className="group relative flex min-h-[130px] flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/25 hover:bg-accent/40 shadow-sm">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5 flex items-center justify-between">
                <span>FAILED RUNS</span>
                <Clock className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                {failedRunsCount}
              </div>
            </div>
            <div className="flex items-end justify-between pt-3">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Halted by budget or error
              </p>
              <StatusBadge
                status={failedRunsCount > 0 ? 'failed' : 'idle'}
                label={failedRunsCount > 0 ? `${failedRunsCount} failed` : '0 issues'}
              />
            </div>
          </div>

          {/* Card 4: Gates Awaiting Review */}
          <div className="group relative flex min-h-[130px] flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/25 hover:bg-accent/40 shadow-sm">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5 flex items-center justify-between">
                <span>PENDING APPROVALS</span>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                {pendingGatesCount}
              </div>
            </div>
            <div className="flex items-end justify-between pt-3">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Awaiting human review
              </p>
              <StatusBadge
                status={pendingGatesCount > 0 ? 'waiting_human' : 'idle'}
                label={pendingGatesCount > 0 ? `${pendingGatesCount} pending` : 'All clear'}
                pulse={pendingGatesCount > 0}
              />
            </div>
          </div>
        </div>

        {/* 3. Subheader: Segmented Tabs (Left) + Search & Filter & View Toggle (Right) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          {/* Segmented Tabs */}
          <div className="p-1 rounded-xl bg-secondary/60 border border-border inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                activeTab === 'all'
                  ? 'bg-card text-foreground border border-border shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Workflow list
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                activeTab === 'active'
                  ? 'bg-card text-foreground border border-border shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                activeTab === 'templates'
                  ? 'bg-card text-foreground border border-border shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Templates
            </button>
          </div>

          {/* Right Controls: Filter Search, Filter, Sort, View Toggle */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Filter Search Input */}
            <div className="relative min-w-[260px]">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter workflows by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-card border border-border rounded-xl pl-9 pr-7 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-white/20 transition-all shadow-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                  aria-label="Clear filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Table / Grid Mode Switcher */}
            <div className="p-1 rounded-xl bg-secondary/60 inline-flex items-center border border-border">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'p-1.5 rounded-lg transition-all cursor-pointer',
                  viewMode === 'table' ? 'bg-card text-foreground border border-border shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
                title="Table view"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-lg transition-all cursor-pointer',
                  viewMode === 'grid' ? 'bg-card text-foreground border border-border shadow-sm' : 'text-muted-foreground hover:text-foreground'
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
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            Failed to load workflows: {(error as Error).message}
          </div>
        )}

        {/* 4. Main Content: Table or Grid */}
        {isLoading ? (
          /* Loading Skeleton */
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 animate-pulse">
            <div className="h-4 bg-secondary rounded w-1/4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-secondary/50 rounded-xl" />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty State */
          <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center">
            <div className="w-12 h-12 rounded-2xl border border-border bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <Network className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mt-3">
              {search ? 'No matching workflows' : 'No workflows yet'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
              {search
                ? `No workflows matched "${search}". Try clearing your filters.`
                : 'Create your first AI workflow to connect prompts, tools, and human review steps.'}
            </p>
            <div className="mt-5">
              {search ? (
                <button
                  onClick={() => setSearch('')}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-foreground bg-secondary hover:bg-accent transition-colors cursor-pointer"
                >
                  Clear filter
                </button>
              ) : (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-foreground text-background rounded-xl text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Workflow</span>
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-muted-foreground text-[11px] font-mono uppercase tracking-wider select-none">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filtered.length && filtered.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-border bg-secondary accent-foreground cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">
                      <span>Workflow name</span>
                    </th>
                    <th className="py-3 px-4">
                      <span>Workflow ID</span>
                    </th>
                    <th className="py-3 px-4">
                      <span>Steps</span>
                    </th>
                    <th className="py-3 px-4">
                      <span>Updated date</span>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <span>Status</span>
                    </th>
                    <th className="py-3 px-4 w-12 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.map((wf) => {
                    const isSelected = selectedIds.includes(wf.id);
                    return (
                      <tr
                        key={wf.id}
                        className={cn(
                          'group hover:bg-white/[0.03] transition-colors',
                          isSelected && 'bg-accent/40'
                        )}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(wf.id)}
                            className="rounded border-border bg-secondary accent-foreground cursor-pointer"
                          />
                        </td>

                        {/* Name + Description */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl border border-border bg-secondary flex items-center justify-center shrink-0 text-foreground font-semibold text-xs shadow-sm">
                              {wf.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/workflows/${wf.id}`}
                                className="text-xs font-semibold text-foreground hover:underline transition-colors truncate block"
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
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(wf.id, e)}
                            className="group/id inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono cursor-pointer"
                            title="Click to copy ID"
                          >
                            <span>{wf.id.length > 16 ? `${wf.id.substring(0, 16)}...` : wf.id}</span>
                            {copiedId === wf.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-0 group-hover/id:opacity-100 text-muted-foreground transition-opacity" />
                            )}
                          </button>
                        </td>

                        {/* Steps */}
                        <td className="py-3.5 px-4">
                          <span className="text-xs text-muted-foreground font-mono">
                            {wf.draft_graph?.nodes?.length ? `${wf.draft_graph.nodes.length} steps` : '5 steps'}
                          </span>
                        </td>

                        {/* Updated Date */}
                        <td className="py-3.5 px-4">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {formatDate(wf.updated_at)}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          <StatusBadge status="active" label="Active" pulse={false} />
                        </td>

                        {/* Action 3-dots */}
                        <td className="py-3.5 px-4 text-right">
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <button
                                type="button"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                                aria-label="Row actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content
                                align="end"
                                className="z-50 min-w-[150px] rounded-xl bg-card border border-border p-1.5 text-xs shadow-2xl text-foreground"
                              >
                                <DropdownMenu.Item asChild>
                                  <Link
                                    href={`/workflows/${wf.id}`}
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-accent cursor-pointer outline-none transition-colors"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>Open Editor</span>
                                  </Link>
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  onClick={(e) => handleCopyId(wf.id, e as any)}
                                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-accent cursor-pointer outline-none transition-colors"
                                >
                                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
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
            <div className="border-t border-border px-4 py-3 bg-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs select-none">
              {/* Left: Records selector */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-card text-foreground text-xs font-medium">
                  <span>10 records</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </div>
              </div>

              {/* Center: Pagination Buttons */}
              <div className="flex items-center gap-1 self-center">
                <button
                  type="button"
                  disabled
                  className="p-1 rounded-lg border border-border text-muted-foreground bg-card disabled:opacity-40 cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className="w-6 h-6 rounded-lg bg-foreground text-background font-semibold text-xs flex items-center justify-center shadow-sm"
                >
                  1
                </button>
                <button
                  type="button"
                  className="w-6 h-6 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground font-medium text-xs flex items-center justify-center transition-colors cursor-pointer"
                >
                  2
                </button>
                <button
                  type="button"
                  className="w-6 h-6 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground font-medium text-xs flex items-center justify-center transition-colors cursor-pointer"
                >
                  3
                </button>
                <span className="px-1 text-muted-foreground">...</span>
                <button
                  type="button"
                  className="p-1 rounded-lg border border-border text-foreground bg-card hover:bg-secondary transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Right: Counter */}
              <div className="text-muted-foreground font-mono tabular-nums text-[11px] self-end sm:self-auto">
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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filtered.map((wf) => (
              <motion.div
                key={wf.id}
                variants={cardItemVariants}
                className="group relative flex min-h-[170px] flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/25 hover:bg-accent/40 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl border border-border bg-secondary flex items-center justify-center font-bold text-xs text-foreground shadow-sm shrink-0">
                        {wf.name.substring(0, 2).toUpperCase()}
                      </div>
                      <Link
                        href={`/workflows/${wf.id}`}
                        className="text-xs font-semibold text-foreground hover:underline transition-colors line-clamp-1"
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

                <div className="border-t border-border/80 mt-4 pt-3 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                    <span>{formatDate(wf.updated_at)}</span>
                  </span>
                  <Link
                    href={`/workflows/${wf.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline transition-colors"
                  >
                    <span>Open Editor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md animate-in fade-in-0 duration-150" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6 focus:outline-none animate-in fade-in-0 zoom-in-95 duration-150 text-foreground">
            <div className="flex items-start justify-between">
              <div>
                <Dialog.Title className="text-base font-bold tracking-tight text-foreground">
                  Create New Workflow
                </Dialog.Title>
                <Dialog.Description className="text-xs text-muted-foreground mt-0.5">
                  Set up a multi-agent workflow graph with strict budgets and review gates.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="workflow-name" className="block text-xs font-semibold text-foreground mb-1.5">
                  Workflow Name <span className="text-rose-400">*</span>
                </label>
                <input
                  id="workflow-name"
                  type="text"
                  placeholder="e.g. customer-refund-triage"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-white/20 placeholder:text-muted-foreground transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="workflow-description" className="block text-xs font-semibold text-foreground mb-1.5">
                  Description
                </label>
                <textarea
                  id="workflow-description"
                  placeholder="Briefly describe the purpose of this workflow..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-white/20 placeholder:text-muted-foreground transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Starter Template
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('triage')}
                    className={cn(
                      'p-3.5 rounded-xl border text-left transition-all cursor-pointer relative',
                      selectedTemplate === 'triage'
                        ? 'border-foreground bg-accent/80 ring-1 ring-foreground/20'
                        : 'border-border bg-secondary/40 hover:bg-secondary/70'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg border border-border bg-secondary text-foreground flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-semibold text-xs text-foreground block">Support Triage</span>
                        <span className="text-[10px] text-muted-foreground font-mono">Recommended</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                      Classifier + Router + Approval Gate + Refund Agent
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('blank')}
                    className={cn(
                      'p-3.5 rounded-xl border text-left transition-all cursor-pointer relative',
                      selectedTemplate === 'blank'
                        ? 'border-foreground bg-accent/80 ring-1 ring-foreground/20'
                        : 'border-border bg-secondary/40 hover:bg-secondary/70'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg border border-border bg-secondary text-foreground flex items-center justify-center">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-semibold text-xs text-foreground block">Blank Canvas</span>
                        <span className="text-[10px] text-muted-foreground font-mono">Empty graph</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                      Start fresh with an empty workflow graph
                    </p>
                  </button>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || createMutation.isPending}
                  className="inline-flex items-center gap-1.5 bg-foreground text-background hover:opacity-90 font-medium px-4 py-2 rounded-xl text-xs transition-opacity disabled:opacity-50 cursor-pointer shadow-md"
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
