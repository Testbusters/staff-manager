'use client';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import SortButton from './SortButton';
import { fmt } from './shared';
import type { SortDir } from './shared';

export type ArchiveRow = {
  id: string;
  collabName: string;
  subtitle: string | null;
  date: string | null;
  amount: number | null;
  rejection_note: string | null;
};

export default function ArchiveTable({
  rows,
  showRejectionNote,
  sortDir,
  onCycleSort,
}: {
  rows: ArchiveRow[];
  showRejectionNote: boolean;
  sortDir: SortDir;
  onCycleSort: () => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/20 hover:bg-muted/20 border-b border-border">
          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Collaboratore</TableHead>
          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
            <SortButton sortDir={sortDir} onCycle={onCycleSort} />
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground text-right">Importo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className="opacity-70">
            <TableCell className="py-3">
              <p className="text-sm font-medium text-foreground leading-tight">{row.collabName}</p>
              {row.subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{row.subtitle}</p>
              )}
              {showRejectionNote && row.rejection_note && (
                <p className="text-xs text-destructive mt-0.5 leading-tight">↳ {row.rejection_note}</p>
              )}
            </TableCell>
            <TableCell className="py-3 text-sm text-muted-foreground tabular-nums">
              {row.date
                ? new Date(row.date).toLocaleDateString('it-IT')
                : <span className="text-muted-foreground/40">—</span>}
            </TableCell>
            <TableCell className="py-3 text-sm text-muted-foreground text-right tabular-nums">
              {fmt(row.amount) ?? <span className="text-muted-foreground/40">—</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
