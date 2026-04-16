'use client';

import { useState } from 'react';
import { Activity } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import SectionAccordion from './SectionAccordion';
import { fmtDate, fmtDuration } from './helpers';
import type { Operation } from './types';

export default function LogOperazioni({
  operations,
  loading,
}: {
  operations: Operation[];
  loading: boolean;
}) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Operation | null>(null);
  const PAGE_SIZE = 20;
  const total = operations.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paged = operations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <SectionAccordion title="Log operazioni" description="Storico import e export con dettaglio righe.">
      <div className="overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : total === 0 ? (
          <EmptyState icon={Activity} title="Nessuna operazione registrata." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Eseguita da</TableHead>
                <TableHead className="text-right">Importati</TableHead>
                <TableHead className="text-right">Saltati</TableHead>
                <TableHead className="text-right">Errori</TableHead>
                <TableHead className="text-right">Durata</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((op) => (
                <TableRow key={op.id}>
                  <TableCell className="text-xs whitespace-nowrap">{fmtDate(op.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{op.tipo}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{op.executed_by_email || '—'}</TableCell>
                  <TableCell className="text-right text-xs text-emerald-600 dark:text-emerald-400 font-medium">{op.imported}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{op.skipped}</TableCell>
                  <TableCell className="text-right text-xs text-red-500 font-medium">{op.errors}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{fmtDuration(op.duration_ms)}</TableCell>
                  <TableCell>
                    {!!op.detail_json && (
                      <button
                        onClick={() => setSelected(op)}
                        className="text-xs text-link hover:text-link/80"
                      >
                        Dettaglio
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
          <span>{total} operazioni</span>
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

      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Dettaglio operazione</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4 px-4">
              <div className="space-y-2 text-xs">
                {([
                  ['Tipo', selected.tipo, ''],
                  ['Data', fmtDate(selected.created_at), ''],
                  ['Eseguita da', selected.executed_by_email || '—', ''],
                  ['Importati', selected.imported, 'text-emerald-600 dark:text-emerald-400 font-medium'],
                  ['Saltati', selected.skipped, ''],
                  ['Errori', selected.errors, 'text-red-500 font-medium'],
                  ['Durata', fmtDuration(selected.duration_ms), 'font-mono'],
                ] as [string, string | number, string][]).map(([label, value, cls]) => (
                  <div key={label} className="flex gap-4">
                    <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
                    <span className={cls}>{value}</span>
                  </div>
                ))}
              </div>
              {Array.isArray(selected.detail_json) && (selected.detail_json as Record<string, unknown>[]).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-2">Dettaglio righe</p>
                  <ScrollArea className="h-96 rounded border border-border divide-y divide-border text-xs">
                    {(selected.detail_json as Record<string, unknown>[]).map((row, i) => (
                      <div key={i} className="px-3 py-2 flex items-start gap-2 border-b border-border last:border-0">
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-xs ${
                            row.status === 'imported' ? 'text-emerald-600 border-emerald-300 dark:text-emerald-400' :
                            row.status === 'error' ? 'text-red-500 border-red-300' :
                            'text-muted-foreground'
                          }`}
                        >
                          {String(row.status ?? '')}
                        </Badge>
                        <span className="text-muted-foreground">#{String(row.rowIndex ?? i + 1)}</span>
                        <span className="flex-1 break-all">{String(row.email ?? row.username ?? '')}</span>
                        {!!row.message && <span className="text-red-400 break-all">{String(row.message)}</span>}
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
              {!!selected.detail_json && !Array.isArray(selected.detail_json) && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-2">Riepilogo</p>
                  <pre className="text-xs bg-muted rounded p-3 overflow-x-auto">
                    {JSON.stringify(selected.detail_json, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </SectionAccordion>
  );
}
