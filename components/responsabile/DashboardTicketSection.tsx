'use client';

import Link from 'next/link';

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

const CARD_CLS = 'rounded-2xl bg-gray-900 border border-gray-800';

const STATO_BADGE: Record<string, string> = {
  APERTO:         'bg-rose-900/40 text-rose-300 border-rose-700/50',
  IN_LAVORAZIONE: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
  CHIUSO:         'bg-gray-800 text-gray-500 border-gray-700',
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
    <span className="text-xs text-gray-500 tabular-nums hidden sm:inline">
      {ticket.last_message_author_name ?? 'Risposta'} · {formatAgeShort(ticket.last_message_at)}
    </span>
  ) : (
    <span className="text-xs text-amber-500/80 hidden sm:inline">In attesa</span>
  );

  return (
    <Link
      href={`/ticket/${ticket.id}`}
      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-800 transition cursor-pointer"
    >
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${CATEGORIA_BADGE[ticket.categoria] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
        {ticket.categoria}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 truncate">{ticket.oggetto}</p>
        <p className="text-xs text-gray-500 truncate">{ticket.collabName}</p>
      </div>
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${STATO_BADGE[ticket.stato] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
        {STATO_LABELS[ticket.stato] ?? ticket.stato}
      </span>
      <span className={`h-2 w-2 rounded-full shrink-0 hidden sm:inline-block ${PRIORITY_DOT[ticket.priority] ?? 'bg-gray-500'}`} title={ticket.priority} />
      {lastReply}
      <span className="text-xs text-gray-600 tabular-nums shrink-0">{formatAge(ticket.created_at)}</span>
      <span className="shrink-0 text-xs text-gray-600">→</span>
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
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-200">Ticket ricevuti</h2>
          <Link href="/ticket" className="text-xs text-gray-500 hover:text-gray-300 transition">
            Vedi tutti →
          </Link>
        </div>
        {ricevuti.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500 text-center">Nessun ticket aperto.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {ricevuti.map((t) => <TicketRow key={t.id} ticket={t} />)}
          </div>
        )}
      </div>

      {/* Ticket recenti */}
      {recenti.length > 0 && (
        <div className={CARD_CLS}>
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-200">Ticket recenti <span className="text-gray-600 font-normal text-xs">(ultimi 3 giorni)</span></h2>
            <Link href="/ticket" className="text-xs text-gray-500 hover:text-gray-300 transition">
              Vedi tutti →
            </Link>
          </div>
          <div className="divide-y divide-gray-800">
            {recenti.map((t) => <TicketRow key={t.id} ticket={t} />)}
          </div>
        </div>
      )}
    </div>
  );
}
