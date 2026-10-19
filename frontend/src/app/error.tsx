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
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-slate-50 min-h-[60vh]">
      <div className="w-10 h-10 rounded border border-border bg-white flex items-center justify-center mb-3 text-slate-700 shadow-xs">
        <AlertCircle className="w-5 h-5 text-rose-500" />
      </div>
      <h2 className="text-sm font-semibold text-slate-900 tracking-tight">View loading error</h2>
      <p className="text-xs text-muted-foreground mt-1 max-w-md leading-relaxed">
        {error.message || 'An unexpected client error occurred while loading this view.'}
      </p>
      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reload Page</span>
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="px-3 py-1.5 rounded border border-border bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
