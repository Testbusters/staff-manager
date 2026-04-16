import Link from 'next/link';
import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import type { BarMonthData } from '@/components/compensation/DashboardBarChart';

// ── Constants ──────────────────────────────────────────────
export const ACTIVE_STATES = new Set(['IN_ATTESA', 'APPROVATO']);

export const sectionCls = 'rounded-2xl bg-card border border-border dark:border-white/[0.12]';

// ── Types ──────────────────────────────────────────────────
export type CompRow = {
  id: string;
  stato: string;
  importo_netto: number | null;
  importo_lordo: number | null;
  liquidated_at: string | null;
};

export type ExpRow = {
  id: string;
  stato: string;
  importo: number | null;
  liquidated_at: string | null;
};

export type CompYearBreakdown = { year: number; netto: number; lordo: number };
export type ExpYearBreakdown = { year: number; total: number };

// ── Helpers ────────────────────────────────────────────────
export function eur(n: number) {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

export function compAmount(c: CompRow) {
  return c.importo_netto ?? 0;
}

export function formatCurrencyR(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

export function groupCompByYear(rows: CompRow[]) {
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
      approvedNetto += row.importo_netto ?? 0;
    } else if (row.stato === 'IN_ATTESA') {
      inAttesaNetto += row.importo_netto ?? 0;
    }
  }

  const paidByYear: CompYearBreakdown[] = Object.entries(nettoMap)
    .map(([y, netto]) => ({ year: Number(y), netto, lordo: lordoMap[Number(y)] ?? 0 }))
    .sort((a, b) => b.year - a.year);

  return { paidByYear, approvedLordo, approvedNetto, inAttesaNetto };
}

export function groupExpByYear(rows: ExpRow[]) {
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

export function buildBarData(comps: CompRow[], exps: ExpRow[]): BarMonthData[] {
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
  const expMap: Record<string, number> = {};

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

export function sumPaidComps(rows: { importo_netto: number | null }[]) {
  return rows.reduce((s, c) => s + (c.importo_netto ?? 0), 0);
}

export function contentVisible(communityIds: string[], userCommunityIds: string[]): boolean {
  return communityIds.length === 0 || communityIds.some((id) => userCommunityIds.includes(id));
}

// ── Sub-components ─────────────────────────────────────────
export function StatCard({
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

export function DocCard({ count }: { count: number }) {
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
