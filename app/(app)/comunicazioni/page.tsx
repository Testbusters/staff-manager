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

export default async function ComunicazioniPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
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

  const { tab } = await searchParams;
  const activeTab: Tab = tab === 'risorse' ? 'risorse' : 'comunicazioni';

  const now = new Date().toISOString();

  const communications: Communication[] = activeTab === 'comunicazioni'
    ? ((await supabase
        .from('communications')
        .select('id, titolo, contenuto, pinned, published_at, expires_at, file_urls, community_id, created_at')
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('pinned', { ascending: false })
        .order('published_at', { ascending: false })
        .then((r) => r.data ?? [])) as Communication[])
    : [];

  const resources: Resource[] = activeTab === 'risorse'
    ? ((await supabase
        .from('resources')
        .select('id, titolo, descrizione, categoria, tag, link, file_url, community_id, created_at')
        .order('created_at', { ascending: false })
        .then((r) => r.data ?? [])) as Resource[])
    : [];

  const tabCls = (t: Tab) =>
    `whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
      activeTab === t
        ? 'bg-blue-600 text-white'
        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
    }`;

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Comunicazioni e Risorse</h1>
        <p className="text-sm text-gray-500 mt-0.5">
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
            <p className="text-sm text-gray-500 py-8 text-center">Nessuna comunicazione.</p>
          )}
          {communications.map((c) => (
            <Link
              key={c.id}
              href={`/comunicazioni/${c.id}`}
              className={`block rounded-xl border p-4 hover:bg-gray-800/50 transition group ${
                c.pinned ? 'border-blue-700 bg-blue-950/20' : 'border-gray-800 bg-gray-900'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {c.pinned && <span className="text-blue-400 text-sm flex-shrink-0">📌</span>}
                  <h3 className="text-sm font-semibold text-gray-100 group-hover:text-white truncate transition">
                    {c.titolo}
                  </h3>
                </div>
                <span className="flex-shrink-0 text-gray-600 group-hover:text-gray-300 text-sm transition">→</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.contenuto}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
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
          {resources.length === 0 && (
            <p className="text-sm text-gray-500 py-8 text-center">Nessuna risorsa disponibile.</p>
          )}
          {resources.map((r) => (
            <Link
              key={r.id}
              href={`/risorse/${r.id}`}
              className="block rounded-xl border border-gray-800 bg-gray-900 p-4 hover:bg-gray-800/50 transition group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="flex-shrink-0 rounded-full bg-gray-800 border border-gray-700 px-2 py-0.5 text-xs text-gray-400">
                    {CATEGORIA_LABELS[r.categoria as ResourceCategoria] ?? r.categoria}
                  </span>
                  <h3 className="text-sm font-semibold text-gray-100 group-hover:text-white truncate transition">
                    {r.titolo}
                  </h3>
                </div>
                <span className="flex-shrink-0 text-gray-600 group-hover:text-gray-300 text-sm transition">→</span>
              </div>
              {r.descrizione && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.descrizione}</p>
              )}
              {r.tag && r.tag.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {r.tag.slice(0, 3).map((t) => (
                    <span key={t} className="rounded-full bg-gray-800/60 px-2 py-0.5 text-xs text-gray-500">{t}</span>
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
