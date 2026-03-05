'use client';

import { useRouter } from 'next/navigation';
import type { Compensation } from '@/lib/types';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    <div className="rounded-xl bg-card border border-amber-300 dark:border-amber-700/30 mb-6">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Da ricevere</p>
        <span className="text-xs text-muted-foreground">
          — {approved.length} {approved.length === 1 ? 'compenso approvato' : 'compensi approvati'}, in attesa di liquidazione
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome servizio / Ruolo</TableHead>
            <TableHead className="hidden sm:table-cell">Community</TableHead>
            <TableHead className="text-right">Lordo</TableHead>
            <TableHead className="text-right">
              <span className="inline-flex items-center gap-1">Netto <InfoTooltip tip={TOOLTIP_TEXT} /></span>
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {approved.map((c) => (
            <TableRow
              key={c.id}
              onClick={() => router.push(`/compensi/${c.id}`)}
              className="hover:bg-muted/40 cursor-pointer"
            >
              <TableCell className="text-foreground font-medium truncate max-w-[180px]">
                {c.nome_servizio_ruolo ?? '—'}
              </TableCell>
              <TableCell className="text-muted-foreground hidden sm:table-cell">
                {c.communities?.name ?? '—'}
              </TableCell>
              <TableCell className="text-right text-foreground tabular-nums">
                {fmt(c.importo_lordo)}
              </TableCell>
              <TableCell className="text-right text-amber-600 dark:text-amber-400 tabular-nums font-medium">
                {fmt(c.importo_netto)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground text-sm">→</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-muted/30">
            <TableCell colSpan={6}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Totale da ricevere</span>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Lordo</p>
                    <span className="text-sm font-semibold text-foreground tabular-nums">{fmt(totalLordo)}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Netto</p>
                    <span className="text-sm font-semibold text-amber-700 dark:text-amber-300 tabular-nums">{fmt(totalNetto)}</span>
                  </div>
                </div>
              </div>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
