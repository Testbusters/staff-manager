'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
    <div className="rounded-xl bg-card border border-border px-4 py-4">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${countColor}`}>{count}</p>
      <p className="text-sm tabular-nums text-muted-foreground mt-0.5">{formatCurrency(amount)}</p>
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
  const [search, setSearch] = useState('');
  const [filterStato, setFilterStato] = useState<CompensationStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

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

  function handleFilterChange(stato: CompensationStatus | 'ALL') {
    setFilterStato(stato);
    setPage(1);
  }

  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
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
        <div className="rounded-xl bg-card border border-border px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Inserimento manuale</p>
            <p className="text-xs text-muted-foreground mt-0.5">Crea un compenso per un singolo collaboratore.</p>
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
        <h2 className="text-sm font-medium text-muted-foreground">
          Compensi{filtered.length !== compensations.length ? ` (${filtered.length} di ${compensations.length})` : ` (${compensations.length})`}
        </h2>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Cerca per nome o cognome..."
        className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
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
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {s === 'ALL' ? 'Tutti' : COMPENSATION_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Nessun compenso trovato.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border divide-y divide-border">
          {paginated.map((c, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === paginated.length - 1;
            return (
              <div
                key={c.id}
                className={`flex items-center gap-3 px-4 py-4 hover:bg-muted/50 transition ${isFirst ? 'rounded-t-xl' : ''} ${isLast ? 'rounded-b-xl' : ''}`}
              >
                <Link
                  href={`/compensi/${c.id}`}
                  className="flex flex-1 items-start justify-between gap-4 min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {c.collaborators
                        ? `${c.collaborators.nome} ${c.collaborators.cognome}`
                        : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.nome_servizio_ruolo ?? '—'}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span>{formatDate(c.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-sm font-medium tabular-nums text-foreground">
                        {formatCurrency(c.importo_lordo)}
                      </span>
                      <StatusBadge stato={c.stato} />
                    </div>
                    <svg className="h-4 w-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
