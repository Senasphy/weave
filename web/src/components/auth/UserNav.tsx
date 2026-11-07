'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useSession,
  signOut,
  organization,
  useActiveOrganization,
  useListOrganizations,
} from '@/lib/auth-client';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  User,
  LogOut,
  Building2,
  Check,
  Plus,
  Settings,
  ChevronDown,
  Loader2,
  LogIn,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export function UserNav() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const { data: activeOrg } = useActiveOrganization();
  const { data: orgs = [] } = useListOrganizations();

  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isSubmittingOrg, setIsSubmittingOrg] = useState(false);

  if (sessionLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-secondary animate-pulse flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-foreground hover:opacity-90 text-background text-xs font-medium shadow-sm transition-opacity"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Sign In</span>
      </Link>
    );
  }

  const user = session.user;
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/login');
          router.refresh();
        },
      },
    });
  };

  const handleSwitchOrg = async (orgId: string | null) => {
    try {
      if (orgId) {
        await organization.setActive({ organizationId: orgId });
      } else {
        await organization.setActive({ organizationId: null });
      }
      router.refresh();
    } catch (err) {
      console.error('Failed to switch workspace:', err);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setIsSubmittingOrg(true);
    try {
      const slug = newOrgName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      await organization.create({
        name: newOrgName.trim(),
        slug: slug || `org-${Date.now()}`,
      });
      setNewOrgName('');
      setIsCreatingOrg(false);
      router.refresh();
    } catch (err) {
      console.error('Failed to create organization:', err);
    } finally {
      setIsSubmittingOrg(false);
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-border bg-card/60 hover:bg-card hover:border-white/20 transition-all cursor-pointer outline-none shadow-sm"
        >
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name || user.email}
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-secondary border border-border text-foreground text-[10px] font-semibold flex items-center justify-center">
              {initials}
            </div>
          )}
          <span className="text-xs font-medium text-foreground max-w-[120px] truncate hidden sm:inline-block">
            {activeOrg?.name || user.name || 'Personal'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[240px] bg-card rounded-2xl shadow-2xl border border-border p-1.5 text-xs select-none animate-in fade-in-0 zoom-in-95 text-foreground"
        >
          {/* User profile header */}
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="font-semibold text-foreground truncate">
              {user.name || 'User'}
            </p>
            <p className="text-[11px] text-muted-foreground truncate font-mono">{user.email}</p>
          </div>

          {/* Active Workspace Label */}
          <div className="px-3 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground/75">
            Workspaces
          </div>

          {/* Personal Workspace item */}
          <DropdownMenu.Item
            onClick={() => handleSwitchOrg(null)}
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer outline-none hover:bg-accent hover:text-foreground transition-all',
              !activeOrg && 'bg-accent/80 font-semibold text-foreground border border-white/[0.08]'
            )}
          >
            <div className="flex items-center gap-2.5 truncate">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="truncate">Personal Workspace</span>
            </div>
            {!activeOrg && <Check className="w-3.5 h-3.5 text-emerald-400" />}
          </DropdownMenu.Item>

          {/* Organizations List */}
          {orgs && orgs.length > 0 && (
            <div className="py-1 space-y-0.5">
              {orgs.map((org: { id: string; name: string }) => {
                const isActive = activeOrg?.id === org.id;
                return (
                  <DropdownMenu.Item
                    key={org.id}
                    onClick={() => handleSwitchOrg(org.id)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer outline-none hover:bg-accent hover:text-foreground transition-all',
                      isActive && 'bg-accent/80 font-semibold text-foreground border border-white/[0.08]'
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="truncate">{org.name}</span>
                    </div>
                    {isActive && (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </DropdownMenu.Item>
                );
              })}
            </div>
          )}

          {/* Create Organization Dialog/Inline */}
          {isCreatingOrg ? (
            <form onSubmit={handleCreateOrg} className="p-2.5 border-t border-border mt-1">
              <input
                type="text"
                autoFocus
                placeholder="Team name..."
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:border-white/20 mb-2"
              />
              <div className="flex items-center gap-1.5 justify-end">
                <button
                  type="button"
                  onClick={() => setIsCreatingOrg(false)}
                  className="px-2.5 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOrg || !newOrgName.trim()}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-foreground text-background font-medium disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingOrg ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          ) : (
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                setIsCreatingOrg(true);
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer outline-none transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create organization</span>
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Separator className="h-px bg-border my-1" />

          {/* Settings link */}
          <DropdownMenu.Item asChild>
            <Link
              href="/settings"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer outline-none transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </Link>
          </DropdownMenu.Item>

          {/* Sign out */}
          <DropdownMenu.Item
            onClick={handleSignOut}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 cursor-pointer outline-none transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
