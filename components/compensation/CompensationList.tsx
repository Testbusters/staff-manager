'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Compensation, CompensationStatus, Role } from '@/lib/types';
import { COMPENSATION_STATUS_LABELS } from '@/lib/types';
import StatusBadge from './StatusBadge';

type CompensationRow = Compensation & { communities?: { name: string } | null };

const ALL_STATI: CompensationStatus[] = [
  'IN_ATTESA',
  'APPROVATO',
  'RIFIUTATO',
  'LIQUIDATO',
];

const TOOLTIP_TEXT =
  "Lordo: compenso prima della ritenuta d'acconto (20%). Netto = Lordo − 20% = importo accreditato sul conto.";

// Deterministic community dot color from ID hash
const COMMUNITY_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
] as const;

function communityDotColor(id: string | undefined): string {
  if (!id) return COMMUNITY_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return COMMUNITY_COLORS[hash % COMMUNITY_COLORS.length];
}

function nettoColorClass(stato: string): string {
  if (stato === 'LIQUIDATO') return 'text-green-400';
  if (stato === 'APPROVATO') return 'text-amber-400';
  return 'text-gray-400';
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

// CSS-only tooltip for amount labels
function AmountWithTooltip({
  amount,
  label,
  colorClass,
}: {
  amount: number | null | undefined;
  label: string;
  colorClass?: string;
}) {
  return (
    <span className="relative group/tip inline-flex items-center gap-1">
      <span className={`tabular-nums font-medium ${colorClass ?? 'text-gray-200'}`}>
        {formatCurrency(amount)}
      </span>
      <span className={`text-xs ${colorClass ?? 'text-gray-400'}`}>{label}</span>
      <span className="ml-0.5 text-gray-600 cursor-default select-none text-xs leading-none">ℹ</span>
      <span className="pointer-events-none absolute bottom-full right-0 mb-2 w-64 rounded-lg bg-gray-700 px-3 py-2 text-xs text-gray-200 opacity-0 group-hover/tip:opacity-100 transition-opacity z-10 shadow-lg whitespace-normal text-left">
        {TOOLTIP_TEXT}
      </span>
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

  const filtered = filterStato === 'ALL'
    ? compensations
    : compensations.filter((c) => c.stato === filterStato);

  return (
    <div className="space-y-4">
      {/* Filter chips */}
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
            {COMPENSATION_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Card list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-8 text-center">
          <p className="text-sm text-gray-500">Nessun compenso trovato.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-gray-900 border border-gray-800 divide-y divide-gray-800 [&>a:first-child]:rounded-t-xl [&>a:last-child]:rounded-b-xl">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/compensi/${c.id}`}
              className="flex items-start justify-between gap-4 px-4 py-4 hover:bg-gray-800/50 transition"
            >
              {/* Left: description + meta */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-100 truncate">
                  {c.descrizione ?? '—'}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                  {c.communities && (
                    <span className="flex items-center gap-1">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${communityDotColor(c.community_id ?? undefined)}`}
                      />
                      <span className="text-gray-400">{c.communities.name}</span>
                    </span>
                  )}
                  <span>{formatDate(c.created_at)}</span>
                  {c.periodo_riferimento && (
                    <>
                      <span className="text-gray-700">·</span>
                      <span>{c.periodo_riferimento}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right: amounts + status badge */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex flex-col items-end gap-0.5">
                  <AmountWithTooltip
                    amount={c.importo_lordo}
                    label="lordi"
                  />
                  <AmountWithTooltip
                    amount={c.importo_netto}
                    label="netti"
                    colorClass={nettoColorClass(c.stato)}
                  />
                </div>
                <StatusBadge stato={c.stato} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
