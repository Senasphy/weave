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
        'group relative w-[250px] rounded bg-white border select-none transition-colors',
        selected
          ? 'border-slate-900 ring-1 ring-slate-900'
          : 'border-border hover:border-slate-400'
      )}
    >
      {/* Top accent bar */}
      <div className="h-0.5 rounded-t bg-amber-500" />

      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        aria-label="Input handle"
        className="!w-2 !h-2 !bg-amber-500 !border-2 !border-white !rounded-full transition-transform hover:!scale-125"
      />

      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded border border-slate-200 bg-white text-slate-700 flex items-center justify-center shrink-0">
            <UserCheck className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-slate-900 truncate max-w-[130px]">
            {node.label || node.id}
          </span>
        </div>

        {/* Gate badge */}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 shrink-0 font-medium">
          gate
        </span>
      </div>

      {/* Body */}
      <div className="p-2.5 space-y-2">
        {/* Gate Prompt text */}
        <p className="text-xs text-slate-700 font-medium line-clamp-2 bg-slate-50 border border-border/80 rounded p-2 leading-relaxed">
          &quot;{node.prompt || 'Review and approve transition.'}&quot;
        </p>

        {/* Meta badges */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 flex-wrap">
          {node.allow_edit && (
            <span className="rounded bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.5">
              payload editable
            </span>
          )}
          {node.timeout_seconds && (
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.5">
              <Clock className="w-2.5 h-2.5 text-slate-500" />
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
          className="!top-[-14px] !w-2 !h-2 !bg-emerald-600 !border-2 !border-white !rounded-full transition-transform hover:!scale-125"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="on_failure"
          aria-label="Reject handle"
          className="!top-[4px] !w-2 !h-2 !bg-rose-600 !border-2 !border-white !rounded-full transition-transform hover:!scale-125"
        />
      </div>
    </motion.div>
  );
});

GateNode.displayName = 'GateNode';
