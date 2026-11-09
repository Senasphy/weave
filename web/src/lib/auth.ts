import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { organization } from 'better-auth/plugins/organization';
import { bearer } from 'better-auth/plugins/bearer';

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString && process.env.NODE_ENV === 'production') {
  console.error('[Better Auth] CRITICAL: DATABASE_URL is not set! Account creation, login, and sessions will fail.');
}

// Enable SSL for remote databases (Neon, Supabase, Render, AWS, etc.), disable for local postgres
const isLocal =
  !connectionString ||
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1') ||
  connectionString.includes('sslmode=disable');

// In production, rejectUnauthorized defaults to true for secure TLS connections.
// Override with PG_SSL_REJECT_UNAUTHORIZED=false ONLY if connecting to local self-signed dev certificates.
const rejectUnauthorized = process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false';

const pool = new Pool({
  connectionString: connectionString || 'postgres://postgres:postgres@localhost:5432/weave',
  ssl: isLocal ? undefined : { rejectUnauthorized },
});

const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID.trim(),
    clientSecret: process.env.GITHUB_CLIENT_SECRET.trim(),
  };
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID.trim(),
    clientSecret: process.env.GOOGLE_CLIENT_SECRET.trim(),
  };
}

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
const betterAuthSecret = process.env.BETTER_AUTH_SECRET?.trim();
if (!betterAuthSecret) {
  if (process.env.NODE_ENV === 'production' && !isBuildPhase) {
    throw new Error(
      '[Better Auth] FATAL: BETTER_AUTH_SECRET environment variable is missing in production! ' +
      'Generate a secure 32+ character random secret and configure it in your environment dashboard.'
    );
  }
  if (!isBuildPhase) {
    console.warn('[Better Auth] WARNING: BETTER_AUTH_SECRET is not set. Using dev secret. DO NOT USE IN PRODUCTION.');
  }
}

const defaultAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';

const rawBaseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : defaultAppUrl);
const baseURL = rawBaseURL ? rawBaseURL.trim().replace(/\/+$/, '') : defaultAppUrl;

if (!process.env.BETTER_AUTH_URL) {
  process.env.BETTER_AUTH_URL = baseURL;
}

const staticOrigins = [
  'http://localhost:3000',
  'http://localhost:3456',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3456',
];
if (baseURL && !staticOrigins.includes(baseURL)) staticOrigins.push(baseURL);
if (process.env.NEXT_PUBLIC_APP_URL) staticOrigins.push(process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, ''));
if (process.env.ALLOWED_ORIGINS) {
  for (const o of process.env.ALLOWED_ORIGINS.split(',')) {
    const trimmed = o.trim().replace(/\/+$/, '');
    if (trimmed && !staticOrigins.includes(trimmed)) staticOrigins.push(trimmed);
  }
}

export const auth = betterAuth({
  database: pool,
  secret: betterAuthSecret || 'weave-insecure-dev-secret-replace-in-production',
  baseURL,
  trustedOrigins: async (request?: Request) => {
    const origins = [...staticOrigins];
    if (request) {
      const originHeader = request.headers.get('origin') || request.headers.get('referer');
      if (originHeader) {
        try {
          const originUrl = new URL(originHeader);
          if (
            originUrl.origin === baseURL ||
            originUrl.hostname === 'localhost' ||
            originUrl.hostname === '127.0.0.1'
          ) {
            origins.push(originUrl.origin);
          }
        } catch {
          // ignore invalid URLs
        }
      }
    }
    return Array.from(new Set(origins.filter(Boolean)));
  },
  advanced: {
    trustedProxyHeaders: true,
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders,
  plugins: [
    organization(),
    bearer(),
  ],
});
