import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Pin, Paperclip } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { Communication } from '@/lib/types';
import RichTextDisplay from '@/components/ui/RichTextDisplay';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

export default async function CommunicationDetailPage({
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

  const { data: comm } = await supabase
    .from('communications')
    .select('*')
    .eq('id', id)
    .single();

  if (!comm) notFound();

  // Community access check for collaboratori
  if (profile.role === 'collaboratore' && comm.community_ids?.length > 0) {
    const { data: collabRow } = await supabase
      .from('collaborators').select('id').eq('user_id', user.id).maybeSingle();
    if (collabRow?.id) {
      const { data: cc } = await supabase
        .from('collaborator_communities').select('community_id').eq('collaborator_id', collabRow.id);
      const userCommunityIds = (cc ?? []).map((r: { community_id: string }) => r.community_id);
      if (!comm.community_ids.some((cid: string) => userCommunityIds.includes(cid))) notFound();
    } else {
      notFound();
    }
  }

  // Mark associated unread notification as read
  await supabase.from('notifications').update({ read: true })
    .eq('user_id', user.id).eq('entity_type', 'communication').eq('entity_id', id).eq('read', false);

  const c = comm as Communication;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Link href="/comunicazioni" className="text-sm text-muted-foreground hover:text-foreground transition block mb-2">
        ← Torna alle comunicazioni
      </Link>

      <div className="space-y-2">
        {c.pinned && <span className="inline-flex items-center gap-1.5 text-brand text-sm"><Pin className="h-3.5 w-3.5" />In evidenza</span>}
        <h1 className="text-xl font-semibold text-foreground">{c.titolo}</h1>
        <p className="text-sm text-muted-foreground">{formatDate(c.published_at)}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <RichTextDisplay html={c.contenuto} />
      </div>

      {c.file_urls && c.file_urls.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Allegati</h2>
          <div className="flex flex-wrap gap-2">
            {c.file_urls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted hover:bg-accent px-3 py-2 text-sm text-foreground transition"
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0" />Allegato {i + 1}
              </a>
            ))}
          </div>
        </div>
      )}

      {c.expires_at && (
        <p className="text-xs text-muted-foreground">
          Comunicazione valida fino al {new Date(c.expires_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      )}
    </div>
  );
}
