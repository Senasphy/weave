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
  pulse = true,
  className,
}: StatusBadgeProps) {
  const norm = (status || '').toLowerCase().trim();

  let bgClass = 'bg-slate-50 text-slate-700 border-slate-200';
  let dotClass = 'bg-slate-400';
  let isAnimated = false;
  let defaultLabel: string = status || 'Unknown';

  switch (norm) {
    case 'running':
    case 'active':
    case 'in_progress':
      bgClass = 'bg-sky-50 text-sky-700 border-sky-200/80';
      dotClass = 'bg-sky-500';
      isAnimated = pulse;
      defaultLabel = norm === 'active' ? 'Active' : 'Running';
      break;

    case 'succeeded':
    case 'completed':
    case 'approved':
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      dotClass = 'bg-emerald-500';
      defaultLabel = norm === 'approved' ? 'Approved' : 'Completed';
      break;

    case 'waiting_human':
    case 'pending':
    case 'waiting':
      bgClass = 'bg-amber-50 text-amber-700 border-amber-200/80';
      dotClass = 'bg-amber-500';
      defaultLabel = norm === 'waiting_human' ? 'Pending Gate' : 'Pending';
      break;

    case 'failed':
    case 'error':
    case 'rejected':
      bgClass = 'bg-rose-50 text-rose-700 border-rose-200/80';
      dotClass = 'bg-rose-500';
      defaultLabel = norm === 'rejected' ? 'Rejected' : 'Failed';
      break;

    case 'budget_exceeded':
    case 'capped':
      bgClass = 'bg-orange-50 text-orange-700 border-orange-200/80';
      dotClass = 'bg-orange-500';
      defaultLabel = 'Budget Capped';
      break;

    case 'cancelled':
      bgClass = 'bg-slate-100 text-slate-600 border-slate-200';
      dotClass = 'bg-slate-400';
      defaultLabel = 'Cancelled';
      break;

    case 'idle':
    case 'draft':
      bgClass = 'bg-slate-50 text-slate-600 border-slate-200';
      dotClass = 'bg-slate-400';
      defaultLabel = norm === 'draft' ? 'Draft' : 'Idle';
      break;

    default:
      bgClass = 'bg-slate-50 text-slate-700 border-slate-200';
      dotClass = 'bg-slate-400';
      defaultLabel = status || 'Unknown';
  }

  const displayText = label || defaultLabel;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border select-none transition-colors',
        size === 'xs'
          ? 'gap-1.5 px-2 py-0.5 rounded text-[11px] leading-tight tracking-tight'
          : 'gap-2 px-2.5 py-1 rounded text-xs leading-tight',
        bgClass,
        className
      )}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0 items-center justify-center">
        {isAnimated && (
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
