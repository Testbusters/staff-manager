'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Notification } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function entityHref(n: Notification): string | null {
  if (!n.entity_type || !n.entity_id) return null;
  if (n.entity_type === 'compensation')  return `/compensi/${n.entity_id}`;
  if (n.entity_type === 'reimbursement') return `/rimborsi/${n.entity_id}`;
  if (n.entity_type === 'document')      return `/documenti/${n.entity_id}`;
  if (n.entity_type === 'ticket')        return `/ticket/${n.entity_id}`;
  if (n.entity_type === 'communication') return `/comunicazioni/${n.entity_id}`;
  if (n.entity_type === 'event')         return `/eventi/${n.entity_id}`;
  if (n.entity_type === 'opportunity')   return `/opportunita/${n.entity_id}`;
  if (n.entity_type === 'discount')      return `/sconti/${n.entity_id}`;
  return null;
}

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  compensation:  { label: 'Compenso',      cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/60 dark:text-blue-300 dark:border-blue-800/60' },
  reimbursement: { label: 'Rimborso',      cls: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/60 dark:text-purple-300 dark:border-purple-800/60' },
  document:      { label: 'Documento',     cls: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/60 dark:text-yellow-300 dark:border-yellow-800/60' },
  ticket:        { label: 'Ticket',        cls: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/60 dark:text-orange-300 dark:border-orange-800/60' },
  communication: { label: 'Comunicazione', cls: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/60 dark:text-green-300 dark:border-green-800/60' },
  event:         { label: 'Evento',        cls: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/60 dark:text-cyan-300 dark:border-cyan-800/60' },
  opportunity:   { label: 'Opportunità',   cls: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/60 dark:text-indigo-300 dark:border-indigo-800/60' },
  discount:      { label: 'Sconto',        cls: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/60 dark:text-rose-300 dark:border-rose-800/60' },
};

// Ordered list for filter chips
const TYPE_FILTERS: { key: string; label: string }[] = [
  { key: 'compensation',  label: 'Compenso' },
  { key: 'reimbursement', label: 'Rimborso' },
  { key: 'document',      label: 'Documento' },
  { key: 'ticket',        label: 'Ticket' },
  { key: 'communication', label: 'Comunicazione' },
  { key: 'event',         label: 'Evento' },
  { key: 'opportunity',   label: 'Opportunità' },
  { key: 'discount',      label: 'Sconto' },
];

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'adesso';
  if (mins < 60) return `${mins} min fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'ora' : 'ore'} fa`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ieri';
  if (days < 7) return `${days} giorni fa`;
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

const LIMIT = 20;

export default function NotificationPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page       = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const unreadOnly = searchParams.get('unread_only') === 'true';
  const entityType = searchParams.get('entity_type') ?? '';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal]                 = useState(0);
  const [unread, setUnread]               = useState(0);
  const [loading, setLoading]             = useState(true);
  const [fetchError, setFetchError]       = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const params = new URLSearchParams({
        page:        String(page),
        limit:       String(LIMIT),
        unread_only: String(unreadOnly),
        ...(entityType ? { entity_type: entityType } : {}),
      });
      const res = await fetch(`/api/notifications?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setTotal(data.total ?? 0);
      setUnread(data.unread ?? 0);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly, entityType]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const pushParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === '') params.delete(k);
      else params.set(k, v);
    }
    router.push(`/notifiche?${params}`);
  };

  const handleMarkRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnread((prev) => Math.max(0, prev - 1));
  };

  const handleDismiss = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const notif = notifications.find((n) => n.id === id);
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    if (notif && !notif.read) setUnread((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  const totalPages = Math.ceil(total / LIMIT);

  const chipBase = 'whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium border transition cursor-pointer select-none';
  const chipActive = 'bg-gray-100 text-gray-900 border-gray-100';
  const chipInactive = 'bg-transparent text-muted-foreground border-border hover:border-muted-foreground hover:text-foreground';

  return (
    <div className="max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Notifiche</h1>
          {unread > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {unread} non {unread === 1 ? 'letta' : 'lette'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 shrink-0">
          <Button
            onClick={() => pushParams({ unread_only: String(!unreadOnly), page: '1' })}
            className={`text-xs px-3 py-1.5 rounded-full border h-auto ${
              unreadOnly
                ? 'bg-brand text-white border-blue-600 hover:bg-blue-500'
                : 'bg-transparent text-muted-foreground border-border hover:border-muted-foreground hover:bg-transparent'
            }`}
          >
            Solo non lette
          </Button>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs text-blue-400 hover:text-blue-300 h-auto p-0"
            >
              Segna tutte come lette
            </Button>
          )}
        </div>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <Button
          onClick={() => pushParams({ entity_type: '', page: '1' })}
          className={`${chipBase} ${!entityType ? chipActive : chipInactive} h-auto`}
        >
          Tutte
        </Button>
        {TYPE_FILTERS.map(({ key, label }) => (
          <Button
            key={key}
            onClick={() => pushParams({ entity_type: entityType === key ? '' : key, page: '1' })}
            className={`${chipBase} ${entityType === key ? chipActive : chipInactive} h-auto`}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* List */}
      <Card>
        <CardContent className="overflow-hidden p-0">
        {fetchError ? (
          <p className="text-sm text-red-600 dark:text-red-400 text-center py-12">
            Errore nel caricamento delle notifiche
          </p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground text-center py-12">Caricamento…</p>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            {unreadOnly ? 'Nessuna notifica non letta' : entityType ? `Nessuna notifica per questa categoria` : 'Nessuna notifica'}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((n) => {
              const href = entityHref(n);
              const badge = n.entity_type ? TYPE_BADGE[n.entity_type] : undefined;
              const inner = (
                <li
                  className={`group flex items-start gap-3 px-4 py-3.5
                              hover:bg-muted/50 transition
                              ${!n.read ? 'bg-muted/30' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {!n.read && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      )}
                      {badge && (
                        <span className={`shrink-0 rounded-full border px-2 py-px text-[10px] font-semibold uppercase tracking-wide ${badge.cls}`}>
                          {badge.label}
                        </span>
                      )}
                      <span className="text-sm font-medium text-foreground truncate">
                        {n.titolo}
                      </span>
                    </div>
                    {n.messaggio && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.messaggio}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">{formatRelativeTime(n.created_at)}</p>
                  </div>

                  {/* Actions (visible on hover) */}
                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition">
                    {!n.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.preventDefault(); handleMarkRead(n.id); }}
                        className="text-[10px] text-blue-400 hover:text-blue-300 whitespace-nowrap h-auto p-0"
                      >
                        Segna letta
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDismiss(n.id, e)}
                      className="text-muted-foreground hover:text-foreground text-base leading-none h-auto p-0"
                      aria-label="Rimuovi notifica"
                    >
                      ×
                    </Button>
                  </div>
                </li>
              );

              return href ? (
                <Link
                  key={n.id}
                  href={href}
                  className="block"
                  onClick={() => { if (!n.read) handleMarkRead(n.id); }}
                >
                  {inner}
                </Link>
              ) : (
                <div key={n.id} onClick={() => { if (!n.read) handleMarkRead(n.id); }}>
                  {inner}
                </div>
              );
            })}
          </ul>
        )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{total} notifiche totali</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => pushParams({ page: String(page - 1) })}
              className="text-xs text-muted-foreground"
            >
              ← Precedente
            </Button>
            <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => pushParams({ page: String(page + 1) })}
              className="text-xs text-muted-foreground"
            >
              Successiva →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
