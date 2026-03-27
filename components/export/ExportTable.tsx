'use client';

import { CheckCircle } from 'lucide-react';
import type { ExportCollaboratorRow } from '@/lib/export-utils';
import { formatEuro } from '@/lib/export-utils';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

interface Props {
  rows: ExportCollaboratorRow[];
}

export default function ExportPreviewTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle}
        title="Nessun elemento da esportare"
        description="Tutti i compensi e rimborsi approvati sono già stati esportati."
      />
    );
  }

  return (
    <Card>
      <CardContent className="overflow-hidden p-0">
        <Table className="text-sm w-auto">
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="px-4 py-3 text-xs text-muted-foreground font-medium">Email</TableHead>
              <TableHead className="px-4 py-3 text-xs text-muted-foreground font-medium">Nome e cognome</TableHead>
              <TableHead className="px-4 py-3 text-xs text-muted-foreground font-medium text-right">Lordo</TableHead>
              <TableHead className="px-4 py-3 text-xs text-muted-foreground font-medium text-right">Netto</TableHead>
              <TableHead className="px-4 py-3 text-xs text-muted-foreground font-medium text-right hidden md:table-cell">Ritenuta</TableHead>
              <TableHead className="px-4 py-3 text-xs text-muted-foreground font-medium text-center hidden sm:table-cell">Voci</TableHead>
              <TableHead className="px-4 py-3 text-xs text-muted-foreground font-medium hidden lg:table-cell">Descrizione</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.collaborator_id} className="border-border hover:bg-muted/60">
                <TableCell className="px-4 py-3 text-muted-foreground text-xs">
                  {row.email || '—'}
                </TableCell>
                <TableCell className="px-4 py-3 text-foreground font-medium">
                  {row.nome} {row.cognome}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-foreground font-medium tabular-nums">
                  {formatEuro(row.importo_lordo)}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-foreground tabular-nums">
                  {formatEuro(row.importo_netto)}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden md:table-cell">
                  {formatEuro(row.ritenuta)}
                </TableCell>
                <TableCell className="px-4 py-3 text-center text-muted-foreground hidden sm:table-cell">
                  {row.compensation_ids.length + row.expense_ids.length}
                </TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground hidden lg:table-cell max-w-xs truncate">
                  <span title={row.descrizione}>{row.descrizione}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
