'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import type { Notification } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext ?? (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1174, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => ctx.close();
  } catch { /* AudioContext unavailable or blocked, fail silently */ }
}

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
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread]               = useState(0);
  const [open, setOpen]                   = useState(false);
  const [loading, setLoading]             = useState(true);
  const [fetchError, setFetchError]       = useState(false);
  const [bellPulse, setBellPulse]         = useState(false);
  const prevUnreadRef = useRef<number | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) { setFetchError(true); return; }
      const data = await res.json();
      const newUnreadCount: number = data.unread ?? 0;
      setNotifications(data.notifications ?? []);
      setUnread(newUnreadCount);
      setFetchError(false);
      const prevCount = prevUnreadRef.current;
      prevUnreadRef.current = newUnreadCount;
      if (prevCount !== null && newUnreadCount > prevCount) {
        playNotificationSound();
        setBellPulse(true);
      }
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

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
    if (notif && !notif.read) setUnread((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex items-center justify-center w-8 h-8 rounded-lg
                     text-muted-foreground hover:text-foreground hover:bg-muted transition"
          aria-label="Notifiche"
        >
          <Bell
            className={[
              'h-4 w-4',
              fetchError ? 'text-red-600 dark:text-red-400' : loading ? 'opacity-50' : '',
              bellPulse ? 'bell-pulse' : '',
            ].join(' ')}
            onAnimationEnd={() => setBellPulse(false)}
          />
          {unread > 0 && (
            <span
              className="absolute top-0.5 right-0.5 min-w-[14px] h-3.5 flex items-center justify-center
                         rounded-full bg-red-500 text-[9px] font-bold text-white px-0.5"
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-80 p-0 bg-card border-border rounded-xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Notifiche</span>
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-link hover:text-link/80 transition"
            >
              Segna tutte come lette
            </button>
          )}
        </div>

        {/* Body */}
        <div className="max-h-80 overflow-y-auto">
          {fetchError ? (
            <p className="text-sm text-red-600 dark:text-red-400 text-center py-8">Errore nel caricamento</p>
          ) : loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Caricamento…</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nessuna notifica</p>
          ) : (
            notifications.map((n) => {
              const href = entityHref(n);
              const badge = n.entity_type ? TYPE_BADGE[n.entity_type] : undefined;
              const inner = (
                <div
                  className={`group px-4 py-3 border-b border-border last:border-0
                              hover:bg-muted/60 transition cursor-pointer relative
                              ${!n.read ? 'bg-muted/30' : ''}`}
                >
                  {/* Dismiss button */}
                  <button
                    onClick={(e) => handleDismiss(n.id, e)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100
                               text-muted-foreground hover:text-foreground transition text-base leading-none"
                    aria-label="Rimuovi notifica"
                  >
                    ×
                  </button>

                  <div className="flex items-center gap-1.5 pr-4">
                    {!n.read && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                    )}
                    {badge && (
                      <span className={`shrink-0 rounded-full border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-foreground leading-snug pr-4 mt-0.5 block">
                    {n.titolo}
                  </span>
                  {n.messaggio && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-1">{n.messaggio}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">{formatRelativeTime(n.created_at)}</p>
                </div>
              );

              const handleClick = () => {
                if (!n.read) handleMarkRead(n.id);
                setOpen(false);
              };

              return href ? (
                <Link key={n.id} href={href} onClick={handleClick}>
                  {inner}
                </Link>
              ) : (
                <div key={n.id} onClick={() => { if (!n.read) handleMarkRead(n.id); }}>
                  {inner}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border flex items-center gap-2">
          {notifications.length >= 50 && (
            <span className="text-[10px] text-muted-foreground flex-1">
              Potrebbero esserci notifiche più vecchie
            </span>
          )}
          <Link
            href="/notifiche"
            onClick={() => setOpen(false)}
            className="text-xs text-link hover:text-link/80 ml-auto"
          >
            Vedi tutte →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
