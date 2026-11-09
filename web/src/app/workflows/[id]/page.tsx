'use client';

import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  Controls,
  MiniMap,
  Node as FlowNode,
  Edge as FlowEdge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Workflow,
  Bot,
  UserCheck,
  GitFork,
  Sparkles,
} from 'lucide-react';

import { api } from '@/lib/api';
import { useEditorStore } from '@/store/editorStore';
import { AgentNode } from '@/components/canvas/AgentNode';
import { GateNode } from '@/components/canvas/GateNode';
import { RouterNode } from '@/components/canvas/RouterNode';
import { ParallelNode } from '@/components/canvas/ParallelNode';
import { EditorHeader } from '@/components/canvas/EditorHeader';
import { EditorToolbar } from '@/components/canvas/EditorToolbar';
import { InspectorPanel } from '@/components/inspector/InspectorPanel';
import { ValidationPanel } from '@/components/validation/ValidationPanel';
import { OutlineView } from '@/components/outline/OutlineView';
import { NodeType, WorkflowGraph } from '@/lib/types';
import { cn } from '@/lib/cn';

function WorkflowEditorContent() {
  const params = useParams();
  const workflowId = params.id as string;
  const { screenToFlowPosition, fitView } = useReactFlow();

  const {
    graph,
    initGraph,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    selectEdge,
    selectedNodeId,
    selectedEdgeId,
    addNode,
    viewMode,
    workflowName,
  } = useEditorStore();

  const isInitializedRef = useRef<string | null>(null);
  const initialFitDoneRef = useRef(false);

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => api.getWorkflow(workflowId),
  });

  const { data: draftGraph } = useQuery({
    queryKey: ['workflow-draft', workflowId],
    queryFn: () => api.getWorkflowDraft(workflowId),
  });

  // Sync draft or workflow graph into store
  useEffect(() => {
    if (workflow) {
      const draft = draftGraph || workflow.draft_graph;
      if (isInitializedRef.current !== workflow.id) {
        initGraph(workflow.id, workflow.name, draft || ({} as any));
        isInitializedRef.current = workflow.id;
      } else if (
        draft &&
        Array.isArray(draft.nodes) &&
        draft.nodes.length > 0 &&
        (!graph?.nodes || graph.nodes.length === 0)
      ) {
        // Late-arriving draft with actual nodes on a clean empty canvas
        initGraph(workflow.id, workflow.name, draft);
      }
    }
  }, [workflow, draftGraph, initGraph, graph?.nodes]);

  const loadTriageTemplate = useCallback(() => {
    const triageGraph: WorkflowGraph = {
      schema_version: '1',
      name: workflowName || 'triage-workflow',
      budgets: { max_wall_seconds: 600, max_cost_usd: 2.0, max_tokens: 150000 },
      nodes: [
        {
          id: 'classifier',
          type: 'agent',
          label: 'Classifier Agent',
          position: { x: 80, y: 150 },
          is_entry: true,
          model: { provider: 'gemini', name: 'gemini-1.5-flash', temperature: 0.2 },
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
          model: { provider: 'gemini', name: 'gemini-1.5-flash', temperature: 0.2 },
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
          model: { provider: 'gemini', name: 'gemini-1.5-flash', temperature: 0.2 },
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

    initGraph(workflowId, workflowName || 'triage-workflow', triageGraph);
    useEditorStore.setState({ isDirty: true });
  }, [workflowId, workflowName, initGraph]);

  const nodeTypes = useMemo(
    () => ({
      agent: AgentNode,
      gate: GateNode,
      router: RouterNode,
      fan_out: ParallelNode,
      join: ParallelNode,
      default: AgentNode, // fallback to ensure any unexpected node type renders
    }),
    []
  );

  // Convert graph nodes to React Flow nodes with guaranteed positions and initial dimensions
  const flowNodes: FlowNode[] = useMemo(() => {
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];

    // Check if positions are missing, identical (0,0), or invalid
    const allAtZero = nodes.length > 1 && nodes.every(
      (n) => !n.position || (n.position.x === 0 && n.position.y === 0)
    );

    return nodes.map((n, index) => {
      let pos = n.position;
      const isPosValid =
        pos &&
        typeof pos.x === 'number' &&
        typeof pos.y === 'number' &&
        !isNaN(pos.x) &&
        !isNaN(pos.y);

      if (!isPosValid || allAtZero) {
        // Safe linear grid layout: 80, 400, 720, 1040...
        pos = {
          x: 80 + (index % 4) * 320,
          y: 150 + Math.floor(index / 4) * 200,
        };
      }

      const rawType = (n.type || 'agent').toLowerCase();
      const type = ['agent', 'gate', 'router', 'fan_out', 'join'].includes(rawType)
        ? rawType
        : 'agent';

      return {
        id: n.id,
        type,
        position: pos!,
        data: n as any,
        selected: n.id === selectedNodeId,
        width: 260,
        initialWidth: 260,
        initialHeight: 140,
      };
    });
  }, [graph, selectedNodeId]);

  // Convert graph edges to React Flow edges with safety checks
  const flowEdges: FlowEdge[] = useMemo(() => {
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];

    // Filter out edges that reference missing nodes
    const validEdges = edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to));

    return validEdges.map((e) => ({
      id: e.id,
      source: e.from,
      target: e.to,
      type: 'default',
      selected: e.id === selectedEdgeId,
      label: e.kind === 'when' ? `when: ${e.expr || ''}` : e.kind !== 'always' ? e.kind : undefined,
      labelStyle: {
        fill: 'rgba(255, 255, 255, 0.75)',
        fontSize: 10,
        fontFamily: 'var(--font-mono, monospace)',
        fontWeight: 600,
        letterSpacing: '0.02em',
      },
      labelBgStyle: {
        fill: '#111215',
        stroke: 'rgba(255, 255, 255, 0.12)',
        strokeWidth: 1,
      },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 6,
      data: e as any,
    }));
  }, [graph, selectedEdgeId]);

  // Auto fit-view to center all nodes when nodes load or when switching back to canvas
  useEffect(() => {
    if (viewMode === 'canvas' && flowNodes.length > 0 && !initialFitDoneRef.current) {
      initialFitDoneRef.current = true;
      const timer = setTimeout(() => {
        fitView({ padding: 0.25, duration: 350 });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [viewMode, flowNodes.length, fitView]);

  // Drag-and-drop node placement from palette onto canvas
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow/type') as NodeType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX - 130, // center the 260px wide node card
        y: event.clientY - 40,
      });

      addNode(type, {
        x: Math.round(position.x),
        y: Math.round(position.y),
      });
    },
    [screenToFlowPosition, addNode]
  );

  const hasSelection = Boolean(selectedNodeId || selectedEdgeId);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background text-muted-foreground gap-3 select-none">
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-border border-t-foreground animate-spin" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs font-semibold text-foreground tracking-tight">Loading workflow graph</p>
          <p className="text-[11px] text-muted-foreground font-medium">Initializing canvas & state...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden select-none bg-background">
      {/* Top Editor Header */}
      <EditorHeader />

      {/* Main Area: Canvas / Outline View & Inspector */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Left Column: Canvas Area & Bottom Validation Panel */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <div className="flex-1 relative overflow-hidden h-full">
            {/* Floating EditorToolbar */}
            <div className="absolute top-4 left-4 z-10 pointer-events-auto">
              <EditorToolbar />
            </div>

            {/* Persistent Canvas View - Kept mounted to prevent DOM destroy / measurement loss */}
            <div
              className={cn(
                'absolute inset-0 w-full h-full',
                viewMode === 'canvas' ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
              )}
            >
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onNodeClick={(_, node) => selectNode(node.id)}
                onEdgeClick={(_, edge) => selectEdge(edge.id)}
                onPaneClick={() => {
                  selectNode(null);
                  selectEdge(null);
                }}
                fitView
                fitViewOptions={{ padding: 0.25 }}
                minZoom={0.15}
                maxZoom={2.5}
                proOptions={{ hideAttribution: true }}
                className="w-full h-full bg-background dark"
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={24}
                  size={1.2}
                  color="rgba(255, 255, 255, 0.08)"
                />
                <Controls
                  showInteractive={false}
                  className="!bg-card/90 !backdrop-blur-md !border !border-border !rounded-xl !shadow-xl overflow-hidden !m-4"
                />
                <MiniMap
                  style={{
                    backgroundColor: '#0c0d12',
                  }}
                  nodeColor={(node) => {
                    switch (node.type) {
                      case 'agent':
                        return '#6366f1';
                      case 'gate':
                        return '#f59e0b';
                      case 'router':
                        return '#06b6d4';
                      case 'fan_out':
                      case 'join':
                        return '#a855f7';
                      default:
                        return '#64748b';
                    }
                  }}
                  nodeStrokeColor="transparent"
                  nodeBorderRadius={4}
                  maskColor="rgba(9, 10, 13, 0.85)"
                  className="!bg-card/90 !backdrop-blur-md !border !border-border !rounded-xl !shadow-xl overflow-hidden !m-4"
                />
              </ReactFlow>

              {/* Empty Canvas Starter Guide Overlay */}
              {flowNodes.length === 0 && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 p-4">
                  <div className="pointer-events-auto max-w-md w-full rounded-2xl bg-card/90 backdrop-blur-md border border-border p-6 shadow-2xl text-center space-y-4 animate-in fade-in-0 zoom-in-95 duration-150">
                    <div className="w-12 h-12 rounded-2xl bg-secondary border border-border flex items-center justify-center mx-auto text-foreground shadow-sm">
                      <Workflow className="w-6 h-6 text-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground tracking-tight">Empty Canvas</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        This workflow doesn&apos;t have any components yet. Click an item in the top toolbar, drag one onto the canvas, or add a starter component below.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => addNode('agent', { x: 260, y: 180 })}
                        className="px-3.5 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>+ Add Agent Worker</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addNode('gate', { x: 260, y: 180 })}
                        className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>+ Gate</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addNode('router', { x: 260, y: 180 })}
                        className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <GitFork className="w-3.5 h-3.5" />
                        <span>+ Router</span>
                      </button>
                    </div>

                    <div className="pt-3 border-t border-border/80">
                      <button
                        type="button"
                        onClick={loadTriageTemplate}
                        className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer group"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                        <span>Load Support Triage Starter Template</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Outline View - Mounted on top when outline mode is active */}
            {viewMode === 'outline' && (
              <div className="absolute inset-0 w-full h-full bg-background overflow-y-auto z-20">
                <OutlineView />
              </div>
            )}
          </div>

          {/* Diagnostics & Validation Bottom Drawer */}
          <ValidationPanel />
        </div>

        {/* Right Inspector Panel */}
        {hasSelection && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 sm:hidden"
              onClick={() => {
                selectNode(null);
                selectEdge(null);
              }}
            />
            <div className="w-full sm:w-80 fixed sm:relative right-0 inset-y-14 sm:inset-auto z-40 flex shrink-0 shadow-2xl sm:shadow-none h-[calc(100vh-3.5rem)] sm:h-full">
              <InspectorPanel />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function WorkflowEditorPage() {
  return (
    <ReactFlowProvider>
      <WorkflowEditorContent />
    </ReactFlowProvider>
  );
}
