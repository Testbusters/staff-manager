'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { Expense, ExpenseStatus, Role } from '@/lib/types';
import { EXPENSE_STATUS_LABELS } from '@/lib/types';
import StatusBadge from '@/components/compensation/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';

const ALL_STATI: ExpenseStatus[] = [
  'IN_ATTESA',
  'APPROVATO',
  'RIFIUTATO',
  'LIQUIDATO',
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

const PAGE_SIZE = 20;

export default function ExpenseList({
  expenses,
  role,
}: {
  expenses: Expense[];
  role: Role;
}) {
  const [filterStato, setFilterStato] = useState<ExpenseStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const filtered = filterStato === 'ALL'
    ? expenses
    : expenses.filter((e) => e.stato === filterStato);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleFilterChange(stato: ExpenseStatus | 'ALL') {
    setFilterStato(stato);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Filter chips + CTA */}
      <div className="flex items-center justify-between gap-4">
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
              {EXPENSE_STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {role === 'collaboratore' && (
          <Link
            href="/rimborsi/nuova"
            className="shrink-0 rounded-lg bg-brand hover:bg-brand/90 px-4 py-2 text-sm font-medium text-white transition"
          >
            Nuovo rimborso
          </Link>
        )}
      </div>

      {/* Card list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <EmptyState icon={Receipt} title="Nessun rimborso trovato" description="Nessun rimborso corrisponde ai filtri selezionati." />
            {role === 'collaboratore' && (
              <Link
                href="/rimborsi/nuova"
                className="mt-3 inline-block text-sm text-link hover:text-link/80"
              >
                Crea la prima richiesta →
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border [&>a:first-child]:rounded-t-xl [&>a:last-child]:rounded-b-xl p-0">
          {paginated.map((e) => (
            <Link
              key={e.id}
              href={`/rimborsi/${e.id}`}
              className="flex items-start justify-between gap-4 px-4 py-4 hover:bg-muted/60 transition"
            >
              {/* Left: category + meta */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{e.categoria}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>Spesa: {formatDate(e.data_spesa)}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>Inviato: {formatDate(e.created_at)}</span>
                </div>
              </div>

              {/* Right: amount + badge + chevron */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex flex-col items-end gap-2">
                  <span className="tabular-nums font-medium text-foreground text-sm">
                    {formatCurrency(e.importo)}
                  </span>
                  <StatusBadge stato={e.stato} />
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
            aria-label="Pagina precedente"
          >
            ‹
          </Button>
          <span className="text-xs text-muted-foreground">{safePage} / {totalPages}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            aria-label="Pagina successiva"
          >
            ›
          </Button>
        </div>
      )}
    </div>
  );
}
