'use client';

import { useRouter } from 'next/navigation';
import type { Expense } from '@/lib/types';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  const router = useRouter();
  const approved = expenses.filter((e) => e.stato === 'APPROVATO');
  if (approved.length === 0) return null;

  const total = approved.reduce((s, e) => s + (e.importo ?? 0), 0);

  return (
    <div className="w-fit rounded-xl bg-card border border-amber-300 dark:border-amber-700/30 mb-6">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Da liquidare</p>
        <span className="text-xs text-muted-foreground">
          — {approved.length} {approved.length === 1 ? 'rimborso approvato' : 'rimborsi approvati'}, in attesa di pagamento
        </span>
      </div>

      <Table className="w-auto">
        <TableHeader>
          <TableRow>
            <TableHead>Categoria</TableHead>
            <TableHead className="hidden sm:table-cell">Data spesa</TableHead>
            <TableHead className="hidden md:table-cell">Descrizione</TableHead>
            <TableHead className="text-right">Importo</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {approved.map((e) => (
            <TableRow
              key={e.id}
              onClick={() => router.push(`/rimborsi/${e.id}`)}
              className="hover:bg-muted/60 cursor-pointer"
            >
              <TableCell className="text-foreground font-medium">{e.categoria}</TableCell>
              <TableCell className="text-muted-foreground hidden sm:table-cell">{formatDate(e.data_spesa)}</TableCell>
              <TableCell className="text-muted-foreground hidden md:table-cell truncate max-w-[200px]">
                {e.descrizione || '—'}
              </TableCell>
              <TableCell className="text-right text-amber-600 dark:text-amber-400 tabular-nums font-medium">
                {fmt(e.importo)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground text-sm">→</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-muted/30">
            <TableCell colSpan={5}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Totale da liquidare</span>
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-300 tabular-nums">{fmt(total)}</span>
              </div>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
