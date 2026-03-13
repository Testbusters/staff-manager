import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { ROLE_LABELS } from '@/lib/types';
import type { Role } from '@/lib/types';
import DashboardTicketSection from '@/components/responsabile/DashboardTicketSection';
import RKpiCard from '@/components/responsabile/RKpiCard';
import type { DashboardTicket } from '@/components/responsabile/DashboardTicketSection';
import DashboardPendingItems from '@/components/responsabile/DashboardPendingItems';
import type { PendingComp, PendingExp } from '@/components/responsabile/DashboardPendingItems';
import AdminDashboard from '@/components/admin/AdminDashboard';
import type { AdminDashboardData } from '@/components/admin/types';
import PaymentOverview from '@/components/compensation/PaymentOverview';
import DashboardBarChart from '@/components/compensation/DashboardBarChart';
import type { BarMonthData } from '@/components/compensation/DashboardBarChart';
import DashboardUpdates from '@/components/compensation/DashboardUpdates';
import type { DashboardDocItem, DashboardEventItem, DashboardCommItem, DashboardOppItem } from '@/components/compensation/DashboardUpdates';
import CollabOpenTicketsSection from '@/components/ticket/CollabOpenTicketsSection';
import ResponsabileAvatarHero from '@/components/responsabile/ResponsabileAvatarHero';
import { AlertTriangle, FileText, Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

// ── Constants ──────────────────────────────────────────────
const ACTIVE_STATES = new Set([
  'IN_ATTESA', 'APPROVATO',
]);

// ── Types ──────────────────────────────────────────────────
type CompRow = {
  id: string;
  stato: string;
  importo_netto: number | null;
  importo_lordo: number | null;
  liquidated_at: string | null;
};

type ExpRow = { id: string; stato: string; importo: number | null; liquidated_at: string | null };

// ── Helpers ────────────────────────────────────────────────
const sectionCls = 'rounded-2xl bg-card border border-border';

function eur(n: number) {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

function compAmount(c: CompRow) {
  return c.importo_netto ?? 0;
}

// ── Sub-components ─────────────────────────────────────────
function StatCard({
  label, count, total, pendingCount, pendingTotal,
}: {
  label: string;
  count: number;
  total: number;
  pendingCount: number;
  pendingTotal: number;
}) {
  return (
    <div className={sectionCls + ' p-5 flex flex-col gap-3'}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">{label}</h2>
        <span className="rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
          {count} attiv{count === 1 ? 'o' : 'i'}
        </span>
      </div>
      <div>
        <p className="text-2xl font-semibold text-foreground tabular-nums">{eur(total)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">importo totale in corso</p>
      </div>
      {pendingCount > 0 && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/30 px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-emerald-700 dark:text-emerald-400">In attesa liquidazione ({pendingCount})</span>
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 tabular-nums">{eur(pendingTotal)}</span>
        </div>
      )}
    </div>
  );
}

function DocCard({ count }: { count: number }) {
  return (
    <div className={sectionCls + ' p-5 flex flex-col gap-3'}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Da firmare</h2>
        <span className={
          count > 0
            ? 'rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900/60 dark:border-amber-700/50 dark:text-amber-300'
            : 'rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs text-muted-foreground'
        }>
          {count}
        </span>
      </div>
      {count > 0 ? (
        <>
          <p className="text-sm text-amber-700 dark:text-amber-300/80">
            {count === 1 ? 'Hai 1 documento' : `Hai ${count} documenti`} in attesa di firma.
          </p>
          <Link href="/profilo?tab=documenti" className="text-xs text-link hover:text-link/80 transition">
            Vai ai documenti →
          </Link>
        </>
      ) : (
        <EmptyState icon={FileText} title="Nessun documento in attesa di firma." />
      )}
    </div>
  );
}


// ── Responsabile helpers ────────────────────────────────────

function formatCurrencyR(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

// ── Collaboratore data helpers ──────────────────────────────

type CompYearBreakdown = { year: number; netto: number; lordo: number };
type ExpYearBreakdown  = { year: number; total: number };

function groupCompByYear(rows: CompRow[]) {
  const nettoMap: Record<number, number> = {};
  const lordoMap: Record<number, number> = {};
  let approvedLordo = 0, approvedNetto = 0, inAttesaNetto = 0;

  for (const row of rows) {
    if (row.stato === 'LIQUIDATO' && row.liquidated_at) {
      const y = new Date(row.liquidated_at).getFullYear();
      nettoMap[y] = (nettoMap[y] ?? 0) + (row.importo_netto ?? 0);
      lordoMap[y] = (lordoMap[y] ?? 0) + (row.importo_lordo ?? 0);
    } else if (row.stato === 'APPROVATO') {
      approvedLordo += row.importo_lordo ?? 0;
      approvedNetto  += row.importo_netto ?? 0;
    } else if (row.stato === 'IN_ATTESA') {
      inAttesaNetto += row.importo_netto ?? 0;
    }
  }

  const paidByYear: CompYearBreakdown[] = Object.entries(nettoMap)
    .map(([y, netto]) => ({ year: Number(y), netto, lordo: lordoMap[Number(y)] ?? 0 }))
    .sort((a, b) => b.year - a.year);

  return { paidByYear, approvedLordo, approvedNetto, inAttesaNetto };
}

function groupExpByYear(rows: ExpRow[]) {
  const map: Record<number, number> = {};
  let approved = 0, inAttesa = 0;

  for (const row of rows) {
    if (row.stato === 'LIQUIDATO' && row.liquidated_at) {
      const y = new Date(row.liquidated_at).getFullYear();
      map[y] = (map[y] ?? 0) + (row.importo ?? 0);
    } else if (row.stato === 'APPROVATO') {
      approved += row.importo ?? 0;
    } else if (row.stato === 'IN_ATTESA') {
      inAttesa += row.importo ?? 0;
    }
  }

  const paidByYear: ExpYearBreakdown[] = Object.entries(map)
    .map(([y, total]) => ({ year: Number(y), total }))
    .sort((a, b) => b.year - a.year);

  return { paidByYear, approved, inAttesa };
}

function buildBarData(comps: CompRow[], exps: ExpRow[]): BarMonthData[] {
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('it-IT', { month: 'short' })
      .replace('.', '').replace(/^\w/, (c) => c.toUpperCase());
    months.push({ key, label });
  }

  const compMap: Record<string, number> = {};
  const expMap:  Record<string, number> = {};

  for (const c of comps) {
    if (c.stato === 'LIQUIDATO' && c.liquidated_at) {
      const d = new Date(c.liquidated_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      compMap[k] = (compMap[k] ?? 0) + (c.importo_netto ?? 0);
    }
  }
  for (const e of exps) {
    if (e.stato === 'LIQUIDATO' && e.liquidated_at) {
      const d = new Date(e.liquidated_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      expMap[k] = (expMap[k] ?? 0) + (e.importo ?? 0);
    }
  }

  return months.map(({ key, label }) => ({
    month: label,
    compensi: compMap[key] ?? 0,
    rimborsi: expMap[key] ?? 0,
  }));
}

// ── Page ───────────────────────────────────────────────────
export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const role = profile?.role ?? '';

  // ── RESPONSABILE DASHBOARD ────────────────────────────────
  if (role === 'responsabile_compensi') {
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Round 1 — own collab record + community guard
    const [{ data: ucaRows }, { data: ownCollab }] = await Promise.all([
      svc.from('user_community_access').select('community_id').eq('user_id', user.id),
      svc.from('collaborators').select('nome, cognome, foto_profilo_url').eq('user_id', user.id).maybeSingle(),
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

    const allCollabIds   = [...new Set((ccResult.data ?? []).map((r: { collaborator_id: string }) => r.collaborator_id))];
    const rawRicevuti    = (ricevutiResult.data ?? []) as RTicket[];
    const rawRecenti     = (recentiResult.data ?? []) as RTicket[];
    const noCollabs      = allCollabIds.length === 0;

    // Round 3 — compensations, expenses, collab names, ticket collab names (all in parallel)
    type RComp    = { id: string; collaborator_id: string; importo_lordo: number | null; stato: string; competenza: string | null; created_at: string };
    type RExp     = { id: string; collaborator_id: string; importo: number | null; categoria: string; stato: string; created_at: string };
    type RCollab3 = { id: string; nome: string | null; cognome: string | null };
    type RTCollab = { user_id: string; nome: string | null; cognome: string | null };

    const ticketUserIds  = [...new Set([
      ...rawRicevuti.map(t => t.creator_user_id),
      ...rawRecenti.map(t => t.creator_user_id),
    ].filter(Boolean))];
    const resolveEmpty   = <T,>(v: T[]) => Promise.resolve({ data: v });

    const [compsResult, expsResult, collabsResult, tCollabsResult] = await Promise.all([
      noCollabs
        ? resolveEmpty<RComp>([])
        : svc.from('compensations')
            .select('id, collaborator_id, importo_lordo, stato, competenza, created_at')
            .in('collaborator_id', allCollabIds)
            .in('stato', ['IN_ATTESA', 'APPROVATO'])
            .order('created_at', { ascending: true }),
      noCollabs
        ? resolveEmpty<RExp>([])
        : svc.from('expense_reimbursements')
            .select('id, collaborator_id, importo, categoria, stato, created_at')
            .in('collaborator_id', allCollabIds)
            .in('stato', ['IN_ATTESA', 'APPROVATO'])
            .order('created_at', { ascending: true }),
      noCollabs
        ? resolveEmpty<RCollab3>([])
        : svc.from('collaborators').select('id, nome, cognome').in('id', allCollabIds),
      ticketUserIds.length > 0
        ? svc.from('collaborators').select('user_id, nome, cognome').in('user_id', ticketUserIds)
        : resolveEmpty<RTCollab>([]),
    ]);

    const allComps   = (compsResult.data ?? []) as RComp[];
    const allExps    = (expsResult.data ?? []) as RExp[];
    const allCollabs = (collabsResult.data ?? []) as RCollab3[];
    const tCollabs   = (tCollabsResult.data ?? []) as RTCollab[];

    // ── KPIs ─────────────────────────────────────────────────
    const pendingComps = allComps.filter(c => c.stato === 'IN_ATTESA');
    const pendingExps  = allExps.filter(e => e.stato === 'IN_ATTESA');
    const liquidabile  = allComps.filter(c => c.stato === 'APPROVATO').length +
                         allExps.filter(e => e.stato === 'APPROVATO').length;

    // ── Name maps ────────────────────────────────────────────
    const collabNameMap: Record<string, string> = {};
    for (const c of allCollabs) collabNameMap[c.id] = `${c.nome ?? ''} ${c.cognome ?? ''}`.trim();

    const tCollabNameMap: Record<string, string> = {};
    for (const c of tCollabs) tCollabNameMap[c.user_id] = `${c.nome ?? ''} ${c.cognome ?? ''}`.trim();

    // ── Tickets ───────────────────────────────────────────────
    const toTicket = (t: RTicket): DashboardTicket => ({
      id:                         t.id,
      oggetto:                    t.oggetto,
      stato:                      t.stato,
      categoria:                  t.categoria,
      priority:                   t.priority,
      collabName:                 tCollabNameMap[t.creator_user_id] ?? 'Collaboratore',
      created_at:                 t.created_at,
      last_message_at:            t.last_message_at,
      last_message_author_name:   t.last_message_author_name,
    });
    const ticketsRicevuti = rawRicevuti.map(toTicket);
    const ticketsRecenti  = rawRecenti.map(toTicket);

    // ── Hero data ────────────────────────────────────────────
    const rTodayStr  = new Date().toLocaleDateString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).replace(/^\w/, (c) => c.toUpperCase());
    const rRoleLabel = ROLE_LABELS[role as Role] ?? role;
    const rFullName  = [ownCollab?.nome, ownCollab?.cognome].filter(Boolean).join(' ');
    const rInitials  = [ownCollab?.nome, ownCollab?.cognome]
      .filter(Boolean).map((n) => n!.charAt(0).toUpperCase()).join('') || '?';

    return (
      <div className="p-6 max-w-5xl space-y-6">

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
            count={pendingComps.length}
            sub={pendingComps.length > 0 ? formatCurrencyR(pendingComps.reduce((s, c) => s + (c.importo_lordo ?? 0), 0)) : null}
            color={pendingComps.length > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-muted-foreground'}
            href="/approvazioni?tab=compensi"
          />
          <RKpiCard
            label="Rimborsi in attesa"
            count={pendingExps.length}
            sub={pendingExps.length > 0 ? formatCurrencyR(pendingExps.reduce((s, e) => s + (e.importo ?? 0), 0)) : null}
            color={pendingExps.length > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-muted-foreground'}
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

  // ── Admin dashboard ──────────────────────────
  if (role === 'amministrazione') {
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Fetch admin's own collaborator record (may not exist for admin-only accounts)
    const { data: adminCollab } = await svc
      .from('collaborators')
      .select('nome, cognome, foto_profilo_url, data_ingresso')
      .eq('user_id', user.id)
      .maybeSingle();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
    const stalledThreshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    // Parallel fetches
    const [
      compsInAttesaRes,
      expsInAttesaRes,
      compsApprovatoRes,
      expsLiquidatoYtdRes,
      expsApprovatoRes,
      docsToSignRes,
      activeCollabsRes,
      communitiesRes,
      collabsByStatusRes,
      collabsByContractRes,
      // Period metrics
      paidCompsThisMonthRes,
      paidCompsLastMonthRes,
      paidCompsYtdRes,
      approvedThisMonthRes,
      approvedLastMonthRes,
      approvedYtdRes,
      newCollabsThisMonthRes,
      newCollabsLastMonthRes,
      newCollabsYtdRes,
      // Urgenti
      stalledCompsRes,
      stalledExpsRes,
      // Feed
      feedCompsRes,
      feedExpsRes,
      // Blocks
      mustChangePwdRes,
      onboardingIncompleteRes,
    ] = await Promise.all([
      // comps IN_ATTESA (da approvare)
      svc.from('compensations').select('importo_netto')
        .eq('stato', 'IN_ATTESA'),
      // exps IN_ATTESA (da approvare)
      svc.from('expense_reimbursements').select('importo')
        .eq('stato', 'IN_ATTESA'),
      // comps APPROVATO (da liquidare)
      svc.from('compensations').select('importo_netto')
        .eq('stato', 'APPROVATO'),
      // exps LIQUIDATO YTD
      svc.from('expense_reimbursements').select('importo')
        .eq('stato', 'LIQUIDATO').gte('updated_at', startOfYear),
      // exps APPROVATO (da liquidare)
      svc.from('expense_reimbursements').select('importo')
        .eq('stato', 'APPROVATO'),
      // docs to sign (unused in KPIs, kept for community cards)
      svc.from('documents').select('id', { count: 'exact', head: true })
        .eq('stato_firma', 'DA_FIRMARE'),
      // active collabs (unused in KPIs, kept for community cards)
      svc.from('user_profiles').select('id', { count: 'exact', head: true })
        .eq('is_active', true).neq('role', 'amministrazione'),
      // communities
      svc.from('communities').select('id, name').eq('is_active', true).order('name'),
      // collab breakdown by status
      svc.from('collaborators').select('member_status'),
      // collab breakdown by contract
      svc.from('collaborators').select('tipo_contratto'),
      // paid comps this month
      svc.from('compensations').select('importo_netto')
        .eq('stato', 'LIQUIDATO').gte('updated_at', startOfMonth),
      // paid comps last month
      svc.from('compensations').select('importo_netto')
        .eq('stato', 'LIQUIDATO').gte('updated_at', startOfLastMonth).lt('updated_at', startOfMonth),
      // paid comps ytd
      svc.from('compensations').select('importo_netto')
        .eq('stato', 'LIQUIDATO').gte('updated_at', startOfYear),
      // approved comps this month
      svc.from('compensations').select('id', { count: 'exact', head: true })
        .in('stato', ['APPROVATO', 'LIQUIDATO']).gte('updated_at', startOfMonth),
      // approved comps last month
      svc.from('compensations').select('id', { count: 'exact', head: true })
        .in('stato', ['APPROVATO', 'LIQUIDATO']).gte('updated_at', startOfLastMonth).lt('updated_at', startOfMonth),
      // approved comps ytd
      svc.from('compensations').select('id', { count: 'exact', head: true })
        .in('stato', ['APPROVATO', 'LIQUIDATO']).gte('updated_at', startOfYear),
      // new collabs this month
      svc.from('collaborators').select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth),
      // new collabs last month
      svc.from('collaborators').select('id', { count: 'exact', head: true })
        .gte('created_at', startOfLastMonth).lt('created_at', startOfMonth),
      // new collabs ytd
      svc.from('collaborators').select('id', { count: 'exact', head: true })
        .gte('created_at', startOfYear),
      // stalled comps (>3 days in IN_ATTESA)
      svc.from('compensations')
        .select('id, stato, importo_netto, created_at, community_id, collaborator_id')
        .eq('stato', 'IN_ATTESA')
        .lt('created_at', stalledThreshold)
        .order('created_at', { ascending: true })
        .limit(20),
      // stalled exps
      svc.from('expense_reimbursements')
        .select('id, stato, importo, created_at, community_id, collaborator_id')
        .eq('stato', 'IN_ATTESA')
        .lt('created_at', stalledThreshold)
        .order('created_at', { ascending: true })
        .limit(20),
      // feed comps (recent, actionable)
      svc.from('compensations')
        .select('id, stato, importo_netto, created_at, community_id, collaborator_id')
        .in('stato', ['IN_ATTESA', 'APPROVATO', 'LIQUIDATO', 'RIFIUTATO'])
        .order('created_at', { ascending: false })
        .limit(30),
      // feed exps
      svc.from('expense_reimbursements')
        .select('id, stato, importo, created_at, community_id, collaborator_id')
        .in('stato', ['IN_ATTESA', 'APPROVATO', 'LIQUIDATO', 'RIFIUTATO'])
        .order('created_at', { ascending: false })
        .limit(30),
      // users with must_change_password
      svc.from('user_profiles')
        .select('user_id, must_change_password')
        .eq('must_change_password', true)
        .eq('is_active', true),
      // users with onboarding incomplete
      svc.from('user_profiles')
        .select('user_id, onboarding_completed')
        .eq('onboarding_completed', false)
        .eq('is_active', true)
        .neq('role', 'amministrazione'),
    ]);

    // Parallel community data fetch
    const [communityCompsRes, communityExpsRes, communityDocsRes, communityCollabsRes] = await Promise.all([
      svc.from('compensations')
        .select('id, collaborator_id, importo_netto, data_competenza, stato, created_at')
        .in('stato', ['IN_ATTESA', 'APPROVATO', 'RIFIUTATO'])
        .order('created_at', { ascending: false }),
      svc.from('expense_reimbursements')
        .select('id, collaborator_id, importo, stato, created_at')
        .in('stato', ['IN_ATTESA', 'APPROVATO', 'RIFIUTATO'])
        .order('created_at', { ascending: false }),
      svc.from('documents')
        .select('id, collaborator_id, tipo, titolo, created_at')
        .eq('stato_firma', 'DA_FIRMARE')
        .order('created_at', { ascending: false }),
      svc.from('collaborator_communities')
        .select('collaborator_id, community_id'),
    ]);

    // Fetch collabs + communities lookup for enrichment
    const allCollabIds = [
      ...(communityCompsRes.data ?? []).map((r: { collaborator_id: string }) => r.collaborator_id),
      ...(communityExpsRes.data ?? []).map((r: { collaborator_id: string }) => r.collaborator_id),
      ...(communityDocsRes.data ?? []).map((r: { collaborator_id: string }) => r.collaborator_id),
      ...(stalledCompsRes.data ?? []).map((r: { collaborator_id: string }) => r.collaborator_id),
      ...(stalledExpsRes.data ?? []).map((r: { collaborator_id: string }) => r.collaborator_id),
      ...(feedCompsRes.data ?? []).map((r: { collaborator_id: string }) => r.collaborator_id),
      ...(feedExpsRes.data ?? []).map((r: { collaborator_id: string }) => r.collaborator_id),
    ];
    const uniqueCollabIds = [...new Set(allCollabIds)];

    const [collabsLookupRes, commLookupRes, blockCollabsRes] = await Promise.all([
      uniqueCollabIds.length > 0
        ? svc.from('collaborators').select('id, nome, cognome, email').in('id', uniqueCollabIds)
        : Promise.resolve({ data: [] as { id: string; nome: string | null; cognome: string | null; email: string | null }[] }),
      svc.from('communities').select('id, name'),
      // collaborators for block items
      svc.from('collaborators').select('id, user_id, nome, cognome, email'),
    ]);

    const collabMap = new Map<string, { nome: string; cognome: string; email: string }>(
      (collabsLookupRes.data ?? []).map(c => [
        c.id,
        { nome: c.nome ?? '', cognome: c.cognome ?? '', email: c.email ?? '' },
      ])
    );
    const commMap = new Map<string, string>(
      (commLookupRes.data ?? []).map(c => [c.id, c.name])
    );

    // ── KPIs ──
    const _compsInAttesa    = compsInAttesaRes.data ?? [];
    const _expsInAttesa     = expsInAttesaRes.data ?? [];
    const _compsApprovato   = compsApprovatoRes.data ?? [];
    const _expsApprovato    = expsApprovatoRes.data ?? [];
    const _compsLiqYtd      = paidCompsYtdRes.data ?? [];
    const _expsLiqYtd       = expsLiquidatoYtdRes.data ?? [];

    const kpis = {
      compsInAttesaCount:   _compsInAttesa.length,
      compsInAttesaAmount:  _compsInAttesa.reduce((s, c) => s + (c.importo_netto ?? 0), 0),
      expsInAttesaCount:    _expsInAttesa.length,
      expsInAttesaAmount:   _expsInAttesa.reduce((s, e) => s + (e.importo ?? 0), 0),
      compsApprovatoCount:  _compsApprovato.length,
      compsApprovatoAmount: _compsApprovato.reduce((s, c) => s + (c.importo_netto ?? 0), 0),
      expsApprovatoCount:   _expsApprovato.length,
      expsApprovatoAmount:  _expsApprovato.reduce((s, e) => s + (e.importo ?? 0), 0),
      compsLiquidatoCount:  _compsLiqYtd.length,
      compsLiquidatoAmount: _compsLiqYtd.reduce((s, c) => s + (c.importo_netto ?? 0), 0),
      expsLiquidatoCount:   _expsLiqYtd.length,
      expsLiquidatoAmount:  _expsLiqYtd.reduce((s, e) => s + (e.importo ?? 0), 0),
    };

    // ── Community collab map ──
    const communityCollabMap = new Map<string, Set<string>>();
    for (const row of (communityCollabsRes.data ?? []) as { collaborator_id: string; community_id: string }[]) {
      if (!communityCollabMap.has(row.community_id)) {
        communityCollabMap.set(row.community_id, new Set());
      }
      communityCollabMap.get(row.community_id)!.add(row.collaborator_id);
    }

    // ── Community cards ──
    const communityCards = (communitiesRes.data ?? []).map(comm => {
      const collabIds = communityCollabMap.get(comm.id) ?? new Set<string>();
      const compsForComm = (communityCompsRes.data ?? []).filter(
        (r: { collaborator_id: string }) => collabIds.has(r.collaborator_id)
      );
      const expsForComm = (communityExpsRes.data ?? []).filter(
        (r: { collaborator_id: string }) => collabIds.has(r.collaborator_id)
      );
      const docsForComm = (communityDocsRes.data ?? []).filter(
        (r: { collaborator_id: string }) => collabIds.has(r.collaborator_id)
      );
      const compsActive = compsForComm.filter(
        (r: { stato: string }) => r.stato === 'IN_ATTESA' || r.stato === 'APPROVATO'
      );
      const expsActive = expsForComm.filter(
        (r: { stato: string }) => r.stato === 'IN_ATTESA' || r.stato === 'APPROVATO'
      );
      return {
        id: comm.id,
        name: comm.name,
        compsActiveCount: compsActive.length,
        expsActiveCount: expsActive.length,
        docsToSignCount: docsForComm.length,
        comps: compsForComm.map((c: {
          id: string; collaborator_id: string; importo_netto: number | null;
          data_competenza: string | null; stato: string;
        }) => {
          const collab = collabMap.get(c.collaborator_id);
          return {
            id: c.id,
            collabName: collab ? `${collab.nome} ${collab.cognome}` : '',
            importoNetto: c.importo_netto ?? 0,
            dataCompetenza: c.data_competenza,
            stato: c.stato,
            href: `/coda?tab=compensi&id=${c.id}`,
          };
        }),
        exps: expsForComm.map((e: {
          id: string; collaborator_id: string; importo: number | null;
          created_at: string; stato: string;
        }) => {
          const collab = collabMap.get(e.collaborator_id);
          return {
            id: e.id,
            collabName: collab ? `${collab.nome} ${collab.cognome}` : '',
            importo: e.importo ?? 0,
            createdAt: e.created_at,
            stato: e.stato,
            href: `/coda?tab=rimborsi&id=${e.id}`,
          };
        }),
        docs: docsForComm.map((d: {
          id: string; collaborator_id: string; tipo: string | null;
          titolo: string | null; created_at: string;
        }) => {
          const collab = collabMap.get(d.collaborator_id);
          return {
            id: d.id,
            collabName: collab ? `${collab.nome} ${collab.cognome}` : '',
            tipo: d.tipo ?? '',
            createdAt: d.created_at,
            href: `/documenti`,
          };
        }),
      };
    });

    // ── Period metrics ──
    function sumPaidComps(rows: { importo_netto: number | null }[]) {
      return rows.reduce((s, c) => s + (c.importo_netto ?? 0), 0);
    }
    const periodMetrics = {
      currentMonth: {
        paidAmount: sumPaidComps(paidCompsThisMonthRes.data ?? []),
        approvedCount: approvedThisMonthRes.count ?? 0,
        newCollabs: newCollabsThisMonthRes.count ?? 0,
      },
      lastMonth: {
        paidAmount: sumPaidComps(paidCompsLastMonthRes.data ?? []),
        approvedCount: approvedLastMonthRes.count ?? 0,
        newCollabs: newCollabsLastMonthRes.count ?? 0,
      },
      ytd: {
        paidAmount: sumPaidComps(paidCompsYtdRes.data ?? []),
        approvedCount: approvedYtdRes.count ?? 0,
        newCollabs: newCollabsYtdRes.count ?? 0,
      },
    };

    // ── Feed ──
    const feedItems = [
      ...(feedCompsRes.data ?? []).map((c: {
        id: string; stato: string; importo_netto: number | null;
        created_at: string; community_id: string; collaborator_id: string;
      }) => {
        const collab = collabMap.get(c.collaborator_id);
        return {
          key: `comp-${c.id}`,
          entityType: 'compensation' as const,
          entityId: c.id,
          collabId: c.collaborator_id,
          collabName: collab?.nome ?? '',
          collabCognome: collab?.cognome ?? '',
          communityId: c.community_id,
          communityName: commMap.get(c.community_id) ?? '',
          stato: c.stato,
          createdAt: c.created_at,
          amount: c.importo_netto ?? 0,
          href: `/coda?tab=compensi&id=${c.id}`,
        };
      }),
      ...(feedExpsRes.data ?? []).map((e: {
        id: string; stato: string; importo: number | null;
        created_at: string; community_id: string; collaborator_id: string;
      }) => {
        const collab = collabMap.get(e.collaborator_id);
        return {
          key: `exp-${e.id}`,
          entityType: 'expense' as const,
          entityId: e.id,
          collabId: e.collaborator_id,
          collabName: collab?.nome ?? '',
          collabCognome: collab?.cognome ?? '',
          communityId: e.community_id,
          communityName: commMap.get(e.community_id) ?? '',
          stato: e.stato,
          createdAt: e.created_at,
          amount: e.importo ?? 0,
          href: `/coda?tab=rimborsi&id=${e.id}`,
        };
      }),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    // ── Block items ──
    const blockCollabMap = new Map<string, { id: string; nome: string; cognome: string; email: string }>(
      (blockCollabsRes.data ?? []).map((c: {
        id: string; user_id: string; nome: string | null; cognome: string | null; email: string | null;
      }) => [
        c.user_id,
        { id: c.id, nome: c.nome ?? '', cognome: c.cognome ?? '', email: c.email ?? '' },
      ])
    );

    const blockItems: AdminDashboardData['blockItems'] = [];

    for (const u of (mustChangePwdRes.data ?? []) as { user_id: string }[]) {
      const collab = blockCollabMap.get(u.user_id);
      blockItems.push({
        key: `pwd-${u.user_id}`,
        blockType: 'must_change_password',
        userId: u.user_id,
        collabId: collab?.id ?? '',
        collabName: collab ? `${collab.nome} ${collab.cognome}` : 'Utente',
        collabEmail: collab?.email ?? '',
        href: `/impostazioni`,
      });
    }

    for (const u of (onboardingIncompleteRes.data ?? []) as { user_id: string }[]) {
      const collab = blockCollabMap.get(u.user_id);
      blockItems.push({
        key: `onb-${u.user_id}`,
        blockType: 'onboarding_incomplete',
        userId: u.user_id,
        collabId: collab?.id ?? '',
        collabName: collab ? `${collab.nome} ${collab.cognome}` : 'Utente',
        collabEmail: collab?.email ?? '',
        href: collab?.id ? `/impostazioni` : `/impostazioni`,
      });
    }

    // stalled comps already fetched above — add block items for those >3 days
    for (const c of (stalledCompsRes.data ?? []) as {
      id: string; stato: string; created_at: string; collaborator_id: string; community_id: string;
    }[]) {
      const collab = collabMap.get(c.collaborator_id);
      const days = Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000);
      blockItems.push({
        key: `stall-comp-${c.id}`,
        blockType: 'stalled_comp',
        userId: '',
        collabId: c.collaborator_id,
        collabName: collab ? `${collab.nome} ${collab.cognome}` : '',
        collabEmail: collab?.email ?? '',
        entityId: c.id,
        href: `/coda?tab=compensi`,
        daysWaiting: days,
      });
    }

    for (const e of (stalledExpsRes.data ?? []) as {
      id: string; stato: string; created_at: string; collaborator_id: string; community_id: string;
    }[]) {
      const collab = collabMap.get(e.collaborator_id);
      const days = Math.floor((Date.now() - new Date(e.created_at).getTime()) / 86400000);
      blockItems.push({
        key: `stall-exp-${e.id}`,
        blockType: 'stalled_exp',
        userId: '',
        collabId: e.collaborator_id,
        collabName: collab ? `${collab.nome} ${collab.cognome}` : '',
        collabEmail: collab?.email ?? '',
        entityId: e.id,
        href: `/coda?tab=rimborsi`,
        daysWaiting: days,
      });
    }

    const dashData: AdminDashboardData = {
      kpis,
      communityCards,
      periodMetrics,
      feedItems,
      blockItems,
      hero: {
        nome:            adminCollab?.nome ?? null,
        cognome:         adminCollab?.cognome ?? null,
        foto_profilo_url: adminCollab?.foto_profilo_url ?? null,
        data_ingresso:   adminCollab?.data_ingresso ?? null,
        roleLabel:       ROLE_LABELS['amministrazione'],
      },
    };

    return <AdminDashboard data={dashData} />;
  }

  // Fetch collaborator record
  const { data: collaborator } = await supabase
    .from('collaborators')
    .select('id, nome, cognome, iban, codice_fiscale, importo_lordo_massimale, approved_lordo_ytd, approved_year, foto_profilo_url, data_ingresso')
    .eq('user_id', user.id)
    .single();

  // Fetch user's community IDs for content filtering
  const { data: collabComms } = collaborator?.id
    ? await supabase.from('collaborator_communities').select('community_id').eq('collaborator_id', collaborator.id)
    : { data: null };
  const userCommunityIds: string[] = (collabComms ?? []).map((r: { community_id: string }) => r.community_id);

  // Parallel main fetches
  const docsQuery = collaborator
    ? supabase.from('documents')
        .select('id, titolo, tipo, created_at')
        .eq('collaborator_id', collaborator.id)
        .eq('stato_firma', 'DA_FIRMARE')
        .order('created_at', { ascending: false })
    : Promise.resolve({ data: null as DashboardDocItem[] | null, error: null });

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
  ] = await Promise.all([
    supabase.from('compensations').select('id, stato, importo_netto, importo_lordo, liquidated_at'),
    supabase.from('expense_reimbursements').select('id, stato, importo, liquidated_at'),
    docsQuery,
    supabase.from('tickets').select('id, oggetto, stato, priority').eq('creator_user_id', user.id),
    supabase.from('events')
      .select('id, titolo, start_datetime, tipo, community_ids')
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
  ]);

  // Derive IDs for second-tier queries
  const openTickets   = (allTickets ?? []).filter((t: { id: string; oggetto: string; stato: string; priority: string }) => t.stato !== 'CHIUSO');
  const openTicketIds = openTickets.map((t: { id: string }) => t.id);

  // Service client for ticket_messages (bypasses RLS — ticket service role pattern)
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

  // ── Aggregations ──────────────────────────────────────────

  // Cards — compensi
  const activeComps    = (compensations ?? []).filter((c: CompRow) => ACTIVE_STATES.has(c.stato));
  const compTotal      = activeComps.reduce((s: number, c: CompRow) => s + compAmount(c), 0);
  const pendingComps   = activeComps.filter((c: CompRow) => c.stato === 'APPROVATO');
  const compPendingTot = pendingComps.reduce((s: number, c: CompRow) => s + compAmount(c), 0);

  // Cards — rimborsi
  const activeExps    = (expenses ?? []).filter((e: ExpRow) => ACTIVE_STATES.has(e.stato));
  const expTotal      = activeExps.reduce((s: number, e: ExpRow) => s + (e.importo ?? 0), 0);
  const pendingExps   = activeExps.filter((e: ExpRow) => e.stato === 'APPROVATO');
  const expPendingTot = pendingExps.reduce((s: number, e: ExpRow) => s + (e.importo ?? 0), 0);

  // Card — documenti da firmare
  const daFirmareCount = (docsToSign ?? []).length;

  // Ticket senza risposta: last message per ticket not from current user
  const lastMsgByTicket: Record<string, MsgRow> = {};
  for (const msg of (ticketMsgs ?? []) as MsgRow[]) {
    if (!lastMsgByTicket[msg.ticket_id]) lastMsgByTicket[msg.ticket_id] = msg;
  }
  const ticketNeedsReply = openTicketIds.filter((id: string) => {
    const last = lastMsgByTicket[id];
    return last && last.author_user_id !== user.id;
  }).length;

  const profiloIncompleto = !collaborator?.iban || !collaborator?.codice_fiscale;

  // Da ricevere — APPROVATO netto compensi + APPROVATO rimborsi
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

  // Bar chart — ultimi 6 mesi
  const barData = buildBarData(compensations ?? [], expenses ?? []);
  const barHasData = barData.some((d) => d.compensi > 0 || d.rimborsi > 0);

  // Da fare — ticket senza risposta + profilo incompleto (docs shown in Ultimi aggiornamenti)
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

  // Dashboard updates — events, comunicazioni, opportunita
  type EventRaw = { id: string; titolo: string; start_datetime: string | null; tipo: string | null; community_ids: string[] };
  type CommRaw  = { id: string; titolo: string; published_at: string; community_ids: string[] };
  type ResRaw   = { id: string; titolo: string; created_at: string; categoria: string; community_ids: string[] };
  type OppRaw   = { id: string; titolo: string; created_at: string; tipo: string; community_ids: string[] };
  type DiscRaw  = { id: string; titolo: string; valid_to: string | null; fornitore: string; created_at: string; community_ids: string[] };

  function contentVisible(communityIds: string[]): boolean {
    return communityIds.length === 0 || communityIds.some((id) => userCommunityIds.includes(id));
  }

  const dashboardEvents: DashboardEventItem[] = ((dashEvents ?? []) as EventRaw[])
    .filter((e) => contentVisible(e.community_ids))
    .slice(0, 4)
    .map((e) => ({
      id: e.id,
      titolo: e.titolo,
      start_datetime: e.start_datetime,
      tipo: e.tipo as DashboardEventItem['tipo'],
    }));

  const commItems: DashboardCommItem[] = [
    ...((dashComms ?? []) as CommRaw[])
      .filter((c) => contentVisible(c.community_ids))
      .map((c) => ({
        id: c.id, titolo: c.titolo, date: c.published_at, kind: 'comm' as const,
      })),
    ...((dashResources ?? []) as ResRaw[])
      .filter((r) => contentVisible(r.community_ids))
      .map((r) => ({
        id: r.id, titolo: r.titolo, date: r.created_at,
        categoria: r.categoria as DashboardCommItem['categoria'],
        kind: 'resource' as const,
      })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  const oppItems: DashboardOppItem[] = [
    ...((dashOpps ?? []) as OppRaw[])
      .filter((o) => contentVisible(o.community_ids))
      .map((o) => ({
        id: o.id, titolo: o.titolo, date: o.created_at, tipo: o.tipo, kind: 'opp' as const,
      })),
    ...((dashDiscounts ?? []) as DiscRaw[])
      .filter((d) => contentVisible(d.community_ids))
      .map((d) => ({
        id: d.id, titolo: d.titolo, date: d.created_at, kind: 'discount' as const,
      })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  // Unread content notification counts — grouped by tab
  const unreadCounts = { events: 0, communicationsResources: 0, opportunitiesDiscounts: 0 };
  for (const n of (unreadNotifs ?? []) as { entity_type: string }[]) {
    if (n.entity_type === 'event') unreadCounts.events++;
    else if (n.entity_type === 'communication') unreadCounts.communicationsResources++;
    else if (n.entity_type === 'opportunity' || n.entity_type === 'discount') unreadCounts.opportunitiesDiscounts++;
  }

  // Data corrente in italiano per il saluto
  const todayStr = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).replace(/^\w/, (c) => c.toUpperCase());

  // Hero — profile card data
  const roleLabel = ROLE_LABELS[role as Role] ?? role;
  const fullName  = [collaborator?.nome, collaborator?.cognome].filter(Boolean).join(' ');
  const initials  = [collaborator?.nome, collaborator?.cognome]
    .filter(Boolean)
    .map((n) => n!.charAt(0).toUpperCase())
    .join('') || '?';
  const joinDate = collaborator?.data_ingresso
    ? new Date(collaborator.data_ingresso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-4xl space-y-6">

      {/* Hero — avatar + saluto + data */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent flex-shrink-0 overflow-hidden flex items-center justify-center">
            {collaborator?.foto_profilo_url ? (
              <img src={collaborator.foto_profilo_url} alt="" className="w-full h-full object-cover" />
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
          </div>
        </div>
        <p className="shrink-0 pt-1 text-right text-sm text-muted-foreground">{todayStr}</p>
      </div>

      {/* 4 KPI card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {/* Compensi in corso */}
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

        {/* Rimborsi in corso */}
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

        {/* Da ricevere */}
        <Link href="/compensi" className={sectionCls + ' p-4 flex flex-col gap-2 hover:bg-muted/60 transition'}>
          <span className="text-xs text-muted-foreground">Da ricevere</span>
          <p className={`text-lg font-semibold tabular-nums leading-tight ${daRicevere > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-muted-foreground'}`}>
            {eur(daRicevere)}
          </p>
          <p className="text-xs text-muted-foreground">approvato</p>
        </Link>

        {/* Da firmare */}
        <Link href="/profilo?tab=documenti" className={sectionCls + ' p-4 flex flex-col gap-2 hover:bg-muted/60 transition'}>
          <span className="text-xs text-muted-foreground">Da firmare</span>
          <p className={`text-2xl font-bold tabular-nums leading-tight ${daFirmareCount > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-muted-foreground'}`}>
            {daFirmareCount}
          </p>
          <p className="text-xs text-muted-foreground">document{daFirmareCount === 1 ? 'o' : 'i'}</p>
        </Link>
      </div>

      {/* Ultimi aggiornamenti — tabs */}
      <DashboardUpdates
        documents={(docsToSign ?? []) as DashboardDocItem[]}
        events={dashboardEvents}
        comunicazioni={commItems}
        opportunita={oppItems}
        unreadCounts={unreadCounts}
      />

      {/* Da fare — ticket senza risposta + profilo incompleto */}
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

      {/* I miei pagamenti — PaymentOverview */}
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

      {/* Bar chart — ultimi 6 mesi */}
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
