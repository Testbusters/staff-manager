import { createClient as createServiceClient } from '@supabase/supabase-js';
import { ROLE_LABELS } from '@/lib/types';
import type { Role } from '@/lib/types';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import DashboardTicketSection from '@/components/responsabile/DashboardTicketSection';
import RKpiCard from '@/components/responsabile/RKpiCard';
import type { DashboardTicket } from '@/components/responsabile/DashboardTicketSection';
import DashboardPendingItems from '@/components/responsabile/DashboardPendingItems';
import type { PendingComp, PendingExp } from '@/components/responsabile/DashboardPendingItems';
import ResponsabileAvatarHero from '@/components/responsabile/ResponsabileAvatarHero';
import { formatCurrencyR } from './shared';

export default async function RespCompensiDashboard({ userId }: { userId: string }) {
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Round 1 — own collab record + community guard
  const [{ data: ucaRows }, { data: ownCollab }] = await Promise.all([
    svc.from('user_community_access').select('community_id').eq('user_id', userId),
    svc.from('collaborators').select('nome, cognome, foto_profilo_url').eq('user_id', userId).maybeSingle(),
  ]);

  const communityIds = (ucaRows ?? []).map((r: { community_id: string }) => r.community_id);

  if (communityIds.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState icon={Users} title="Nessuna community assegnata." />
      </div>
    );
  }

  // Round 2 — collab IDs + open tickets (ricevuti) + recently active tickets (recenti)
  type RTicket = {
    id: string; oggetto: string; stato: string; categoria: string;
    priority: string;
    created_at: string; updated_at: string; creator_user_id: string;
    last_message_at: string | null; last_message_author_name: string | null;
  };

  const threeAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const [ccResult, ricevutiResult, recentiResult] = await Promise.all([
    svc.from('collaborator_communities').select('collaborator_id').in('community_id', communityIds),
    svc.from('tickets')
      .select('id, oggetto, stato, categoria, priority, created_at, updated_at, creator_user_id, last_message_at, last_message_author_name')
      .in('stato', ['APERTO', 'IN_LAVORAZIONE'])
      .order('created_at', { ascending: false })
      .limit(5),
    svc.from('tickets')
      .select('id, oggetto, stato, categoria, priority, created_at, updated_at, creator_user_id, last_message_at, last_message_author_name')
      .gte('updated_at', threeAgo)
      .order('updated_at', { ascending: false })
      .limit(5),
  ]);

  const allCollabIds = [...new Set((ccResult.data ?? []).map((r: { collaborator_id: string }) => r.collaborator_id))];
  const rawRicevuti = (ricevutiResult.data ?? []) as RTicket[];
  const rawRecenti = (recentiResult.data ?? []) as RTicket[];
  const noCollabs = allCollabIds.length === 0;

  // Round 3 — compensations, expenses, collab names, ticket collab names (all in parallel)
  type RComp = { id: string; collaborator_id: string; importo_lordo: number | null; importo_netto: number | null; nome_servizio_ruolo: string | null; competenza: string | null; data_competenza: string | null; info_specifiche: string | null; stato: string; created_at: string };
  type RExp = { id: string; collaborator_id: string; importo: number | null; categoria: string; descrizione: string | null; data_spesa: string; stato: string; created_at: string };
  type RCollab3 = { id: string; nome: string | null; cognome: string | null };
  type RTCollab = { user_id: string; nome: string | null; cognome: string | null };

  const ticketUserIds = [...new Set([
    ...rawRicevuti.map(t => t.creator_user_id),
    ...rawRecenti.map(t => t.creator_user_id),
  ].filter(Boolean))];
  const resolveEmpty = <T,>(v: T[]) => Promise.resolve({ data: v });

  const [compsResult, expsResult, collabsResult, tCollabsResult, pendingCompsCountResult, pendingExpsCountResult] = await Promise.all([
    noCollabs
      ? resolveEmpty<RComp>([])
      : svc.from('compensations')
          .select('id, collaborator_id, importo_lordo, importo_netto, nome_servizio_ruolo, competenza, data_competenza, info_specifiche, stato, created_at')
          .in('collaborator_id', allCollabIds)
          .in('stato', ['IN_ATTESA', 'APPROVATO'])
          .order('created_at', { ascending: true })
          .limit(1000),
    noCollabs
      ? resolveEmpty<RExp>([])
      : svc.from('expense_reimbursements')
          .select('id, collaborator_id, importo, categoria, descrizione, data_spesa, stato, created_at')
          .in('collaborator_id', allCollabIds)
          .in('stato', ['IN_ATTESA', 'APPROVATO'])
          .order('created_at', { ascending: true })
          .limit(1000),
    noCollabs
      ? resolveEmpty<RCollab3>([])
      : svc.from('collaborators').select('id, nome, cognome').in('id', allCollabIds),
    ticketUserIds.length > 0
      ? svc.from('collaborators').select('user_id, nome, cognome').in('user_id', ticketUserIds)
      : resolveEmpty<RTCollab>([]),
    noCollabs
      ? Promise.resolve({ count: 0 })
      : svc.from('compensations').select('id', { count: 'exact', head: true }).in('collaborator_id', allCollabIds).eq('stato', 'IN_ATTESA'),
    noCollabs
      ? Promise.resolve({ count: 0 })
      : svc.from('expense_reimbursements').select('id', { count: 'exact', head: true }).in('collaborator_id', allCollabIds).eq('stato', 'IN_ATTESA'),
  ]);

  const allComps = (compsResult.data ?? []) as RComp[];
  const allExps = (expsResult.data ?? []) as RExp[];
  const allCollabs = (collabsResult.data ?? []) as RCollab3[];
  const tCollabs = (tCollabsResult.data ?? []) as RTCollab[];

  // KPIs
  const pendingCompsCount = pendingCompsCountResult.count ?? 0;
  const pendingExpsCount = pendingExpsCountResult.count ?? 0;
  const pendingComps = allComps.filter(c => c.stato === 'IN_ATTESA');
  const pendingExps = allExps.filter(e => e.stato === 'IN_ATTESA');
  const liquidabile = allComps.filter(c => c.stato === 'APPROVATO').length +
                       allExps.filter(e => e.stato === 'APPROVATO').length;

  // Name maps
  const collabNameMap: Record<string, string> = {};
  for (const c of allCollabs) collabNameMap[c.id] = `${c.nome ?? ''} ${c.cognome ?? ''}`.trim();

  const tCollabNameMap: Record<string, string> = {};
  for (const c of tCollabs) tCollabNameMap[c.user_id] = `${c.nome ?? ''} ${c.cognome ?? ''}`.trim();

  // Tickets
  const toTicket = (t: RTicket): DashboardTicket => ({
    id: t.id,
    oggetto: t.oggetto,
    stato: t.stato,
    categoria: t.categoria,
    priority: t.priority,
    collabName: tCollabNameMap[t.creator_user_id] ?? 'Collaboratore',
    created_at: t.created_at,
    last_message_at: t.last_message_at,
    last_message_author_name: t.last_message_author_name,
  });
  const ticketsRicevuti = rawRicevuti.map(toTicket);
  const ricevutiIds = new Set(rawRicevuti.map(t => t.id));
  const ticketsRecenti = rawRecenti.filter(t => !ricevutiIds.has(t.id)).map(toTicket);

  // Hero data
  const role = 'responsabile_compensi';
  const rTodayStr = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).replace(/^\w/, (c) => c.toUpperCase());
  const rRoleLabel = ROLE_LABELS[role as Role] ?? role;
  const rFullName = [ownCollab?.nome, ownCollab?.cognome].filter(Boolean).join(' ');
  const rInitials = [ownCollab?.nome, ownCollab?.cognome]
    .filter(Boolean).map((n) => n!.charAt(0).toUpperCase()).join('') || '?';

  return (
    <div className="p-6 max-w-5xl space-y-8">

      {/* Hero */}
      <ResponsabileAvatarHero
        initialAvatarUrl={ownCollab?.foto_profilo_url ?? null}
        initials={rInitials}
        fullName={rFullName}
        roleLabel={rRoleLabel}
        todayStr={rTodayStr}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <RKpiCard
          label="Compensi in attesa"
          count={pendingCompsCount}
          sub={pendingCompsCount > 0 ? formatCurrencyR(pendingComps.reduce((s, c) => s + (c.importo_lordo ?? 0), 0)) : null}
          color={pendingCompsCount > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-muted-foreground'}
          href="/approvazioni?tab=compensi"
          highlight={pendingCompsCount > 0}
        />
        <RKpiCard
          label="Rimborsi in attesa"
          count={pendingExpsCount}
          sub={pendingExpsCount > 0 ? formatCurrencyR(pendingExps.reduce((s, e) => s + (e.importo ?? 0), 0)) : null}
          color={pendingExpsCount > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-muted-foreground'}
          href="/approvazioni?tab=rimborsi"
        />
        <RKpiCard
          label="Da liquidare"
          count={liquidabile}
          sub={null}
          color={liquidabile > 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-muted-foreground'}
          href="/approvazioni"
        />
        <RKpiCard
          label="Ticket aperti"
          count={ticketsRicevuti.length}
          sub={null}
          color={ticketsRicevuti.length > 0 ? 'text-rose-600 dark:text-rose-300' : 'text-muted-foreground'}
          href="/ticket"
        />
      </div>

      {/* Two-column pending items */}
      <DashboardPendingItems
        comps={allComps as PendingComp[]}
        exps={allExps as PendingExp[]}
        collabNameMap={collabNameMap}
      />

      {/* Ticket */}
      <DashboardTicketSection ricevuti={ticketsRicevuti} recenti={ticketsRecenti} />

    </div>
  );
}
