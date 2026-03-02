import Link from 'next/link';
import type { Compensation } from '@/lib/types';

type CompensationRow = Compensation & { communities?: { name: string } | null };

const fmt = (n: number | null) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

// CSS-only tooltip wrapper
function WithTooltip({ children, tip }: { children: React.ReactNode; tip: string }) {
  return (
    <span className="relative group/tip inline-flex items-center gap-0.5">
      {children}
      <span className="ml-0.5 text-gray-600 cursor-default select-none">ℹ</span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-64 rounded-lg bg-gray-700 px-3 py-2 text-xs text-gray-200 opacity-0 group-hover/tip:opacity-100 transition-opacity z-10 shadow-lg">
        {tip}
      </span>
    </span>
  );
}

const TOOLTIP_TEXT =
  'Lordo: compenso prima della ritenuta d\'acconto (20%). Netto = Lordo − 20% = importo accreditato sul conto.';

export default function PendingApprovedList({
  compensations,
}: {
  compensations: CompensationRow[];
}) {
  const approved = compensations.filter((c) => c.stato === 'APPROVATO');
  if (approved.length === 0) return null;

  const totalLordo = approved.reduce((s, c) => s + (c.importo_lordo ?? 0), 0);
  const totalNetto = approved.reduce((s, c) => s + (c.importo_netto ?? 0), 0);

  return (
    <div className="rounded-xl bg-gray-900 border border-amber-700/30 overflow-hidden mb-6">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
        <p className="text-sm font-medium text-amber-300">Da ricevere</p>
        <span className="text-xs text-gray-500">
          — {approved.length} {approved.length === 1 ? 'compenso approvato' : 'compensi approvati'}, in attesa di liquidazione
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Descrizione</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden sm:table-cell">Community</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden md:table-cell">Periodo</th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
              <WithTooltip tip={TOOLTIP_TEXT}>Lordo</WithTooltip>
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
              <WithTooltip tip={TOOLTIP_TEXT}>Netto</WithTooltip>
            </th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {approved.map((c) => (
            <tr key={c.id} className="hover:bg-gray-800/40 transition">
              <td className="px-4 py-3 text-gray-200 font-medium truncate max-w-[180px]">
                {c.descrizione ?? '—'}
              </td>
              <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">
                {c.communities?.name ?? '—'}
              </td>
              <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                {c.periodo_riferimento ?? '—'}
              </td>
              <td className="px-4 py-3 text-right text-gray-300 tabular-nums">
                {fmt(c.importo_lordo)}
              </td>
              <td className="px-4 py-3 text-right text-amber-400 tabular-nums font-medium">
                {fmt(c.importo_netto)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/compensi/${c.id}`}
                  className="text-xs text-blue-400 hover:text-blue-300 transition"
                >
                  →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-700 bg-gray-800/30">
            <td colSpan={3} className="px-4 py-2.5 text-xs font-medium text-gray-500 hidden md:table-cell">
              Totale da ricevere
            </td>
            <td colSpan={3} className="px-4 py-2.5 text-xs font-medium text-gray-500 md:hidden">
              Totale da ricevere
            </td>
            <td className="px-4 py-2.5 text-right text-sm font-semibold text-gray-300 tabular-nums hidden md:table-cell">
              {fmt(totalLordo)}
            </td>
            <td className="px-4 py-2.5 text-right text-sm font-semibold text-amber-300 tabular-nums hidden md:table-cell">
              {fmt(totalNetto)}
            </td>
            <td className="px-4 py-2.5 hidden md:table-cell" />
          </tr>
          <tr className="border-t border-gray-700 bg-gray-800/30 md:hidden">
            <td colSpan={6} className="px-4 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Totale</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-300 tabular-nums">{fmt(totalLordo)}</span>
                  <span className="text-sm font-semibold text-amber-300 tabular-nums">{fmt(totalNetto)}</span>
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
