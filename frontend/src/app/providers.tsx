'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleChunkError = (e: ErrorEvent) => {
      const isChunk =
        /Loading chunk .* failed/i.test(e.message) ||
        /Failed to fetch dynamically imported module/i.test(e.message) ||
        (e.error && (e.error.name === 'ChunkLoadError' || /Loading chunk .* failed/i.test(e.error.message)));

      if (isChunk) {
        const lastReload = sessionStorage.getItem('chunk_reload_ts');
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
          sessionStorage.setItem('chunk_reload_ts', String(now));
          window.location.reload();
        }
      }
    };

    window.addEventListener('error', handleChunkError);
    return () => window.removeEventListener('error', handleChunkError);
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
