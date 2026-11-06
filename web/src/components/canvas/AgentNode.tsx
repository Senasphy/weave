'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Bot, Wrench, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Node as GraphNode } from '@/lib/types';
import { cn } from '@/lib/cn';

export const AgentNode = memo(({ data, selected }: NodeProps) => {
  const node = data as unknown as GraphNode;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      tabIndex={0}
      role="region"
      aria-label={`Agent Node: ${node.label || node.id}`}
      className={cn(
        'group relative w-[260px] rounded-2xl bg-card border select-none transition-all duration-200 overflow-hidden shadow-lg',
        selected
          ? 'border-indigo-500/80 ring-2 ring-indigo-500/40 shadow-[0_0_24px_rgba(99,102,241,0.3)]'
          : 'border-border hover:border-white/20'
      )}
    >
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-indigo-500 to-indigo-400" />

      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        aria-label="Input handle"
        className="!w-2.5 !h-2.5 !bg-indigo-400 !border-2 !border-[#090a0d] !rounded-full transition-all hover:!scale-125"
      />

      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-border/80 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg border border-indigo-500/30 bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 shadow-sm">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-foreground truncate max-w-[130px]">
            {node.label || node.id}
          </span>
        </div>

        {/* Provider badge */}
        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground shrink-0">
          <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
          <span>{node.model?.provider || 'agent'}</span>
        </span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5">
        {/* System Prompt Preview */}
        <p className="text-xs text-muted-foreground line-clamp-2 italic bg-secondary/60 border border-border/60 rounded-xl p-2.5 leading-relaxed">
          {node.system_prompt ? `"${node.system_prompt}"` : 'No system prompt defined.'}
        </p>

        {/* Tools badges */}
        {node.tools && node.tools.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Wrench className="w-3 h-3 text-muted-foreground/60 mr-0.5 shrink-0" />
            {node.tools.map((t) => (
              <span
                key={t}
                className="inline-flex items-center bg-secondary text-muted-foreground border border-border rounded-lg px-2 py-0.5 text-[10px] font-mono"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* State read/write indicators */}
        {(node.reads?.length || node.writes?.length) ? (
          <div className="flex items-center gap-3 pt-0.5 text-[10px] font-mono">
            {node.reads?.length ? (
              <div className="flex items-center gap-1 min-w-0" title={`Reads: ${node.reads.join(', ')}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                <span className="text-muted-foreground">R:</span>
                <span className="text-foreground truncate max-w-[80px] font-medium">{node.reads.join(',')}</span>
              </div>
            ) : null}

            {node.writes?.length ? (
              <div className="flex items-center gap-1 min-w-0" title={`Writes: ${node.writes.join(', ')}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                <span className="text-muted-foreground">W:</span>
                <span className="text-foreground truncate max-w-[80px] font-medium">{node.writes.join(',')}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Source handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        aria-label="Output handle"
        className="!w-2.5 !h-2.5 !bg-indigo-400 !border-2 !border-[#090a0d] !rounded-full transition-all hover:!scale-125"
      />
    </motion.div>
  );
});

AgentNode.displayName = 'AgentNode';
