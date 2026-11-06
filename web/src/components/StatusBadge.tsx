'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import { RunStatus } from '@/lib/types';

export type StatusType =
  | RunStatus
  | 'active'
  | 'idle'
  | 'draft'
  | 'succeeded'
  | 'completed'
  | 'running'
  | 'in_progress'
  | 'pending'
  | 'waiting_human'
  | 'failed'
  | 'budget_exceeded'
  | 'capped'
  | 'cancelled'
  | 'approved'
  | 'rejected'
  | string;

interface StatusBadgeProps {
  status?: StatusType;
  label?: string;
  size?: 'xs' | 'sm';
  pulse?: boolean;
  className?: string;
}

export function StatusBadge({
  status = 'idle',
  label,
  size = 'xs',
  pulse = false,
  className,
}: StatusBadgeProps) {
  const norm = (status || '').toLowerCase().trim();

  let bgClass = 'bg-secondary text-muted-foreground border-border';
  let dotClass = 'bg-muted-foreground/60';
  let defaultLabel: string = status || 'Unknown';

  switch (norm) {
    case 'running':
    case 'active':
    case 'in_progress':
      bgClass = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 font-medium';
      dotClass = 'bg-indigo-400';
      defaultLabel = norm === 'active' ? 'Active' : 'Running';
      break;

    case 'succeeded':
    case 'completed':
    case 'approved':
      bgClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      dotClass = 'bg-emerald-400';
      defaultLabel = norm === 'approved' ? 'Approved' : 'Completed';
      break;

    case 'waiting_human':
    case 'pending':
    case 'waiting':
      bgClass = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      dotClass = 'bg-amber-400';
      defaultLabel = norm === 'waiting_human' ? 'Pending Gate' : 'Pending';
      break;

    case 'failed':
    case 'error':
    case 'rejected':
      bgClass = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      dotClass = 'bg-rose-400';
      defaultLabel = norm === 'rejected' ? 'Rejected' : 'Failed';
      break;

    case 'budget_exceeded':
    case 'capped':
      bgClass = 'bg-orange-500/15 text-orange-300 border-orange-500/30';
      dotClass = 'bg-orange-400';
      defaultLabel = 'Budget Capped';
      break;

    case 'cancelled':
      bgClass = 'bg-secondary text-muted-foreground border-border';
      dotClass = 'bg-muted-foreground/60';
      defaultLabel = 'Cancelled';
      break;

    case 'idle':
    case 'draft':
      bgClass = 'bg-secondary/70 text-muted-foreground border-border';
      dotClass = 'bg-muted-foreground/50';
      defaultLabel = norm === 'draft' ? 'Draft' : 'Idle';
      break;

    default:
      bgClass = 'bg-secondary text-muted-foreground border-border';
      dotClass = 'bg-muted-foreground/60';
      defaultLabel = status || 'Unknown';
  }

  const displayText = label || defaultLabel;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border rounded-full select-none transition-colors backdrop-blur-sm',
        size === 'xs'
          ? 'gap-1.5 px-2.5 py-0.5 text-[11px] leading-tight tracking-tight'
          : 'gap-2 px-3 py-1 text-xs leading-tight',
        bgClass,
        className
      )}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0 items-center justify-center">
        {pulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              dotClass
            )}
          />
        )}
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', dotClass)} />
      </span>
      <span>{displayText}</span>
    </span>
  );
}
