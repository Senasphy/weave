'use client';

import React, { useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // If it's a ChunkLoadError caused by build redeployment or server restart, auto-reload once
    const isChunkError =
      error.name === 'ChunkLoadError' ||
      /Loading chunk .* failed/i.test(error.message) ||
      /Failed to fetch dynamically imported module/i.test(error.message);

    if (isChunkError && typeof window !== 'undefined') {
      const lastReload = sessionStorage.getItem('chunk_reload_ts');
      const now = Date.now();
      // Only auto-reload if not reloaded within the last 15s to prevent infinite loop
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem('chunk_reload_ts', String(now));
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-background min-h-[60vh]">
      <div className="w-12 h-12 rounded-2xl border border-destructive/20 bg-destructive/10 flex items-center justify-center mb-4 text-rose-400 shadow-lg">
        <AlertCircle className="w-6 h-6 text-rose-400" />
      </div>
      <h2 className="text-base font-semibold text-foreground tracking-tight">View loading error</h2>
      <p className="text-xs text-muted-foreground mt-1.5 max-w-md leading-relaxed">
        {error.message || 'An unexpected client error occurred while loading this view.'}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reload Page</span>
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-medium hover:bg-accent hover:border-white/20 transition-all cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
