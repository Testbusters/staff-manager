'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function PasswordChangeForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('La password deve essere di almeno 8 caratteri.');
      return;
    }
    if (password !== confirm) {
      toast.error('Le password non coincidono.');
      return;
    }

    setSaving(true);
    const res = await fetch('/api/profile/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      toast.error(data.error ?? 'Errore durante il cambio password.');
      return;
    }

    // Re-sign in because password change invalidates the JWT
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    await supabase.auth.signInWithPassword({ email: data.email, password });

    toast.success('Password aggiornata con successo.');
    setPassword('');
    setConfirm('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Nuova password</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimo 8 caratteri"
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Conferma password</label>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Ripeti la nuova password"
          autoComplete="new-password"
        />
      </div>
      <Button
        type="submit"
        disabled={saving || !password || !confirm}
        className="bg-brand hover:bg-brand/90 text-white"
      >
        {saving ? 'Salvataggio...' : 'Aggiorna password'}
      </Button>
    </form>
  );
}
