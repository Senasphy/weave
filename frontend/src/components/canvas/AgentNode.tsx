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
        'group relative w-[250px] rounded bg-white border select-none transition-colors',
        selected
          ? 'border-slate-900 ring-1 ring-slate-900'
          : 'border-border hover:border-slate-400'
      )}
    >
      {/* Top accent bar */}
      <div className="h-0.5 rounded-t bg-slate-900" />

      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        aria-label="Input handle"
        className="!w-2 !h-2 !bg-slate-900 !border-2 !border-white !rounded-full transition-transform hover:!scale-125"
      />

      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded border border-slate-200 bg-white text-slate-700 flex items-center justify-center shrink-0">
            <Bot className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-slate-900 truncate max-w-[125px]">
            {node.label || node.id}
          </span>
        </div>

        {/* Provider badge */}
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 shrink-0">
          <Sparkles className="w-2.5 h-2.5 text-slate-500" />
          <span>{node.model?.provider || 'agent'}</span>
        </span>
      </div>

      {/* Body */}
      <div className="p-2.5 space-y-2">
        {/* System Prompt Preview */}
        <p className="text-xs text-slate-600 line-clamp-2 italic bg-slate-50 border border-border/80 rounded p-2 leading-relaxed">
          {node.system_prompt ? `"${node.system_prompt}"` : 'No system prompt defined.'}
        </p>

        {/* Tools badges */}
        {node.tools && node.tools.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Wrench className="w-3 h-3 text-slate-400 mr-0.5 shrink-0" />
            {node.tools.map((t) => (
              <span
                key={t}
                className="inline-flex items-center bg-slate-50 text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 text-[10px]"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* State read/write indicators */}
        {(node.reads?.length || node.writes?.length) ? (
          <div className="flex items-center gap-3 pt-0.5 text-[10px]">
            {node.reads?.length ? (
              <div className="flex items-center gap-1 min-w-0" title={`Reads: ${node.reads.join(', ')}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                <span className="text-slate-500">R:</span>
                <span className="text-slate-700 truncate max-w-[80px] font-medium">{node.reads.join(',')}</span>
              </div>
            ) : null}

            {node.writes?.length ? (
              <div className="flex items-center gap-1 min-w-0" title={`Writes: ${node.writes.join(', ')}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                <span className="text-slate-500">W:</span>
                <span className="text-slate-700 truncate max-w-[80px] font-medium">{node.writes.join(',')}</span>
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
        className="!w-2 !h-2 !bg-slate-900 !border-2 !border-white !rounded-full transition-transform hover:!scale-125"
      />
    </motion.div>
  );
});

AgentNode.displayName = 'AgentNode';
