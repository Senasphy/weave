/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { cn } from '@/lib/cn';

interface WeaveLogoProps {
  /**
   * "full" displays mark + "Weave" wordmark
   * "mark" displays only the monogram mark icon
   */
  variant?: 'full' | 'mark';
  className?: string;
  markClassName?: string;
  textClassName?: string;
  alt?: string;
  priority?: boolean;
}

export function WeaveLogo({
  variant = 'full',
  className,
  markClassName,
  textClassName,
  alt = 'Weave',
  priority = true,
}: WeaveLogoProps) {
  const isFull = variant === 'full';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5 shrink-0 select-none',
        isFull ? 'h-6' : 'h-6 w-auto',
        className
      )}
    >
      {/* Weave Mark Monogram */}
      <span
        className={cn(
          'relative inline-flex items-center justify-center shrink-0 h-full w-auto',
          markClassName
        )}
      >
        <img
          src="/weave-mark.svg"
          alt={alt}
          width={36}
          height={24}
          className="h-full w-auto block dark:hidden object-contain"
          loading={priority ? 'eager' : 'lazy'}
        />
        <img
          src="/weave-mark-dark.svg"
          alt={alt}
          width={36}
          height={24}
          className="h-full w-auto hidden dark:block object-contain"
          loading={priority ? 'eager' : 'lazy'}
        />
      </span>

      {/* Typography matching docs design */}
      {isFull && (
        <span
          className={cn(
            'text-[16px] font-semibold tracking-tight text-foreground leading-none',
            textClassName
          )}
        >
          Weave
        </span>
      )}
    </span>
  );
}
