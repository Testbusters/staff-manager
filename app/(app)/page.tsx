import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import AdminDashboard from '@/components/admin/AdminDashboard';
import type { AdminDashboardData } from '@/components/admin/types';
import PaymentOverview from '@/components/compensation/PaymentOverview';
import DashboardBarChart from '@/components/compensation/DashboardBarChart';
import type { BarMonthData } from '@/components/compensation/DashboardBarChart';
import DashboardUpdates from '@/components/compensation/DashboardUpdates';
import type { DashboardDocItem, DashboardEventItem, DashboardCommItem, DashboardOppItem } from '@/components/compensation/DashboardUpdates';

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

type CommStat = {
  id: string;
  name: string;
  pendingComps: number;
  pendingExps: number;
  docsToSign: number;
  totalCollabs: number;
  stalloCount: number;
};


// ── Helpers ────────────────────────────────────────────────
const sectionCls = 'rounded-2xl bg-gray-900 border border-gray-800';

// ── Types used by responsabile feed ─────────────────────────
type FeedItem = {
  key:  string;
  icon: 'comp' | 'exp' | 'ticket' | 'ann';
  text: string;
  date: string;
  href: string;
};

const FEED_ICONS: Record<FeedItem['icon'], string> = {
  comp:   '💼',
  exp:    '🧾',
  ticket: '💬',
  ann:    '📣',
};

