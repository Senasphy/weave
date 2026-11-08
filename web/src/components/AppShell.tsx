'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Search } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { CommandMenu } from './CommandMenu';
import { WeaveLogo } from './WeaveLogo';
import { useSession } from '@/lib/auth-client';
import { cn } from '@/lib/cn';

interface MobileNavContextValue {
  openMobileNav: () => void;
  closeMobileNav: () => void;
  isMobileNavOpen: boolean;
}

const MobileNavContext = createContext<MobileNavContextValue>({
  openMobileNav: () => {},
  closeMobileNav: () => {},
  isMobileNavOpen: false,
});

export const useMobileNav = () => useContext(MobileNavContext);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);

  const { data: session, isPending: isSessionPending } = useSession();

  // Auto-collapse sidebar on workflow canvas editor to maximize canvas space
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
    if (isWorkflowCanvas || (typeof window !== 'undefined' && window.innerWidth < 768)) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }
  }, [isWorkflowCanvas]);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

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
        <WeaveLogo variant="mark" className="h-8 w-auto" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
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
    <MobileNavContext.Provider
      value={{
        openMobileNav: () => setMobileNavOpen(true),
        closeMobileNav: () => setMobileNavOpen(false),
        isMobileNavOpen: mobileNavOpen,
      }}
    >
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        {/* Desktop Sidebar (hidden on < md) */}
        <div className="hidden md:flex h-full shrink-0">
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(!collapsed)}
            onOpenSearch={() => setCommandMenuOpen(true)}
          />
        </div>

        {/* Mobile Slide-Over Drawer (< md) */}
        <AnimatePresence>
          {mobileNavOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setMobileNavOpen(false)}
                className="fixed inset-0 bg-black/75 backdrop-blur-xs"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                className="relative z-50 w-72 max-w-[85vw] h-full bg-background border-r border-border shadow-2xl flex flex-col"
              >
                <Sidebar
                  collapsed={false}
                  isMobileDrawer={true}
                  onCloseMobileDrawer={() => setMobileNavOpen(false)}
                  onOpenSearch={() => {
                    setMobileNavOpen(false);
                    setCommandMenuOpen(true);
                  }}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-background">
          {/* Mobile Top Header (only on < md and not on workflow canvas editor) */}
          {!isWorkflowCanvas && (
            <header className="h-13 bg-card border-b border-border flex items-center justify-between px-3.5 md:hidden shrink-0 z-30 select-none">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(true)}
                  className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  title="Open menu"
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
                  <WeaveLogo variant="mark" className="h-5 w-auto" />
                  <span className="font-semibold text-sm tracking-tight text-foreground">Weave</span>
                </Link>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCommandMenuOpen(true)}
                  className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  title="Search (⌘K)"
                  aria-label="Search"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </header>
          )}

          {children}
        </div>

        {/* Global Command Menu & Search */}
        <CommandMenu
          isOpen={commandMenuOpen}
          onClose={() => setCommandMenuOpen(false)}
        />
      </div>
    </MobileNavContext.Provider>
  );
}
