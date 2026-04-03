'use client';

import { Ban } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface BlacklistEntry {
  id: string;
  nome: string;
  cognome: string;
  username: string | null;
  note: string | null;
  created_at: string;
}

interface Props {
  entries: BlacklistEntry[];
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ListaNeraPage({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Ban}
        title="Lista nera vuota"
        description="Nessun collaboratore è attualmente in lista nera."
      />
    );
  }

  return (
    <div className="w-fit rounded-2xl bg-card border border-border overflow-hidden">
      <Table className="w-auto">
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="text-xs">Nome</TableHead>
            <TableHead className="text-xs">Cognome</TableHead>
            <TableHead className="text-xs">Username</TableHead>
            <TableHead className="text-xs">Note</TableHead>
            <TableHead className="text-xs">Data inserimento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id} className="hover:bg-muted/60">
              <TableCell className="text-sm">{entry.nome}</TableCell>
              <TableCell className="text-sm font-medium">{entry.cognome}</TableCell>
              <TableCell className="text-sm font-mono text-muted-foreground">
                {entry.username ?? '—'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-xs">
                {entry.note ?? '—'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {fmtDate(entry.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
