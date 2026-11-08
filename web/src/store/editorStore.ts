import { create } from 'zustand';
import {
  WorkflowGraph,
  Node as GraphNode,
  Edge as GraphEdge,
  Diagnostic,
  NodeType,
} from '@/lib/types';
import {
  Node as FlowNode,
  Edge as FlowEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
} from '@xyflow/react';

interface HistorySnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface EditorState {
  workflowId: string;
  workflowName: string;
  graph: WorkflowGraph;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  diagnostics: Diagnostic[];
  semanticHash: string;
  isDirty: boolean;
  viewMode: 'canvas' | 'outline';
  past: HistorySnapshot[];
  future: HistorySnapshot[];

  // Actions
  initGraph: (workflowId: string, name: string, graph: WorkflowGraph) => void;
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  addNode: (type: NodeType, position?: { x: number; y: number }) => void;
  updateNode: (id: string, patch: Partial<GraphNode>) => void;
  deleteNode: (id: string) => void;
  updateEdge: (id: string, patch: Partial<GraphEdge>) => void;
  deleteEdge: (id: string) => void;
  setDiagnostics: (diags: Diagnostic[], hash?: string) => void;
  setIsDirty: (dirty: boolean) => void;
  setViewMode: (mode: 'canvas' | 'outline') => void;
  undo: () => void;
  redo: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  workflowId: '',
  workflowName: '',
  graph: {
    schema_version: '1',
    name: 'untitled',
    nodes: [],
    edges: [],
  },
  selectedNodeId: null,
  selectedEdgeId: null,
  diagnostics: [],
  semanticHash: '',
  isDirty: false,
  viewMode: 'canvas',
  past: [],
  future: [],

  initGraph: (workflowId, name, initialGraph) => {
    const safeGraph: WorkflowGraph = {
      schema_version: initialGraph?.schema_version || '1',
      name: initialGraph?.name || name || 'untitled',
      nodes: Array.isArray(initialGraph?.nodes) ? initialGraph.nodes : [],
      edges: Array.isArray(initialGraph?.edges) ? initialGraph.edges : [],
      description: initialGraph?.description,
      state: initialGraph?.state,
      defaults: initialGraph?.defaults,
      budgets: initialGraph?.budgets,
    };
    set({
      workflowId,
      workflowName: name,
      graph: safeGraph,
      selectedNodeId: null,
      selectedEdgeId: null,
      isDirty: false,
      past: [],
      future: [],
    });
  },

