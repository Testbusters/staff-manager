import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, MapPin, ExternalLink, Paperclip } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { ContentEvent, EventTipo } from '@/lib/types';
import RichTextDisplay from '@/components/ui/RichTextDisplay';

function buildGCalUrl(event: ContentEvent): string | null {
  if (!event.start_datetime) return null;
  const fmt = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d+/, '');
  const start = fmt(event.start_datetime);
  const end = event.end_datetime
    ? fmt(event.end_datetime)
    : fmt(new Date(new Date(event.start_datetime).getTime() + 3_600_000).toISOString());
  const params = new URLSearchParams({ action: 'TEMPLATE', text: event.titolo, dates: `${start}/${end}` });
  if (event.descrizione) params.set('details', event.descrizione);
  if (event.location)    params.set('location', event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildMapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

const TIPO_LABELS: Record<EventTipo, string> = {
  Convention:       'Convention',
  Attivita_interna: 'Attività interna',
  Workshop:         'Workshop',
  Formazione:       'Formazione',
  Altro:            'Altro',
};

const TIPO_COLORS: Record<EventTipo, string> = {
  Convention:       'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400',
  Attivita_interna: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400',
  Workshop:         'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400',
  Formazione:       'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400',
  Altro:            'bg-muted border-border text-muted-foreground',
};

function formatDatetime(iso: string) {
  return new Date(iso).toLocaleString('it-IT', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default async function EventDetailPage({
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

  const { data: ev } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (!ev) notFound();

  // Community access check for collaboratori
  if (profile.role === 'collaboratore' && ev.community_ids?.length > 0) {
    const { data: collabRow } = await supabase
      .from('collaborators').select('id').eq('user_id', user.id).maybeSingle();
    if (collabRow?.id) {
      const { data: cc } = await supabase
        .from('collaborator_communities').select('community_id').eq('collaborator_id', collabRow.id);
      const userCommunityIds = (cc ?? []).map((r: { community_id: string }) => r.community_id);
      if (!ev.community_ids.some((cid: string) => userCommunityIds.includes(cid))) notFound();
    } else {
      notFound();
    }
  }

  // Mark associated unread notification as read
  await supabase.from('notifications').update({ read: true })
    .eq('user_id', user.id).eq('entity_type', 'event').eq('entity_id', id).eq('read', false);

  const event = ev as ContentEvent;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Link href="/eventi" className="text-sm text-link hover:text-link/80 transition block mb-2">
        ← Torna agli eventi
      </Link>

      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {event.tipo && (
            <span className={`inline-block rounded-full border px-3 py-0.5 text-xs font-medium ${TIPO_COLORS[event.tipo as EventTipo] ?? TIPO_COLORS.Altro}`}>
              {TIPO_LABELS[event.tipo as EventTipo] ?? event.tipo}
            </span>
          )}
          {event.citta && (
            <span className="inline-block rounded-full border border-border bg-muted px-3 py-0.5 text-xs font-medium text-muted-foreground">
              📍 {event.citta}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-semibold text-foreground">{event.titolo}</h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        {(event.start_datetime || event.end_datetime) && (
          <div className="flex items-start gap-3">
            <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              {event.start_datetime && (
                <p className="text-sm text-foreground">{formatDatetime(event.start_datetime)}</p>
              )}
              {event.end_datetime && (
                <p className="text-xs text-muted-foreground mt-0.5">Fine: {formatDatetime(event.end_datetime)}</p>
              )}
            </div>
          </div>
        )}
        {event.location && (
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-3">
              <p className="text-sm text-foreground">{event.location}</p>
              <a
                href={buildMapsUrl(event.location)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-link hover:text-link/80 transition"
              >
                Vedi su Maps →
              </a>
            </div>
          </div>
        )}
        {event.luma_url && (
          <div className="flex items-center gap-3">
            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
            <a href={event.luma_url} target="_blank" rel="noopener noreferrer"
              className="text-sm text-link hover:text-link/80 underline transition">
              Pagina evento →
            </a>
          </div>
        )}
        {event.file_url && (
          <div className="flex items-center gap-3">
            <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
            <a href={event.file_url} target="_blank" rel="noopener noreferrer"
              className="text-sm text-link hover:text-link/80 underline transition">
              Scarica allegato →
            </a>
          </div>
        )}
      </div>

      {(() => { const gcalUrl = buildGCalUrl(event); return gcalUrl ? (
        <div>
          <a
            href={gcalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted hover:bg-accent px-4 py-3 text-sm text-foreground transition"
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />Aggiungi a Google Calendar
          </a>
        </div>
      ) : null; })()}

      {event.descrizione && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Descrizione</h2>
          <RichTextDisplay html={event.descrizione} />
        </div>
      )}

      {event.luma_embed_url && (
        <div className="rounded-xl overflow-hidden border border-border">
          <iframe
            src={event.luma_embed_url}
            className="w-full h-80 border-0"
            title={event.titolo}
            loading="lazy"
            allow="fullscreen"
          />
        </div>
      )}
    </div>
  );
}
