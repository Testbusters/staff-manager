import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Resource, ResourceCategoria } from '@/lib/types';
import RichTextDisplay from '@/components/ui/RichTextDisplay';

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

  // Community access check for collaboratori
  if (profile.role === 'collaboratore' && res.community_ids?.length > 0) {
    const { data: collabRow } = await supabase
      .from('collaborators').select('id').eq('user_id', user.id).maybeSingle();
    if (collabRow?.id) {
      const { data: cc } = await supabase
        .from('collaborator_communities').select('community_id').eq('collaborator_id', collabRow.id);
      const userCommunityIds = (cc ?? []).map((r2: { community_id: string }) => r2.community_id);
      if (!res.community_ids.some((cid: string) => userCommunityIds.includes(cid))) notFound();
    } else {
      notFound();
    }
  }

  const r = res as Resource;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Link href="/comunicazioni?tab=risorse" className="text-sm text-muted-foreground hover:text-foreground transition">
        ← Torna alle risorse
      </Link>

      <div className="space-y-2">
        <span className="inline-block rounded-full bg-muted border border-border px-3 py-0.5 text-xs text-muted-foreground">
          {CATEGORIA_LABELS[r.categoria as ResourceCategoria] ?? r.categoria}
        </span>
        <h1 className="text-2xl font-semibold text-foreground">{r.titolo}</h1>
      </div>

      {r.descrizione && (
        <div className="rounded-xl border border-border bg-card p-5">
          <RichTextDisplay html={r.descrizione} />
        </div>
      )}

      {r.tag && r.tag.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {r.tag.map((t) => (
            <span key={t} className="rounded-full bg-muted border border-border px-2 py-0.5 text-xs text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {r.link && (
          <a href={r.link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-brand hover:bg-brand/90 px-4 py-2 text-sm font-medium text-white transition">
            🔗 Apri link
          </a>
        )}
        {r.file_url && (
          <a href={r.file_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted hover:bg-accent px-4 py-2 text-sm text-foreground transition">
            📎 Scarica file
          </a>
        )}
      </div>
    </div>
  );
}
