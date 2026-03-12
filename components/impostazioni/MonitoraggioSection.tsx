'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, ChevronDown, Database, Mail } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { EmptyState } from '@/components/ui/empty-state';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ── Types ─────────────────────────────────────────────────────────────────────

type Stats = {
  compensi_in_attesa: number;
  rimborsi_in_attesa: number;
  doc_da_firmare: number;
  ticket_aperti: number;
  onboarding_incompleti: number;
};

type AccessEvent = {
  id: string;
  created_at: string;
  email: string;
  role: string;
  event_type: string;
  ip_address: string;
};

type Operation = {
  id: string;
  tipo: string;
  executed_by_email: string;
  imported: number;
  skipped: number;
  errors: number;
  duration_ms: number | null;
  detail_json: unknown;
  created_at: string;
};

type EmailEvent = {
  id: string;
  created_at: string;
  recipient: string;
  subject: string;
  event_type: string;
};

type EmailDeliveryData = {
  summary: Record<string, number>;
  events: EmailEvent[];
  total: number;
  page: number;
  page_size: number;
};

type SupabaseLogEntry = {
  id?: string;
  timestamp?: string;
  event_message?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

type TopQuery = {
  query: string;
  calls: number;
  total_ms: number;
  mean_ms: number;
  rows_total: number;
};

type TableStat = {
  table_name: string;
  seq_scan: number;
  idx_scan: number;
  n_live_tup: number;
  n_dead_tup: number;
};

type AppError = {
  id: string;
  created_at: string;
  message: string;
  stack: string | null;
  url: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDuration(ms: number | null) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const ACCESS_EVENT_LABELS: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  token_refreshed: 'Token refresh',
  user_recovery_requested: 'Reset password',
};

const EMAIL_EVENT_LABELS: Record<string, string> = {
  ['email.delivered']: 'Consegnata',
  ['email.bounced']: 'Rimbalzata',
  ['email.opened']: 'Aperta',
  ['email.clicked']: 'Click',
  ['email.complained']: 'Spam',
};

// ── Accordion wrapper ─────────────────────────────────────────────────────────

function SectionAccordion({
  title,
  description,
  controls,
  children,
  defaultOpen = true,
}: {
  title: string;
  description: string;
  controls?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="rounded-2xl bg-card border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <CollapsibleTrigger asChild>
          <button className="group flex-1 flex items-center justify-between text-left min-w-0 gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-foreground">{title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
            />
          </button>
        </CollapsibleTrigger>
        {controls && <div className="shrink-0 flex items-center gap-1">{controls}</div>}
      </div>
      <CollapsibleContent>
        <div>{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Section: StatoSistema ─────────────────────────────────────────────────────

const PILLS = [
  { key: 'compensi_in_attesa', label: 'Compensi in attesa', link: '/coda?tab=compensi', warn: 10 },
  { key: 'rimborsi_in_attesa', label: 'Rimborsi in attesa', link: '/coda?tab=rimborsi', warn: 5 },
  { key: 'doc_da_firmare', label: 'Doc. da firmare', link: '/documenti', warn: 1 },
  { key: 'ticket_aperti', label: 'Ticket aperti', link: '/ticket', warn: 5 },
  { key: 'onboarding_incompleti', label: 'Onboarding incompleti', link: '/impostazioni?tab=collaboratori', warn: 1 },
] as const;

function StatoSistema({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  return (
    <SectionAccordion title="Stato sistema" description="Contatori in tempo reale sulle entità in attesa.">
      <div className="p-5 flex flex-wrap gap-3">
        {PILLS.map((pill) => {
          const count = stats?.[pill.key] ?? 0;
          const isWarning = count >= pill.warn;
          return loading ? (
            <Skeleton key={pill.key} className="h-9 w-40 rounded-full" />
          ) : (
            <Link
              key={pill.key}
              href={pill.link}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition border ${
                isWarning
                  ? 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
              }`}
            >
              <span className={`inline-flex h-5 min-w-5 px-1 items-center justify-center rounded-full text-xs font-bold ${
                isWarning ? 'bg-amber-600 text-white dark:bg-amber-500' : 'bg-emerald-600 text-white dark:bg-emerald-500'
              }`}>
                {count}
              </span>
              {pill.label}
            </Link>
          );
        })}
      </div>
    </SectionAccordion>
  );
}

// ── Section: LogAccessi ───────────────────────────────────────────────────────

type AccessDays = 1 | 7 | 30;

function LogAccessi({
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

// ── Section: LogOperazioni ────────────────────────────────────────────────────

function LogOperazioni({
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

// ── Section: EmailDelivery ────────────────────────────────────────────────────

function EmailDelivery({
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

  const EVENT_COLORS: Record<string, string> = {
    ['email.delivered']: 'text-emerald-600 border-emerald-300 dark:text-emerald-400',
    ['email.bounced']: 'text-red-500 border-red-300',
    ['email.opened']: 'text-brand border-brand/30 dark:text-brand',
    ['email.clicked']: 'text-purple-600 border-purple-300 dark:text-purple-400',
    ['email.complained']: 'text-orange-600 border-orange-300 dark:text-orange-400',
  };

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

// ── Section: LogSistema (Supabase Logs) ───────────────────────────────────────

type LogService = 'api' | 'auth' | 'database';

function LogSistema({
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

// ── Section: DBPerformance ────────────────────────────────────────────────────

function DBPerformance({
  topQueries,
  tableStats,
  loading,
  onReset,
  resetting,
}: {
  topQueries: TopQuery[];
  tableStats: TableStat[];
  loading: boolean;
  onReset: () => void;
  resetting: boolean;
}) {
  const [tab, setTab] = useState<'queries' | 'tables'>('queries');

  const controls = (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        <button onClick={() => setTab('queries')} className={`rounded px-3 py-1 text-xs font-medium transition ${tab === 'queries' ? 'bg-brand text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>Query</button>
        <button onClick={() => setTab('tables')} className={`rounded px-3 py-1 text-xs font-medium transition ${tab === 'tables' ? 'bg-brand text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>Tabelle</button>
      </div>
      <Button variant="outline" size="sm" onClick={onReset} disabled={resetting} className="text-xs">
        {resetting ? 'Reset…' : 'Reset stats'}
      </Button>
    </div>
  );

  return (
    <SectionAccordion title="Performance DB" description="Top query per tempo totale di esecuzione · statistiche tabelle." controls={controls}>
      <div className="overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : tab === 'queries' ? (
          topQueries.length === 0 ? (
            <EmptyState icon={Database} title="Nessun dato. Esegui alcune query e ricarica." />
          ) : (
            <>
              {topQueries.length >= 2 && (
                <div className="px-4 pt-4 pb-2">
                  <p className="text-xs text-muted-foreground mb-2">Top {Math.min(5, topQueries.length)} per media ms</p>
                  <ResponsiveContainer width="100%" height={Math.min(5, topQueries.length) * 28}>
                    <BarChart
                      layout="vertical"
                      data={topQueries.slice(0, 5).map((q) => ({ name: q.query.slice(0, 40), mean_ms: q.mean_ms }))}
                      margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                    >
                      <XAxis type="number" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={160} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v: number | undefined) => [`${(v ?? 0).toLocaleString('it-IT')} ms`, 'Media']}
                        contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-foreground)' }}
                        labelStyle={{ color: 'var(--color-muted-foreground)' }}
                        cursor={{ fill: 'rgba(128,128,128,0.06)' }}
                      />
                      <Bar dataKey="mean_ms" radius={[0, 3, 3, 0]} maxBarSize={16}>
                        {topQueries.slice(0, 5).map((_, i) => (
                          <Cell key={i} fill={i === 0 ? 'var(--color-brand)' : 'var(--color-muted-foreground)'} fillOpacity={i === 0 ? 1 : 0.5} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Query</TableHead>
                  <TableHead className="text-right">Chiamate</TableHead>
                  <TableHead className="text-right">Totale ms</TableHead>
                  <TableHead className="text-right">Media ms</TableHead>
                  <TableHead className="text-right">Righe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topQueries.map((q, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-mono max-w-sm truncate" title={q.query}>{q.query}</TableCell>
                    <TableCell className="text-right text-xs">{q.calls.toLocaleString('it-IT')}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{q.total_ms.toLocaleString('it-IT')}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{q.mean_ms.toLocaleString('it-IT')}</TableCell>
                    <TableCell className="text-right text-xs">{q.rows_total.toLocaleString('it-IT')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </>
          )
        ) : (
          tableStats.length === 0 ? (
            <EmptyState icon={Database} title="Nessun dato tabelle." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tabella</TableHead>
                  <TableHead className="text-right">Seq scan</TableHead>
                  <TableHead className="text-right">Idx scan</TableHead>
                  <TableHead className="text-right">Righe vive</TableHead>
                  <TableHead className="text-right">Dead tuples</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableStats.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-mono">{t.table_name}</TableCell>
                    <TableCell className="text-right text-xs">{t.seq_scan.toLocaleString('it-IT')}</TableCell>
                    <TableCell className="text-right text-xs">{(t.idx_scan ?? 0).toLocaleString('it-IT')}</TableCell>
                    <TableCell className="text-right text-xs">{t.n_live_tup.toLocaleString('it-IT')}</TableCell>
                    <TableCell className={`text-right text-xs ${t.n_dead_tup > 1000 ? 'text-amber-500 font-medium' : ''}`}>{t.n_dead_tup.toLocaleString('it-IT')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}
      </div>
    </SectionAccordion>
  );
}

// ── Section: AppErrors ────────────────────────────────────────────────────────

function AppErrorsSection({ errors, loading }: { errors: AppError[]; loading: boolean }) {
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

// ── Main component ────────────────────────────────────────────────────────────

export default function MonitoraggioSection() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [accessEvents, setAccessEvents] = useState<AccessEvent[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [emailData, setEmailData] = useState<EmailDeliveryData | null>(null);
  // New sections
  const [supabaseLogs, setSupabaseLogs] = useState<SupabaseLogEntry[]>([]);
  const [topQueries, setTopQueries] = useState<TopQuery[]>([]);
  const [tableStats, setTableStats] = useState<TableStat[]>([]);
  const [appErrors, setAppErrors] = useState<AppError[]>([]);
  const [logService, setLogService] = useState<LogService>('api');
  const [resetting, setResetting] = useState(false);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [accessDays, setAccessDays] = useState<AccessDays>(7);
  const [emailPage, setEmailPage] = useState(1);

  const accessDaysRef = useRef(accessDays);
  const emailPageRef = useRef(emailPage);
  const logServiceRef = useRef(logService);
  accessDaysRef.current = accessDays;
  emailPageRef.current = emailPage;
  logServiceRef.current = logService;

  const fetchAll = async (
    days = accessDaysRef.current,
    ePage = emailPageRef.current,
    svc = logServiceRef.current,
  ) => {
    const [statsRes, accessRes, opsRes, emailRes, logsRes, dbRes, errorsRes] = await Promise.allSettled([
      fetch('/api/admin/monitoring/stats').then((r) => r.json()),
      fetch(`/api/admin/monitoring/access-log?days=${days}`).then((r) => r.json()),
      fetch('/api/admin/monitoring/operations').then((r) => r.json()),
      fetch(`/api/admin/monitoring/email-delivery?page=${ePage}`).then((r) => r.json()),
      fetch(`/api/admin/monitoring/supabase-logs?service=${svc}`).then((r) => r.json()),
      fetch('/api/admin/monitoring/db-stats').then((r) => r.json()),
      fetch('/api/admin/monitoring/app-errors').then((r) => r.json()),
    ]);

    if (statsRes.status === 'fulfilled' && !statsRes.value.error) setStats(statsRes.value);
    if (accessRes.status === 'fulfilled' && !accessRes.value.error) setAccessEvents(accessRes.value.events ?? []);
    if (opsRes.status === 'fulfilled' && !opsRes.value.error) setOperations(opsRes.value.operations ?? []);
    if (emailRes.status === 'fulfilled' && !emailRes.value.error) setEmailData(emailRes.value);
    if (logsRes.status === 'fulfilled' && !logsRes.value.error) setSupabaseLogs(logsRes.value.logs ?? []);
    if (dbRes.status === 'fulfilled' && !dbRes.value.error) {
      setTopQueries(dbRes.value.top_queries ?? []);
      setTableStats(dbRes.value.table_stats ?? []);
    }
    if (errorsRes.status === 'fulfilled' && !errorsRes.value.error) setAppErrors(errorsRes.value.errors ?? []);
    setLastUpdated(new Date());
    setCountdown(60);
    setLoading(false);
  };

  // Initial fetch
  useEffect(() => {
    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => fetchAll(), 60_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live countdown
  useEffect(() => {
    const interval = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1_000);
    return () => clearInterval(interval);
  }, []);

  // Re-fetch when access days changes
  const handleAccessDaysChange = (d: AccessDays) => {
    setAccessDays(d);
    setLoading(true);
    fetchAll(d, emailPageRef.current, logServiceRef.current);
  };

  // Re-fetch when email page changes
  const handleEmailPageChange = (p: number) => {
    setEmailPage(p);
    fetchAll(accessDaysRef.current, p, logServiceRef.current);
  };

  // Re-fetch when log service changes
  const handleLogServiceChange = (s: LogService) => {
    setLogService(s);
    setLoading(true);
    fetchAll(accessDaysRef.current, emailPageRef.current, s);
  };

  // Reset pg_stat_statements
  const handleResetStats = async () => {
    setResetting(true);
    await fetch('/api/admin/monitoring/db-stats', { method: 'POST' }).catch(() => {});
    await fetchAll();
    setResetting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with refresh info */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {lastUpdated
            ? `Aggiornato alle ${lastUpdated.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · prossimo aggiornamento in ${countdown}s`
            : 'Caricamento in corso…'}
        </div>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchAll(); }}>
          Aggiorna ora
        </Button>
      </div>

      <StatoSistema stats={stats} loading={loading} />
      <LogAccessi
        events={accessEvents}
        loading={loading}
        days={accessDays}
        onDaysChange={handleAccessDaysChange}
      />
      <LogOperazioni operations={operations} loading={loading} />
      <EmailDelivery
        data={emailData}
        loading={loading}
        page={emailPage}
        onPageChange={handleEmailPageChange}
      />
      <LogSistema
        logs={supabaseLogs}
        loading={loading}
        service={logService}
        onServiceChange={handleLogServiceChange}
      />
      <AppErrorsSection errors={appErrors} loading={loading} />
      <DBPerformance
        topQueries={topQueries}
        tableStats={tableStats}
        loading={loading}
        onReset={handleResetStats}
        resetting={resetting}
      />
    </div>
  );
}
