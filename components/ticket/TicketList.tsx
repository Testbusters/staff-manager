'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import type { TicketStatus, Role } from '@/lib/types';
import { TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from '@/lib/types';
import TicketStatusBadge from './TicketStatusBadge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

type TicketRow = {
  id: string;
  categoria: string;
  oggetto: string;
  stato: TicketStatus;
  priority: string;
  created_at: string;
  creator_name?: string | null;
};

const ALL_STATI: TicketStatus[] = ['APERTO', 'IN_LAVORAZIONE', 'CHIUSO'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const PRIORITY_DOT: Record<string, string> = {
  ALTA:    'bg-red-500 dark:bg-red-400',
  NORMALE: 'bg-yellow-500 dark:bg-yellow-400',
  BASSA:   'bg-muted-foreground/40',
};

export default function TicketList({
  tickets,
  role,
}: {
  tickets: TicketRow[];
  role: Role;
}) {
  const [filterStato, setFilterStato] = useState<TicketStatus | 'ALL'>('ALL');

  const router = useRouter();
  const isManager = ['amministrazione', 'responsabile_compensi'].includes(role);

  const filtered = filterStato === 'ALL'
    ? tickets
    : tickets.filter((t) => t.stato === filterStato);

  return (
    <div className="space-y-4">
      {/* Filter + action bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <Button
            onClick={() => setFilterStato('ALL')}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium h-auto ${
              filterStato === 'ALL'
                ? 'bg-brand text-white hover:bg-brand/90'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            Tutti
          </Button>
          {ALL_STATI.map((s) => (
            <Button
              key={s}
              onClick={() => setFilterStato(s)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium h-auto ${
                filterStato === s
                  ? 'bg-brand text-white hover:bg-brand/90'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {TICKET_STATUS_LABELS[s]}
            </Button>
          ))}
        </div>

        <Link
          href="/ticket/nuova"
          className="shrink-0 rounded-lg bg-brand hover:bg-brand/90 px-4 py-2 text-sm font-medium text-white transition"
        >
          Nuovo ticket
        </Link>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <EmptyState icon={MessageSquare} title="Nessun ticket trovato" description="Non ci sono ticket che corrispondono ai filtri selezionati." />
            <Link href="/ticket/nuova" className="mt-3 inline-block text-sm text-link hover:text-link/80">
              Apri il primo ticket →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stato</TableHead>
                <TableHead className="hidden sm:table-cell">Priorità</TableHead>
                <TableHead>Oggetto</TableHead>
                <TableHead className="hidden md:table-cell">Riferimento</TableHead>
                {isManager && (
                  <TableHead className="hidden lg:table-cell">Collaboratore</TableHead>
                )}
                <TableHead className="text-right hidden lg:table-cell">Aperto il</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow
                  key={t.id}
                  onClick={() => router.push(`/ticket/${t.id}`)}
                  className="hover:bg-muted/60 cursor-pointer"
                >
                  <TableCell>
                    <TicketStatusBadge stato={t.stato} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[t.priority] ?? 'bg-gray-500'}`} />
                      {TICKET_PRIORITY_LABELS[t.priority as keyof typeof TICKET_PRIORITY_LABELS] ?? t.priority}
                    </span>
                  </TableCell>
                  <TableCell className="text-foreground max-w-xs truncate">{t.oggetto}</TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">{t.categoria}</TableCell>
                  {isManager && (
                    <TableCell className="text-muted-foreground hidden lg:table-cell">
                      {t.creator_name ?? '—'}
                    </TableCell>
                  )}
                  <TableCell className="text-right text-muted-foreground hidden lg:table-cell tabular-nums">
                    {formatDate(t.created_at)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground"><ChevronRight className="h-4 w-4 text-muted-foreground inline" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
