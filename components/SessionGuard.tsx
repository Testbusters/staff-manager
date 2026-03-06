'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Handles session expiry in two ways:
 * 1. onAuthStateChange — redirects to /login when Supabase fires SIGNED_OUT
 *    (covers refresh token expiry after extended inactivity).
 * 2. Global fetch patch — intercepts 401 responses from /api/* routes and
 *    redirects to /login (covers access token expiry mid-session).
 *
 * Must be rendered inside app/(app)/layout.tsx so it's active on every app page.
 */
export function SessionGuard() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      if (response.status === 401) {
        const url = args[0];
        const isApiCall = typeof url === 'string' && url.startsWith('/api/');
        if (isApiCall) {
          router.push('/login');
        }
      }
      return response;
    };

    return () => {
      subscription.unsubscribe();
      window.fetch = originalFetch;
    };
  }, [router]);

  return null;
}
