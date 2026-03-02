import Link from 'next/link';
import type { Expense } from '@/lib/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function PendingApprovedExpenseList({ expenses }: { expenses: Expense[] }) {
  const approved = expenses.filter((e) => e.stato === 'APPROVATO');
  if (approved.length === 0) return null;

  const total = approved.reduce((s, e) => s + (e.importo ?? 0), 0);

  return (
    <div className="rounded-xl bg-gray-900 border border-amber-700/30 mb-6">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        <p className="text-sm font-semibold text-amber-300">Da liquidare</p>
        <span className="text-xs text-gray-500">
          — {approved.length} {approved.length === 1 ? 'rimborso approvato' : 'rimborsi approvati'}, in attesa di pagamento
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Categoria</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden sm:table-cell">Data spesa</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden md:table-cell">Descrizione</th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Importo</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {approved.map((e) => (
            <tr key={e.id} className="hover:bg-gray-800/40 transition">
              <td className="px-4 py-3 text-gray-200 font-medium">{e.categoria}</td>
              <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{formatDate(e.data_spesa)}</td>
              <td className="px-4 py-3 text-gray-400 hidden md:table-cell truncate max-w-[200px]">
                {e.descrizione || '—'}
              </td>
              <td className="px-4 py-3 text-right text-amber-400 tabular-nums font-medium">
                {fmt(e.importo)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/rimborsi/${e.id}`}
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
            <td colSpan={5} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Totale da liquidare</span>
                <span className="text-sm font-semibold text-amber-300 tabular-nums">{fmt(total)}</span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
