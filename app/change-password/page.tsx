'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('La password deve essere di almeno 8 caratteri', { duration: 5000 });
      return;
    }
    if (password !== confirm) {
      toast.error('Le password non coincidono', { duration: 5000 });
      return;
    }
    setLoading(true);

    // Single server-side call: updates password + clears must_change_password atomically
    // (avoids race condition from client-side updateUser invalidating the session cookie)
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error ?? "Errore durante l'aggiornamento della password.", { duration: 5000 });
      setLoading(false);
      return;
    }

    // Password change invalidates the current JWT — re-sign-in with the new password
    // so the browser gets a fresh session cookie before we redirect to the dashboard.
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password,
    });
    if (signInError) {
      // Re-sign-in failed — redirect anyway, proxy will enforce re-login
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-600 dark:bg-amber-700 mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Cambia password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Imposta una nuova password per accedere alla piattaforma.
          </p>
        </div>

        <div className="rounded-2xl bg-card border border-border p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Nuova password</label>
              <Input
                type="password"
                placeholder="Minimo 8 caratteri"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Conferma password</label>
              <Input
                type="password"
                placeholder="Ripeti la nuova password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading}
                required
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !password || !confirm}
              className="w-full bg-brand hover:bg-brand/90 text-white"
            >
              {loading ? <>{spinner} Aggiornamento…</> : 'Imposta nuova password'}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Per problemi di accesso contatta l&apos;amministrazione.
        </p>
      </div>
    </div>
  );
}
