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
        'group relative w-[250px] rounded-2xl bg-card border select-none transition-all duration-200 overflow-hidden shadow-lg',
        selected
          ? 'border-foreground/80 ring-1 ring-foreground/20 shadow-md'
          : 'border-border hover:border-white/20'
      )}
    >
      {/* Top accent bar */}
      <div className="h-0.5 bg-border" />

      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        aria-label="Input handle"
        className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-card !rounded-full transition-all hover:!scale-125 hover:!bg-foreground"
      />

      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-border/80 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg border border-border bg-secondary text-foreground flex items-center justify-center shrink-0 shadow-sm">
            <GitFork className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-foreground truncate max-w-[125px]">
            {node.label || node.id}
          </span>
        </div>

        {/* Router badge */}
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground shrink-0 font-medium">
          router
        </span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Mode:</span>
          <span className="text-foreground font-mono font-medium bg-secondary border border-border px-2 py-0.5 rounded-lg">
            {node.router_mode || 'first_matching'}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">
          Evaluates dynamic CEL predicates to route execution across downstream branches.
        </p>
      </div>

      {/* Source handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        aria-label="Output handle"
        className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-card !rounded-full transition-all hover:!scale-125 hover:!bg-foreground"
      />
    </motion.div>
  );
});

RouterNode.displayName = 'RouterNode';
