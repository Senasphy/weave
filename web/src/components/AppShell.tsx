'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { CommandMenu } from './CommandMenu';
import { WeaveLogo } from './WeaveLogo';
import { useSession } from '@/lib/auth-client';
import { cn } from '@/lib/cn';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);

  const { data: session, isPending: isSessionPending } = useSession();

  // Auto-collapse sidebar on workflow canvas editor to maximize canvas space, but allow user to toggle
  const isWorkflowCanvas = pathname.startsWith('/workflows/');
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname.startsWith('/auth');

  // Client-side authentication guard: redirect to login if session resolves to null on protected page
  useEffect(() => {
    if (!isSessionPending && !session && !isAuthPage) {
      const loginUrl = pathname !== '/' ? `/login?callbackUrl=${encodeURIComponent(pathname)}` : '/login';
      router.replace(loginUrl);
    }
  }, [isSessionPending, session, isAuthPage, pathname, router]);

  useEffect(() => {
    if (isWorkflowCanvas) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }
  }, [isWorkflowCanvas]);

  // Global ⌘K / Ctrl+K shortcut to open command menu / search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandMenuOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isAuthPage) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground flex flex-col items-center justify-center">
        {children}
      </div>
    );
  }

  // Show subtle loading screen on protected routes while session is being verified
  if (isSessionPending) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground flex flex-col items-center justify-center gap-3 select-none">
        <WeaveLogo className="h-8 w-auto animate-pulse" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
          <span>Verifying workspace session...</span>
        </div>
      </div>
    );
  }

  // If not authenticated, keep view blank while redirect takes effect
  if (!session) {
    return null;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar navigation */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onOpenSearch={() => setCommandMenuOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-background">
        {children}
      </div>

      {/* Global Command Menu & Search */}
      <CommandMenu
        isOpen={commandMenuOpen}
        onClose={() => setCommandMenuOpen(false)}
      />
    </div>
  );
}
