'use client';

import { useState } from 'react';
import { Activity } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import SectionAccordion from './SectionAccordion';
import type { SupabaseLogEntry, LogService } from './types';

export default function LogSistema({
  logs,
  loading,
  service,
  onServiceChange,
}: {
  logs: SupabaseLogEntry[];
  loading: boolean;
  service: LogService;
  onServiceChange: (s: LogService) => void;
}) {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const total = logs.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paged = logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const services: { label: string; value: LogService }[] = [
    { label: 'API', value: 'api' },
    { label: 'Auth', value: 'auth' },
    { label: 'Database', value: 'database' },
  ];

  const controls = (
    <div className="flex gap-1">
      {services.map((s) => (
        <button
          key={s.value}
          onClick={() => { onServiceChange(s.value); setPage(1); }}
          className={`rounded px-3 py-1 text-xs font-medium transition ${
            service === s.value
              ? 'bg-brand text-white'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );

  return (
    <SectionAccordion title="Log Supabase" description="Ultimi 100 log per servizio dal progetto Supabase." controls={controls}>
      <div className="overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : total === 0 ? (
          <EmptyState icon={Activity} title="Nessun log disponibile per questo servizio." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Messaggio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((log, i) => {
                const ts = String(log.timestamp ?? log.event_message ?? '');
                const msg = String(log.event_message ?? JSON.stringify(log));
                return (
                  <TableRow key={log.id ?? i}>
                    <TableCell className="text-xs whitespace-nowrap font-mono w-40">{ts.slice(0, 19).replace('T', ' ')}</TableCell>
                    <TableCell className="text-xs font-mono break-all max-w-xl">{msg.slice(0, 300)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground">
          <span>{total} log</span>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Pagina precedente" className="rounded px-2 py-1 bg-muted hover:bg-accent disabled:opacity-40">‹</button>
            <span className="px-2 py-1">{page}/{totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Pagina successiva" className="rounded px-2 py-1 bg-muted hover:bg-accent disabled:opacity-40">›</button>
          </div>
        </div>
      )}
    </SectionAccordion>
  );
}
