'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export type DashboardTicket = {
  id: string;
  oggetto: string;
  stato: string;
  categoria: string;
  collabName: string;
  created_at: string;
};

const CARD_CLS = 'rounded-2xl bg-gray-900 border border-gray-800';

const STATO_BADGE: Record<string, string> = {
  APERTO:         'bg-rose-900/40 text-rose-300 border-rose-700/50',
  IN_LAVORAZIONE: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
};

const CATEGORIA_BADGE: Record<string, string> = {
  Compenso:  'bg-blue-900/40 text-blue-300 border-blue-700/50',
  Rimborso:  'bg-violet-900/40 text-violet-300 border-violet-700/50',
};

const STATO_LABELS: Record<string, string> = {
  APERTO:         'Aperto',
  IN_LAVORAZIONE: 'In lavorazione',
};

function formatAge(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'Oggi';
  if (days === 1) return '1g';
  return `${days}g`;
}

export default function DashboardTicketSection({ tickets }: { tickets: DashboardTicket[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [replyTexts, setReplyTexts]   = useState<Record<string, string>>({});
  const [submitting, setSubmitting]   = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);

  function toggleReply(id: string) {
    setExpandedId(prev => (prev === id ? null : id));
    setError(null);
  }

  async function handleReply(ticketId: string) {
    const message = (replyTexts[ticketId] ?? '').trim();
    if (!message) return;
    setSubmitting(ticketId);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('message', message);
      const res = await fetch(`/api/tickets/${ticketId}/messages`, { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Errore durante l\'invio della risposta.');
      } else {
        setExpandedId(null);
        setReplyTexts(prev => { const next = { ...prev }; delete next[ticketId]; return next; });
        startTransition(() => router.refresh());
      }
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className={CARD_CLS}>
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-200">Ticket recenti</h2>
        <Link href="/ticket" className="text-xs text-gray-500 hover:text-gray-300 transition">
          Vedi tutti →
        </Link>
      </div>

      {tickets.length === 0 ? (
        <p className="px-5 py-6 text-sm text-gray-500 text-center">Nessun ticket aperto.</p>
      ) : (
        <div className="divide-y divide-gray-800">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="px-5 py-3">
              {/* Ticket row */}
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
                <span className="text-xs text-gray-600 tabular-nums shrink-0">{formatAge(ticket.created_at)}</span>
                <button
                  onClick={() => toggleReply(ticket.id)}
                  className="shrink-0 text-xs text-blue-400 hover:text-blue-300 transition"
                >
                  {expandedId === ticket.id ? 'Annulla' : 'Rispondi'}
                </button>
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

              {/* Inline reply */}
              {expandedId === ticket.id && (
                <div className="mt-3 space-y-2 pl-0">
                  <textarea
                    value={replyTexts[ticket.id] ?? ''}
                    onChange={(e) => setReplyTexts(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                    rows={2}
                    placeholder="Scrivi risposta..."
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                  {error && submitting === null && (
                    <p className="text-xs text-red-400">{error}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setExpandedId(null); setError(null); }}
                      className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 transition"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={() => handleReply(ticket.id)}
                      disabled={!replyTexts[ticket.id]?.trim() || submitting === ticket.id}
                      className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-50"
                    >
                      {submitting === ticket.id ? 'Invio...' : 'Invia risposta →'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
