'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

function TicketRow({
  ticket,
  showReply,
}: {
  ticket: DashboardTicket;
  showReply: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastReply = ticket.last_message_at ? (
    <span className="text-xs text-gray-500 tabular-nums hidden sm:inline">
      {ticket.last_message_author_name ?? 'Risposta'} · {formatAgeShort(ticket.last_message_at)}
    </span>
  ) : (
    <span className="text-xs text-amber-500/80 hidden sm:inline">In attesa</span>
  );

  async function handleReply() {
    const message = replyText.trim();
    if (!message) return;
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('message', message);
      const res = await fetch(`/api/tickets/${ticket.id}/messages`, { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Errore durante l\'invio.');
      } else {
        setExpanded(false);
        setReplyText('');
        startTransition(() => router.refresh());
      }
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-5 py-3">
      <div className="flex items-center gap-3">
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
        {showReply && ticket.stato !== 'CHIUSO' && (
          <button
            onClick={() => { setExpanded(p => !p); setError(null); }}
            className="shrink-0 text-xs text-blue-400 hover:text-blue-300 transition"
          >
            {expanded ? 'Annulla' : 'Rispondi'}
          </button>
        )}
        <Link
          href={`/ticket/${ticket.id}`}
          className="shrink-0 text-gray-600 hover:text-gray-400 transition"
          aria-label="Apri ticket"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            placeholder="Scrivi risposta..."
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setExpanded(false); setError(null); }}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 transition"
            >
              Annulla
            </button>
            <button
              onClick={handleReply}
              disabled={!replyText.trim() || submitting}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-50"
            >
              {submitting ? 'Invio...' : 'Invia risposta →'}
            </button>
          </div>
        </div>
      )}
    </div>
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
            {ricevuti.map((t) => <TicketRow key={t.id} ticket={t} showReply={true} />)}
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
            {recenti.map((t) => <TicketRow key={t.id} ticket={t} showReply={false} />)}
          </div>
        </div>
      )}
    </div>
  );
}
