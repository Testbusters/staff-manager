'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Checkbox } from '@/components/ui/checkbox';
import type { Expense, ExpenseStatus, ExpenseCategory } from '@/lib/types';
import { EXPENSE_STATUS_LABELS, EXPENSE_CATEGORIES, EXPENSE_CATEGORIA_BADGE } from '@/lib/types';
import StatusBadge from '@/components/compensation/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';

type ExpenseRow = Expense & {
  collaborators?: { nome: string; cognome: string } | null;
};

type Kpi = {
  inAttesa: number;
  totaleInAttesa: number;
  approvati: number;
  totaleApprovati: number;
  liquidato: number;
  totaleLiquidato: number;
};

const ALL_STATI: ExpenseStatus[] = ['IN_ATTESA', 'APPROVATO', 'RIFIUTATO', 'LIQUIDATO'];
const PAGE_SIZE = 20;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

function KpiCard({ label, count, amount, countColor }: { label: string; count: number; amount: number; countColor: string }) {
  return (
    <Card>
      <CardContent className="px-4 py-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-2xl font-semibold tabular-nums ${countColor}`}>{count}</p>
        <p className="text-sm text-muted-foreground tabular-nums mt-0.5">{formatCurrency(amount)}</p>
      </CardContent>
    </Card>
  );
}

