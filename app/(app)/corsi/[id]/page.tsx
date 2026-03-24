import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import CorsoForm from '@/components/corsi/CorsoForm';
import LezioniTab from '@/components/corsi/LezioniTab';
import CandidatureCittaTab from '@/components/corsi/CandidatureCittaTab';
import LezioniTabCollab from '@/components/corsi/LezioniTabCollab';
import LezioniTabRespCitt from '@/components/corsi/LezioniTabRespCitt';
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

  if (!profile?.is_active) redirect('/');

  const { id } = await params;
  const role = profile.role as string;

  const { tab } = await searchParams;
  const activeTab: Tab = tab === 'lezioni' ? 'lezioni'
    : tab === 'candidature_citta' ? 'candidature_citta'
    : 'dettaglio';

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // collaboratore branch
  if (role === 'collaboratore') {
    const { data: collab } = await svc
      .from('collaborators')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!collab) notFound();

    const { data: collabCommunity } = await svc
      .from('collaborator_communities')
      .select('community_id')
      .eq('collaborator_id', collab.id)
      .single();

    const communityId = collabCommunity?.community_id ?? null;

    const [
      { data: blacklistEntry },
      { data: corso },
      { data: lezioni },
    ] = await Promise.all([
      svc.from('blacklist').select('id').eq('collaborator_id', collab.id).maybeSingle(),
      communityId
        ? svc.from('corsi').select('*').eq('id', id).eq('community_id', communityId).maybeSingle()
        : Promise.resolve({ data: null }),
      svc.from('lezioni').select('*').eq('corso_id', id).order('data').order('orario_inizio'),
    ]);

    if (!corso) notFound();

    const stato = getCorsoStato(corso.data_inizio, corso.data_fine) as CorsoStato;
    const lezioniIds = (lezioni ?? []).map((l: { id: string }) => l.id);

    const [
      { data: ownCandidature },
      { data: ownAssegnazioni },
      { data: allAssegnazioni },
      { data: community },
      { data: allegati },
    ] = await Promise.all([
      lezioniIds.length > 0
        ? svc.from('candidature').select('*').eq('collaborator_id', collab.id).in('lezione_id', lezioniIds)
        : Promise.resolve({ data: [] }),
      lezioniIds.length > 0
        ? svc.from('assegnazioni').select('*').eq('collaborator_id', collab.id).in('lezione_id', lezioniIds)
        : Promise.resolve({ data: [] }),
      lezioniIds.length > 0
        ? svc.from('assegnazioni').select('*').in('lezione_id', lezioniIds)
        : Promise.resolve({ data: [] }),
      svc.from('communities').select('name').eq('id', corso.community_id).single(),
      svc.from('allegati_globali').select('id, tipo, file_url, nome_file').eq('community_id', corso.community_id),
    ]);

    return (
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/corsi" className="text-sm text-link hover:text-link/80">← Corsi</Link>
            </div>
            <h1 className="text-xl font-semibold text-foreground">{corso.nome}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-muted-foreground font-mono">{corso.codice_identificativo}</span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATO_BADGE[stato]}`}>
                {CORSO_STATO_LABELS[stato]}
              </span>
              <span className="text-xs text-muted-foreground">
                {corso.modalita === 'online' ? 'Online' : 'In aula'}
                {corso.citta ? ` · ${corso.citta}` : ''}
              </span>
              {community?.name && (
                <span className="text-xs text-muted-foreground">{community.name}</span>
              )}
              {corso.linea && (
                <span className="text-xs text-muted-foreground">Linea: {corso.linea}</span>
              )}
            </div>
          </div>
        </div>

        {/* Link group */}
        {(corso.link_lw || corso.link_zoom || corso.link_telegram_corsisti || corso.link_qa_assignments || corso.link_questionari || corso.link_emergenza) && (
          <div className="flex flex-wrap gap-3 mb-6 text-sm">
            {corso.link_lw && <a href={corso.link_lw} target="_blank" rel="noopener noreferrer" className="text-link hover:text-link/80">LW</a>}
            {corso.link_zoom && <a href={corso.link_zoom} target="_blank" rel="noopener noreferrer" className="text-link hover:text-link/80">Zoom</a>}
            {corso.link_telegram_corsisti && <a href={corso.link_telegram_corsisti} target="_blank" rel="noopener noreferrer" className="text-link hover:text-link/80">Telegram</a>}
            {corso.link_qa_assignments && <a href={corso.link_qa_assignments} target="_blank" rel="noopener noreferrer" className="text-link hover:text-link/80">Q&A Assignments</a>}
            {corso.link_questionari && <a href={corso.link_questionari} target="_blank" rel="noopener noreferrer" className="text-link hover:text-link/80">Questionari</a>}
            {corso.link_emergenza && <a href={corso.link_emergenza} target="_blank" rel="noopener noreferrer" className="text-link hover:text-link/80">Emergenza</a>}
          </div>
        )}

        {/* Allegati docenza / CoCoD'à */}
        {(allegati ?? []).length > 0 && (
          <div className="flex flex-wrap gap-3 mb-6">
            {(allegati ?? []).map((a: { id: string; tipo: string; file_url: string; nome_file: string }) => (
              <a
                key={a.id}
                href={a.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-link hover:bg-muted/60 transition-colors"
              >
                📎 {a.nome_file} ({a.tipo === 'docenza' ? 'Docenza' : "CoCoDà"})
              </a>
            ))}
          </div>
        )}

        <LezioniTabCollab
          lezioni={lezioni ?? []}
          corsoId={id}
          maxDocenti={corso.max_docenti_per_lezione}
          maxQA={corso.max_qa_per_lezione}
          ownCandidature={ownCandidature ?? []}
          ownAssegnazioni={ownAssegnazioni ?? []}
          allAssegnazioni={allAssegnazioni ?? []}
          isBlacklisted={!!blacklistEntry}
        />
      </div>
    );
  }

  // responsabile_cittadino branch
  if (role === 'responsabile_cittadino') {
    const { data: upProfile } = await svc
      .from('user_profiles')
      .select('citta_responsabile')
      .eq('user_id', user.id)
      .single();

    const cittaResp = upProfile?.citta_responsabile ?? null;
    if (!cittaResp) notFound();

    const [{ data: corso }, { data: lezioni }] = await Promise.all([
      svc.from('corsi').select('*').eq('id', id).eq('citta', cittaResp).maybeSingle(),
      svc.from('lezioni').select('*').eq('corso_id', id).order('data').order('orario_inizio'),
    ]);

    if (!corso) notFound();

    const stato = getCorsoStato(corso.data_inizio, corso.data_fine) as CorsoStato;
    const lezioniIds = (lezioni ?? []).map((l: { id: string }) => l.id);

    const { data: candidature } = lezioniIds.length > 0
      ? await svc.from('candidature').select('*').in('lezione_id', lezioniIds).neq('stato', 'ritirata')
      : { data: [] };

    // Fetch collaborator names directly from collaborators table
    const collabIds = [...new Set((candidature ?? []).map((c: { collaborator_id: string | null }) => c.collaborator_id).filter(Boolean) as string[])];
    const collabRows = collabIds.length > 0
      ? (await svc.from('collaborators').select('id, nome, cognome').in('id', collabIds)).data ?? []
      : [];

    const collabMap: Record<string, { nome: string; cognome: string }> = {};
    for (const c of collabRows) {
      collabMap[c.id] = { nome: c.nome ?? '—', cognome: c.cognome ?? '' };
    }

    return (
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/corsi/assegnazione" className="text-sm text-link hover:text-link/80">← Corsi</Link>
            </div>
            <h1 className="text-xl font-semibold text-foreground">{corso.nome}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground font-mono">{corso.codice_identificativo}</span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATO_BADGE[stato]}`}>
                {CORSO_STATO_LABELS[stato]}
              </span>
              <span className="text-xs text-muted-foreground">
                {corso.modalita === 'online' ? 'Online' : 'In aula'} · {corso.citta}
              </span>
            </div>
          </div>
        </div>

        <LezioniTabRespCitt
          lezioni={lezioni ?? []}
          candidature={candidature ?? []}
          collabMap={collabMap}
        />
      </div>
    );
  }

  if (role !== 'amministrazione') redirect('/');

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
