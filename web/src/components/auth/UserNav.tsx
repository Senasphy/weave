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
      <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-sm transition-colors"
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
          className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border border-border bg-white hover:bg-slate-50 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-slate-900/10"
        >
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name || user.email}
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-semibold flex items-center justify-center">
              {initials}
            </div>
          )}
          <span className="text-xs font-medium text-slate-800 max-w-[100px] truncate hidden sm:inline-block">
            {activeOrg?.name || user.name || 'Personal'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[240px] bg-white rounded-xl shadow-lg border border-border p-1.5 text-xs select-none animate-in fade-in-0 zoom-in-95"
        >
          {/* User profile header */}
          <div className="px-2.5 py-2 border-b border-border mb-1">
            <p className="font-semibold text-slate-900 truncate">
              {user.name || 'User'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>

          {/* Active Workspace Label */}
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Workspaces
          </div>

          {/* Personal Workspace item */}
          <DropdownMenu.Item
            onClick={() => handleSwitchOrg(null)}
            className={cn(
              'flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer outline-none hover:bg-slate-100 transition-colors',
              !activeOrg && 'bg-slate-50 font-medium text-slate-900'
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate">Personal Workspace</span>
            </div>
            {!activeOrg && <Check className="w-3.5 h-3.5 text-emerald-600" />}
          </DropdownMenu.Item>

          {/* Organizations List */}
          {orgs && orgs.length > 0 && (
            <div className="py-1">
              {orgs.map((org: { id: string; name: string }) => {
                const isActive = activeOrg?.id === org.id;
                return (
                  <DropdownMenu.Item
                    key={org.id}
                    onClick={() => handleSwitchOrg(org.id)}
                    className={cn(
                      'flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer outline-none hover:bg-slate-100 transition-colors',
                      isActive && 'bg-slate-50 font-medium text-slate-900'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{org.name}</span>
                    </div>
                    {isActive && (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </DropdownMenu.Item>
                );
              })}
            </div>
          )}

          {/* Create Organization Dialog/Inline */}
          {isCreatingOrg ? (
            <form onSubmit={handleCreateOrg} className="p-2 border-t border-border mt-1">
              <input
                type="text"
                autoFocus
                placeholder="Team name..."
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className="w-full px-2 py-1 text-xs rounded border border-border focus:outline-none focus:ring-1 focus:ring-slate-900 mb-1.5"
              />
              <div className="flex items-center gap-1.5 justify-end">
                <button
                  type="button"
                  onClick={() => setIsCreatingOrg(false)}
                  className="px-2 py-0.5 rounded text-[11px] text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOrg || !newOrgName.trim()}
                  className="px-2 py-0.5 rounded text-[11px] bg-slate-900 text-white font-medium disabled:opacity-50"
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
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer outline-none transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-slate-400" />
              <span>Create organization</span>
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Separator className="h-px bg-border my-1" />

          {/* Settings link */}
          <DropdownMenu.Item asChild>
            <Link
              href="/settings"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer outline-none transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Settings</span>
            </Link>
          </DropdownMenu.Item>

          {/* Sign out */}
          <DropdownMenu.Item
            onClick={handleSignOut}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer outline-none transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
