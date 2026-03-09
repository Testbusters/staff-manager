'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import AppLogo from '@/components/ui/AppLogo';

const TEST_USERS = [
  { role: 'Collaboratore',                    email: 'collaboratore_test@test.com' },
  { role: 'Resp. Cittadino',                  email: 'responsabile_cittadino_test@test.com' },
  { role: 'Resp. Compensi',                   email: 'responsabile_compensi_test@test.com' },
  { role: 'Resp. Servizi Ind.',               email: 'responsabile_servizi_individuali_test@test.com' },
  { role: 'Admin',                            email: 'admin_test@test.com' },
] as const;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const supabase = createClient();
  const { setTheme } = useTheme();

  // Login page is always dark — override any stored preference
  useEffect(() => {
    setTheme('dark');
  }, [setTheme]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('Email o password non corretti');
      setLoading(false);
      return;
    }
    router.push('/');
  };

  const spinner = (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <AppLogo className="w-14 h-14 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground">Staff Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">Accedi alla tua area personale</p>
        </div>

        <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Email</label>
              <Input
                type="email"
                placeholder="nome@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Password</label>
              <Input
                ref={passwordRef}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2.5 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-brand hover:bg-brand/90 text-white"
            >
              {loading ? <>{spinner} Accesso in corso…</> : 'Accedi'}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Per problemi di accesso contatta l&apos;amministrazione.
        </p>

        {/* Test credentials */}
        <div className="mt-6 space-y-2">
          <p className="text-center text-xs text-muted-foreground">Utenze di test</p>
          <div className="grid grid-cols-3 gap-2">
            {TEST_USERS.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => {
                  setEmail(u.email);
                  setPassword('Testbusters123');
                  passwordRef.current?.focus();
                }}
                className="rounded-lg bg-background border border-border px-2 py-2.5 text-left hover:border-muted-foreground/30 hover:bg-muted/60 transition"
              >
                <p className="text-xs font-medium text-muted-foreground">{u.role}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
