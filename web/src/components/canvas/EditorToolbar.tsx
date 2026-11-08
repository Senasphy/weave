'use client';

import React from 'react';
import {
  Bot,
  UserCheck,
  GitFork,
  Network,
  Undo2,
  Redo2,
  LayoutGrid,
  ListFilter,
  GripVertical,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useReactFlow } from '@xyflow/react';
import { useEditorStore } from '@/store/editorStore';
import { NodeType } from '@/lib/types';
import { cn } from '@/lib/cn';

interface EditorToolbarProps {
  className?: string;
  viewMode?: 'canvas' | 'outline';
  setViewMode?: (mode: 'canvas' | 'outline') => void;
}

export function EditorToolbar({
  className,
  viewMode,
  setViewMode,
}: EditorToolbarProps = {}) {
  const storeViewMode = useEditorStore((state) => state.viewMode);
  const storeSetViewMode = useEditorStore((state) => state.setViewMode);
  const currentViewMode = viewMode ?? storeViewMode;
  const handleSetViewMode = setViewMode ?? storeSetViewMode;

  const graph = useEditorStore((state) => state.graph);
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const addNode = useEditorStore((state) => state.addNode);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const past = useEditorStore((state) => state.past);
  const future = useEditorStore((state) => state.future);

  let reactFlow: ReturnType<typeof useReactFlow> | null = null;
  try {
    reactFlow = useReactFlow();
  } catch {
    reactFlow = null;
  }

  const handleAddNode = (type: NodeType) => {
    let position: { x: number; y: number };

    const canvasEl = document.querySelector('.react-flow');
    if (canvasEl && reactFlow) {
      const rect = canvasEl.getBoundingClientRect();
      // Target center of visible canvas area (offsetting slightly left if inspector is open)
      const targetX = rect.left + (selectedNodeId ? rect.width * 0.35 : rect.width * 0.5);
      const targetY = rect.top + rect.height * 0.5;
      const converted = reactFlow.screenToFlowPosition({ x: targetX, y: targetY });
      position = converted && !isNaN(converted.x) && !isNaN(converted.y) ? converted : { x: 250, y: 150 };
    } else if (reactFlow) {
      const vp = reactFlow.getViewport();
      const zoom = vp.zoom || 1;
      const calcX = (-vp.x + window.innerWidth / 2) / zoom;
      const calcY = (-vp.y + window.innerHeight / 2) / zoom;
      position = !isNaN(calcX) && !isNaN(calcY) ? { x: calcX, y: calcY } : { x: 250, y: 150 };
    } else {
      position = { x: 250, y: 150 };
    }

    if (!position || isNaN(position.x) || isNaN(position.y)) {
      position = { x: 250, y: 150 };
    }

    // Offset slightly if a node already exists within 70px to avoid overlapping cards
    const existing = graph?.nodes || [];
    let offsetX = 0;
    let offsetY = 0;
    while (
      existing.some(
        (n) =>
          Math.abs((n.position?.x ?? 0) - (position.x + offsetX)) < 70 &&
          Math.abs((n.position?.y ?? 0) - (position.y + offsetY)) < 70
      )
    ) {
      offsetX += 40;
      offsetY += 40;
    }

    const finalPos = {
      x: Math.round(position.x + offsetX),
      y: Math.round(position.y + offsetY),
    };

    addNode(type, finalPos);

    if (reactFlow) {
      const currentZoom = reactFlow.getViewport().zoom || 1;
      reactFlow.setCenter(finalPos.x + 130, finalPos.y + 70, {
        duration: 350,
        zoom: Math.max(currentZoom, 0.8),
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, type: NodeType) => {
    e.dataTransfer.setData('application/reactflow/type', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      role="toolbar"
      aria-label="Editor Palette & Controls"
      className={cn(
        'absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-2xl bg-card/90 border border-border select-none shadow-2xl backdrop-blur-md max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar',
        className
      )}
    >
      {/* Node creation buttons */}
      <div className="flex items-center gap-1 pr-1">
        <button
          type="button"
          draggable
          onDragStart={(e) => handleDragStart(e, 'agent')}
          onClick={() => handleAddNode('agent')}
          className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-grab active:cursor-grabbing"
          title="Click to add at center, or drag onto canvas"
        >
          <GripVertical className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/80 transition-colors" />
          <Bot className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
          <span className="hidden sm:inline">Agent</span>
        </button>

        <button
          type="button"
          draggable
          onDragStart={(e) => handleDragStart(e, 'gate')}
          onClick={() => handleAddNode('gate')}
          className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-grab active:cursor-grabbing"
          title="Click to add at center, or drag onto canvas"
        >
          <GripVertical className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/80 transition-colors" />
          <UserCheck className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
          <span className="hidden sm:inline">Gate</span>
        </button>

        <button
          type="button"
          draggable
          onDragStart={(e) => handleDragStart(e, 'router')}
          onClick={() => handleAddNode('router')}
          className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-grab active:cursor-grabbing"
          title="Click to add at center, or drag onto canvas"
        >
          <GripVertical className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/80 transition-colors" />
          <GitFork className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
          <span className="hidden sm:inline">Router</span>
        </button>

        <button
          type="button"
          draggable
          onDragStart={(e) => handleDragStart(e, 'fan_out')}
          onClick={() => handleAddNode('fan_out')}
          className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-grab active:cursor-grabbing"
          title="Click to add at center, or drag onto canvas"
        >
          <GripVertical className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/80 transition-colors" />
          <Network className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
          <span className="hidden sm:inline">Fan-Out</span>
        </button>
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-border mx-0.5" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={undo}
          disabled={past.length === 0}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={future.length === 0}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-border mx-0.5" />

      {/* View Mode Toggle: Canvas vs Outline */}
      <div className="flex items-center gap-0.5 p-1 rounded-xl bg-secondary/60 border border-border">
        <button
          type="button"
          onClick={() => {
            handleSetViewMode('canvas');
            if (reactFlow) {
              setTimeout(() => reactFlow.fitView({ padding: 0.25, duration: 300 }), 50);
            }
          }}
          className={cn(
            'p-1.5 rounded-lg transition-all cursor-pointer',
            currentViewMode === 'canvas'
              ? 'bg-card text-foreground border border-border shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title="Canvas Visual View"
          aria-label="Canvas Visual View"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleSetViewMode('outline')}
          className={cn(
            'p-1.5 rounded-lg transition-all cursor-pointer',
            currentViewMode === 'outline'
              ? 'bg-card text-foreground border border-border shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title="Outline Tree View"
          aria-label="Outline Tree View"
        >
          <ListFilter className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
