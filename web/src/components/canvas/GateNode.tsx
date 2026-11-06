'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Node as GraphNode } from '@/lib/types';
import { cn } from '@/lib/cn';

export const GateNode = memo(({ data, selected }: NodeProps) => {
  const node = data as unknown as GraphNode;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      tabIndex={0}
      role="region"
      aria-label={`Human Review Gate Node: ${node.label || node.id}`}
      className={cn(
        'group relative w-[260px] rounded-2xl bg-card border select-none transition-all duration-200 overflow-hidden shadow-lg',
        selected
          ? 'border-amber-500/80 ring-2 ring-amber-500/40 shadow-[0_0_24px_rgba(245,158,11,0.3)]'
          : 'border-border hover:border-white/20'
      )}
    >
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-400" />

      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        aria-label="Input handle"
        className="!w-2.5 !h-2.5 !bg-amber-400 !border-2 !border-[#090a0d] !rounded-full transition-all hover:!scale-125"
      />

      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-border/80 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-foreground truncate max-w-[130px]">
            {node.label || node.id}
          </span>
        </div>

        {/* Gate badge */}
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground shrink-0 font-medium">
          gate
        </span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5">
        {/* Gate Prompt text */}
        <p className="text-xs text-foreground font-medium line-clamp-2 bg-secondary/60 border border-border/60 rounded-xl p-2.5 leading-relaxed">
          &quot;{node.prompt || 'Review and approve transition.'}&quot;
        </p>

        {/* Meta badges */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground flex-wrap">
          {node.allow_edit && (
            <span className="rounded-lg bg-secondary border border-border text-muted-foreground px-2 py-0.5">
              payload editable
            </span>
          )}
          {node.timeout_seconds && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-secondary border border-border text-muted-foreground px-2 py-0.5">
              <Clock className="w-2.5 h-2.5 text-muted-foreground/60" />
              <span>{node.timeout_seconds}s timeout</span>
            </span>
          )}
        </div>
      </div>

      {/* Source handles */}
      <div className="relative">
        <Handle
          type="source"
          position={Position.Right}
          id="on_success"
          aria-label="Approve handle"
          className="!top-[-14px] !w-2.5 !h-2.5 !bg-emerald-400 !border-2 !border-[#090a0d] !rounded-full transition-all hover:!scale-125"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="on_failure"
          aria-label="Reject handle"
          className="!top-[4px] !w-2.5 !h-2.5 !bg-rose-400 !border-2 !border-[#090a0d] !rounded-full transition-all hover:!scale-125"
        />
      </div>
    </motion.div>
  );
});

GateNode.displayName = 'GateNode';
