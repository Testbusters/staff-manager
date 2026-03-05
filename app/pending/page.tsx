import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function PendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const handleSignOut = async () => {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800/40 mb-5">
          <span className="text-2xl">⏳</span>
        </div>
        <h1 className="text-lg font-semibold text-foreground mb-2">Account in attesa di attivazione</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Il tuo account è stato creato ma non è ancora stato attivato.
          Contatta il tuo responsabile o l&apos;amministrazione.
        </p>
        <p className="text-xs text-muted-foreground mb-6">Accesso effettuato come: {user.email}</p>
        <form action={handleSignOut}>
          <button type="submit"
            className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground
                       hover:text-foreground hover:border-border transition">
            Esci
          </button>
        </form>
      </div>
    </div>
  );
}
