import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Communication, Resource, ResourceCategoria } from '@/lib/types';

type Tab = 'comunicazioni' | 'risorse';

const CATEGORIA_LABELS: Record<ResourceCategoria, string> = {
  GUIDA:     'Guida',
  NORMATIVA: 'Normativa',
  PROCEDURA: 'Procedura',
  MODELLO:   'Modello',
  ALTRO:     'Altro',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

const VALID_CATEGORIA = ['GUIDA', 'NORMATIVA', 'PROCEDURA', 'MODELLO', 'ALTRO'] as const;

export default async function ComunicazioniPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; categoria?: string }>;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active, member_status')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) redirect('/pending');
  if (profile.member_status === 'uscente_senza_compenso') redirect('/documenti');

  // Fetch user's community IDs for content filtering (collaboratori only)
  let userCommunityIds: string[] = [];
  if (profile.role === 'collaboratore') {
    const { data: collabRow } = await supabase
      .from('collaborators')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (collabRow?.id) {
      const { data: cc } = await supabase
        .from('collaborator_communities')
        .select('community_id')
        .eq('collaborator_id', collabRow.id);
      userCommunityIds = (cc ?? []).map((r: { community_id: string }) => r.community_id);
    }
  }

  const params = await searchParams;
  const activeTab: Tab = params.tab === 'risorse' ? 'risorse' : 'comunicazioni';
  const categoriaFilter = VALID_CATEGORIA.includes(params.categoria as ResourceCategoria)
    ? (params.categoria as ResourceCategoria)
    : null;

  const now = new Date().toISOString();

  const allCommunications: Communication[] = activeTab === 'comunicazioni'
    ? ((await supabase
        .from('communications')
        .select('id, titolo, contenuto, pinned, published_at, expires_at, file_urls, community_ids, created_at')
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('pinned', { ascending: false })
        .order('published_at', { ascending: false })
        .then((r) => r.data ?? [])) as Communication[])
    : [];

  const communications = profile.role === 'collaboratore'
    ? allCommunications.filter((c) =>
        c.community_ids.length === 0 || c.community_ids.some((id) => userCommunityIds.includes(id)))
    : allCommunications;

  let resourcesQuery = supabase
    .from('resources')
    .select('id, titolo, descrizione, categoria, tag, link, file_url, community_ids, created_at')
    .order('created_at', { ascending: false });
  if (categoriaFilter) resourcesQuery = resourcesQuery.eq('categoria', categoriaFilter);

  const allResources: Resource[] = activeTab === 'risorse'
    ? ((await resourcesQuery.then((r) => r.data ?? [])) as Resource[])
    : [];

  const resources = profile.role === 'collaboratore'
    ? allResources.filter((r) =>
        r.community_ids.length === 0 || r.community_ids.some((id) => userCommunityIds.includes(id)))
    : allResources;

  const tabCls = (t: Tab) =>
    `whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
      activeTab === t
        ? 'bg-brand text-white'
        : 'bg-muted text-muted-foreground hover:bg-accent'
    }`;

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Comunicazioni e Risorse</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Aggiornamenti dalla community e guide utili.
        </p>
      </div>

      <div className="flex gap-2">
        <Link href="?tab=comunicazioni" className={tabCls('comunicazioni')}>📌 Comunicazioni</Link>
        <Link href="?tab=risorse" className={tabCls('risorse')}>📚 Risorse</Link>
      </div>

      {activeTab === 'comunicazioni' && (
        <div className="space-y-3">
          {communications.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">Nessuna comunicazione.</p>
          )}
          {communications.map((c) => (
            <Link
              key={c.id}
              href={`/comunicazioni/${c.id}`}
              className={`block rounded-xl border p-4 hover:bg-muted/50 transition group ${
                c.pinned ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/20' : 'border-border bg-card'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {c.pinned && <span className="text-blue-400 text-sm flex-shrink-0">📌</span>}
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {c.titolo}
                  </h3>
                </div>
                <span className="flex-shrink-0 text-muted-foreground group-hover:text-foreground text-sm transition">→</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.contenuto}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>{formatDate(c.published_at)}</span>
                {c.file_urls && c.file_urls.length > 0 && (
                  <span>📎 {c.file_urls.length} allegat{c.file_urls.length === 1 ? 'o' : 'i'}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {activeTab === 'risorse' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {([['', 'Tutte'], ...Object.entries(CATEGORIA_LABELS)] as [string, string][]).map(([key, label]) => {
              const active = key === '' ? !categoriaFilter : categoriaFilter === key;
              const href = key === '' ? '?tab=risorse' : `?tab=risorse&categoria=${key}`;
              return (
                <Link key={key || 'all'} href={href}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    active
                      ? 'bg-gray-200 text-gray-900'
                      : 'bg-muted text-muted-foreground border border-border hover:bg-accent'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
          {resources.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">Nessuna risorsa disponibile.</p>
          )}
          {resources.map((r) => (
            <Link
              key={r.id}
              href={`/risorse/${r.id}`}
              className="block rounded-xl border border-border bg-card p-4 hover:bg-muted/50 transition group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="flex-shrink-0 rounded-full bg-muted border border-border px-2 py-0.5 text-xs text-muted-foreground">
                    {CATEGORIA_LABELS[r.categoria as ResourceCategoria] ?? r.categoria}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {r.titolo}
                  </h3>
                </div>
                <span className="flex-shrink-0 text-muted-foreground group-hover:text-foreground text-sm transition">→</span>
              </div>
              {r.descrizione && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.descrizione}</p>
              )}
              {r.tag && r.tag.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {r.tag.slice(0, 3).map((t) => (
                    <span key={t} className="rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">{t}</span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
