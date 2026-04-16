'use client';

import { useState } from 'react';
import { Activity } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import SectionAccordion from './SectionAccordion';
import { fmtDate, ACCESS_EVENT_LABELS } from './helpers';
import type { AccessEvent, AccessDays } from './types';

export default function LogAccessi({
  events,
  loading,
  days,
  onDaysChange,
}: {
  events: AccessEvent[];
  loading: boolean;
  days: AccessDays;
  onDaysChange: (d: AccessDays) => void;
}) {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const total = events.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paged = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const dayOptions: { label: string; value: AccessDays }[] = [
    { label: '24h', value: 1 },
    { label: '7 gg', value: 7 },
    { label: '30 gg', value: 30 },
  ];

  const controls = (
    <div className="flex gap-1">
      {dayOptions.map((o) => (
        <button
          key={o.value}
          onClick={() => { onDaysChange(o.value); setPage(1); }}
          className={`rounded px-3 py-1 text-xs font-medium transition ${
            days === o.value
              ? 'bg-brand text-white'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <SectionAccordion title="Log accessi" description="Autenticazioni recenti dal log di Supabase Auth." controls={controls}>
      <div className="overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : total === 0 ? (
          <EmptyState icon={Activity} title="Nessun evento trovato." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs whitespace-nowrap">{fmtDate(e.created_at)}</TableCell>
                  <TableCell className="text-xs">{e.email || '—'}</TableCell>
                  <TableCell className="text-xs">{e.role || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {ACCESS_EVENT_LABELS[e.event_type] ?? e.event_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{e.ip_address || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground">
          <span>{total} eventi</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Pagina precedente"
              className="rounded px-2 py-1 bg-muted hover:bg-accent disabled:opacity-40"
            >‹</button>
            <span className="px-2 py-1">{page}/{totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Pagina successiva"
              className="rounded px-2 py-1 bg-muted hover:bg-accent disabled:opacity-40"
            >›</button>
          </div>
        </div>
      )}
    </SectionAccordion>
  );
}
