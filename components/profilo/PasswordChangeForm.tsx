'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, useForm, zodResolver } from '@/components/ui/form';
import { profilePasswordSchema, type ProfilePasswordFormValues } from '@/lib/schemas/password';
import { toast } from 'sonner';

export default function PasswordChangeForm() {
  const [saving, setSaving] = useState(false);

  const form = useForm<ProfilePasswordFormValues>({
    resolver: zodResolver(profilePasswordSchema),
    defaultValues: { current: '', password: '', confirm: '' },
  });

  const onSubmit = async (values: ProfilePasswordFormValues) => {
    setSaving(true);
    const res = await fetch('/api/profile/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: values.password }),
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
    await supabase.auth.signInWithPassword({ email: data.email, password: values.password });

    toast.success('Password aggiornata con successo.');
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="current" render={({ field }) => (
          <FormItem>
            <FormLabel>Password attuale</FormLabel>
            <FormControl>
              <Input {...field} type="password" placeholder="Password attuale" autoComplete="current-password" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <FormLabel>Nuova password</FormLabel>
            <FormControl>
              <Input {...field} type="password" placeholder="Minimo 8 caratteri" autoComplete="new-password" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="confirm" render={({ field }) => (
          <FormItem>
            <FormLabel>Conferma password</FormLabel>
            <FormControl>
              <Input {...field} type="password" placeholder="Ripeti la nuova password" autoComplete="new-password" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button
          type="submit"
          disabled={saving || !form.formState.isDirty}
          className="bg-brand hover:bg-brand/90 text-white"
        >
          {saving ? 'Salvataggio...' : 'Aggiorna password'}
        </Button>
      </form>
    </Form>
  );
}