export default function ApprovazioniRimborsi({
  expenses,
  kpi,
}: {
  expenses: ExpenseRow[];
  kpi: Kpi;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [filterStato, setFilterStato] = useState<ExpenseStatus | 'ALL'>('ALL');
  const [filterCategoria, setFilterCategoria] = useState<ExpenseCategory | 'ALL'>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const filtered = expenses
    .filter((e) => filterStato === 'ALL' || e.stato === filterStato)
    .filter((e) => filterCategoria === 'ALL' || e.categoria === filterCategoria)
    .filter((e) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const name = `${e.collaborators?.nome ?? ''} ${e.collaborators?.cognome ?? ''}`.toLowerCase();
      return name.includes(q);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const approvabiliOnPage = paginated.filter((e) => e.stato === 'IN_ATTESA');
  const allPageSelected =
    approvabiliOnPage.length > 0 && approvabiliOnPage.every((e) => selectedIds.has(e.id));
  const totaleSelezionati = expenses
    .filter((e) => selectedIds.has(e.id))
    .reduce((s, e) => s + (e.importo ?? 0), 0);

  function toggleSelectAll() {
    const next = new Set(selectedIds);
    if (allPageSelected) {
      approvabiliOnPage.forEach((e) => next.delete(e.id));
    } else {
      approvabiliOnPage.forEach((e) => next.add(e.id));
    }
    setSelectedIds(next);
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  }

  function handleFilterChange(stato: ExpenseStatus | 'ALL') {
    setFilterStato(stato);
    setPage(1);
    setSelectedIds(new Set());
  }

  function handleCategoriaChange(cat: ExpenseCategory | 'ALL') {
    setFilterCategoria(cat);
    setPage(1);
    setSelectedIds(new Set());
  }

  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
    setSelectedIds(new Set());
  }

  async function handleBulkApprove() {
    setBulkLoading(true);
    setBulkError(null);
    try {
      const res = await fetch('/api/expenses/approve-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selectedIds] }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setBulkError(err.error ?? "Errore durante l'approvazione.");
      } else {
        setSelectedIds(new Set());
        startTransition(() => router.refresh());
      }
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="In attesa" count={kpi.inAttesa} amount={kpi.totaleInAttesa} countColor="text-blue-600 dark:text-blue-400" />
        <KpiCard label="Approvati" count={kpi.approvati} amount={kpi.totaleApprovati} countColor="text-amber-600 dark:text-amber-400" />
        <KpiCard label="Liquidati" count={kpi.liquidato} amount={kpi.totaleLiquidato} countColor="text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* List header */}
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Rimborsi{filtered.length !== expenses.length ? ` (${filtered.length} di ${expenses.length})` : ` (${expenses.length})`}
        </h2>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Cerca per nome cognome collaboratore"
        className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
      />

      {/* Filter chips — stato */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
        {(['ALL', ...ALL_STATI] as const).map((s) => (
          <button
            key={s}
            onClick={() => handleFilterChange(s)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
              filterStato === s
                ? 'bg-brand text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {s === 'ALL' ? 'Tutti gli stati' : EXPENSE_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Filter chips — categoria */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
        <button
          onClick={() => handleCategoriaChange('ALL')}
          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
            filterCategoria === 'ALL'
              ? 'bg-brand text-white'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          Tutte le categorie
        </button>
        {EXPENSE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoriaChange(cat)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
              filterCategoria === cat
                ? 'bg-brand text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Bulk approve bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-lg bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-blue-800 dark:text-blue-200">
              {selectedIds.size} {selectedIds.size === 1 ? 'selezionato' : 'selezionati'}
            </span>
            <span className="text-xs text-blue-700 dark:text-blue-300 tabular-nums">{formatCurrency(totaleSelezionati)}</span>
          </div>
          <div className="flex items-center gap-3">
            {bulkError && <span className="text-xs text-red-600 dark:text-red-400">{bulkError}</span>}
            <Button
              onClick={handleBulkApprove}
              disabled={bulkLoading || isPending}
              className="bg-brand hover:bg-blue-500 text-white"
            >
              {bulkLoading ? 'Approvazione...' : 'Approva selezionati'}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <EmptyState icon={Receipt} title="Nessun rimborso trovato" description="Non ci sono rimborsi che corrispondono ai filtri selezionati." />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
          {/* Select-all row */}
          {approvabiliOnPage.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 bg-muted/40 rounded-t-xl">
              <Checkbox
                checked={allPageSelected}
                onCheckedChange={() => toggleSelectAll()}
              />
              <span className="text-xs text-muted-foreground">
                {allPageSelected ? 'Deseleziona tutti' : `Seleziona tutti in attesa (${approvabiliOnPage.length})`}
              </span>
            </div>
          )}

          {paginated.map((e, idx) => {
            const isApprovabile = e.stato === 'IN_ATTESA';
            const isSelected = selectedIds.has(e.id);
            const isFirst = idx === 0 && approvabiliOnPage.length === 0;
            const isLast = idx === paginated.length - 1;
            return (
              <div
                key={e.id}
                className={`flex items-center gap-3 px-4 py-4 hover:bg-muted/60 transition ${isFirst ? 'rounded-t-xl' : ''} ${isLast ? 'rounded-b-xl' : ''}`}
              >
                {/* Checkbox column */}
                <div className="w-5 shrink-0 flex items-center justify-center">
                  {isApprovabile && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(e.id)}
                    />
                  )}
                </div>

                {/* Row content */}
                <Link
                  href={`/rimborsi/${e.id}`}
                  className="flex flex-1 items-start justify-between gap-4 min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {e.collaborators
                        ? `${e.collaborators.nome} ${e.collaborators.cognome}`
                        : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{e.descrizione ?? '—'}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${EXPENSE_CATEGORIA_BADGE[e.categoria]}`}>
                        {e.categoria}
                      </span>
                      {e.data_spesa && (
                        <><span className="text-gray-700">·</span><span>Spesa: {formatDate(e.data_spesa)}</span></>
                      )}
                      <span className="text-gray-700">·</span>
                      <span>{formatDate(e.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-sm font-medium tabular-nums text-foreground">
                        {formatCurrency(e.importo)}
                      </span>
                      <StatusBadge stato={e.stato} />
                    </div>
                    <svg className="h-4 w-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </div>
            );
          })}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
          >
            ‹
          </Button>
          <span className="text-xs text-muted-foreground">{safePage} / {totalPages}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
          >
            ›
          </Button>
        </div>
      )}
    </div>
  );
}
