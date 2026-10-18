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
} from 'lucide-react';
import { motion } from 'framer-motion';
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

  const addNode = useEditorStore((state) => state.addNode);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const past = useEditorStore((state) => state.past);
  const future = useEditorStore((state) => state.future);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      role="toolbar"
      aria-label="Editor Palette & Controls"
      className={cn(
        'absolute top-4 left-4 z-10 flex items-center gap-1.5 p-1 rounded bg-white border border-border select-none',
        className
      )}
    >
      {/* Node creation buttons */}
      <div className="flex items-center gap-0.5 pr-1">
        <button
          type="button"
          onClick={() => addNode('agent')}
          className="group flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Add Agent Node"
        >
          <Bot className="w-3.5 h-3.5 text-slate-500" />
          <span>Agent</span>
        </button>

        <button
          type="button"
          onClick={() => addNode('gate')}
          className="group flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Add Human Gate Node"
        >
          <UserCheck className="w-3.5 h-3.5 text-slate-500" />
          <span>Gate</span>
        </button>

        <button
          type="button"
          onClick={() => addNode('router')}
          className="group flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Add Router Node"
        >
          <GitFork className="w-3.5 h-3.5 text-slate-500" />
          <span>Router</span>
        </button>

        <button
          type="button"
          onClick={() => addNode('fan_out')}
          className="group flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Add Fan-Out / Join Nodes"
        >
          <Network className="w-3.5 h-3.5 text-slate-500" />
          <span>Fan-Out</span>
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
          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={future.length === 0}
          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-border mx-0.5" />

      {/* View Mode Toggle: Canvas vs Outline */}
      <div className="flex items-center gap-0.5 p-0.5 rounded bg-slate-100">
        <button
          type="button"
          onClick={() => handleSetViewMode('canvas')}
          className={cn(
            'p-1 rounded transition-colors cursor-pointer',
            currentViewMode === 'canvas'
              ? 'bg-white text-slate-900 border border-border/80'
              : 'text-slate-500 hover:text-slate-900'
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
            'p-1 rounded transition-colors cursor-pointer',
            currentViewMode === 'outline'
              ? 'bg-white text-slate-900 border border-border/80'
              : 'text-slate-500 hover:text-slate-900'
          )}
          title="Outline Structural View"
          aria-label="Outline Structural View"
        >
          <ListFilter className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
