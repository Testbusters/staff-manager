'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bell } from 'lucide-react';
import type { Notification } from '@/lib/types';
import { NOTIFICATION_TYPE_BADGE } from '@/lib/notification-utils';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

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
  const chipActive = 'bg-accent text-foreground border-accent';
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
          <ButtonGroup>
            <Button
              variant={!unreadOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => pushParams({ unread_only: 'false', page: '1' })}
              className={!unreadOnly ? 'bg-brand hover:bg-brand/90 text-white' : ''}
            >
              Tutte
            </Button>
            <Button
              variant={unreadOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => pushParams({ unread_only: 'true', page: '1' })}
              className={unreadOnly ? 'bg-brand hover:bg-brand/90 text-white' : ''}
            >
              Non lette
            </Button>
          </ButtonGroup>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs text-link hover:text-link/80 h-auto p-0"
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
          <EmptyState
            icon={Bell}
            title={unreadOnly ? 'Nessuna notifica non letta' : entityType ? 'Nessuna notifica per questa categoria' : 'Nessuna notifica'}
          />
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((n) => {
              const href = entityHref(n);
              const badge = n.entity_type ? NOTIFICATION_TYPE_BADGE[n.entity_type] : undefined;
              const inner = (
                <li
                  className={`group flex items-start gap-3 px-4 py-3.5
                              hover:bg-muted/60 transition
                              ${!n.read ? 'bg-muted/30' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {!n.read && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
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
                        className="text-[10px] text-link hover:text-link/80 whitespace-nowrap h-auto p-0"
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