  onNodesChange: (changes) => {
    const current = get();
    const currentNodes = Array.isArray(current.graph?.nodes) ? current.graph.nodes : [];
    // Convert GraphNodes to flow nodes representation
    const flowNodes: FlowNode[] = currentNodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position || { x: 0, y: 0 },
      data: n as any,
    }));

    const updatedFlowNodes = applyNodeChanges(changes, flowNodes);
    const updatedGraphNodes = updatedFlowNodes.map((fn) => {
      const orig = currentNodes.find((n) => n.id === fn.id);
      return {
        ...(orig || { id: fn.id, type: 'agent' as const, label: 'Node' }),
        position: fn.position,
      };
    });

    set({
      graph: { ...current.graph, nodes: updatedGraphNodes },
      isDirty: true,
    });
  },

  onEdgesChange: (changes) => {
    const current = get();
    const currentEdges = Array.isArray(current.graph?.edges) ? current.graph.edges : [];
    const flowEdges: FlowEdge[] = currentEdges.map((e) => ({
      id: e.id,
      source: e.from,
      target: e.to,
      type: 'default',
      data: e as any,
    }));

    const updatedFlowEdges = applyEdgeChanges(changes, flowEdges);
    const updatedGraphEdges = updatedFlowEdges.map((fe) => {
      const orig = currentEdges.find((e) => e.id === fe.id) || {
        id: fe.id,
        from: fe.source,
        to: fe.target,
        kind: 'always' as const,
      };
      return orig;
    });

    set({
      graph: { ...current.graph, edges: updatedGraphEdges },
      isDirty: true,
    });
  },

  onConnect: (connection) => {
    if (!connection.source || !connection.target) return;
    const current = get();
    const newEdgeId = `e-${Date.now()}`;
    const newEdge: GraphEdge = {
      id: newEdgeId,
      from: connection.source,
      to: connection.target,
      kind: 'always',
    };

    set({
      past: [...current.past, { nodes: current.graph.nodes, edges: current.graph.edges }],
      future: [],
      graph: {
        ...current.graph,
        edges: [...current.graph.edges, newEdge],
      },
      isDirty: true,
    });
  },

  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  addNode: (type, pos) => {
    const current = get();
    const id = `${type}_${Date.now().toString(36)}`;

    let position = pos;
    if (!position) {
      const existing = current.graph?.nodes || [];
      if (existing.length > 0) {
        const maxX = Math.max(...existing.map((n) => n.position?.x ?? 0));
        const lastNode = existing.find((n) => (n.position?.x ?? 0) === maxX);
        position = { x: maxX + 320, y: lastNode?.position?.y ?? 160 };
      } else {
        position = { x: 120, y: 160 };
      }
    }

    const defaultLabels: Record<NodeType, string> = {
      agent: 'Agent Worker',
      gate: 'Approval Gate',
      router: 'Decision Router',
      fan_out: 'Broadcast Query',
      join: 'Consensus Join',
    };

    let newNode: GraphNode = {
      id,
      type,
      label: defaultLabels[type] || `${type.toUpperCase()} Node`,
      position,
    };

    if (type === 'agent') {
      newNode = {
        ...newNode,
        model: { provider: 'gemini', name: 'gemini-1.5-flash', temperature: 0.2 },
        system_prompt: 'You are an intelligent agent in the workflow.',
        output_schema: { type: 'object' },
      };
    } else if (type === 'gate') {
      newNode = {
        ...newNode,
        prompt: 'Review and approve action before proceeding.',
        timeout_seconds: 86400,
        allow_edit: true,
      };
    } else if (type === 'router') {
      newNode = {
        ...newNode,
        router_mode: 'first_matching',
      };
    }

    set({
      past: [...current.past, { nodes: current.graph.nodes, edges: current.graph.edges }],
      future: [],
      graph: {
        ...current.graph,
        nodes: [...current.graph.nodes, newNode],
      },
      selectedNodeId: id,
      isDirty: true,
    });
  },

  updateNode: (id, patch) => {
    const current = get();
    const currentNodes = Array.isArray(current.graph?.nodes) ? current.graph.nodes : [];
    const updated = currentNodes.map((n) => (n.id === id ? { ...n, ...patch } : n));
    set({
      graph: { ...current.graph, nodes: updated },
      isDirty: true,
    });
  },

  deleteNode: (id) => {
    const current = get();
    const currentNodes = Array.isArray(current.graph?.nodes) ? current.graph.nodes : [];
    const currentEdges = Array.isArray(current.graph?.edges) ? current.graph.edges : [];
    set({
      past: [...current.past, { nodes: currentNodes, edges: currentEdges }],
      future: [],
      graph: {
        ...current.graph,
        nodes: currentNodes.filter((n) => n.id !== id),
        edges: currentEdges.filter((e) => e.from !== id && e.to !== id),
      },
      selectedNodeId: current.selectedNodeId === id ? null : current.selectedNodeId,
      isDirty: true,
    });
  },

  updateEdge: (id, patch) => {
    const current = get();
    const currentEdges = Array.isArray(current.graph?.edges) ? current.graph.edges : [];
    const updated = currentEdges.map((e) => (e.id === id ? { ...e, ...patch } : e));
    set({
      graph: { ...current.graph, edges: updated },
      isDirty: true,
    });
  },

  deleteEdge: (id) => {
    const current = get();
    const currentNodes = Array.isArray(current.graph?.nodes) ? current.graph.nodes : [];
    const currentEdges = Array.isArray(current.graph?.edges) ? current.graph.edges : [];
    set({
      past: [...current.past, { nodes: currentNodes, edges: currentEdges }],
      future: [],
      graph: {
        ...current.graph,
        edges: currentEdges.filter((e) => e.id !== id),
      },
      selectedEdgeId: current.selectedEdgeId === id ? null : current.selectedEdgeId,
      isDirty: true,
    });
  },

  setDiagnostics: (diags, hash) => {
    set({
      diagnostics: diags,
      semanticHash: hash || get().semanticHash,
    });
  },

  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setViewMode: (mode) => set({ viewMode: mode }),

  undo: () => {
    const current = get();
    if (current.past.length === 0) return;
    const previous = current.past[current.past.length - 1];
    const newPast = current.past.slice(0, current.past.length - 1);
    set({
      past: newPast,
      future: [{ nodes: current.graph.nodes, edges: current.graph.edges }, ...current.future],
      graph: {
        ...current.graph,
        nodes: previous.nodes,
        edges: previous.edges,
      },
      isDirty: true,
    });
  },

  redo: () => {
    const current = get();
    if (current.future.length === 0) return;
    const next = current.future[0];
    const newFuture = current.future.slice(1);
    set({
      past: [...current.past, { nodes: current.graph.nodes, edges: current.graph.edges }],
      future: newFuture,
      graph: {
        ...current.graph,
        nodes: next.nodes,
        edges: next.edges,
      },
      isDirty: true,
    });
  },
}));
