import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Opportunity, OpportunityTipo } from '@/lib/types';
import RichTextDisplay from '@/components/ui/RichTextDisplay';

const TIPO_LABELS: Record<OpportunityTipo, string> = {
  LAVORO:     'Lavoro',
  FORMAZIONE: 'Formazione',
  STAGE:      'Stage',
  PROGETTO:   'Progetto',
  ALTRO:      'Altro',
};

const TIPO_COLORS: Record<OpportunityTipo, string> = {
  LAVORO:     'bg-green-100 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400',
  FORMAZIONE: 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400',
  STAGE:      'bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400',
  PROGETTO:   'bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400',
  ALTRO:      'bg-muted border-border text-muted-foreground',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export default async function OpportunityDetailPage({
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

  const { data: opp } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .single();

  if (!opp) notFound();

  // Community access check for collaboratori
  if (profile.role === 'collaboratore' && opp.community_ids?.length > 0) {
    const { data: collabRow } = await supabase
      .from('collaborators').select('id').eq('user_id', user.id).maybeSingle();
    if (collabRow?.id) {
      const { data: cc } = await supabase
        .from('collaborator_communities').select('community_id').eq('collaborator_id', collabRow.id);
      const userCommunityIds = (cc ?? []).map((r: { community_id: string }) => r.community_id);
      if (!opp.community_ids.some((cid: string) => userCommunityIds.includes(cid))) notFound();
    } else {
      notFound();
    }
  }

  // Mark associated unread notification as read
  await supabase.from('notifications').update({ read: true })
    .eq('user_id', user.id).eq('entity_type', 'opportunity').eq('entity_id', id).eq('read', false);

  const o = opp as Opportunity;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Link href="/opportunita" className="text-sm text-muted-foreground hover:text-foreground transition">
        ← Torna alle opportunità
      </Link>

      <div className="space-y-2">
        <span className={`inline-block rounded-full border px-3 py-0.5 text-xs font-medium ${TIPO_COLORS[o.tipo as OpportunityTipo] ?? TIPO_COLORS.ALTRO}`}>
          {TIPO_LABELS[o.tipo as OpportunityTipo] ?? o.tipo}
        </span>
        <h1 className="text-2xl font-semibold text-foreground">{o.titolo}</h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Descrizione</h2>
          <RichTextDisplay html={o.descrizione} />
        </div>

        {o.requisiti && (
          <div className="border-t border-border pt-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Requisiti</h2>
            <RichTextDisplay html={o.requisiti} />
          </div>
        )}

        {o.scadenza_candidatura && (
          <div className="border-t border-border pt-3 flex items-center gap-2">
            <span className="text-muted-foreground">📅</span>
            <div>
              <p className="text-xs text-muted-foreground">Scadenza candidatura</p>
              <p className="text-sm text-foreground">{formatDate(o.scadenza_candidatura)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {o.link_candidatura && (
          <a href={o.link_candidatura} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-600 px-4 py-2 text-sm font-medium text-white transition">
            Candidati →
          </a>
        )}
        {o.file_url && (
          <a href={o.file_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted hover:bg-accent px-4 py-2 text-sm text-foreground transition">
            📎 Scarica allegato
          </a>
        )}
      </div>
    </div>
  );
}
