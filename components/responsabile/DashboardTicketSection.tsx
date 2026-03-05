'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export type DashboardTicket = {
  id: string;
  oggetto: string;
  stato: string;
  categoria: string;
  priority: string;
  collabName: string;
  created_at: string;
  last_message_at: string | null;
  last_message_author_name: string | null;
};

const CARD_CLS = 'rounded-2xl bg-card border border-border';

const STATO_BADGE: Record<string, string> = {
  APERTO:         'bg-rose-900/40 text-rose-300 border-rose-700/50',
  IN_LAVORAZIONE: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
  CHIUSO:         'bg-muted text-muted-foreground border-border',
};

const CATEGORIA_BADGE: Record<string, string> = {
  Compenso: 'bg-blue-900/40 text-blue-300 border-blue-700/50',
  Rimborso: 'bg-violet-900/40 text-violet-300 border-violet-700/50',
};

const STATO_LABELS: Record<string, string> = {
  APERTO:         'Aperto',
  IN_LAVORAZIONE: 'In lavorazione',
  CHIUSO:         'Chiuso',
};

const PRIORITY_DOT: Record<string, string> = {
  ALTA:    'bg-red-500',
  NORMALE: 'bg-yellow-500',
  BASSA:   'bg-gray-500',
};

function formatAge(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'Oggi';
  if (days === 1) return '1g';
  return `${days}g`;
}

function formatAgeShort(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m fa`;
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(diffMs / 86400000);
  return `${days}g fa`;
}

function TicketRow({ ticket }: { ticket: DashboardTicket }) {
  const lastReply = ticket.last_message_at ? (
    <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">
      {ticket.last_message_author_name ?? 'Risposta'} · {formatAgeShort(ticket.last_message_at)}
    </span>
  ) : (
    <span className="text-xs text-amber-500/80 hidden sm:inline">In attesa</span>
  );

  return (
    <Link
      href={`/ticket/${ticket.id}`}
      className="flex items-center gap-3 px-5 py-3 hover:bg-muted transition cursor-pointer"
    >
      <Badge variant="outline" className={`shrink-0 ${CATEGORIA_BADGE[ticket.categoria] ?? 'border-border text-muted-foreground'}`}>
        {ticket.categoria}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{ticket.oggetto}</p>
        <p className="text-xs text-muted-foreground truncate">{ticket.collabName}</p>
      </div>
      <Badge variant="outline" className={`shrink-0 ${STATO_BADGE[ticket.stato] ?? 'border-border text-muted-foreground'}`}>
        {STATO_LABELS[ticket.stato] ?? ticket.stato}
      </Badge>
      <span className={`h-2 w-2 rounded-full shrink-0 hidden sm:inline-block ${PRIORITY_DOT[ticket.priority] ?? 'bg-gray-500'}`} title={ticket.priority} />
      {lastReply}
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">{formatAge(ticket.created_at)}</span>
      <span className="shrink-0 text-xs text-muted-foreground">→</span>
    </Link>
  );
}

export default function DashboardTicketSection({
  ricevuti,
  recenti,
}: {
  ricevuti: DashboardTicket[];
  recenti: DashboardTicket[];
}) {
  return (
    <div className="space-y-4">
      {/* Ticket ricevuti */}
      <div className={CARD_CLS}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Ticket ricevuti</h2>
          <Link href="/ticket" className="text-xs text-muted-foreground hover:text-foreground transition">
            Vedi tutti →
          </Link>
        </div>
        {ricevuti.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground text-center">Nessun ticket aperto.</p>
        ) : (
          <div className="divide-y divide-border">
            {ricevuti.map((t) => <TicketRow key={t.id} ticket={t} />)}
          </div>
        )}
      </div>

      {/* Ticket recenti */}
      {recenti.length > 0 && (
        <div className={CARD_CLS}>
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Ticket recenti <span className="text-muted-foreground font-normal text-xs">(ultimi 3 giorni)</span></h2>
            <Link href="/ticket" className="text-xs text-muted-foreground hover:text-foreground transition">
              Vedi tutti →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recenti.map((t) => <TicketRow key={t.id} ticket={t} />)}
          </div>
        </div>
      )}
    </div>
  );
}
