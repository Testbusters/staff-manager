import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import CorsoForm from '@/components/corsi/CorsoForm';

export default async function NuovoCorsoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active || profile.role !== 'amministrazione') redirect('/');

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [{ data: communities }, { data: citta }, { data: materie }] = await Promise.all([
    svc.from('communities').select('id, name').eq('is_active', true).order('name'),
    svc.from('lookup_options').select('nome').eq('type', 'citta').order('sort_order'),
    svc.from('lookup_options').select('nome').eq('type', 'materia').order('sort_order'),
  ]);

  // Deduplicate across communities
  const cittaList = [...new Set((citta ?? []).map((c: { nome: string }) => c.nome))];
  const materieList = [...new Set((materie ?? []).map((m: { nome: string }) => m.nome))];

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Nuovo corso</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Compila i campi per creare un nuovo corso.
        </p>
      </div>
      <CorsoForm
        mode="create"
        communities={communities as { id: string; name: string }[]}
        cittaList={cittaList}
        materieList={materieList}
      />
    </div>
  );
}
