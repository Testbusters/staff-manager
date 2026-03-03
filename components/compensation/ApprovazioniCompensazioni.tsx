'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Compensation, CompensationStatus } from '@/lib/types';
import { COMPENSATION_STATUS_LABELS, ROLE_LABELS } from '@/lib/types';
import StatusBadge from './StatusBadge';

type CompensationRow = Compensation & {
  communities?: { name: string } | null;
  collaborators?: { nome: string; cognome: string } | null;
};

type Kpi = {
  inAttesa: number;
  totaleLordoInAttesa: number;
  approvati: number;
  totaleLordoApprovati: number;
};

const ALL_STATI: CompensationStatus[] = ['IN_ATTESA', 'APPROVATO', 'RIFIUTATO', 'LIQUIDATO'];
const PAGE_SIZE = 25;

const COMMUNITY_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
] as const;

function communityDotColor(id: string | undefined): string {
  if (!id) return COMMUNITY_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return COMMUNITY_COLORS[hash % COMMUNITY_COLORS.length];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 px-4 py-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-semibold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-gray-600 mt-0.5">{sub}</p>
    </div>
  );
}

function ImportSection() {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
        <span className="text-sm font-medium text-gray-300">Import da file</span>
        <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-400">In configurazione</span>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="rounded-lg bg-gray-800/50 border border-gray-700/50 px-3 py-4 opacity-50 cursor-not-allowed text-center"
          >
            <div className="text-2xl mb-2">📄</div>
            <p className="text-xs font-medium text-gray-400">Tipologia {n}</p>
            <p className="text-xs text-gray-600 mt-1">— non configurato —</p>
          </div>
        ))}
      </div>
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
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="In attesa" value={kpi.inAttesa} sub="da revisionare" color="text-blue-400" />
        <KpiCard label="Totale lordo" value={formatCurrency(kpi.totaleLordoInAttesa)} sub="in attesa" color="text-blue-300" />
        <KpiCard label="Approvati" value={kpi.approvati} sub="da liquidare" color="text-amber-400" />
        <KpiCard label="Totale lordo" value={formatCurrency(kpi.totaleLordoApprovati)} sub="approvati" color="text-amber-300" />
      </div>

      {/* Import section — disabled, pending configuration */}
      <ImportSection />

      {/* List header + manual entry button */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium text-gray-400">
          Compensi{filtered.length !== compensations.length ? ` (${filtered.length} di ${compensations.length})` : ` (${compensations.length})`}
        </h2>
        <Link
          href="/approvazioni/carica"
          className="shrink-0 rounded-lg bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-xs font-medium text-gray-200 transition"
        >
          + Inserimento manuale
        </Link>
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
                      {c.communities && (
                        <span className="flex items-center gap-1">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${communityDotColor(c.community_id ?? undefined)}`} />
                          <span className="text-gray-400">{c.communities.name}</span>
                        </span>
                      )}
                      {c.periodo_riferimento && (
                        <><span className="text-gray-700">·</span><span>{c.periodo_riferimento}</span></>
                      )}
                      <span className="text-gray-700">·</span>
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
