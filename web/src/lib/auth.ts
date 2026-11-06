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

const pool = new Pool({
  connectionString: connectionString || 'postgres://postgres:postgres@localhost:5433/weave',
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
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

const rawBaseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
const baseURL = rawBaseURL ? rawBaseURL.trim().replace(/\/+$/, '') : undefined;

const trustedOrigins: string[] = [];
if (baseURL) trustedOrigins.push(baseURL);
if (process.env.NEXT_PUBLIC_APP_URL) trustedOrigins.push(process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, ''));
if (process.env.VERCEL_URL) trustedOrigins.push(`https://${process.env.VERCEL_URL.trim().replace(/\/+$/, '')}`);

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET || 'weave-insecure-dev-secret-replace-in-production',
  baseURL,
  trustedOrigins: Array.from(new Set(trustedOrigins.filter(Boolean))),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders,
  plugins: [
    organization(),
    bearer(),
  ],
});
