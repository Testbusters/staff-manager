'use client';

import { useRouter } from 'next/navigation';
import type { Compensation } from '@/lib/types';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

type CompensationRow = Compensation & { communities?: { name: string } | null };

const fmt = (n: number | null) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);


const TOOLTIP_TEXT =
  'Lordo: compenso prima della ritenuta d\'acconto (20%). Netto = Lordo − 20% = importo accreditato sul conto.';

export default function PendingApprovedList({
  compensations,
}: {
  compensations: CompensationRow[];
}) {
  const router = useRouter();
  const approved = compensations.filter((c) => c.stato === 'APPROVATO');
  if (approved.length === 0) return null;

  const totalLordo = approved.reduce((s, c) => s + (c.importo_lordo ?? 0), 0);
  const totalNetto = approved.reduce((s, c) => s + (c.importo_netto ?? 0), 0);

  return (
    <div className="rounded-xl bg-card border border-amber-700/30 mb-6">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <p className="text-sm font-semibold text-amber-300">Da ricevere</p>
        <span className="text-xs text-muted-foreground">
          — {approved.length} {approved.length === 1 ? 'compenso approvato' : 'compensi approvati'}, in attesa di liquidazione
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Nome servizio / Ruolo</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Community</th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Lordo</th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1">Netto <InfoTooltip tip={TOOLTIP_TEXT} /></span>
            </th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {approved.map((c) => (
            <tr
              key={c.id}
              onClick={() => router.push(`/compensi/${c.id}`)}
              className="hover:bg-muted/40 transition cursor-pointer"
            >
              <td className="px-4 py-3 text-foreground font-medium truncate max-w-[180px]">
                {c.nome_servizio_ruolo ?? '—'}
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                {c.communities?.name ?? '—'}
              </td>
              <td className="px-4 py-3 text-right text-foreground tabular-nums">
                {fmt(c.importo_lordo)}
              </td>
              <td className="px-4 py-3 text-right text-amber-400 tabular-nums font-medium">
                {fmt(c.importo_netto)}
              </td>
              <td className="px-4 py-3 text-right text-muted-foreground text-sm">→</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-muted/30">
            <td colSpan={6} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Totale da ricevere</span>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Lordo</p>
                    <span className="text-sm font-semibold text-foreground tabular-nums">{fmt(totalLordo)}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Netto</p>
                    <span className="text-sm font-semibold text-amber-300 tabular-nums">{fmt(totalNetto)}</span>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
