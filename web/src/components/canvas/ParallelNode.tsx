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
        'group relative w-[240px] rounded-2xl bg-card border select-none transition-all duration-200 overflow-hidden shadow-lg',
        selected
          ? 'border-purple-500/80 ring-2 ring-purple-500/40 shadow-[0_0_24px_rgba(168,85,247,0.3)]'
          : 'border-border hover:border-white/20'
      )}
    >
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-400" />

      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        aria-label="Input handle"
        className="!w-2.5 !h-2.5 !bg-purple-400 !border-2 !border-[#090a0d] !rounded-full transition-all hover:!scale-125"
      />

      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-border/80 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg border border-purple-500/30 bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 shadow-sm">
            {isFanOut ? <Network className="w-3.5 h-3.5" /> : <GitMerge className="w-3.5 h-3.5" />}
          </div>
          <span className="text-xs font-semibold text-foreground truncate max-w-[110px]">
            {node.label || (isFanOut ? 'Fan-out' : 'Join')}
          </span>
        </div>

        {/* Node Type badge */}
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground shrink-0 font-medium">
          {isFanOut ? 'fan_out' : 'join'}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 text-[11px] text-muted-foreground font-sans leading-relaxed">
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
        className="!w-2.5 !h-2.5 !bg-purple-400 !border-2 !border-[#090a0d] !rounded-full transition-all hover:!scale-125"
      />
    </motion.div>
  );
});

ParallelNode.displayName = 'ParallelNode';
