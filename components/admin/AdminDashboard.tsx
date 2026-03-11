'use client';

import { useState } from 'react';
import CountUp from 'react-countup';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ShieldCheck, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AdminDashboardData, AdminCommunityCard, AdminCommunityCompRecord, AdminCommunityExpRecord, AdminCommunityDocRecord } from './types';
import type { AdminHero } from './types';
import BlocksDrawer from './BlocksDrawer';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import StatusBadge from '@/components/compensation/StatusBadge';

// ── Helpers ────────────────────────────────────────────────
function eur(n: number) {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

const sectionCls = 'rounded-2xl bg-card border border-border';

// ── KPI Card ───────────────────────────────────────────────
function KpiCard({
  label, value, sub, highlight, currency,
}: {
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
  currency?: boolean;
}) {
  const formattingFn = currency
    ? (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
    : undefined;
  return (
    <div className={sectionCls + ' p-5 animate-in fade-in slide-in-from-bottom-2 duration-500'}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={
        'text-2xl font-semibold tabular-nums ' +
        (highlight ? 'text-amber-600 dark:text-amber-300' : 'text-foreground')
      }>
        <CountUp end={value} duration={1.2} formattingFn={formattingFn} />
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Filter Tab ─────────────────────────────────────────────
function FilterTab({
  label, count, active, onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={
        'rounded-xl border px-3 py-2 text-center transition cursor-pointer w-full ' +
        (active
          ? 'bg-sidebar-accent border-border/60 text-foreground'
          : 'bg-muted/60 border-border/40 text-muted-foreground hover:bg-muted')
      }
    >
      <p className={
        'text-lg font-semibold tabular-nums leading-none ' +
        (active && count > 0 ? 'text-amber-600 dark:text-amber-300' : '')
      }>
        {count}
      </p>
      <p className="text-[10px] mt-0.5">{label}</p>
    </button>
  );
}

// ── Record Row ─────────────────────────────────────────────
type RecordRowProps =
  | { tab: 'comps'; record: AdminCommunityCompRecord }
  | { tab: 'exps'; record: AdminCommunityExpRecord }
  | { tab: 'docs'; record: AdminCommunityDocRecord };

function RecordRow(props: RecordRowProps) {
  const { tab, record } = props;
  const fmtDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : '—';

  if (tab === 'comps') {
    const r = record as AdminCommunityCompRecord;
    return (
      <Link
        href={r.href}
        className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 border border-border/30 px-3 py-2.5 hover:bg-muted/70 transition"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground truncate">{r.collabName}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDate(r.dataCompetenza)}</p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <StatusBadge stato={r.stato as Parameters<typeof StatusBadge>[0]['stato']} />
          <p className="text-xs font-semibold tabular-nums text-foreground">{eur(r.importoNetto)}</p>
        </div>
      </Link>
    );
  }

  if (tab === 'exps') {
    const r = record as AdminCommunityExpRecord;
    return (
      <Link
        href={r.href}
        className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 border border-border/30 px-3 py-2.5 hover:bg-muted/70 transition"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground truncate">{r.collabName}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDate(r.createdAt)}</p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <StatusBadge stato={r.stato as Parameters<typeof StatusBadge>[0]['stato']} />
          <p className="text-xs font-semibold tabular-nums text-foreground">{eur(r.importo)}</p>
        </div>
      </Link>
    );
  }

  const r = record as AdminCommunityDocRecord;
  return (
    <Link
      href={r.href}
      className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 border border-border/30 px-3 py-2.5 hover:bg-muted/70 transition"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground truncate">{r.collabName}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{r.tipo}</p>
      </div>
      <p className="text-[10px] text-muted-foreground shrink-0">{fmtDate(r.createdAt)}</p>
    </Link>
  );
}

// ── Community Column ────────────────────────────────────────
type Tab = 'comps' | 'exps' | 'docs';

function CommunityColumn({ card }: { card: AdminCommunityCard }) {
  const [tab, setTab] = useState<Tab>('comps');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const records: (AdminCommunityCompRecord | AdminCommunityExpRecord | AdminCommunityDocRecord)[] =
    tab === 'comps' ? card.comps : tab === 'exps' ? card.exps : card.docs;

  const totalPages = Math.ceil(records.length / PAGE_SIZE);
  const pageRecords = records.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleTab = (t: Tab) => { setTab(t); setPage(0); };

  return (
    <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">{card.name}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <FilterTab label="Compensi" count={card.compsActiveCount} active={tab === 'comps'} onClick={() => handleTab('comps')} />
        <FilterTab label="Rimborsi" count={card.expsActiveCount} active={tab === 'exps'} onClick={() => handleTab('exps')} />
        <FilterTab label="Da firmare" count={card.docsToSignCount} active={tab === 'docs'} onClick={() => handleTab('docs')} />
      </div>

      <div className="space-y-1.5">
        {pageRecords.length === 0 ? (
          <EmptyState icon={Inbox} title="Nessun elemento" className="py-6" />
        ) : (
          pageRecords.map(r => (
            <RecordRow key={r.id} tab={tab} record={r as never} />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-1 pt-1">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 0}
            aria-label="Pagina precedente"
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground px-1">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages - 1}
            aria-label="Pagina successiva"
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Period chart tooltip ───────────────────────────────────
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-muted border border-border px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.name === 'Importo pagato'
            ? eur(p.value)
            : p.value}
        </p>
      ))}
    </div>
  );
}

// ── Hero ───────────────────────────────────────────────────
function AdminHeroSection({ hero }: { hero: AdminHero }) {
  const fullName = [hero.nome, hero.cognome].filter(Boolean).join(' ');
  const initials = [hero.nome, hero.cognome].filter(Boolean).map((n) => n!.charAt(0).toUpperCase()).join('') || '?';
  const joinDate = hero.data_ingresso
    ? new Date(hero.data_ingresso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const todayStr = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-accent flex-shrink-0 overflow-hidden flex items-center justify-center">
          <ShieldCheck className="h-7 w-7 text-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Ciao{fullName ? `, ${fullName}` : ''}!
          </h1>
          <span className="mt-1.5 inline-flex items-center rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs text-foreground">
            {hero.roleLabel}
          </span>
          {joinDate && (
            <p className="text-xs text-muted-foreground mt-1.5">Data di ingresso: {joinDate}</p>
          )}
        </div>
      </div>
      <p className="shrink-0 pt-1 text-right text-sm text-muted-foreground">{todayStr}</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────
export default function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const {
    kpis, communityCards, periodMetrics,
    blockItems, hero,
  } = data;

  const [showBlocks, setShowBlocks] = useState(false);

  // Period chart data
  const chartData = [
    {
      label: 'Mese prec.',
      'Importo pagato': periodMetrics.lastMonth.paidAmount,
      'Compensi approvati': periodMetrics.lastMonth.approvedCount,
      'Nuovi collab.': periodMetrics.lastMonth.newCollabs,
    },
    {
      label: 'Mese corr.',
      'Importo pagato': periodMetrics.currentMonth.paidAmount,
      'Compensi approvati': periodMetrics.currentMonth.approvedCount,
      'Nuovi collab.': periodMetrics.currentMonth.newCollabs,
    },
    {
      label: 'YTD',
      'Importo pagato': periodMetrics.ytd.paidAmount,
      'Compensi approvati': periodMetrics.ytd.approvedCount,
      'Nuovi collab.': periodMetrics.ytd.newCollabs,
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-6">

      {/* ── Hero ── */}
      <AdminHeroSection hero={hero} />

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Panoramica operativa</p>
        </div>
        <Button
          onClick={() => setShowBlocks(true)}
          className={
            'relative rounded-xl px-4 py-2 text-sm font-medium ' +
            (blockItems.length > 0
              ? 'bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60'
              : 'bg-muted border border-border text-muted-foreground hover:text-foreground')
          }
        >
          {blockItems.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 rounded-full bg-red-500 dark:bg-red-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
              {blockItems.length}
            </span>
          )}
          Situazioni di blocco
        </Button>
      </div>

      {/* ── KPI cards ── */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Compensi da approvare" value={kpis.compsInAttesaCount} sub={eur(kpis.compsInAttesaAmount)} highlight={kpis.compsInAttesaCount > 0} />
          <KpiCard label="Rimborsi da approvare" value={kpis.expsInAttesaCount} sub={eur(kpis.expsInAttesaAmount)} highlight={kpis.expsInAttesaCount > 0} />
          <KpiCard label="Compensi da liquidare" value={kpis.compsApprovatoCount} sub={eur(kpis.compsApprovatoAmount)} highlight={kpis.compsApprovatoCount > 0} />
          <KpiCard label="Rimborsi da liquidare" value={kpis.expsApprovatoCount} sub={eur(kpis.expsApprovatoAmount)} highlight={kpis.expsApprovatoCount > 0} />
          <KpiCard label="Compensi liquidati" value={kpis.compsLiquidatoCount} sub={eur(kpis.compsLiquidatoAmount)} />
          <KpiCard label="Rimborsi liquidati" value={kpis.expsLiquidatoCount} sub={eur(kpis.expsLiquidatoAmount)} />
        </div>
      </section>

      {/* ── Community columns ── */}
      {communityCards.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Community</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {communityCards.map(c => (
              <CommunityColumn key={c.id} card={c} />
            ))}
          </div>
        </section>
      )}

      {/* ── Period metrics chart ── */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Metriche periodo
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Importo pagato */}
          <div className={sectionCls + ' p-5'}>
            <p className="text-xs text-muted-foreground mb-4">Importo pagato (€)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={28}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(128,128,128,0.06)' }} />
                <Bar dataKey="Importo pagato" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Conteggi */}
          <div className={sectionCls + ' p-5'}>
            <p className="text-xs text-muted-foreground mb-4">Compensi approvati / Nuovi collaboratori</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={20} barCategoryGap="30%">
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(128,128,128,0.06)' }} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-muted-foreground)' }} />
                <Bar dataKey="Compensi approvati" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Nuovi collab." fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* YTD summary strip */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={sectionCls + ' px-4 py-3 text-center'}>
            <p className="text-xs text-muted-foreground">YTD pagato</p>
            <p className="text-lg font-semibold tabular-nums text-brand dark:text-brand mt-0.5">{eur(periodMetrics.ytd.paidAmount)}</p>
          </div>
          <div className={sectionCls + ' px-4 py-3 text-center'}>
            <p className="text-xs text-muted-foreground">YTD compensi approvati</p>
            <p className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-300 mt-0.5">{periodMetrics.ytd.approvedCount}</p>
          </div>
          <div className={sectionCls + ' px-4 py-3 text-center'}>
            <p className="text-xs text-muted-foreground">YTD nuovi collab.</p>
            <p className="text-lg font-semibold tabular-nums text-violet-600 dark:text-violet-300 mt-0.5">{periodMetrics.ytd.newCollabs}</p>
          </div>
        </div>
      </section>


      {/* ── Blocks drawer ── */}
      <BlocksDrawer
        items={blockItems}
        open={showBlocks}
        onClose={() => setShowBlocks(false)}
      />
    </div>
  );
}
