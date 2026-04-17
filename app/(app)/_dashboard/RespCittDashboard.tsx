import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import DashboardUpdates from '@/components/compensation/DashboardUpdates';
import type { DashboardEventItem, DashboardCommItem, DashboardOppItem } from '@/components/compensation/DashboardUpdates';
import { sectionCls } from './shared';

export default async function RespCittDashboard({ userId }: { userId: string }) {
  const supabase = await createClient();
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [{ data: rcProfile }, { data: ownCollab }] = await Promise.all([
    svc.from('user_profiles').select('citta_responsabile').eq('user_id', userId).single(),
    svc.from('collaborators').select('nome, cognome, foto_profilo_url').eq('user_id', userId).maybeSingle(),
  ]);

  const cittaResp = rcProfile?.citta_responsabile as string | null;
  const nowIsoRc = new Date().toISOString();

  const [
    { data: mieiCorsi },
    { data: ownCandidature },
    { data: rcEvents },
    { data: rcComms },
    { data: rcResources },
    { data: rcOpps },
    { data: rcDiscounts },
    { data: rcUnreadNotifs },
  ] = await Promise.all([
    cittaResp
      ? svc.from('corsi').select('id').eq('citta', cittaResp)
      : Promise.resolve({ data: [] as { id: string }[] }),
    svc.from('candidature').select('id, corso_id, stato').eq('city_user_id', userId).eq('tipo', 'citta_corso').neq('stato', 'ritirata'),
    svc.from('events').select('id, titolo, start_datetime, tipo, community_ids').order('start_datetime', { ascending: true, nullsFirst: false }).limit(10),
    svc.from('communications').select('id, titolo, published_at, community_ids').or(`expires_at.is.null,expires_at.gt.${nowIsoRc}`).order('published_at', { ascending: false }).limit(10),
    svc.from('resources').select('id, titolo, created_at, categoria, community_ids').order('created_at', { ascending: false }).limit(10),
    svc.from('opportunities').select('id, titolo, created_at, tipo, community_ids').order('created_at', { ascending: false }).limit(10),
    svc.from('discounts').select('id, titolo, valid_to, fornitore, created_at, community_ids').order('created_at', { ascending: false }).limit(10),
    supabase.from('notifications').select('entity_type').eq('read', false).in('entity_type', ['event', 'communication', 'opportunity', 'discount']),
  ]);

  const corsiIds = (mieiCorsi ?? []).map((c: { id: string }) => c.id);

  let pendingCandidatureCount = 0;
  if (corsiIds.length > 0) {
    const { data: lezioni } = await svc.from('lezioni').select('id').in('corso_id', corsiIds);
    const lezioniIds = (lezioni ?? []).map((l: { id: string }) => l.id);
    if (lezioniIds.length > 0) {
      const { count } = await svc.from('candidature')
        .select('id', { count: 'exact', head: true })
        .in('lezione_id', lezioniIds)
        .eq('stato', 'in_attesa');
      pendingCandidatureCount = count ?? 0;
    }
  }

  const nome = ownCollab?.nome ?? 'Responsabile';
  const corsiCount = (mieiCorsi ?? []).length;
  const candidatureSottomesseCount = (ownCandidature ?? []).length;

  // Content updates
  type RcEventRaw = { id: string; titolo: string; start_datetime: string | null; tipo: string | null; community_ids: string[] };
  type RcCommRaw = { id: string; titolo: string; published_at: string; community_ids: string[] };
  type RcResRaw = { id: string; titolo: string; created_at: string; categoria: string; community_ids: string[] };
  type RcOppRaw = { id: string; titolo: string; created_at: string; tipo: string; community_ids: string[] };
  type RcDiscRaw = { id: string; titolo: string; valid_to: string | null; fornitore: string; created_at: string; community_ids: string[] };

  const rcEventItems: DashboardEventItem[] = ((rcEvents ?? []) as RcEventRaw[])
    .slice(0, 4)
    .map((e) => ({ id: e.id, titolo: e.titolo, start_datetime: e.start_datetime, tipo: e.tipo as DashboardEventItem['tipo'] }));

  const rcCommItems: DashboardCommItem[] = [
    ...((rcComms ?? []) as RcCommRaw[]).map((c) => ({ id: c.id, titolo: c.titolo, date: c.published_at, kind: 'comm' as const })),
    ...((rcResources ?? []) as RcResRaw[]).map((r) => ({ id: r.id, titolo: r.titolo, date: r.created_at, categoria: r.categoria as DashboardCommItem['categoria'], kind: 'resource' as const })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  const rcOppItems: DashboardOppItem[] = [
    ...((rcOpps ?? []) as RcOppRaw[]).map((o) => ({ id: o.id, titolo: o.titolo, date: o.created_at, tipo: o.tipo, kind: 'opp' as const })),
    ...((rcDiscounts ?? []) as RcDiscRaw[]).map((d) => ({ id: d.id, titolo: d.titolo, date: d.created_at, tipo: d.fornitore, kind: 'discount' as const })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  type RcUnread = { entity_type: string };
  const rcUnread = (rcUnreadNotifs ?? []) as RcUnread[];
  const rcUnreadCounts = {
    events: rcUnread.filter((n) => n.entity_type === 'event').length,
    communicationsResources: rcUnread.filter((n) => n.entity_type === 'communication').length,
    opportunitiesDiscounts: rcUnread.filter((n) => ['opportunity', 'discount'].includes(n.entity_type)).length,
  };

  return (
    <div className="p-6 space-y-8">
      {/* Hero */}
      <div className="flex items-center gap-4">
        {ownCollab?.foto_profilo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ownCollab.foto_profilo_url} alt="avatar" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="h-12 w-12 rounded-full bg-brand/20 flex items-center justify-center text-brand font-semibold text-lg">
            {nome.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Ciao, {ownCollab?.nome ?? 'Responsabile'}!
          </h1>
          <p className="text-sm text-muted-foreground">
            {cittaResp ? `Responsabile cittadino · ${cittaResp}` : 'Responsabile cittadino · città non configurata'}
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`${sectionCls} p-4`}>
          <p className="text-xs text-muted-foreground mb-1">I miei corsi</p>
          <p className="text-2xl font-semibold text-foreground">{corsiCount}</p>
          <p className="text-xs text-muted-foreground mt-1">{cittaResp ?? '—'}</p>
        </div>
        <div className={`${sectionCls} p-4`}>
          <p className="text-xs text-muted-foreground mb-1">Candidature da approvare</p>
          <p className="text-2xl font-semibold text-foreground">{pendingCandidatureCount}</p>
          <p className="text-xs text-muted-foreground mt-1">docente / Q&A in attesa</p>
        </div>
        <div className={`${sectionCls} p-4`}>
          <p className="text-xs text-muted-foreground mb-1">Candidature inviate</p>
          <p className="text-2xl font-semibold text-foreground">{candidatureSottomesseCount}</p>
          <p className="text-xs text-muted-foreground mt-1">corsi senza città</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className={`${sectionCls} p-4`}>
        <p className="text-sm font-medium text-foreground mb-3">Azioni rapide</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/corsi/assegnazione" className="inline-flex items-center gap-2 rounded-lg bg-brand hover:bg-brand/90 text-white text-sm px-4 py-2 transition">
            Candidatura e Assegnazione
          </Link>
          <Link href="/corsi/valutazioni" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card hover:bg-muted/60 text-foreground text-sm px-4 py-2 transition">
            Valutazione Corsi
          </Link>
        </div>
      </div>

      {/* Ultimi aggiornamenti */}
      <DashboardUpdates
        documents={[]}
        events={rcEventItems}
        comunicazioni={rcCommItems}
        opportunita={rcOppItems}
        unreadCounts={rcUnreadCounts}
      />
    </div>
  );
}