function FeedRow({ item }: { item: FeedItem }) {
  return (
    <Link
      href={item.href}
      className="flex items-start gap-3 py-2.5 px-1 rounded-lg hover:bg-gray-800/50 transition group"
    >
      <span className="text-base mt-0.5 flex-shrink-0">{FEED_ICONS[item.icon]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-300 group-hover:text-gray-100 truncate transition">{item.text}</p>
        <p className="text-xs text-gray-600 mt-0.5">
          {new Date(item.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>
    </Link>
  );
}

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
        <h2 className="text-sm font-medium text-gray-200">{label}</h2>
        <span className="rounded-full bg-gray-800 border border-gray-700 px-2.5 py-0.5 text-xs text-gray-400">
          {count} attiv{count === 1 ? 'o' : 'i'}
        </span>
      </div>
      <div>
        <p className="text-2xl font-semibold text-gray-100 tabular-nums">{eur(total)}</p>
        <p className="text-xs text-gray-500 mt-0.5">importo totale in corso</p>
      </div>
      {pendingCount > 0 && (
        <div className="rounded-lg bg-emerald-950/40 border border-emerald-800/30 px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-emerald-400">In attesa liquidazione ({pendingCount})</span>
          <span className="text-xs font-medium text-emerald-300 tabular-nums">{eur(pendingTotal)}</span>
        </div>
      )}
    </div>
  );
}

function DocCard({ count }: { count: number }) {
  return (
    <div className={sectionCls + ' p-5 flex flex-col gap-3'}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-200">Da firmare</h2>
        <span className={
          count > 0
            ? 'rounded-full bg-amber-900/60 border border-amber-700/50 px-2.5 py-0.5 text-xs text-amber-300'
            : 'rounded-full bg-gray-800 border border-gray-700 px-2.5 py-0.5 text-xs text-gray-400'
        }>
          {count}
        </span>
      </div>
      {count > 0 ? (
        <>
          <p className="text-sm text-amber-300/80">
            {count === 1 ? 'Hai 1 documento' : `Hai ${count} documenti`} in attesa di firma.
          </p>
          <Link href="/profilo?tab=documenti" className="text-xs text-blue-400 hover:text-blue-300 transition">
            Vai ai documenti →
          </Link>
        </>
      ) : (
        <p className="text-xs text-gray-500">Nessun documento in attesa di firma.</p>
      )}
    </div>
  );
}

function CommCard({ stat }: { stat: CommStat }) {
  return (
    <div className={sectionCls + ' p-5 space-y-4'}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-100">{stat.name}</h2>
        <span className="text-xs text-gray-500">
          {stat.totalCollabs} collaborator{stat.totalCollabs === 1 ? 'e' : 'i'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Link
          href="/approvazioni?tab=compensi"
          className={`flex flex-col items-center justify-center rounded-xl py-3 px-2 transition ${
            stat.pendingComps > 0
              ? 'bg-amber-950/40 border border-amber-800/30 hover:bg-amber-950/60'
              : 'bg-gray-800/50 border border-gray-700/50'
          }`}
        >
          <span className={`text-2xl font-bold tabular-nums ${stat.pendingComps > 0 ? 'text-amber-300' : 'text-gray-600'}`}>
            {stat.pendingComps}
          </span>
          <span className="text-xs text-gray-400 mt-1 text-center leading-tight">Compensi</span>
        </Link>
        <Link
          href="/approvazioni?tab=rimborsi"
          className={`flex flex-col items-center justify-center rounded-xl py-3 px-2 transition ${
            stat.pendingExps > 0
              ? 'bg-amber-950/40 border border-amber-800/30 hover:bg-amber-950/60'
              : 'bg-gray-800/50 border border-gray-700/50'
          }`}
        >
          <span className={`text-2xl font-bold tabular-nums ${stat.pendingExps > 0 ? 'text-amber-300' : 'text-gray-600'}`}>
            {stat.pendingExps}
          </span>
          <span className="text-xs text-gray-400 mt-1 text-center leading-tight">Rimborsi</span>
        </Link>
        <Link
          href="/collaboratori?filter=documenti"
          className={`flex flex-col items-center justify-center rounded-xl py-3 px-2 transition ${
            stat.docsToSign > 0
              ? 'bg-blue-950/40 border border-blue-800/30 hover:bg-blue-950/60'
              : 'bg-gray-800/50 border border-gray-700/50'
          }`}
        >
          <span className={`text-2xl font-bold tabular-nums ${stat.docsToSign > 0 ? 'text-blue-300' : 'text-gray-600'}`}>
            {stat.docsToSign}
          </span>
          <span className="text-xs text-gray-400 mt-1 text-center leading-tight">Da firmare</span>
        </Link>
      </div>
      {stat.stalloCount > 0 && (
        <p className="text-xs text-gray-500 border-t border-gray-800 pt-3">
          {stat.stalloCount} richiesta{stat.stalloCount === 1 ? '' : 'e'} in pipeline
        </p>
      )}
    </div>
  );
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

    // Round 1 — community IDs for this responsabile
    const { data: ucaRows } = await svc
      .from('user_community_access')
      .select('community_id')
      .eq('user_id', user.id);

    const communityIds = (ucaRows ?? []).map((r: { community_id: string }) => r.community_id);

    if (communityIds.length === 0) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-gray-500">Nessuna community assegnata.</p>
        </div>
      );
    }

    // Round 2 — communities + collaborator IDs (separate queries, no join) + announcements
    type CommunityRow = { id: string; name: string };
    type CCRow        = { collaborator_id: string; community_id: string };
    type AnnRow       = { id: string; titolo: string; published_at: string };

    const [commResult, ccResult, annResult] = await Promise.all([
      svc.from('communities').select('id, name').in('id', communityIds),
      svc.from('collaborator_communities').select('collaborator_id, community_id').in('community_id', communityIds),
      svc.from('communications')
        .select('id, titolo, published_at')
        .order('pinned', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(3),
    ]);

    const commRows = commResult.data as CommunityRow[] | null;
    const ccRows   = ccResult.data   as CCRow[] | null;
    const annRows  = annResult.data  as AnnRow[] | null;

    // Build lookup maps from round 2
    const allCollabIds: string[] = [...new Set((ccRows ?? []).map(r => r.collaborator_id))];
    const collabIdsByComm: Record<string, Set<string>> = {};
    const commNameMap: Record<string, string> = {};

    for (const c of commRows ?? []) commNameMap[c.id] = c.name;
    for (const row of ccRows ?? []) {
      if (!collabIdsByComm[row.community_id]) collabIdsByComm[row.community_id] = new Set();
      collabIdsByComm[row.community_id].add(row.collaborator_id);
    }

    const noCollabs = allCollabIds.length === 0;

    // Round 3 — all data in parallel using collabIds
    type CollabRow = { id: string; nome: string | null; cognome: string | null };
    type PComp     = { id: string; collaborator_id: string; community_id: string; created_at: string };
    type PExp      = { id: string; collaborator_id: string; created_at: string };
    type DocRow2   = { id: string; collaborator_id: string; community_id: string };
    type SComp     = { id: string; collaborator_id: string; community_id: string };
    type SExp      = { id: string; collaborator_id: string };

    const resolve = <T,>(v: T[]) => Promise.resolve({ data: v, error: null });

    const [collabsResult, pcRes, peRes, ddRes, scRes, seRes] = await Promise.all([
      noCollabs ? resolve<CollabRow>([]) : svc.from('collaborators')
        .select('id, nome, cognome').in('id', allCollabIds),
      noCollabs ? resolve<PComp>([]) : svc.from('compensations')
        .select('id, collaborator_id, community_id, created_at')
        .in('collaborator_id', allCollabIds).eq('stato', 'IN_ATTESA')
        .order('created_at', { ascending: false }).limit(20),
      noCollabs ? resolve<PExp>([]) : svc.from('expense_reimbursements')
        .select('id, collaborator_id, created_at')
        .in('collaborator_id', allCollabIds).eq('stato', 'IN_ATTESA')
        .order('created_at', { ascending: false }).limit(20),
      noCollabs ? resolve<DocRow2>([]) : svc.from('documents')
        .select('id, collaborator_id, community_id')
        .in('collaborator_id', allCollabIds).eq('stato_firma', 'DA_FIRMARE'),
      noCollabs ? resolve<SComp>([]) : svc.from('compensations')
        .select('id, collaborator_id, community_id')
        .in('collaborator_id', allCollabIds)
        .neq('stato', 'LIQUIDATO').neq('stato', 'RIFIUTATO'),
      noCollabs ? resolve<SExp>([]) : svc.from('expense_reimbursements')
        .select('id, collaborator_id')
        .in('collaborator_id', allCollabIds)
        .neq('stato', 'LIQUIDATO').neq('stato', 'RIFIUTATO'),
    ]);

    const allCollabs   = (collabsResult.data ?? []) as CollabRow[];
    const pendingComps = (pcRes.data ?? []) as PComp[];
    const pendingExps  = (peRes.data ?? []) as PExp[];
    const docsToSign   = (ddRes.data ?? []) as DocRow2[];
    const stalloComps  = (scRes.data ?? []) as SComp[];
    const stalloExps   = (seRes.data ?? []) as SExp[];

    const collabByCollabId: Record<string, { nome: string; cognome: string }> = {};
    for (const c of allCollabs) collabByCollabId[c.id] = { nome: c.nome ?? '', cognome: c.cognome ?? '' };

    // ── Per-community stats ──────────────────────────────────
    const communityStats: CommStat[] = communityIds.map(commId => {
      const collabsInComm = collabIdsByComm[commId] ?? new Set<string>();
      return {
        id:           commId,
        name:         commNameMap[commId] ?? commId,
        pendingComps: pendingComps.filter(c => c.community_id === commId).length,
        pendingExps:  pendingExps.filter(e => collabsInComm.has(e.collaborator_id)).length,
        docsToSign:   docsToSign.filter(d => d.community_id === commId).length,
        totalCollabs: collabsInComm.size,
        stalloCount:  stalloComps.filter(c => c.community_id === commId).length +
                      stalloExps.filter(e => collabsInComm.has(e.collaborator_id)).length,
      };
    });

    // ── Cosa devo fare ───────────────────────────────────────
    const collabsWithDocs = new Set(docsToSign.map(d => d.collaborator_id)).size;
    const rCosaDevoFare = [
      pendingComps.length > 0 && {
        text: `${pendingComps.length} compensi in attesa di approvazione`,
        href: '/approvazioni?tab=compensi',
      },
      pendingExps.length > 0 && {
        text: `${pendingExps.length} rimborsi in attesa di approvazione`,
        href: '/approvazioni?tab=rimborsi',
      },
      collabsWithDocs > 0 && {
        text: `${collabsWithDocs} collaboratore${collabsWithDocs === 1 ? '' : 'i'} con documenti da firmare`,
        href: '/collaboratori?filter=documenti',
      },
    ].filter(Boolean) as { text: string; href: string }[];

    // ── Feed ─────────────────────────────────────────────────
    const rFeedItems: FeedItem[] = [];

    for (const c of pendingComps.slice(0, 5)) {
      const collab = collabByCollabId[c.collaborator_id];
      const name = collab ? `${collab.nome} ${collab.cognome}`.trim() : 'Collaboratore';
      rFeedItems.push({ key: `pc-${c.id}`, icon: 'comp', text: `Compenso inviato da ${name}`, date: c.created_at, href: `/collaboratori/${c.collaborator_id}` });
    }
    for (const e of pendingExps.slice(0, 5)) {
      const collab = collabByCollabId[e.collaborator_id];
      const name = collab ? `${collab.nome} ${collab.cognome}`.trim() : 'Collaboratore';
      rFeedItems.push({ key: `pe-${e.id}`, icon: 'exp', text: `Rimborso inviato da ${name}`, date: e.created_at, href: `/collaboratori/${e.collaborator_id}` });
    }
    for (const a of annRows ?? []) {
      rFeedItems.push({ key: `ann-${a.id}`, icon: 'ann', text: a.titolo, date: a.published_at, href: '/comunicazioni' });
    }
    rFeedItems.sort((a, b) => b.date.localeCompare(a.date));
    const rFeed = rFeedItems.slice(0, 10);

    return (
      <div className="p-6 max-w-4xl space-y-6">
        <h1 className="text-xl font-semibold text-gray-100">Dashboard</h1>

        {/* Per-community overview cards */}
        <div className={`grid gap-4 ${communityStats.length === 1 ? 'grid-cols-1 max-w-sm' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {communityStats.map(stat => <CommCard key={stat.id} stat={stat} />)}
        </div>

        {/* Cosa devo fare */}
        {rCosaDevoFare.length > 0 && (
          <div className={sectionCls}>
            <div className="px-5 py-4 border-b border-gray-800">
              <h2 className="text-sm font-medium text-gray-200">Cosa devo fare</h2>
            </div>
            <div className="p-5 space-y-2">
              {rCosaDevoFare.map(item => (
                <Link
                  key={item.href + item.text}
                  href={item.href}
                  className="flex items-center gap-2 rounded-lg bg-amber-950/30 border border-amber-800/30 px-3 py-2.5 text-sm text-amber-300 hover:bg-amber-950/50 transition"
                >
                  <span className="flex-shrink-0 text-base">⚠</span>
                  {item.text}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Azioni rapide */}
        <div className={sectionCls}>
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-medium text-gray-200">Azioni rapide</h2>
          </div>
          <div className="p-5 flex flex-wrap gap-3">
            <Link href="/approvazioni" className="rounded-lg bg-blue-700 hover:bg-blue-600 px-4 py-2 text-sm font-medium text-white transition">
              Approvazioni
            </Link>
            <Link href="/collaboratori" className="rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition">
              Collaboratori
            </Link>
            <Link href="/ticket/nuova" className="rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition">
              + Apri ticket
            </Link>
          </div>
        </div>

        {/* Ultimi aggiornamenti */}
        <div className={sectionCls}>
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-medium text-gray-200">Ultimi aggiornamenti</h2>
          </div>
          <div className="px-4 py-2 divide-y divide-gray-800/50">
            {rFeed.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">Nessun aggiornamento recente.</p>
            ) : (
              rFeed.map(item => <FeedRow key={item.key} item={item} />)
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Admin dashboard ──────────────────────────
  if (role === 'amministrazione') {
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
    const stalledThreshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    // Parallel fetches
    const [
      pendingCompsRes,
      pendingExpsRes,
      inApprovalRes,
      toPayCompsRes,
      toPayExpsRes,
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
      // pending comps (IN_ATTESA)
      svc.from('compensations').select('id', { count: 'exact', head: true })
        .eq('stato', 'IN_ATTESA'),
      // pending exps
      svc.from('expense_reimbursements').select('id', { count: 'exact', head: true })
        .eq('stato', 'IN_ATTESA'),
      // in approval amount (APPROVATO comps)
      svc.from('compensations').select('importo_netto')
        .eq('stato', 'APPROVATO'),
      // to pay comps (APPROVATO)
      svc.from('compensations').select('importo_netto')
        .eq('stato', 'APPROVATO'),
      // to pay exps
      svc.from('expense_reimbursements').select('importo')
        .eq('stato', 'APPROVATO'),
      // docs to sign
      svc.from('documents').select('id', { count: 'exact', head: true })
        .eq('stato_firma', 'DA_FIRMARE'),
      // active collabs
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

    // Fetch collabs + communities lookup for urgenti/feed enrichment
    const allCollabIds = [
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
    const inApprovalAmount = (inApprovalRes.data ?? []).reduce((sum, c) => {
      return sum + (c.importo_netto ?? 0);
    }, 0);
    const toPayAmount = (toPayCompsRes.data ?? []).reduce((sum, c) => {
      return sum + (c.importo_netto ?? 0);
    }, 0) + (toPayExpsRes.data ?? []).reduce((sum, e) => sum + (e.importo ?? 0), 0);

    const kpis = {
      pendingCompsCount: pendingCompsRes.count ?? 0,
      pendingExpsCount: pendingExpsRes.count ?? 0,
      inApprovalAmount,
      toPayAmount,
      docsToSignCount: docsToSignRes.count ?? 0,
      activeCollabsCount: activeCollabsRes.count ?? 0,
    };

    // ── Community cards ──
    const communityCards = (communitiesRes.data ?? []).map(comm => {
      const pComps = (stalledCompsRes.data ?? []).filter((r: { community_id: string }) => r.community_id === comm.id).length;
      const pExps = (stalledExpsRes.data ?? []).filter((r: { community_id: string }) => r.community_id === comm.id).length;
      return {
        id: comm.id,
        name: comm.name,
        pendingComps: pComps,
        pendingExps: pExps,
        docsToSign: 0, // simplified — docs don't carry community_id directly
        collabCount: 0, // will be enriched below
      };
    });

    // enrich collabCount per community
    const collabCommRes = await svc.from('collab_communities')
      .select('community_id', { count: 'exact' });
    if (collabCommRes.data) {
      const countMap = new Map<string, number>();
      for (const row of collabCommRes.data as { community_id: string }[]) {
        countMap.set(row.community_id, (countMap.get(row.community_id) ?? 0) + 1);
      }
      for (const card of communityCards) {
        card.collabCount = countMap.get(card.id) ?? 0;
      }
    }

    // ── Collab breakdown ──
    const statusLabels: Record<string, string> = {
      attivo: 'Attivo',
      uscente_con_compenso: 'Uscente con compenso',
      uscente_senza_compenso: 'Uscente senza compenso',
    };
    const contractLabels: Record<string, string> = {
      OCCASIONALE: 'Occasionale',
      COCOCO: 'CoCoCo',
    };
    const statusCounts = new Map<string, number>();
    const contractCounts = new Map<string, number>();
    for (const c of (collabsByStatusRes.data ?? []) as { member_status: string | null }[]) {
      const k = c.member_status ?? 'attivo';
      statusCounts.set(k, (statusCounts.get(k) ?? 0) + 1);
    }
    for (const c of (collabsByContractRes.data ?? []) as { tipo_contratto: string | null }[]) {
      if (!c.tipo_contratto) continue;
      contractCounts.set(c.tipo_contratto, (contractCounts.get(c.tipo_contratto) ?? 0) + 1);
    }
    const collabBreakdown = {
      byStatus: Object.entries(statusLabels).map(([key, label]) => ({
        key, label, count: statusCounts.get(key) ?? 0,
      })),
      byContract: Object.entries(contractLabels).map(([key, label]) => ({
        key, label, count: contractCounts.get(key) ?? 0,
      })),
    };

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

    // ── Urgenti ──
    const urgentItems = [
      ...(stalledCompsRes.data ?? []).map((c: {
        id: string; stato: string; importo_netto: number | null;
        created_at: string; community_id: string; collaborator_id: string;
      }) => {
        const collab = collabMap.get(c.collaborator_id);
        const days = Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000);
        return {
          key: `comp-${c.id}`,
          entityType: 'compensation' as const,
          entityId: c.id,
          collabName: collab?.nome ?? '',
          collabCognome: collab?.cognome ?? '',
          collabId: c.collaborator_id,
          communityId: c.community_id,
          communityName: commMap.get(c.community_id) ?? '',
          daysWaiting: days,
          stato: c.stato,
          amount: c.importo_netto ?? 0,
          href: `/coda?tab=compensi&id=${c.id}`,
        };
      }),
      ...(stalledExpsRes.data ?? []).map((e: {
        id: string; stato: string; importo: number | null;
        created_at: string; community_id: string; collaborator_id: string;
      }) => {
        const collab = collabMap.get(e.collaborator_id);
        const days = Math.floor((Date.now() - new Date(e.created_at).getTime()) / 86400000);
        return {
          key: `exp-${e.id}`,
          entityType: 'expense' as const,
          entityId: e.id,
          collabName: collab?.nome ?? '',
          collabCognome: collab?.cognome ?? '',
          collabId: e.collaborator_id,
          communityId: e.community_id,
          communityName: commMap.get(e.community_id) ?? '',
          daysWaiting: days,
          stato: e.stato,
          amount: e.importo ?? 0,
          href: `/coda?tab=rimborsi&id=${e.id}`,
        };
      }),
    ].sort((a, b) => b.daysWaiting - a.daysWaiting);

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
      collabBreakdown,
      periodMetrics,
      urgentItems,
      feedItems,
      blockItems,
      communities: (communitiesRes.data ?? []).map(c => ({ id: c.id, name: c.name })),
    };

    return <AdminDashboard data={dashData} />;
  }

  // Fetch collaborator record
  const { data: collaborator } = await supabase
    .from('collaborators')
    .select('id, nome, cognome, iban, codice_fiscale, importo_lordo_massimale')
    .eq('user_id', user.id)
    .single();

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
  ] = await Promise.all([
    supabase.from('compensations').select('id, stato, importo_netto, importo_lordo, liquidated_at'),
    supabase.from('expense_reimbursements').select('id, stato, importo, liquidated_at'),
    docsQuery,
    supabase.from('tickets').select('id, oggetto, stato').eq('creator_user_id', user.id),
    supabase.from('events')
      .select('id, titolo, start_datetime, tipo')
      .order('start_datetime', { ascending: true, nullsFirst: false })
      .limit(4),
    supabase.from('communications')
      .select('id, titolo, published_at')
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('published_at', { ascending: false })
      .limit(2),
    supabase.from('resources')
      .select('id, titolo, created_at, categoria')
      .order('created_at', { ascending: false })
      .limit(2),
    supabase.from('opportunities')
      .select('id, titolo, created_at, tipo')
      .order('created_at', { ascending: false })
      .limit(2),
    supabase.from('discounts')
      .select('id, titolo, valid_to, fornitore, created_at')
      .order('created_at', { ascending: false })
      .limit(2),
  ]);

  // Derive IDs for second-tier queries
  const openTickets   = (allTickets ?? []).filter((t: { id: string; oggetto: string; stato: string }) => t.stato !== 'CHIUSO');
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
  const paidCurrentYear = compensPaidByYear.find((y) => y.year === currentYear)?.lordo ?? 0;

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
  const dashboardEvents: DashboardEventItem[] = ((dashEvents ?? []) as {
    id: string; titolo: string; start_datetime: string | null; tipo: string | null;
  }[]).map((e) => ({
    id: e.id,
    titolo: e.titolo,
    start_datetime: e.start_datetime,
    tipo: e.tipo as DashboardEventItem['tipo'],
  }));

  type CommRaw = { id: string; titolo: string; published_at: string };
  type ResRaw  = { id: string; titolo: string; created_at: string; categoria: string };
  type OppRaw  = { id: string; titolo: string; created_at: string; tipo: string };
  type DiscRaw = { id: string; titolo: string; valid_to: string | null; fornitore: string; created_at: string };

  const commItems: DashboardCommItem[] = [
    ...((dashComms ?? []) as CommRaw[]).map((c) => ({
      id: c.id, titolo: c.titolo, date: c.published_at, kind: 'comm' as const,
    })),
    ...((dashResources ?? []) as ResRaw[]).map((r) => ({
      id: r.id, titolo: r.titolo, date: r.created_at,
      categoria: r.categoria as DashboardCommItem['categoria'],
      kind: 'resource' as const,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  const oppItems: DashboardOppItem[] = [
    ...((dashOpps ?? []) as OppRaw[]).map((o) => ({
      id: o.id, titolo: o.titolo, date: o.created_at, tipo: o.tipo, kind: 'opp' as const,
    })),
    ...((dashDiscounts ?? []) as DiscRaw[]).map((d) => ({
      id: d.id, titolo: d.titolo, date: d.created_at, kind: 'discount' as const,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  // Data corrente in italiano per il saluto
  const todayStr = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).replace(/^\w/, (c) => c.toUpperCase());

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-4xl space-y-6">

      {/* Header — saluto + data */}
      <div>
        <h1 className="text-xl font-semibold text-gray-100">
          Ciao{collaborator?.nome ? `, ${collaborator.nome}` : ''}!
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{todayStr}</p>
      </div>

      {/* 4 KPI card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Compensi in corso */}
        <Link href="/compensi" className={sectionCls + ' p-4 flex flex-col gap-2 hover:bg-gray-800/50 transition'}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs text-gray-400 truncate">Compensi</span>
            <span className="flex-shrink-0 rounded-full bg-gray-800 border border-gray-700 px-2 py-0.5 text-xs text-gray-400 tabular-nums">
              {activeComps.length}
            </span>
          </div>
          <p className="text-lg font-semibold text-gray-100 tabular-nums leading-tight">{eur(compTotal)}</p>
          <p className="text-xs text-gray-600">in corso</p>
        </Link>

        {/* Rimborsi in corso */}
        <Link href="/rimborsi" className={sectionCls + ' p-4 flex flex-col gap-2 hover:bg-gray-800/50 transition'}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs text-gray-400 truncate">Rimborsi</span>
            <span className="flex-shrink-0 rounded-full bg-gray-800 border border-gray-700 px-2 py-0.5 text-xs text-gray-400 tabular-nums">
              {activeExps.length}
            </span>
          </div>
          <p className="text-lg font-semibold text-gray-100 tabular-nums leading-tight">{eur(expTotal)}</p>
          <p className="text-xs text-gray-600">in corso</p>
        </Link>

        {/* Da ricevere */}
        <Link href="/compensi" className={sectionCls + ' p-4 flex flex-col gap-2 hover:bg-gray-800/50 transition'}>
          <span className="text-xs text-gray-400">Da ricevere</span>
          <p className={`text-lg font-semibold tabular-nums leading-tight ${daRicevere > 0 ? 'text-amber-300' : 'text-gray-600'}`}>
            {eur(daRicevere)}
          </p>
          <p className="text-xs text-gray-600">approvato</p>
        </Link>

        {/* Da firmare */}
        <Link href="/profilo?tab=documenti" className={sectionCls + ' p-4 flex flex-col gap-2 hover:bg-gray-800/50 transition'}>
          <span className="text-xs text-gray-400">Da firmare</span>
          <p className={`text-2xl font-bold tabular-nums leading-tight ${daFirmareCount > 0 ? 'text-amber-300' : 'text-gray-600'}`}>
            {daFirmareCount}
          </p>
          <p className="text-xs text-gray-600">document{daFirmareCount === 1 ? 'o' : 'i'}</p>
        </Link>
      </div>

      {/* Ultimi aggiornamenti — tabs */}
      <DashboardUpdates
        documents={(docsToSign ?? []) as DashboardDocItem[]}
        events={dashboardEvents}
        comunicazioni={commItems}
        opportunita={oppItems}
      />

      {/* Da fare — ticket senza risposta + profilo incompleto */}
      {daFare.length > 0 && (
        <div className={sectionCls}>
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-medium text-gray-200">Da fare</h2>
          </div>
          <div className="p-4 space-y-2">
            {daFare.map((item) => (
              <Link
                key={item.href + item.text}
                href={item.href}
                className="flex items-center gap-2.5 rounded-lg bg-amber-950/30 border border-amber-800/30 px-3 py-2.5 text-sm text-amber-300 hover:bg-amber-950/50 transition"
              >
                <span className="flex-shrink-0">⚠</span>
                <span className="flex-1 min-w-0 truncate">{item.text}</span>
                <span className="flex-shrink-0 text-xs text-amber-500/60">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Azioni rapide */}
      <div className={sectionCls}>
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-medium text-gray-200">Azioni rapide</h2>
        </div>
        <div className="p-5 flex flex-wrap gap-3">
          <Link
            href="/rimborsi/nuova"
            className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-medium text-white transition"
          >
            + Nuovo rimborso
          </Link>
          <Link
            href="/compensi"
            className="rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition"
          >
            Compensi e rimborsi
          </Link>
          <Link
            href="/profilo?tab=documenti"
            className="rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition"
          >
            Carica documento
          </Link>
          <Link
            href="/ticket/nuova"
            className="rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition"
          >
            + Apri ticket
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
          <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-3">
            <h2 className="text-sm font-medium text-gray-200">Ultimi 6 mesi</h2>
            <div className="flex items-center gap-4 ml-auto">
              <span className="flex items-center gap-1.5 text-xs text-blue-400">
                <span className="inline-block w-3 h-3 rounded bg-blue-500 flex-shrink-0" />
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
