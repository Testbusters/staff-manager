'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import StatoSistema from './monitoraggio/StatoSistema';
import LogAccessi from './monitoraggio/LogAccessi';
import LogOperazioni from './monitoraggio/LogOperazioni';
import EmailDelivery from './monitoraggio/EmailDelivery';
import LogSistema from './monitoraggio/LogSistema';
import DBPerformance from './monitoraggio/DBPerformance';
import AppErrorsSection from './monitoraggio/AppErrorsSection';
import type {
  Stats, AccessEvent, Operation, EmailDeliveryData,
  SupabaseLogEntry, TopQuery, TableStat, AppError,
  AccessDays, LogService,
} from './monitoraggio/types';

export default function MonitoraggioSection() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [accessEvents, setAccessEvents] = useState<AccessEvent[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [emailData, setEmailData] = useState<EmailDeliveryData | null>(null);
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

  const handleAccessDaysChange = (d: AccessDays) => {
    setAccessDays(d);
    setLoading(true);
    fetchAll(d, emailPageRef.current, logServiceRef.current);
  };

  const handleEmailPageChange = (p: number) => {
    setEmailPage(p);
    fetchAll(accessDaysRef.current, p, logServiceRef.current);
  };

  const handleLogServiceChange = (s: LogService) => {
    setLogService(s);
    setLoading(true);
    fetchAll(accessDaysRef.current, emailPageRef.current, s);
  };

  const handleResetStats = async () => {
    setResetting(true);
    await fetch('/api/admin/monitoring/db-stats', { method: 'POST' }).catch(() => {});
    await fetchAll();
    setResetting(false);
  };

  return (
    <div className="space-y-6">
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
