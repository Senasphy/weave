import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL:
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'https://weave-orchestrator-main.vercel.app',
  plugins: [
    organizationClient(),
  ],
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  organization,
  useActiveOrganization,
  useListOrganizations,
} = authClient;
