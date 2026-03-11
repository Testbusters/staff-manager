'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function useToggle(initial = false): [boolean, () => void] {
  const [value, setValue] = useState(initial);
  return [value, () => setValue((v) => !v)];
}

interface Rule {
  label: string;
  test: (p: string) => boolean;
}

const RULES: Rule[] = [
  { label: 'Almeno 8 caratteri',              test: (p) => p.length >= 8 },
  { label: 'Almeno una lettera maiuscola',     test: (p) => /[A-Z]/.test(p) },
  { label: 'Almeno un numero o simbolo',       test: (p) => /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
];

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass,    toggleShowPass]    = useToggle();
  const [showConfirm, toggleShowConfirm] = useToggle();
  const router = useRouter();

  const rulesPassed  = RULES.every((r) => r.test(password));
  const mismatch     = confirm.length > 0 && password !== confirm;
  const canSubmit    = rulesPassed && !mismatch && confirm.length > 0 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rulesPassed) {
      toast.error('La password non soddisfa i requisiti di sicurezza.', { duration: 5000 });
      return;
    }
    if (password !== confirm) {
      toast.error('Le password non coincidono.', { duration: 5000 });
      return;
    }
    setLoading(true);

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

    // Password change invalidates the current JWT — re-sign-in to get a fresh session cookie.
    const supabase = createClient();
    await supabase.auth.signInWithPassword({ email: data.email, password });
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

            {/* Password field */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Nuova password</label>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Minimo 8 caratteri"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={toggleShowPass}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPass ? 'Nascondi password' : 'Mostra password'}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Strength checklist — shown once the user starts typing */}
              {password.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {RULES.map((rule) => {
                    const ok = rule.test(password);
                    return (
                      <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                        {ok
                          ? <Check className="h-3 w-3 shrink-0" />
                          : <X className="h-3 w-3 shrink-0" />}
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Confirm field */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Conferma password</label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Ripeti la nuova password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="new-password"
                  className={`pr-10 ${mismatch ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={toggleShowConfirm}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirm ? 'Nascondi conferma' : 'Mostra conferma'}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mismatch && (
                <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                  <X className="h-3 w-3" /> Le password non coincidono
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={!canSubmit}
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
