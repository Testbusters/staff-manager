import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Paperclip } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { Discount } from '@/lib/types';
import CopyButton from '@/components/ui/CopyButton';
import RichTextDisplay from '@/components/ui/RichTextDisplay';
import { ExpiryBadge } from '@/components/ui/content-status-badge';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}


export default async function DiscountDetailPage({
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

  const { data: disc } = await supabase
    .from('discounts')
    .select('*')
    .eq('id', id)
    .single();

  if (!disc) notFound();

  // Community access check for collaboratori
  if (profile.role === 'collaboratore' && disc.community_ids?.length > 0) {
    const { data: collabRow } = await supabase
      .from('collaborators').select('id').eq('user_id', user.id).maybeSingle();
    if (collabRow?.id) {
      const { data: cc } = await supabase
        .from('collaborator_communities').select('community_id').eq('collaborator_id', collabRow.id);
      const userCommunityIds = (cc ?? []).map((r: { community_id: string }) => r.community_id);
      if (!disc.community_ids.some((cid: string) => userCommunityIds.includes(cid))) notFound();
    } else {
      notFound();
    }
  }

  // Mark associated unread notification as read
  await supabase.from('notifications').update({ read: true })
    .eq('user_id', user.id).eq('entity_type', 'discount').eq('entity_id', id).eq('read', false);

  const d = disc as Discount;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Link href="/opportunita?tab=sconti" className="text-sm text-muted-foreground hover:text-foreground transition block mb-2">
        ← Torna agli sconti
      </Link>

      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <ExpiryBadge valid_to={d.valid_to} />
          {d.fornitore && <span className="text-xs text-muted-foreground">{d.fornitore}</span>}
        </div>
        <h1 className="text-xl font-semibold text-foreground">{d.titolo}</h1>
      </div>

      {d.logo_url && (
        <div className="flex items-center justify-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.logo_url} alt={d.fornitore || d.titolo} width={120} height={48} className="h-12 object-contain rounded" />
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        {d.descrizione && (
          <RichTextDisplay html={d.descrizione} />
        )}

        {d.codice_sconto && (
          <div className="border-t border-border pt-3">
            <p className="text-xs text-muted-foreground mb-2">Codice sconto</p>
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-muted border border-border px-3 py-1.5 text-sm font-mono text-foreground">
                {d.codice_sconto}
              </span>
              <CopyButton text={d.codice_sconto} />
            </div>
          </div>
        )}

        {(d.valid_from || d.valid_to) && (
          <div className="border-t border-border pt-3 text-sm text-muted-foreground">
            {d.valid_from && <span>Dal {formatDate(d.valid_from)}</span>}
            {d.valid_from && d.valid_to && <span> · </span>}
            {d.valid_to && <span>Al {formatDate(d.valid_to)}</span>}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {d.link && (
          <a href={d.link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-brand hover:bg-brand/90 px-4 py-2 text-sm font-medium text-white transition">
            Scopri l&apos;offerta →
          </a>
        )}
        {d.file_url && (
          <a href={d.file_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted hover:bg-accent px-4 py-2 text-sm text-foreground transition">
            <Paperclip className="h-3.5 w-3.5 shrink-0" />Scarica allegato
          </a>
        )}
      </div>
    </div>
  );
}
