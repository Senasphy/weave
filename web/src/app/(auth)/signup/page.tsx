'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signUp, signIn, organization } from '@/lib/auth-client';
import { WeaveLogo } from '@/components/WeaveLogo';
import { Mail, Lock, User, Building2, Loader2, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'github' | 'google' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setErrorMessage('Please fill in your name, email, and password.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await signUp.email({
        name,
        email,
        password,
        callbackURL: callbackUrl,
      });

      if (res.error) {
        setErrorMessage(res.error.message || 'Failed to create account.');
        setIsLoading(false);
        return;
      }

      // If user provided an organization name, create organization workspace
      if (orgName.trim()) {
        try {
          const slug = orgName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

          await organization.create({
            name: orgName.trim(),
            slug: slug || `org-${Date.now()}`,
          });
        } catch (orgErr) {
          console.warn('Organization auto-creation deferred:', orgErr);
        }
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during registration.';
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: 'github' | 'google') => {
    setOauthLoading(provider);
    setErrorMessage(null);

    try {
      await signIn.social({
        provider,
        callbackURL: callbackUrl,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to initiate ${provider} registration.`;
      setErrorMessage(msg);
      setOauthLoading(null);
    }
  };

  return (
    <div className="relative w-full max-w-[460px] px-4 py-8">
      <div className="relative bg-card rounded-2xl border border-border shadow-2xl p-8 sm:p-10 overflow-hidden">
        {/* Header */}
        <div className="relative flex flex-col items-center text-center mb-8">
          <Link href="/" className="mb-4 hover:opacity-90 transition-opacity">
            <WeaveLogo variant="mark" className="h-9 w-auto" />
          </Link>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/80 border border-border text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-widest mb-2.5">
            Join the Network
          </div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Create your account
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Start building multi-agent systems with collaborative workspaces
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-rose-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-2.5 mb-6">
          <button
            type="button"
            onClick={() => handleSocialSignIn('github')}
            disabled={!!oauthLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-accent/30 hover:bg-accent/70 hover:border-white/20 text-xs font-medium text-foreground shadow-sm transition-all duration-150 disabled:opacity-60 cursor-pointer"
          >
            {oauthLoading === 'github' ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <svg className="w-4 h-4 fill-current text-foreground" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            )}
            <span>Continue with GitHub</span>
          </button>

          <button
            type="button"
            onClick={() => handleSocialSignIn('google')}
            disabled={!!oauthLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-accent/30 hover:bg-accent/70 hover:border-white/20 text-xs font-medium text-foreground shadow-sm transition-all duration-150 disabled:opacity-60 cursor-pointer"
          >
            {oauthLoading === 'google' ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.27 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.6H1.26C.46 8.22 0 10.06 0 12s.46 3.78 1.26 5.4l4.02-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.64 1.26 6.6l4.02 3.13c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-3 text-muted-foreground font-mono text-[11px]">or register with email</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleEmailSignUp} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground/80 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground/80 mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ada@company.com"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground/80 mb-1.5">
              Password <span className="text-muted-foreground text-[11px] font-normal">(min. 8 characters)</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-2.5 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground/80 mb-1.5">
              Team / Organization Name <span className="text-muted-foreground text-[11px] font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme AI Engineering"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !!oauthLoading}
            className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2.5 rounded-xl bg-foreground hover:bg-foreground/90 text-background text-xs font-semibold shadow transition-all duration-150 disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-background" />
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link
              href={callbackUrl !== '/' ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login'}
              className="font-semibold text-foreground hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md p-6 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}
