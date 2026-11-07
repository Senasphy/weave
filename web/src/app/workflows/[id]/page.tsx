'use client';

import React, { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node as FlowNode,
  Edge as FlowEdge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';

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
import { cn } from '@/lib/cn';

export default function WorkflowEditorPage() {
  const params = useParams();
  const workflowId = params.id as string;

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
    viewMode,
  } = useEditorStore();

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => api.getWorkflow(workflowId),
  });

  const { data: draftGraph } = useQuery({
    queryKey: ['workflow-draft', workflowId],
    queryFn: () => api.getWorkflowDraft(workflowId),
  });

  useEffect(() => {
    if (workflow) {
      initGraph(workflow.id, workflow.name, draftGraph || ({} as any));
    }
  }, [workflow, draftGraph, initGraph]);

  const nodeTypes = useMemo(
    () => ({
      agent: AgentNode,
      gate: GateNode,
      router: RouterNode,
      fan_out: ParallelNode,
      join: ParallelNode,
    }),
    []
  );

  // Convert graph nodes to React Flow nodes
  const flowNodes: FlowNode[] = useMemo(() => {
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
    return nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position || { x: 100, y: 100 },
      data: n as any,
    }));
  }, [graph?.nodes]);

  // Convert graph edges to React Flow edges with refined styles
  const flowEdges: FlowEdge[] = useMemo(() => {
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];
    return edges.map((e) => ({
      id: e.id,
      source: e.from,
      target: e.to,
      type: 'default',
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
  }, [graph?.edges]);

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
      <div className="flex-1 flex overflow-hidden relative">
        {/* Floating EditorToolbar */}
        <div className="absolute top-4 left-4 z-10 pointer-events-auto">
          <EditorToolbar />
        </div>

        {/* View Switch: Canvas View vs Outline View with AnimatePresence */}
        <AnimatePresence mode="wait">
          {viewMode === 'canvas' ? (
            <motion.div
              key="canvas-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 h-full relative"
            >
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_, node) => selectNode(node.id)}
                onEdgeClick={(_, edge) => selectEdge(edge.id)}
                onPaneClick={() => {
                  selectNode(null);
                  selectEdge(null);
                }}
                onlyRenderVisibleElements
                fitView
                minZoom={0.2}
                maxZoom={2.0}
                proOptions={{ hideAttribution: true }}
                className="bg-background"
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
            </motion.div>
          ) : (
            <motion.div
              key="outline-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 h-full overflow-hidden"
            >
              <OutlineView />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Inspector Panel */}
        <div
          className={cn(
            'transition-all duration-300 ease-out flex shrink-0',
            hasSelection ? 'w-full sm:w-80 fixed sm:relative right-0 inset-y-14 sm:inset-auto z-40' : 'w-0'
          )}
        >
          {hasSelection && <InspectorPanel />}
        </div>

        {/* Diagnostics & Validation Bottom Drawer */}
        <ValidationPanel />
      </div>
    </div>
  );
}
