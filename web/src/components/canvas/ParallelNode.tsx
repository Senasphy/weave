'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Network, GitMerge } from 'lucide-react';
import { motion } from 'framer-motion';
import { Node as GraphNode } from '@/lib/types';
import { cn } from '@/lib/cn';

export const ParallelNode = memo(({ data, selected }: NodeProps) => {
  const node = data as unknown as GraphNode;
  const isFanOut = node.type === 'fan_out';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      tabIndex={0}
      role="region"
      aria-label={`${isFanOut ? 'Fan-out' : 'Join'} Node: ${node.label || node.id}`}
      className={cn(
        'group relative w-[220px] rounded bg-white border select-none transition-colors',
        selected
          ? 'border-slate-900 ring-1 ring-slate-900'
          : 'border-border hover:border-slate-400'
      )}
    >
      {/* Top accent bar */}
      <div className="h-0.5 rounded-t bg-purple-600" />

      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        aria-label="Input handle"
        className="!w-2 !h-2 !bg-purple-600 !border-2 !border-white !rounded-full transition-transform hover:!scale-125"
      />

      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded border border-slate-200 bg-white text-slate-700 flex items-center justify-center shrink-0">
            {isFanOut ? <Network className="w-3 h-3" /> : <GitMerge className="w-3 h-3" />}
          </div>
          <span className="text-xs font-semibold text-slate-900 truncate max-w-[100px]">
            {node.label || (isFanOut ? 'Fan-out' : 'Join')}
          </span>
        </div>

        {/* Node Type badge */}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 shrink-0 font-medium">
          {isFanOut ? 'fan_out' : 'join'}
        </span>
      </div>

      {/* Body */}
      <div className="p-2.5 text-[11px] text-slate-500 font-sans leading-relaxed">
        {isFanOut
          ? 'Distributes payload concurrently across parallel execution branches.'
          : 'Synchronizes and joins completed parallel branch states.'}
      </div>

      {/* Source handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        aria-label="Output handle"
        className="!w-2 !h-2 !bg-purple-600 !border-2 !border-white !rounded-full transition-transform hover:!scale-125"
      />
    </motion.div>
  );
});

ParallelNode.displayName = 'ParallelNode';
