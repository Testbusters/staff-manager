'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Compensation, CompensationStatus } from '@/lib/types';
import { COMPENSATION_STATUS_LABELS } from '@/lib/types';
import StatusBadge from './StatusBadge';
import ImportSection from './ImportSection';

type CompensationRow = Compensation & {
  collaborators?: { nome: string; cognome: string } | null;
};

type Kpi = {
  inAttesa: number;
  totaleLordoInAttesa: number;
  approvati: number;
  totaleLordoApprovati: number;
  liquidato: number;
  totaleLordoLiquidato: number;
};

const ALL_STATI: CompensationStatus[] = ['IN_ATTESA', 'APPROVATO', 'RIFIUTATO', 'LIQUIDATO'];
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
    <div className="rounded-xl bg-gray-900 border border-gray-800 px-4 py-4">
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${countColor}`}>{count}</p>
      <p className="text-sm tabular-nums text-gray-400 mt-0.5">{formatCurrency(amount)}</p>
    </div>
  );
}


export default function ApprovazioniCompensazioni({
  compensations,
  kpi,
}: {
  compensations: CompensationRow[];
  kpi: Kpi;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [filterStato, setFilterStato] = useState<CompensationStatus | 'ALL'>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const filtered = compensations
    .filter((c) => filterStato === 'ALL' || c.stato === filterStato)
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const name = `${c.collaborators?.nome ?? ''} ${c.collaborators?.cognome ?? ''}`.toLowerCase();
      return name.includes(q);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const approvabiliOnPage = paginated.filter((c) => c.stato === 'IN_ATTESA');
  const allPageSelected =
    approvabiliOnPage.length > 0 && approvabiliOnPage.every((c) => selectedIds.has(c.id));

  function toggleSelectAll() {
    const next = new Set(selectedIds);
    if (allPageSelected) {
      approvabiliOnPage.forEach((c) => next.delete(c.id));
    } else {
      approvabiliOnPage.forEach((c) => next.add(c.id));
    }
    setSelectedIds(next);
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  }

  function handleFilterChange(stato: CompensationStatus | 'ALL') {
    setFilterStato(stato);
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
      const res = await fetch('/api/compensations/approve-bulk', {
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
      {/* KPI cards — 3 unified cards */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="In attesa" count={kpi.inAttesa} amount={kpi.totaleLordoInAttesa} countColor="text-blue-400" />
        <KpiCard label="Approvati" count={kpi.approvati} amount={kpi.totaleLordoApprovati} countColor="text-amber-400" />
        <KpiCard label="Liquidati" count={kpi.liquidato} amount={kpi.totaleLordoLiquidato} countColor="text-emerald-400" />
      </div>

      {/* Creation modes — two stacked peer cards */}
      <div className="space-y-3">
        <div className="rounded-xl bg-gray-900 border border-gray-800 px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-200">Inserimento manuale</p>
            <p className="text-xs text-gray-500 mt-0.5">Crea un compenso per un singolo collaboratore.</p>
          </div>
          <Link
            href="/approvazioni/carica"
            className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition"
          >
            + Inserimento manuale
          </Link>
        </div>
        <ImportSection />
      </div>

      {/* List header */}
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium text-gray-400">
          Compensi{filtered.length !== compensations.length ? ` (${filtered.length} di ${compensations.length})` : ` (${compensations.length})`}
        </h2>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Cerca per nome o cognome..."
        className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
      />

      {/* Filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
        {(['ALL', ...ALL_STATI] as const).map((s) => (
          <button
            key={s}
            onClick={() => handleFilterChange(s)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
              filterStato === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {s === 'ALL' ? 'Tutti' : COMPENSATION_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Bulk approve bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-lg bg-blue-900/40 border border-blue-700/50 px-4 py-3">
          <span className="text-sm text-blue-200">
            {selectedIds.size} {selectedIds.size === 1 ? 'selezionato' : 'selezionati'}
          </span>
          <div className="flex items-center gap-3">
            {bulkError && <span className="text-xs text-red-400">{bulkError}</span>}
            <button
              onClick={handleBulkApprove}
              disabled={bulkLoading || isPending}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-1.5 text-sm font-medium text-white transition"
            >
              {bulkLoading ? 'Approvazione...' : 'Approva selezionati'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-8 text-center">
          <p className="text-sm text-gray-500">Nessun compenso trovato.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-gray-900 border border-gray-800 divide-y divide-gray-800">
          {/* Select-all row */}
          {approvabiliOnPage.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-800/40 rounded-t-xl">
              <input
                type="checkbox"
                checked={allPageSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500">
                {allPageSelected ? 'Deseleziona tutti' : `Seleziona tutti in attesa (${approvabiliOnPage.length})`}
              </span>
            </div>
          )}

          {paginated.map((c, idx) => {
            const isApprovabile = c.stato === 'IN_ATTESA';
            const isSelected = selectedIds.has(c.id);
            const isFirst = idx === 0 && approvabiliOnPage.length === 0;
            const isLast = idx === paginated.length - 1;
            return (
              <div
                key={c.id}
                className={`flex items-center gap-3 px-4 py-4 hover:bg-gray-800/50 transition ${isFirst ? 'rounded-t-xl' : ''} ${isLast ? 'rounded-b-xl' : ''}`}
              >
                {/* Checkbox column */}
                <div className="w-5 shrink-0 flex items-center justify-center">
                  {isApprovabile && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(c.id)}
                      className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                    />
                  )}
                </div>

                {/* Row content */}
                <Link
                  href={`/compensi/${c.id}`}
                  className="flex flex-1 items-start justify-between gap-4 min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-100 truncate">
                      {c.collaborators
                        ? `${c.collaborators.nome} ${c.collaborators.cognome}`
                        : '—'}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{c.nome_servizio_ruolo ?? '—'}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                      {c.periodo_riferimento && (
                        <span>{c.periodo_riferimento}</span>
                      )}
                      {c.periodo_riferimento && (
                        <span className="text-gray-700">·</span>
                      )}
                      <span>{formatDate(c.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-sm font-medium tabular-nums text-gray-200">
                        {formatCurrency(c.importo_lordo)}
                      </span>
                      <StatusBadge stato={c.stato} />
                    </div>
                    <svg className="h-4 w-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700 disabled:opacity-40 transition"
          >
            ‹
          </button>
          <span className="text-xs text-gray-500">{safePage} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700 disabled:opacity-40 transition"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
