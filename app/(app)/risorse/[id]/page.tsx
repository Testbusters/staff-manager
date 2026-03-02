import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Resource, ResourceCategoria } from '@/lib/types';

const CATEGORIA_LABELS: Record<ResourceCategoria, string> = {
  GUIDA:     'Guida',
  NORMATIVA: 'Normativa',
  PROCEDURA: 'Procedura',
  MODELLO:   'Modello',
  ALTRO:     'Altro',
};

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: res } = await supabase
    .from('resources')
    .select('*')
    .eq('id', id)
    .single();

  if (!res) notFound();

  const r = res as Resource;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Link href="/comunicazioni?tab=risorse" className="text-sm text-gray-500 hover:text-gray-300 transition">
        ← Torna alle risorse
      </Link>

      <div className="space-y-2">
        <span className="inline-block rounded-full bg-gray-800 border border-gray-700 px-3 py-0.5 text-xs text-gray-400">
          {CATEGORIA_LABELS[r.categoria as ResourceCategoria] ?? r.categoria}
        </span>
        <h1 className="text-2xl font-semibold text-gray-100">{r.titolo}</h1>
      </div>

      {r.descrizione && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{r.descrizione}</p>
        </div>
      )}

      {r.tag && r.tag.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {r.tag.map((t) => (
            <span key={t} className="rounded-full bg-gray-800 border border-gray-700 px-2 py-0.5 text-xs text-gray-400">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {r.link && (
          <a href={r.link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-600 px-4 py-2 text-sm font-medium text-white transition">
            🔗 Apri link
          </a>
        )}
        {r.file_url && (
          <a href={r.file_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm text-gray-200 transition">
            📎 Scarica file
          </a>
        )}
      </div>
    </div>
  );
}
