import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { ContentEvent, EventTipo } from '@/lib/types';

const TIPO_LABELS: Record<EventTipo, string> = {
  WEBINAR:  'Webinar',
  INCONTRO: 'Incontro',
  WORKSHOP: 'Workshop',
  SOCIAL:   'Social',
  ALTRO:    'Altro',
};

const TIPO_COLORS: Record<EventTipo, string> = {
  WEBINAR:  'bg-blue-900/30 border-blue-800 text-blue-400',
  INCONTRO: 'bg-green-900/30 border-green-800 text-green-400',
  WORKSHOP: 'bg-purple-900/30 border-purple-800 text-purple-400',
  SOCIAL:   'bg-pink-900/30 border-pink-800 text-pink-400',
  ALTRO:    'bg-gray-800 border-gray-700 text-gray-400',
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

  const event = ev as ContentEvent;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Link href="/eventi" className="text-sm text-gray-500 hover:text-gray-300 transition">
        ← Torna agli eventi
      </Link>

      <div className="space-y-3">
        {event.tipo && (
          <span className={`inline-block rounded-full border px-3 py-0.5 text-xs font-medium ${TIPO_COLORS[event.tipo as EventTipo] ?? TIPO_COLORS.ALTRO}`}>
            {TIPO_LABELS[event.tipo as EventTipo] ?? event.tipo}
          </span>
        )}
        <h1 className="text-2xl font-semibold text-gray-100">{event.titolo}</h1>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
        {(event.start_datetime || event.end_datetime) && (
          <div className="flex items-start gap-3">
            <span className="text-gray-500 mt-0.5">📅</span>
            <div>
              {event.start_datetime && (
                <p className="text-sm text-gray-200">{formatDatetime(event.start_datetime)}</p>
              )}
              {event.end_datetime && (
                <p className="text-xs text-gray-500 mt-0.5">Fine: {formatDatetime(event.end_datetime)}</p>
              )}
            </div>
          </div>
        )}
        {event.location && (
          <div className="flex items-center gap-3">
            <span className="text-gray-500">📍</span>
            <p className="text-sm text-gray-200">{event.location}</p>
          </div>
        )}
        {event.luma_url && (
          <div className="flex items-center gap-3">
            <span className="text-gray-500">🔗</span>
            <a href={event.luma_url} target="_blank" rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300 underline transition">
              Pagina evento →
            </a>
          </div>
        )}
        {event.file_url && (
          <div className="flex items-center gap-3">
            <span className="text-gray-500">📎</span>
            <a href={event.file_url} target="_blank" rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300 underline transition">
              Scarica allegato →
            </a>
          </div>
        )}
      </div>

      {event.descrizione && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-400">Descrizione</h2>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{event.descrizione}</p>
        </div>
      )}

      {event.luma_embed_url && (
        <div className="rounded-xl overflow-hidden border border-gray-800">
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
