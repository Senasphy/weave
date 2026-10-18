'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitFork } from 'lucide-react';
import { motion } from 'framer-motion';
import { Node as GraphNode } from '@/lib/types';
import { cn } from '@/lib/cn';

export const RouterNode = memo(({ data, selected }: NodeProps) => {
  const node = data as unknown as GraphNode;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      tabIndex={0}
      role="region"
      aria-label={`Router Node: ${node.label || node.id}`}
      className={cn(
        'group relative w-[240px] rounded bg-white border select-none transition-colors',
        selected
          ? 'border-slate-900 ring-1 ring-slate-900'
          : 'border-border hover:border-slate-400'
      )}
    >
      {/* Top accent bar */}
      <div className="h-0.5 rounded-t bg-cyan-600" />

      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        aria-label="Input handle"
        className="!w-2 !h-2 !bg-cyan-600 !border-2 !border-white !rounded-full transition-transform hover:!scale-125"
      />

      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded border border-slate-200 bg-white text-slate-700 flex items-center justify-center shrink-0">
            <GitFork className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">
            {node.label || node.id}
          </span>
        </div>

        {/* Router badge */}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 shrink-0 font-medium">
          router
        </span>
      </div>

      {/* Body */}
      <div className="p-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500">Mode:</span>
          <span className="text-slate-800 font-medium bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
            {node.router_mode || 'first_matching'}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
          Evaluates dynamic CEL predicates to route execution across downstream branches.
        </p>
      </div>

      {/* Source handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        aria-label="Output handle"
        className="!w-2 !h-2 !bg-cyan-600 !border-2 !border-white !rounded-full transition-transform hover:!scale-125"
      />
    </motion.div>
  );
});

RouterNode.displayName = 'RouterNode';
