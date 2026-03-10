'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
    <div className="rounded-2xl bg-card border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Stato sistema</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Contatori in tempo reale sulle entità in attesa.</p>
      </div>
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
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                isWarning ? 'bg-amber-600 text-white dark:bg-amber-500' : 'bg-emerald-600 text-white dark:bg-emerald-500'
              }`}>
                {count}
              </span>
              {pill.label}
            </Link>
          );
        })}
      </div>
    </div>
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

  return (
    <div className="rounded-2xl bg-card border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-foreground">Log accessi</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Autenticazioni recenti dal log di Supabase Auth.</p>
        </div>
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
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : total === 0 ? (
          <p className="p-5 text-sm text-muted-foreground text-center">Nessun evento trovato.</p>
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
    </div>
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
    <div className="rounded-2xl bg-card border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Log operazioni</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Storico import e export con dettaglio righe.</p>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : total === 0 ? (
          <p className="p-5 text-sm text-muted-foreground text-center">Nessuna operazione registrata.</p>
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
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-muted-foreground">Tipo</div><div>{selected.tipo}</div>
                <div className="text-muted-foreground">Data</div><div>{fmtDate(selected.created_at)}</div>
                <div className="text-muted-foreground">Eseguita da</div><div>{selected.executed_by_email || '—'}</div>
                <div className="text-muted-foreground">Importati</div><div className="text-emerald-600 dark:text-emerald-400 font-medium">{selected.imported}</div>
                <div className="text-muted-foreground">Saltati</div><div>{selected.skipped}</div>
                <div className="text-muted-foreground">Errori</div><div className="text-red-500 font-medium">{selected.errors}</div>
                <div className="text-muted-foreground">Durata</div><div className="font-mono">{fmtDuration(selected.duration_ms)}</div>
              </div>
              {Array.isArray(selected.detail_json) && (selected.detail_json as Record<string, unknown>[]).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-2">Dettaglio righe</p>
                  <div className="rounded border border-border divide-y divide-border text-xs max-h-96 overflow-y-auto">
                    {(selected.detail_json as Record<string, unknown>[]).map((row, i) => (
                      <div key={i} className="px-3 py-2 flex items-start gap-2">
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
                  </div>
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
    </div>
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
    ['email.opened']: 'text-blue-600 border-blue-300 dark:text-blue-400',
    ['email.clicked']: 'text-purple-600 border-purple-300 dark:text-purple-400',
    ['email.complained']: 'text-orange-600 border-orange-300 dark:text-orange-400',
  };

  return (
    <div className="rounded-2xl bg-card border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Consegna email</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Eventi email degli ultimi 30 giorni ricevuti tramite webhook Resend.</p>
      </div>

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

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : !data || data.events.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground text-center">
            Nessun evento email. Configura il webhook Resend su <code className="text-xs">/api/webhooks/resend</code>.
          </p>
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
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MonitoraggioSection() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [accessEvents, setAccessEvents] = useState<AccessEvent[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [emailData, setEmailData] = useState<EmailDeliveryData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [accessDays, setAccessDays] = useState<AccessDays>(7);
  const [emailPage, setEmailPage] = useState(1);

  const accessDaysRef = useRef(accessDays);
  const emailPageRef = useRef(emailPage);
  accessDaysRef.current = accessDays;
  emailPageRef.current = emailPage;

  const fetchAll = async (days = accessDaysRef.current, ePage = emailPageRef.current) => {
    const [statsRes, accessRes, opsRes, emailRes] = await Promise.allSettled([
      fetch('/api/admin/monitoring/stats').then((r) => r.json()),
      fetch(`/api/admin/monitoring/access-log?days=${days}`).then((r) => r.json()),
      fetch('/api/admin/monitoring/operations').then((r) => r.json()),
      fetch(`/api/admin/monitoring/email-delivery?page=${ePage}`).then((r) => r.json()),
    ]);

    if (statsRes.status === 'fulfilled' && !statsRes.value.error) setStats(statsRes.value);
    if (accessRes.status === 'fulfilled' && !accessRes.value.error) setAccessEvents(accessRes.value.events ?? []);
    if (opsRes.status === 'fulfilled' && !opsRes.value.error) setOperations(opsRes.value.operations ?? []);
    if (emailRes.status === 'fulfilled' && !emailRes.value.error) setEmailData(emailRes.value);
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
    fetchAll(d, emailPageRef.current);
  };

  // Re-fetch when email page changes
  const handleEmailPageChange = (p: number) => {
    setEmailPage(p);
    fetchAll(accessDaysRef.current, p);
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
    </div>
  );
}
