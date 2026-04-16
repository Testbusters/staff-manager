'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import SectionAccordion from './SectionAccordion';
import { fmtDate } from './helpers';
import type { AppError } from './types';

export default function AppErrorsSection({ errors, loading }: { errors: AppError[]; loading: boolean }) {
  const [selected, setSelected] = useState<AppError | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const total = errors.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paged = errors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const last24h = errors.filter(
    (e) => new Date(e.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000,
  ).length;

  const errorBadge = last24h > 0 ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
      <span className="font-bold">{last24h}</span> nelle ultime 24h
    </span>
  ) : undefined;

  return (
    <SectionAccordion title="Errori applicazione" description="Errori catturati da error.tsx · ultimi 50." controls={errorBadge}>
      <div className="overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : total === 0 ? (
          <EmptyState icon={AlertTriangle} title="Nessun errore registrato." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Messaggio</TableHead>
                <TableHead>URL</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs whitespace-nowrap">{fmtDate(e.created_at)}</TableCell>
                  <TableCell className="text-xs max-w-xs truncate font-mono">{e.message}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{e.url ?? '—'}</TableCell>
                  <TableCell>
                    {!!e.stack && (
                      <button onClick={() => setSelected(e)} className="text-xs text-link hover:text-link/80">
                        Stack
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground">
          <span>{total} errori</span>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Pagina precedente" className="rounded px-2 py-1 bg-muted hover:bg-accent disabled:opacity-40">‹</button>
            <span className="px-2 py-1">{page}/{totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Pagina successiva" className="rounded px-2 py-1 bg-muted hover:bg-accent disabled:opacity-40">›</button>
          </div>
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Stack trace</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-3 px-4">
              <p className="text-xs font-mono font-medium text-red-500 break-all">{selected.message}</p>
              {selected.url && <p className="text-xs text-muted-foreground break-all">{selected.url}</p>}
              <p className="text-xs text-muted-foreground">{fmtDate(selected.created_at)}</p>
              <pre className="text-xs bg-muted rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">
                {selected.stack}
              </pre>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </SectionAccordion>
  );
}
