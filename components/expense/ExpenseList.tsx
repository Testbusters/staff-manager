'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Expense, ExpenseStatus, Role } from '@/lib/types';
import { EXPENSE_STATUS_LABELS } from '@/lib/types';
import StatusBadge from '@/components/compensation/StatusBadge';

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

export default function ExpenseList({
  expenses,
  role,
}: {
  expenses: Expense[];
  role: Role;
}) {
  const [filterStato, setFilterStato] = useState<ExpenseStatus | 'ALL'>('ALL');

  const filtered = filterStato === 'ALL'
    ? expenses
    : expenses.filter((e) => e.stato === filterStato);

  return (
    <div className="space-y-4">
      {/* Filter chips + CTA */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <button
            onClick={() => setFilterStato('ALL')}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
              filterStato === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Tutti
          </button>
          {ALL_STATI.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStato(s)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
                filterStato === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {EXPENSE_STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {role === 'collaboratore' && (
          <Link
            href="/rimborsi/nuova"
            className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-medium text-white transition"
          >
            Nuovo rimborso
          </Link>
        )}
      </div>

      {/* Card list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-8 text-center">
          <p className="text-sm text-gray-500">Nessun rimborso trovato.</p>
          {role === 'collaboratore' && (
            <Link
              href="/rimborsi/nuova"
              className="mt-3 inline-block text-sm text-blue-400 hover:text-blue-300"
            >
              Crea la prima richiesta →
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-gray-900 border border-gray-800 divide-y divide-gray-800 overflow-hidden">
          {filtered.map((e) => (
            <Link
              key={e.id}
              href={`/rimborsi/${e.id}`}
              className="flex items-start justify-between gap-4 px-4 py-4 hover:bg-gray-800/50 transition"
            >
              {/* Left: category + meta */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-100">{e.categoria}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                  <span>{formatDate(e.data_spesa)}</span>
                  <span className="text-gray-700">·</span>
                  <span>inviato {formatDate(e.created_at)}</span>
                </div>
              </div>

              {/* Right: amount + badge */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="tabular-nums font-medium text-gray-200 text-sm">
                  {formatCurrency(e.importo)}
                </span>
                <StatusBadge stato={e.stato} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
