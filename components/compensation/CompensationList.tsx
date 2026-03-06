'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { Compensation, CompensationStatus, Role } from '@/lib/types';
import { COMPENSATION_STATUS_LABELS } from '@/lib/types';
import StatusBadge from './StatusBadge';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { Card, CardContent } from '@/components/ui/card';

type CompensationRow = Compensation;

const ALL_STATI: CompensationStatus[] = [
  'IN_ATTESA',
  'APPROVATO',
  'RIFIUTATO',
  'LIQUIDATO',
];

const TOOLTIP_TEXT =
  "Lordo: compenso prima della ritenuta d'acconto (20%). Netto = Lordo − 20% = importo accreditato sul conto.";

const PAGE_SIZE = 20;

function nettoColorClass(stato: string): string {
  if (stato === 'LIQUIDATO') return 'text-green-700 dark:text-green-400';
  if (stato === 'APPROVATO') return 'text-amber-600 dark:text-amber-400';
  return 'text-muted-foreground';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

function AmountWithTooltip({
  amount,
  label,
  colorClass,
  showTooltip = false,
}: {
  amount: number | null | undefined;
  label: string;
  colorClass?: string;
  showTooltip?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`tabular-nums font-medium ${colorClass ?? 'text-foreground'}`}>
        {formatCurrency(amount)}
      </span>
      <span className={`text-xs ${colorClass ?? 'text-muted-foreground'}`}>{label}</span>
      {showTooltip && <InfoTooltip tip={TOOLTIP_TEXT} />}
    </span>
  );
}

export default function CompensationList({
  compensations,
  role: _role,
}: {
  compensations: CompensationRow[];
  role: Role;
}) {
  const [filterStato, setFilterStato] = useState<CompensationStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const filtered = filterStato === 'ALL'
    ? compensations
    : compensations.filter((c) => c.stato === filterStato);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleFilterChange(stato: CompensationStatus | 'ALL') {
    setFilterStato(stato);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
        <button
          onClick={() => handleFilterChange('ALL')}
          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
            filterStato === 'ALL'
              ? 'bg-brand text-white'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          Tutti
        </button>
        {ALL_STATI.map((s) => (
          <button
            key={s}
            onClick={() => handleFilterChange(s)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
              filterStato === s
                ? 'bg-brand text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {COMPENSATION_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Card list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <EmptyState icon={Wallet} title="Nessun compenso trovato" description="Nessun compenso corrisponde ai filtri selezionati." />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border [&>a:first-child]:rounded-t-xl [&>a:last-child]:rounded-b-xl p-0">
          {paginated.map((c) => (
            <Link
              key={c.id}
              href={`/compensi/${c.id}`}
              className="flex items-start justify-between gap-4 px-4 py-4 hover:bg-muted/60 transition"
            >
              {/* Left: description + meta */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">
                  {c.nome_servizio_ruolo ?? '—'}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>Inviato: {formatDate(c.created_at)}</span>
                </div>
              </div>

              {/* Right: amounts + status badge + chevron */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex flex-col items-end gap-2">
                  <div className="flex flex-col items-end gap-0.5">
                    <AmountWithTooltip
                      amount={c.importo_lordo}
                      label="lordi"
                    />
                    <AmountWithTooltip
                      amount={c.importo_netto}
                      label="netti"
                      colorClass={nettoColorClass(c.stato)}
                      showTooltip
                    />
                  </div>
                  <StatusBadge stato={c.stato} />
                </div>
                <svg className="h-4 w-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
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
