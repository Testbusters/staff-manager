'use client';

import { Mail } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import SectionAccordion from './SectionAccordion';
import { fmtDate, EMAIL_EVENT_LABELS } from './helpers';
import type { EmailDeliveryData } from './types';

const EVENT_COLORS: Record<string, string> = {
  ['email.delivered']: 'text-emerald-600 border-emerald-300 dark:text-emerald-400',
  ['email.bounced']: 'text-red-500 border-red-300',
  ['email.opened']: 'text-brand border-brand/30 dark:text-brand',
  ['email.clicked']: 'text-purple-600 border-purple-300 dark:text-purple-400',
  ['email.complained']: 'text-orange-600 border-orange-300 dark:text-orange-400',
};

export default function EmailDelivery({
  data,
  loading,
  page,
  onPageChange,
}: {
  data: EmailDeliveryData | null;
  loading: boolean;
  page: number;
  onPageChange: (p: number) => void;
}) {
  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1;

  return (
    <SectionAccordion title="Consegna email" description="Eventi email degli ultimi 30 giorni.">
      {/* Summary strip */}
      {loading ? (
        <div className="px-5 py-3 flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-28 rounded-full" />)}
        </div>
      ) : data && Object.keys(data.summary).length > 0 ? (
        <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-border">
          {Object.entries(data.summary).map(([type, count]) => (
            <span
              key={type}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${EVENT_COLORS[type] ?? 'text-muted-foreground border-border'}`}
            >
              <span className="font-bold">{count}</span>
              {EMAIL_EVENT_LABELS[type] ?? type}
            </span>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : !data || data.events.length === 0 ? (
          <EmptyState icon={Mail} title="Nessun evento email registrato." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead>Oggetto</TableHead>
                <TableHead>Evento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.events.map((e) => {
                const isBounce = e.event_type === 'email.bounced' || e.event_type === 'email.complained';
                return (
                  <TableRow key={e.id} className={isBounce ? 'bg-red-50/40 dark:bg-red-900/10' : ''}>
                    <TableCell className="text-xs whitespace-nowrap">{fmtDate(e.created_at)}</TableCell>
                    <TableCell className="text-xs">{e.recipient}</TableCell>
                    <TableCell className="text-xs max-w-xs truncate">{e.subject || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${EVENT_COLORS[e.event_type] ?? ''}`}>
                        {EMAIL_EVENT_LABELS[e.event_type] ?? e.event_type}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground">
          <span>{data?.total ?? 0} eventi (ultimi 100)</span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              aria-label="Pagina precedente"
              className="rounded px-2 py-1 bg-muted hover:bg-accent disabled:opacity-40"
            >‹</button>
            <span className="px-2 py-1">{page}/{totalPages}</span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
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
