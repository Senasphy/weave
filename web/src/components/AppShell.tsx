'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { CommandMenu } from './CommandMenu';
import { cn } from '@/lib/cn';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);

  // Auto-collapse sidebar on workflow canvas editor to maximize canvas space, but allow user to toggle
  const isWorkflowCanvas = pathname.startsWith('/workflows/');
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname.startsWith('/auth');

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
      <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center">
        {children}
      </div>
    );
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
