'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, useForm, zodResolver } from '@/components/ui/form';
import { loginSchema, type LoginFormValues } from '@/lib/schemas/auth';
import AppLogo from '@/components/ui/AppLogo';

const TEST_USERS = [
  { role: 'Collab. TB',                       email: 'collaboratore_tb_test@test.com' },
  { role: 'Collab. P4M',                      email: 'collaboratore_p4m_test@test.com' },
  { role: 'Resp. Cittadino',                  email: 'responsabile_cittadino_test@test.com' },
  { role: 'Resp. Compensi',                   email: 'responsabile_compensi_test@test.com' },
  { role: 'Resp. Servizi Ind.',               email: 'responsabile_servizi_individuali_test@test.com' },
  { role: 'Admin',                            email: 'admin_test@test.com' },
] as const;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const supabase = createClient();
  const { setTheme } = useTheme();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Login page is always dark — override any stored preference
  useEffect(() => {
    setTheme('dark');
  }, [setTheme]);

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
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
    <>
      {/* Centered login block — test credentials excluded from flex flow */}
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4 pb-24">
        <div className="w-full max-w-sm">
          {/* Logo / Title */}
          <div className="text-center mb-8">
            <AppLogo className="w-14 h-14 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-foreground">Staff Manager</h1>
            <p className="text-sm text-muted-foreground mt-1">Accedi alla tua area personale</p>
          </div>

          <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="nome@email.com"
                        disabled={loading}
                        autoComplete="email"
                      />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          {...field}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          disabled={loading}
                          autoComplete="current-password"
                          className="pr-10"
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition"
                        aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormItem>
                )} />

                {error && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2.5 text-xs text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !form.watch('email') || !form.watch('password')}
                  className="w-full bg-brand hover:bg-brand/90 text-white"
                >
                  {loading ? <>{spinner} Accesso in corso…</> : 'Accedi'}
                </Button>
              </form>
            </Form>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Per problemi di accesso contatta l&apos;amministrazione.
          </p>
        </div>
      </div>

      {/* Test credentials — local dev + staging only, hidden on production */}
      {process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production' && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 space-y-2">
        <p className="text-center text-xs text-muted-foreground">Utenze di test</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TEST_USERS.map((u) => (
            <button
              key={u.email}
              type="button"
              onClick={() => {
                form.setValue('email', u.email);
                form.setValue('password', 'Testbusters123');
              }}
              className="rounded-lg bg-background border border-border px-2 py-2.5 text-left hover:border-muted-foreground/30 hover:bg-muted/60 transition"
            >
              <p className="text-xs font-medium text-muted-foreground">{u.role}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
            </button>
          ))}
        </div>
      </div>}
    </>
  );
}
