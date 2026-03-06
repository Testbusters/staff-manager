import Link from 'next/link';
import TicketStatusBadge from './TicketStatusBadge';
import type { TicketStatus } from '@/lib/types';
import { TICKET_PRIORITY_LABELS } from '@/lib/types';
import type { TicketPriority } from '@/lib/types';

function formatAge(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m fa`;
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(diffMs / 86400000);
  return `${days}g fa`;
}

const CATEGORIA_BADGE: Record<string, string> = {
  Compenso: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700/50',
  Rimborso: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700/50',
};

const PRIORITY_DOT: Record<string, string> = {
  ALTA:    'bg-red-500 dark:bg-red-400',
  NORMALE: 'bg-yellow-500 dark:bg-yellow-400',
  BASSA:   'bg-gray-500 dark:bg-gray-400',
};

export type TicketRecord = {
  id: string;
  categoria: string;
  oggetto: string;
  stato: TicketStatus;
  priority: string;
  creator_name?: string | null;
  last_message_at: string | null;
  last_message_author_name: string | null;
};

export default function TicketRecordRow({ ticket }: { ticket: TicketRecord }) {
  const lastReply = ticket.last_message_at ? (
    <span className="text-xs text-muted-foreground tabular-nums">
      {ticket.last_message_author_name ?? 'Risposta'} · {formatAge(ticket.last_message_at)}
    </span>
  ) : (
    <span className="text-xs text-amber-500/80">In attesa</span>
  );

  return (
    <Link
      href={`/ticket/${ticket.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition cursor-pointer"
    >
      <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${CATEGORIA_BADGE[ticket.categoria] ?? 'bg-muted text-muted-foreground border-border'}`}>
        {ticket.categoria}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{ticket.oggetto}</p>
        {ticket.creator_name && (
          <p className="text-xs text-muted-foreground truncate">{ticket.creator_name}</p>
        )}
      </div>

      <div className="shrink-0">
        <TicketStatusBadge stato={ticket.stato} />
      </div>

      <span
        className="hidden sm:inline-flex items-center gap-1 shrink-0 text-xs text-muted-foreground"
        title={TICKET_PRIORITY_LABELS[ticket.priority as TicketPriority] ?? ticket.priority}
      >
        <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[ticket.priority] ?? 'bg-gray-500'}`} />
        <span className="hidden md:inline">{TICKET_PRIORITY_LABELS[ticket.priority as TicketPriority] ?? ticket.priority}</span>
      </span>

      <div className="shrink-0 hidden sm:block">
        {lastReply}
      </div>

      <span className="shrink-0 text-xs text-muted-foreground">→</span>
    </Link>
  );
}
