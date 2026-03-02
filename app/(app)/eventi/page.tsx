import { redirect } from 'next/navigation';
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
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default async function EventiPage() {
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

  const { data } = await supabase
    .from('events')
    .select('id, titolo, tipo, start_datetime, end_datetime, location, descrizione')
    .order('start_datetime', { ascending: false, nullsFirst: false });

  const now = new Date();
  const events: ContentEvent[] = (data ?? []) as ContentEvent[];

  const upcoming = events.filter((e) => !e.start_datetime || new Date(e.start_datetime) >= now);
  const past = events.filter((e) => e.start_datetime && new Date(e.start_datetime) < now);

  function EventRow({ ev, isPast }: { ev: ContentEvent; isPast: boolean }) {
    return (
      <Link
        href={`/eventi/${ev.id}`}
        className={`flex items-start gap-4 rounded-xl border p-4 hover:bg-gray-800/50 transition group ${
          isPast ? 'border-gray-800 bg-gray-900/50' : 'border-gray-800 bg-gray-900'
        }`}
      >
        <div className={`flex-shrink-0 w-12 text-center rounded-lg p-1.5 ${isPast ? 'bg-gray-800' : 'bg-blue-950/50 border border-blue-800/40'}`}>
          {ev.start_datetime ? (
            <>
              <p className={`text-lg font-bold leading-none ${isPast ? 'text-gray-500' : 'text-blue-300'}`}>
                {new Date(ev.start_datetime).getDate()}
              </p>
              <p className={`text-xs uppercase ${isPast ? 'text-gray-600' : 'text-blue-400'}`}>
                {new Date(ev.start_datetime).toLocaleString('it-IT', { month: 'short' })}
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-600">—</p>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {ev.tipo && (
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TIPO_COLORS[ev.tipo as EventTipo] ?? TIPO_COLORS.ALTRO}`}>
                {TIPO_LABELS[ev.tipo as EventTipo] ?? ev.tipo}
              </span>
            )}
            <h3 className={`text-sm font-semibold group-hover:text-white transition ${isPast ? 'text-gray-400' : 'text-gray-100'}`}>
              {ev.titolo}
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            {ev.start_datetime && <span>📅 {formatDatetime(ev.start_datetime)}</span>}
            {ev.location && <span>📍 {ev.location}</span>}
          </div>
          {ev.descrizione && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ev.descrizione}</p>
          )}
        </div>
        <span className="flex-shrink-0 text-gray-600 group-hover:text-gray-300 transition text-sm">→</span>
      </Link>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Eventi</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tutti gli eventi della community.</p>
      </div>

      {events.length === 0 && (
        <p className="text-sm text-gray-500 py-8 text-center">Nessun evento in programma.</p>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">In programma</h2>
          {upcoming.map((ev) => <EventRow key={ev.id} ev={ev} isPast={false} />)}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Passati</h2>
          {past.map((ev) => <EventRow key={ev.id} ev={ev} isPast={true} />)}
        </div>
      )}
    </div>
  );
}
