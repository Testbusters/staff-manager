import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { ROLE_LABELS } from '@/lib/types';
import type { Role } from '@/lib/types';
import PaymentOverview from '@/components/compensation/PaymentOverview';
import DashboardBarChart from '@/components/compensation/DashboardBarChart';
import DashboardUpdates from '@/components/compensation/DashboardUpdates';
import type { DashboardDocItem, DashboardEventItem, DashboardCommItem, DashboardOppItem } from '@/components/compensation/DashboardUpdates';
import CollabOpenTicketsSection from '@/components/ticket/CollabOpenTicketsSection';
import DashboardCorsiKpi from '@/components/corsi/DashboardCorsiKpi';
import { AlertTriangle, CalendarDays } from 'lucide-react';
import {
  ACTIVE_STATES, sectionCls, eur, compAmount,
  groupCompByYear, groupExpByYear, buildBarData, contentVisible,
  type CompRow, type ExpRow,
} from './shared';

export default async function CollabDashboard({ userId, role }: { userId: string; role: string }) {
  const supabase = await createClient();

  // Fetch collaborator record
  const { data: collaborator } = await supabase
    .from('collaborators')
    .select('id, nome, cognome, iban, codice_fiscale, importo_lordo_massimale, approved_lordo_ytd, approved_year, foto_profilo_url, data_ingresso, materie_insegnate, citta')
    .eq('user_id', userId)
    .single();

  // Parallel main fetches
  const docsQuery = collaborator
    ? supabase.from('documents')
        .select('id, titolo, tipo, created_at')
        .eq('collaborator_id', collaborator.id)
        .eq('stato_firma', 'DA_FIRMARE')
        .order('created_at', { ascending: false })
    : Promise.resolve({ data: null as DashboardDocItem[] | null, error: null });

  const collabCommsQuery = collaborator?.id
    ? supabase.from('collaborator_communities').select('community_id').eq('collaborator_id', collaborator.id)
    : Promise.resolve({ data: null as { community_id: string }[] | null, error: null });

  const nowIso = new Date().toISOString();

  const [
    { data: compensations },
    { data: expenses },
    { data: docsToSign },
    { data: allTickets },
    { data: dashEvents },
    { data: dashComms },
    { data: dashResources },
    { data: dashOpps },
    { data: dashDiscounts },
    { data: unreadNotifs },
    { data: collabComms },
  ] = await Promise.all([
    supabase.from('compensations').select('id, stato, importo_netto, importo_lordo, liquidated_at'),
    supabase.from('expense_reimbursements').select('id, stato, importo, liquidated_at'),
    docsQuery,
    supabase.from('tickets').select('id, oggetto, stato, priority').eq('creator_user_id', userId),
    supabase.from('events')
      .select('id, titolo, start_datetime, tipo, community_ids, citta')
      .order('start_datetime', { ascending: true, nullsFirst: false })
      .limit(20),
    supabase.from('communications')
      .select('id, titolo, published_at, community_ids')
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('published_at', { ascending: false })
      .limit(20),
    supabase.from('resources')
      .select('id, titolo, created_at, categoria, community_ids')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('opportunities')
      .select('id, titolo, created_at, tipo, community_ids')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('discounts')
      .select('id, titolo, valid_to, fornitore, created_at, community_ids')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('notifications')
      .select('entity_type')
      .eq('read', false)
      .in('entity_type', ['event', 'communication', 'opportunity', 'discount']),
    collabCommsQuery,
  ]);
  const userCommunityIds: string[] = (collabComms ?? []).map((r: { community_id: string }) => r.community_id);

  // Open tickets + messages
  const openTickets = (allTickets ?? []).filter((t: { id: string; oggetto: string; stato: string; priority: string }) => t.stato !== 'CHIUSO');
  const openTicketIds = openTickets.map((t: { id: string }) => t.id);

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  type MsgRow = { id: string; ticket_id: string; author_user_id: string; created_at: string };

  const { data: ticketMsgs } = await (
    openTicketIds.length > 0
      ? serviceClient.from('ticket_messages').select('id, ticket_id, author_user_id, created_at').in('ticket_id', openTicketIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: null as MsgRow[] | null, error: null })
  );

  // Corsi KPI
  type AssRow = { id: string; ruolo: string; valutazione: number | null; lezione_id: string };
  type LezRow = { id: string; data: string; corso_id: string; ore: number | null };

  let corsiKpi = {
    assegnatiDocente: 0,
    svoltiDocente: 0,
    valMediaDocente: null as number | null,
    valMediaCocoda: null as number | null,
    assegnatiQA: 0,
    svoltiQA: 0,
    oreAssegnatiQA: 0,
    oreSvoltiQA: 0,
    assegnatiCocoda: 0,
    svoltiCocoda: 0,
  };

  if (collaborator?.id) {
    const { data: ownAss } = await serviceClient
      .from('assegnazioni')
      .select('id, ruolo, valutazione, lezione_id')
      .eq('collaborator_id', collaborator.id);

    if ((ownAss ?? []).length > 0) {
      const lezioneIds = [...new Set((ownAss ?? []).map((a: AssRow) => a.lezione_id))];
      const [{ data: lezioniData }] = await Promise.all([
        serviceClient.from('lezioni').select('id, data, corso_id, ore').in('id', lezioneIds),
      ]);

      const corsiIds = [...new Set((lezioniData ?? []).map((l: LezRow) => l.corso_id))];
      const { data: corsiData } = corsiIds.length > 0
        ? await serviceClient.from('corsi').select('id, data_inizio, data_fine').in('id', corsiIds)
        : { data: [] as { id: string; data_inizio: string; data_fine: string }[] };

      const { getCorsoStato } = await import('@/lib/corsi-utils');
      const today = new Date().toISOString().slice(0, 10);

      const lezioneMap = new Map<string, LezRow>();
      for (const l of (lezioniData ?? []) as LezRow[]) lezioneMap.set(l.id, l);

      const corsoStatoMap = new Map<string, string>();
      for (const c of (corsiData ?? []) as { id: string; data_inizio: string; data_fine: string }[]) {
        corsoStatoMap.set(c.id, getCorsoStato(c.data_inizio, c.data_fine));
      }

      const assArr = (ownAss ?? []) as AssRow[];
      const docenteAss = assArr.filter((a) => a.ruolo === 'docente');
      const cocotaAss = assArr.filter((a) => a.ruolo === 'cocoda');
      const qaAss = assArr.filter((a) => a.ruolo === 'qa');

      corsiKpi.assegnatiDocente = docenteAss.filter((a) => {
        const l = lezioneMap.get(a.lezione_id);
        if (!l) return false;
        const stato = corsoStatoMap.get(l.corso_id) ?? '';
        return l.data >= today && (stato === 'programmato' || stato === 'attivo');
      }).length;

      corsiKpi.svoltiDocente = docenteAss.filter((a) => {
        const l = lezioneMap.get(a.lezione_id);
        return l && l.data < today && a.valutazione !== null;
      }).length;

      const docVals = docenteAss.filter((a) => a.valutazione !== null).map((a) => a.valutazione as number);
      corsiKpi.valMediaDocente = docVals.length > 0
        ? Math.round((docVals.reduce((s, v) => s + v, 0) / docVals.length) * 10) / 10
        : null;

      const cocVals = cocotaAss.filter((a) => a.valutazione !== null).map((a) => a.valutazione as number);
      corsiKpi.valMediaCocoda = cocVals.length > 0
        ? Math.round((cocVals.reduce((s, v) => s + v, 0) / cocVals.length) * 10) / 10
        : null;

      const qaAssegnati = qaAss.filter((a) => {
        const l = lezioneMap.get(a.lezione_id);
        if (!l) return false;
        const stato = corsoStatoMap.get(l.corso_id) ?? '';
        return l.data >= today && (stato === 'programmato' || stato === 'attivo');
      });
      corsiKpi.assegnatiQA = qaAssegnati.length;
      corsiKpi.oreAssegnatiQA = qaAssegnati.reduce((s, a) => s + (lezioneMap.get(a.lezione_id)?.ore ?? 0), 0);

      const qaSwolti = qaAss.filter((a) => {
        const l = lezioneMap.get(a.lezione_id);
        return l && l.data < today && a.valutazione !== null;
      });
      corsiKpi.svoltiQA = qaSwolti.length;
      corsiKpi.oreSvoltiQA = qaSwolti.reduce((s, a) => s + (lezioneMap.get(a.lezione_id)?.ore ?? 0), 0);

      corsiKpi.assegnatiCocoda = cocotaAss.filter((a) => {
        const l = lezioneMap.get(a.lezione_id);
        if (!l) return false;
        const stato = corsoStatoMap.get(l.corso_id) ?? '';
        return l.data >= today && (stato === 'programmato' || stato === 'attivo');
      }).length;

      corsiKpi.svoltiCocoda = cocotaAss.filter((a) => {
        const l = lezioneMap.get(a.lezione_id);
        return l && l.data < today && a.valutazione !== null;
      }).length;
    }
  }

  // Aggregations
  const activeComps = (compensations ?? []).filter((c: CompRow) => ACTIVE_STATES.has(c.stato));
  const compTotal = activeComps.reduce((s: number, c: CompRow) => s + compAmount(c), 0);
  const pendingComps = activeComps.filter((c: CompRow) => c.stato === 'APPROVATO');
  const compPendingTot = pendingComps.reduce((s: number, c: CompRow) => s + compAmount(c), 0);

  const activeExps = (expenses ?? []).filter((e: ExpRow) => ACTIVE_STATES.has(e.stato));
  const expTotal = activeExps.reduce((s: number, e: ExpRow) => s + (e.importo ?? 0), 0);
  const pendingExps = activeExps.filter((e: ExpRow) => e.stato === 'APPROVATO');
  const expPendingTot = pendingExps.reduce((s: number, e: ExpRow) => s + (e.importo ?? 0), 0);

  const daFirmareCount = (docsToSign ?? []).length;

  // Ticket senza risposta
  const lastMsgByTicket: Record<string, MsgRow> = {};
  for (const msg of (ticketMsgs ?? []) as MsgRow[]) {
    if (!lastMsgByTicket[msg.ticket_id]) lastMsgByTicket[msg.ticket_id] = msg;
  }
  const ticketNeedsReply = openTicketIds.filter((id: string) => {
    const last = lastMsgByTicket[id];
    return last && last.author_user_id !== userId;
  }).length;

  const profiloIncompleto = !collaborator?.iban || !collaborator?.codice_fiscale;
  const daRicevere = compPendingTot + expPendingTot;

  // PaymentOverview data
  const currentYear = new Date().getFullYear();
  const {
    paidByYear: compensPaidByYear,
    approvedLordo: compensApprovedLordo,
    approvedNetto: compensApprovedNetto,
    inAttesaNetto: compensInAttesaNetto,
  } = groupCompByYear(compensations ?? []);
  const {
    paidByYear: expensePaidByYear,
    approved: expenseApproved,
    inAttesa: expenseInAttesa,
  } = groupExpByYear(expenses ?? []);
  const massimale = collaborator?.importo_lordo_massimale ?? null;
  const paidCurrentYear = (collaborator?.approved_year === currentYear ? (collaborator?.approved_lordo_ytd ?? 0) : 0);

  // Bar chart
  const barData = buildBarData(compensations ?? [], expenses ?? []);
  const barHasData = barData.some((d) => d.compensi > 0 || d.rimborsi > 0);

  // Da fare
  const daFare: { text: string; href: string }[] = [];
  if (ticketNeedsReply > 0) {
    daFare.push({
      text: `${ticketNeedsReply} ticket in attesa di risposta`,
      href: '/ticket',
    });
  }
  if (profiloIncompleto) {
    const missing = [...(!collaborator?.iban ? ['IBAN'] : []), ...(!collaborator?.codice_fiscale ? ['codice fiscale'] : [])];
    daFare.push({
      text: `Profilo incompleto: ${missing.join(' e ')} mancante${missing.length > 1 ? 'i' : ''}`,
      href: '/profilo',
    });
  }

  // Dashboard updates
  type EventRaw = { id: string; titolo: string; start_datetime: string | null; tipo: string | null; community_ids: string[] };
  type CommRaw = { id: string; titolo: string; published_at: string; community_ids: string[] };
  type ResRaw = { id: string; titolo: string; created_at: string; categoria: string; community_ids: string[] };
  type OppRaw = { id: string; titolo: string; created_at: string; tipo: string; community_ids: string[] };
  type DiscRaw = { id: string; titolo: string; valid_to: string | null; fornitore: string; created_at: string; community_ids: string[] };

  const dashboardEvents: DashboardEventItem[] = ((dashEvents ?? []) as EventRaw[])
    .filter((e) => contentVisible(e.community_ids, userCommunityIds))
    .slice(0, 4)
    .map((e) => ({
      id: e.id,
      titolo: e.titolo,
      start_datetime: e.start_datetime,
      tipo: e.tipo as DashboardEventItem['tipo'],
    }));

  const commItems: DashboardCommItem[] = [
    ...((dashComms ?? []) as CommRaw[])
      .filter((c) => contentVisible(c.community_ids, userCommunityIds))
      .map((c) => ({
        id: c.id, titolo: c.titolo, date: c.published_at, kind: 'comm' as const,
      })),
    ...((dashResources ?? []) as ResRaw[])
      .filter((r) => contentVisible(r.community_ids, userCommunityIds))
      .map((r) => ({
        id: r.id, titolo: r.titolo, date: r.created_at,
        categoria: r.categoria as DashboardCommItem['categoria'],
        kind: 'resource' as const,
      })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  const oppItems: DashboardOppItem[] = [
    ...((dashOpps ?? []) as OppRaw[])
      .filter((o) => contentVisible(o.community_ids, userCommunityIds))
      .map((o) => ({
        id: o.id, titolo: o.titolo, date: o.created_at, tipo: o.tipo, kind: 'opp' as const,
      })),
    ...((dashDiscounts ?? []) as DiscRaw[])
      .filter((d) => contentVisible(d.community_ids, userCommunityIds))
      .map((d) => ({
        id: d.id, titolo: d.titolo, date: d.created_at, kind: 'discount' as const,
      })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  const unreadCounts = { events: 0, communicationsResources: 0, opportunitiesDiscounts: 0 };
  for (const n of (unreadNotifs ?? []) as { entity_type: string }[]) {
    if (n.entity_type === 'event') unreadCounts.events++;
    else if (n.entity_type === 'communication') unreadCounts.communicationsResources++;
    else if (n.entity_type === 'opportunity' || n.entity_type === 'discount') unreadCounts.opportunitiesDiscounts++;
  }

  const todayStr = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).replace(/^\w/, (c) => c.toUpperCase());

  const roleLabel = ROLE_LABELS[role as Role] ?? role;
  const fullName = [collaborator?.nome, collaborator?.cognome].filter(Boolean).join(' ');
  const materieInsegnate = (collaborator?.materie_insegnate as string[] | null) ?? [];
  const initials = [collaborator?.nome, collaborator?.cognome]
    .filter(Boolean)
    .map((n) => n!.charAt(0).toUpperCase())
    .join('') || '?';
  const joinDate = collaborator?.data_ingresso
    ? new Date(collaborator.data_ingresso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="p-6 max-w-4xl space-y-8">

      {/* Hero */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent flex-shrink-0 overflow-hidden flex items-center justify-center">
            {collaborator?.foto_profilo_url ? (
              <img src={collaborator.foto_profilo_url} alt="" width={56} height={56} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-medium text-foreground select-none">{initials}</span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Ciao{fullName ? `, ${fullName}` : ''}!
            </h1>
            {role && (
              <span className="mt-1.5 inline-flex items-center rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs text-foreground">
                {roleLabel}
              </span>
            )}
            {joinDate && (
              <p className="text-xs text-muted-foreground mt-1.5">Data di ingresso: {joinDate}</p>
            )}
            {materieInsegnate.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {materieInsegnate.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center rounded-full bg-muted border border-border px-2 py-0.5 text-xs text-foreground"
                  >
                    {m}
                  </span>
                ))}
              </div>
            ) : (
              <span className="inline-flex items-center rounded-full bg-muted border border-border px-2 py-0.5 text-xs text-muted-foreground italic mt-2">
                Materie: non configurato
              </span>
            )}
          </div>
        </div>
        <p className="shrink-0 pt-1 text-right text-sm text-muted-foreground">{todayStr}</p>
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <Link href="/compensi" className={sectionCls + ' p-4 flex flex-col gap-2 hover:bg-muted/60 transition'}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs text-muted-foreground truncate">Compensi</span>
            <span className="flex-shrink-0 rounded-full bg-muted border border-border px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
              {activeComps.length}
            </span>
          </div>
          <p className="text-lg font-semibold text-foreground tabular-nums leading-tight">{eur(compTotal)}</p>
          <p className="text-xs text-muted-foreground">in corso</p>
        </Link>

        <Link href="/rimborsi" className={sectionCls + ' p-4 flex flex-col gap-2 hover:bg-muted/60 transition'}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs text-muted-foreground truncate">Rimborsi</span>
            <span className="flex-shrink-0 rounded-full bg-muted border border-border px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
              {activeExps.length}
            </span>
          </div>
          <p className="text-lg font-semibold text-foreground tabular-nums leading-tight">{eur(expTotal)}</p>
          <p className="text-xs text-muted-foreground">in corso</p>
        </Link>

        <Link href="/compensi" className={sectionCls + ' p-4 flex flex-col gap-2 hover:bg-muted/60 transition'}>
          <span className="text-xs text-muted-foreground">Da ricevere</span>
          <p className={`text-lg font-semibold tabular-nums leading-tight ${daRicevere > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-muted-foreground'}`}>
            {eur(daRicevere)}
          </p>
          <p className="text-xs text-muted-foreground">approvato</p>
        </Link>

        <Link href="/profilo?tab=documenti" className={sectionCls + ' p-4 flex flex-col gap-2 hover:bg-muted/60 transition'}>
          <span className="text-xs text-muted-foreground">Da firmare</span>
          <p className={`text-lg font-semibold tabular-nums leading-tight ${daFirmareCount > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-muted-foreground'}`}>
            {daFirmareCount}
          </p>
          <p className="text-xs text-muted-foreground">document{daFirmareCount === 1 ? 'o' : 'i'}</p>
        </Link>
      </div>

      {/* Corsi KPI */}
      <DashboardCorsiKpi kpi={corsiKpi} />

      {/* Prossimi eventi */}
      {(() => {
        const today = new Date().toISOString();
        const collabCitta = collaborator?.citta ?? null;
        const prossimiEventi = ((dashEvents ?? []) as { id: string; titolo: string; start_datetime: string | null; community_ids: string[]; citta: string | null }[])
          .filter((e) => {
            if (!e.start_datetime || e.start_datetime < today) return false;
            const communityMatch = e.community_ids.length === 0 || e.community_ids.some((id) => userCommunityIds.includes(id));
            if (!communityMatch) return false;
            if (e.citta !== null && e.citta !== collabCitta) return false;
            return true;
          })
          .slice(0, 4);
        return prossimiEventi.length > 0 ? (
          <div className={sectionCls}>
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium text-foreground">Prossimi eventi</h2>
            </div>
            <div className="divide-y divide-border">
              {prossimiEventi.map((e) => (
                <Link
                  key={e.id}
                  href={`/eventi`}
                  className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-muted/60 transition"
                >
                  <span className="text-sm text-foreground truncate">{e.titolo}</span>
                  {e.start_datetime && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(e.start_datetime).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Ultimi aggiornamenti */}
      <DashboardUpdates
        documents={(docsToSign ?? []) as DashboardDocItem[]}
        events={dashboardEvents}
        comunicazioni={commItems}
        opportunita={oppItems}
        unreadCounts={unreadCounts}
      />

      {/* Da fare */}
      {daFare.length > 0 && (
        <div className={sectionCls}>
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Da fare</h2>
          </div>
          <div className="p-4 space-y-2">
            {daFare.map((item) => (
              <Link
                key={item.href + item.text}
                href={item.href}
                className="flex items-center gap-2.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-700 hover:bg-amber-100 transition dark:bg-amber-950/30 dark:border-amber-800/30 dark:text-amber-300 dark:hover:bg-amber-950/50"
              >
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 min-w-0 truncate">{item.text}</span>
                <span className="flex-shrink-0 text-xs text-amber-500/60">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Ticket aperti */}
      <CollabOpenTicketsSection tickets={openTickets as { id: string; oggetto: string; stato: string; priority: string }[]} />

      {/* Azioni rapide */}
      <div className={sectionCls}>
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Azioni rapide</h2>
        </div>
        <div className="p-5 flex flex-wrap gap-3">
          <Link
            href="/rimborsi/nuova"
            className="rounded-lg bg-brand hover:bg-brand/90 px-4 py-2 text-sm font-medium text-white transition"
          >
            + Nuovo rimborso
          </Link>
          <Link
            href="/compensi"
            className="rounded-lg bg-muted hover:bg-accent border border-border px-4 py-2 text-sm font-medium text-foreground transition"
          >
            Compensi e rimborsi
          </Link>
          <Link
            href="/profilo?tab=documenti"
            className="rounded-lg bg-muted hover:bg-accent border border-border px-4 py-2 text-sm font-medium text-foreground transition"
          >
            Carica documento
          </Link>
        </div>
      </div>

      {/* I miei pagamenti */}
      <PaymentOverview
        compensPaidByYear={compensPaidByYear}
        compensApprovedLordo={compensApprovedLordo}
        compensApprovedNetto={compensApprovedNetto}
        compensInAttesaNetto={compensInAttesaNetto}
        expensePaidByYear={expensePaidByYear}
        expenseApproved={expenseApproved}
        expenseInAttesa={expenseInAttesa}
        massimale={massimale}
        paidCurrentYear={paidCurrentYear}
        currentYear={currentYear}
      />

      {/* Bar chart */}
      {barHasData && (
        <div className={sectionCls}>
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <h2 className="text-sm font-medium text-foreground">Ultimi 6 mesi</h2>
            <div className="flex items-center gap-4 ml-auto">
              <span className="flex items-center gap-1.5 text-xs text-brand">
                <span className="inline-block w-3 h-3 rounded bg-brand flex-shrink-0" />
                Compensi
              </span>
              <span className="flex items-center gap-1.5 text-xs text-teal-400">
                <span className="inline-block w-3 h-3 rounded bg-teal-500 flex-shrink-0" />
                Rimborsi
              </span>
            </div>
          </div>
          <div className="px-4 pt-4 pb-2">
            <DashboardBarChart data={barData} />
          </div>
        </div>
      )}
    </div>
  );
}
