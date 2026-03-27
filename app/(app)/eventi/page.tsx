import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/ui/empty-state';
import type { ContentEvent, EventTipo } from '@/lib/types';

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
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

const PAGE_SIZE = 20;

function PaginationNav({ page, totalPages, makeUrl }: {
  page: number; totalPages: number; makeUrl: (p: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t border-border">
      <span className="text-xs text-muted-foreground">Pagina {page} di {totalPages}</span>
      <div className="flex gap-2">
        {page > 1
          ? <a href={makeUrl(page - 1)} className="rounded-lg border border-border bg-muted hover:bg-accent px-3 py-1.5 text-xs text-foreground transition" aria-label="Pagina precedente">← Precedente</a>
          : <span className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground/40 select-none">← Precedente</span>
        }
        {page < totalPages
          ? <a href={makeUrl(page + 1)} className="rounded-lg border border-border bg-muted hover:bg-accent px-3 py-1.5 text-xs text-foreground transition" aria-label="Pagina successiva">Successivo →</a>
          : <span className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground/40 select-none">Successivo →</span>
        }
      </div>
    </div>
  );
}

export default async function EventiPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
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

  // Fetch user's community IDs and citta for content filtering (collaboratori only)
  let userCommunityIds: string[] = [];
  let collabCitta: string | null = null;
  if (profile.role === 'collaboratore') {
    const { data: collabRow } = await supabase
      .from('collaborators')
      .select('id, citta')
      .eq('user_id', user.id)
      .maybeSingle();
    if (collabRow?.id) {
      collabCitta = collabRow.citta ?? null;
      const { data: cc } = await supabase
        .from('collaborator_communities')
        .select('community_id')
        .eq('collaborator_id', collabRow.id);
      userCommunityIds = (cc ?? []).map((r: { community_id: string }) => r.community_id);
    }
  }

  const { data } = await supabase
    .from('events')
    .select('id, titolo, tipo, start_datetime, end_datetime, location, descrizione, community_ids, citta')
    .order('start_datetime', { ascending: false, nullsFirst: false });

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1'));

  const now = new Date();
  const allEvents: ContentEvent[] = (data ?? []) as ContentEvent[];
  const events = profile.role === 'collaboratore'
    ? allEvents.filter((e) => {
        const communityMatch = e.community_ids.length === 0 || e.community_ids.some((id) => userCommunityIds.includes(id));
        if (!communityMatch) return false;
        // City events: only show if collab citta matches; national events (citta null) always shown
        if (e.citta !== null && e.citta !== collabCitta) return false;
        return true;
      })
    : allEvents;

  const upcoming = events.filter((e) => !e.start_datetime || new Date(e.start_datetime) >= now);
  const past = events.filter((e) => e.start_datetime && new Date(e.start_datetime) < now);

  // Paginate combined list (upcoming first, then past)
  const allSorted = [...upcoming, ...past];
  const totalPages = Math.ceil(allSorted.length / PAGE_SIZE);
  const pageItems = allSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageUpcoming = pageItems.filter((e) => !e.start_datetime || new Date(e.start_datetime) >= now);
  const pagePast = pageItems.filter((e) => e.start_datetime && new Date(e.start_datetime) < now);

  function EventRow({ ev, isPast }: { ev: ContentEvent; isPast: boolean }) {
    return (
      <Link
        href={`/eventi/${ev.id}`}
        className={`flex items-start gap-4 rounded-xl border p-4 hover:bg-muted/60 transition group ${
          isPast ? 'border-border bg-card/50' : 'border-border bg-card'
        }`}
      >
        <div className={`flex-shrink-0 w-12 text-center rounded-lg p-1.5 ${isPast ? 'bg-muted' : 'bg-brand/10 border border-brand/20'}`}>
          {ev.start_datetime ? (
            <>
              <p className={`text-lg font-bold leading-none ${isPast ? 'text-muted-foreground' : 'text-brand'}`}>
                {new Date(ev.start_datetime).getDate()}
              </p>
              <p className={`text-xs uppercase ${isPast ? 'text-muted-foreground' : 'text-brand/80'}`}>
                {new Date(ev.start_datetime).toLocaleString('it-IT', { month: 'short' })}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">—</p>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {ev.tipo && (
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TIPO_COLORS[ev.tipo as EventTipo] ?? TIPO_COLORS.Altro}`}>
                {TIPO_LABELS[ev.tipo as EventTipo] ?? ev.tipo}
              </span>
            )}
            {ev.citta && (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                📍 {ev.citta}
              </span>
            )}
            <h3 className={`text-sm font-semibold ${isPast ? 'text-muted-foreground' : 'text-foreground'}`}>
              {ev.titolo}
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {ev.start_datetime && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 shrink-0" />{formatDatetime(ev.start_datetime)}</span>}
            {ev.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" />{ev.location}</span>}
          </div>
          {ev.descrizione && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{stripHtml(ev.descrizione)}</p>
          )}
        </div>
        <span className="flex-shrink-0 text-muted-foreground group-hover:text-foreground transition text-sm">→</span>
      </Link>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Eventi</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Tutti gli eventi della community.</p>
      </div>

      {events.length === 0 && (
        <EmptyState icon={CalendarDays} title="Nessun evento in programma" description="Non ci sono eventi pubblicati al momento." />
      )}

      {pageUpcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">In programma</h2>
          {pageUpcoming.map((ev) => <EventRow key={ev.id} ev={ev} isPast={false} />)}
        </div>
      )}

      {pagePast.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Passati</h2>
          {pagePast.map((ev) => <EventRow key={ev.id} ev={ev} isPast={true} />)}
        </div>
      )}

      <PaginationNav page={page} totalPages={totalPages} makeUrl={(p) => `?page=${p}`} />
    </div>
  );
}
