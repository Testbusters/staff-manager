import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import CorsoForm from '@/components/corsi/CorsoForm';
import LezioniTab from '@/components/corsi/LezioniTab';
import CandidatureCittaTab from '@/components/corsi/CandidatureCittaTab';
import { getCorsoStato } from '@/lib/corsi-utils';
import { CORSO_STATO_LABELS } from '@/lib/types';
import type { CorsoStato } from '@/lib/types';

type Tab = 'dettaglio' | 'lezioni' | 'candidature_citta';

const STATO_BADGE: Record<CorsoStato, string> = {
  programmato: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  attivo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  concluso: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default async function CorsoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active || profile.role !== 'amministrazione') redirect('/');

  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab: Tab = tab === 'lezioni' ? 'lezioni'
    : tab === 'candidature_citta' ? 'candidature_citta'
    : 'dettaglio';

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: corso, error } = await svc
    .from('corsi')
    .select('*, community:communities(id, name)')
    .eq('id', id)
    .single();

  if (error || !corso) notFound();

  const stato = getCorsoStato(corso.data_inizio, corso.data_fine) as CorsoStato;

  const [{ data: lezioni }, { data: citta }, { data: materie }, { data: communities }] =
    await Promise.all([
      svc.from('lezioni').select('*').eq('corso_id', id).order('data').order('orario_inizio'),
      svc.from('lookup_options').select('nome').eq('type', 'citta').order('sort_order'),
      svc.from('lookup_options').select('nome').eq('type', 'materia').order('sort_order'),
      svc.from('communities').select('id, name').eq('is_active', true).order('name'),
    ]);

  const cittaList = [...new Set((citta ?? []).map((c: { nome: string }) => c.nome))];
  const materieList = [...new Set((materie ?? []).map((m: { nome: string }) => m.nome))];

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ${
      activeTab === t
        ? 'bg-brand text-white'
        : 'bg-muted text-muted-foreground hover:bg-accent'
    }`;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/corsi" className="text-sm text-link hover:text-link/80">← Corsi</Link>
          </div>
          <h1 className="text-xl font-semibold text-foreground">{corso.nome}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground font-mono">{corso.codice_identificativo}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATO_BADGE[stato]}`}>
              {CORSO_STATO_LABELS[stato]}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 mt-4">
        <Link href={`/corsi/${id}?tab=dettaglio`} className={tabCls('dettaglio')}>Dettaglio</Link>
        <Link href={`/corsi/${id}?tab=lezioni`} className={tabCls('lezioni')}>
          Lezioni ({lezioni?.length ?? 0})
        </Link>
        {corso.citta === null && (
          <Link href={`/corsi/${id}?tab=candidature_citta`} className={tabCls('candidature_citta')}>
            Candidature città
          </Link>
        )}
      </div>

      {activeTab === 'dettaglio' && (
        <div className="max-w-3xl">
          <CorsoForm
            mode="edit"
            initialData={{ ...corso, stato }}
            communities={communities as { id: string; name: string }[]}
            cittaList={cittaList}
            materieList={materieList}
          />
        </div>
      )}

      {activeTab === 'lezioni' && (
        <LezioniTab
          corsoId={id}
          initialLezioni={lezioni ?? []}
          materieList={materieList}
        />
      )}

      {activeTab === 'candidature_citta' && corso.citta === null && (
        <CandidatureCittaTab
          corsoId={id}
          cittaList={cittaList}
        />
      )}
    </div>
  );
}
