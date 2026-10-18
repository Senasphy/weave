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
    set({
      workflowId,
      workflowName: name,
      graph: initialGraph,
      selectedNodeId: null,
      selectedEdgeId: null,
      isDirty: false,
      past: [],
      future: [],
    });
  },

  onNodesChange: (changes) => {
    const current = get();
    // Convert GraphNodes to flow nodes representation
    const flowNodes: FlowNode[] = current.graph.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position || { x: 0, y: 0 },
      data: n as any,
    }));

    const updatedFlowNodes = applyNodeChanges(changes, flowNodes);
    const updatedGraphNodes = updatedFlowNodes.map((fn) => {
      const orig = current.graph.nodes.find((n) => n.id === fn.id)!;
      return {
        ...orig,
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
    const flowEdges: FlowEdge[] = current.graph.edges.map((e) => ({
      id: e.id,
      source: e.from,
      target: e.to,
      type: 'default',
      data: e as any,
    }));

    const updatedFlowEdges = applyEdgeChanges(changes, flowEdges);
    const updatedGraphEdges = updatedFlowEdges.map((fe) => {
      const orig = current.graph.edges.find((e) => e.id === fe.id) || {
        id: fe.id,
        from: fe.source,
        to: fe.target,
        kind: 'always',
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
    const position = pos || { x: 250 + Math.random() * 50, y: 150 + Math.random() * 50 };

    let newNode: GraphNode = {
      id,
      type,
      label: `${type.toUpperCase()} Node`,
      position,
    };

    if (type === 'agent') {
      newNode = {
        ...newNode,
        model: { provider: 'mock', name: 'mock-llm' },
        system_prompt: 'You are an agent in the workflow.',
        output_schema: { type: 'object' },
      };
    } else if (type === 'gate') {
      newNode = {
        ...newNode,
        prompt: 'Approve or reject action?',
        timeout_seconds: 86400,
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
    const updated = current.graph.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n));
    set({
      graph: { ...current.graph, nodes: updated },
      isDirty: true,
    });
  },

  deleteNode: (id) => {
    const current = get();
    set({
      past: [...current.past, { nodes: current.graph.nodes, edges: current.graph.edges }],
      future: [],
      graph: {
        ...current.graph,
        nodes: current.graph.nodes.filter((n) => n.id !== id),
        edges: current.graph.edges.filter((e) => e.from !== id && e.to !== id),
      },
      selectedNodeId: current.selectedNodeId === id ? null : current.selectedNodeId,
      isDirty: true,
    });
  },

  updateEdge: (id, patch) => {
    const current = get();
    const updated = current.graph.edges.map((e) => (e.id === id ? { ...e, ...patch } : e));
    set({
      graph: { ...current.graph, edges: updated },
      isDirty: true,
    });
  },

  deleteEdge: (id) => {
    const current = get();
    set({
      past: [...current.past, { nodes: current.graph.nodes, edges: current.graph.edges }],
      future: [],
      graph: {
        ...current.graph,
        edges: current.graph.edges.filter((e) => e.id !== id),
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
