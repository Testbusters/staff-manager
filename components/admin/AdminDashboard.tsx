'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { AdminDashboardData } from './types';
import type { AdminHero } from './types';
import BlocksDrawer from './BlocksDrawer';
import { Button } from '@/components/ui/button';

// ── Helpers ────────────────────────────────────────────────
function eur(n: number) {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

const sectionCls = 'rounded-2xl bg-card border border-border';

// ── KPI Card ───────────────────────────────────────────────
function KpiCard({
  label, value, sub, highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={sectionCls + ' p-5'}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={
        'text-2xl font-semibold tabular-nums ' +
        (highlight ? 'text-amber-600 dark:text-amber-300' : 'text-foreground')
      }>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Community Card ─────────────────────────────────────────
function CommunityCard({
  name, pendingComps, pendingExps, docsToSign, collabCount,
}: {
  name: string;
  pendingComps: number;
  pendingExps: number;
  docsToSign: number;
  collabCount: number;
}) {
  return (
    <div className={sectionCls + ' p-5 space-y-3'}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground truncate">{name}</h3>
        <span className="text-xs text-muted-foreground shrink-0 ml-2">
          {collabCount} collab.
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-muted/60 border border-border/40 px-3 py-2 text-center">
          <p className={
            'text-lg font-semibold tabular-nums ' +
            (pendingComps > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-muted-foreground')
          }>
            {pendingComps}
          </p>
          <p className="text-[10px] text-muted-foreground">Compensi</p>
        </div>
        <div className="rounded-lg bg-muted/60 border border-border/40 px-3 py-2 text-center">
          <p className={
            'text-lg font-semibold tabular-nums ' +
            (pendingExps > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-muted-foreground')
          }>
            {pendingExps}
          </p>
          <p className="text-[10px] text-muted-foreground">Rimborsi</p>
        </div>
        <div className="rounded-lg bg-muted/60 border border-border/40 px-3 py-2 text-center">
          <p className={
            'text-lg font-semibold tabular-nums ' +
            (docsToSign > 0 ? 'text-blue-600 dark:text-blue-300' : 'text-muted-foreground')
          }>
            {docsToSign}
          </p>
          <p className="text-[10px] text-muted-foreground">Da firmare</p>
        </div>
      </div>
    </div>
  );
}

// ── Urgenti row ────────────────────────────────────────────
function UrgentRow({
  collabName, communityName, entityType, stato, amount, daysWaiting, href,
}: {
  collabName: string;
  communityName: string;
  entityType: string;
  stato: string;
  amount: number;
  daysWaiting: number;
  href: string;
}) {
  const typeLabel = entityType === 'compensation' ? 'Compenso' : entityType === 'expense' ? 'Rimborso' : 'Documento';
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 rounded-xl bg-muted/50 border border-border/40 px-4 py-3 hover:bg-muted transition group"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{collabName}</p>
        <p className="text-xs text-muted-foreground truncate">{communityName} · {typeLabel} · {stato}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums text-foreground">{eur(amount)}</p>
        <p className="text-xs text-red-600 dark:text-red-400">{daysWaiting}gg in attesa</p>
      </div>
    </Link>
  );
}

// ── Feed row ───────────────────────────────────────────────
function FeedRow({
  collabName, communityName, entityType, stato, amount, createdAt, href,
}: {
  collabName: string;
  communityName: string;
  entityType: string;
  stato: string;
  amount: number;
  createdAt: string;
  href: string;
}) {
  const typeLabel = entityType === 'compensation' ? 'Compenso' : entityType === 'expense' ? 'Rimborso' : 'Documento';
  const date = new Date(createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 rounded-xl bg-muted/40 border border-border/30 px-4 py-3 hover:bg-muted/70 transition"
    >
      <div className="min-w-0">
        <p className="text-sm text-foreground truncate">
          <span className="font-medium">{collabName}</span>
          <span className="text-muted-foreground"> · {typeLabel}</span>
        </p>
        <p className="text-xs text-muted-foreground truncate">{communityName} · {stato}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm tabular-nums text-foreground">{eur(amount)}</p>
        <p className="text-xs text-muted-foreground">{date}</p>
      </div>
    </Link>
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
          {hero.foto_profilo_url ? (
            <img src={hero.foto_profilo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-medium text-foreground select-none">{initials}</span>
          )}
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
    kpis, communityCards, collabBreakdown, periodMetrics,
    urgentItems, feedItems, blockItems, communities, hero,
  } = data;

  const [search, setSearch] = useState('');
  const [communityFilter, setCommunityFilter] = useState('');
  const [showBlocks, setShowBlocks] = useState(false);

  // Feed filtering (client-side)
  const filteredFeed = feedItems.filter(item => {
    const matchText = search.trim() === '' || item.collabName.toLowerCase().includes(search.toLowerCase());
    const matchComm = communityFilter === '' || item.communityId === communityFilter;
    return matchText && matchComm;
  });

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
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
              {blockItems.length}
            </span>
          )}
          Situazioni di blocco
        </Button>
      </div>

      {/* ── KPI cards ── */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Compensi in coda" value={kpis.pendingCompsCount} />
          <KpiCard label="Rimborsi in coda" value={kpis.pendingExpsCount} />
          <KpiCard label="In approvazione" value={eur(kpis.inApprovalAmount)} highlight={kpis.inApprovalAmount > 0} />
          <KpiCard label="Da pagare" value={eur(kpis.toPayAmount)} highlight={kpis.toPayAmount > 0} />
          <KpiCard label="Doc. da firmare" value={kpis.docsToSignCount} />
          <KpiCard label="Collaboratori attivi" value={kpis.activeCollabsCount} />
        </div>
      </section>

      {/* ── Quick actions ── */}
      <section>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/coda"
            className="rounded-xl bg-blue-700 hover:bg-brand px-4 py-2 text-sm font-medium text-white transition"
          >
            Vai alla coda
          </Link>
          <Link
            href="/export"
            className="rounded-xl bg-accent hover:bg-muted px-4 py-2 text-sm font-medium text-foreground transition"
          >
            Export pagamenti
          </Link>
          <Link
            href="/documenti"
            className="rounded-xl bg-accent hover:bg-muted px-4 py-2 text-sm font-medium text-foreground transition"
          >
            Carica documento
          </Link>
          <Link
            href="/impostazioni"
            className="rounded-xl bg-accent hover:bg-muted px-4 py-2 text-sm font-medium text-foreground transition"
          >
            Crea utente
          </Link>
        </div>
      </section>

      {/* ── Community cards ── */}
      {communityCards.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Community</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {communityCards.map(c => (
              <CommunityCard key={c.id} {...c} />
            ))}
          </div>
        </section>
      )}

      {/* ── Urgenti + Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Urgenti */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Urgenti ({urgentItems.length})
          </h2>
          {urgentItems.length === 0 ? (
            <div className={sectionCls + ' flex items-center justify-center h-28'}>
              <p className="text-sm text-muted-foreground">Nessun elemento urgente.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {urgentItems.map(item => (
                <UrgentRow
                  key={item.key}
                  collabName={`${item.collabName} ${item.collabCognome}`}
                  communityName={item.communityName}
                  entityType={item.entityType}
                  stato={item.stato}
                  amount={item.amount}
                  daysWaiting={item.daysWaiting}
                  href={item.href}
                />
              ))}
            </div>
          )}
        </section>

        {/* Collab breakdown */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Collaboratori
          </h2>
          <div className={sectionCls + ' p-5 space-y-5'}>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Per stato</p>
              <div className="space-y-1.5">
                {collabBreakdown.byStatus.map(s => (
                  <div key={s.key} className="flex items-center justify-between">
                    <span className="text-xs text-foreground">{s.label}</span>
                    <span className="text-xs font-medium text-foreground tabular-nums">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-2">Per contratto</p>
              <div className="space-y-1.5">
                {collabBreakdown.byContract.map(c => (
                  <div key={c.key} className="flex items-center justify-between">
                    <span className="text-xs text-foreground">{c.label}</span>
                    <span className="text-xs font-medium text-foreground tabular-nums">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

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
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="Importo pagato" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Conteggi */}
          <div className={sectionCls + ' p-5'}>
            <p className="text-xs text-muted-foreground mb-4">Compensi approvati / Nuovi collaboratori</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={20} barCategoryGap="30%">
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                <Bar dataKey="Compensi approvati" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Nuovi collab." fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* YTD summary strip */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className={sectionCls + ' px-4 py-3 text-center'}>
            <p className="text-xs text-muted-foreground">YTD pagato</p>
            <p className="text-lg font-semibold tabular-nums text-blue-600 dark:text-blue-300 mt-0.5">{eur(periodMetrics.ytd.paidAmount)}</p>
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

      {/* ── Feed ── */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Attività recenti
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cerca cognome…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded-lg bg-muted border border-border px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring w-36"
            />
            <Select value={communityFilter || 'all'} onValueChange={(v) => setCommunityFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs w-auto"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le community</SelectItem>
                {communities.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {filteredFeed.length === 0 ? (
          <div className={sectionCls + ' flex items-center justify-center h-20'}>
            <p className="text-sm text-muted-foreground">Nessuna attività trovata.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFeed.map(item => (
              <FeedRow
                key={item.key}
                collabName={`${item.collabName} ${item.collabCognome}`}
                communityName={item.communityName}
                entityType={item.entityType}
                stato={item.stato}
                amount={item.amount}
                createdAt={item.createdAt}
                href={item.href}
              />
            ))}
          </div>
        )}
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
