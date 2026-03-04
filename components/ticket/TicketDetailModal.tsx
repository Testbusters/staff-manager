'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { TicketStatus } from '@/lib/types';
import { TICKET_STATUS_LABELS } from '@/lib/types';

type TicketMessage = {
  id: string;
  message: string;
  is_own: boolean;
  author_label: string;
  created_at: string;
  attachment_name: string | null;
  signed_attachment_url: string | null;
};

type TicketDetail = {
  id: string;
  oggetto: string;
  stato: TicketStatus;
  categoria: string;
};

const STATUS_COLOR: Record<TicketStatus, string> = {
  APERTO:         'text-gray-400 bg-gray-800',
  IN_LAVORAZIONE: 'text-yellow-300 bg-yellow-900/30',
  CHIUSO:         'text-green-300 bg-green-900/30',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TicketDetailModal({
  ticketId,
  onClose,
}: {
  ticketId: string;
  onClose: () => void;
}) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchTicket() {
    const res = await fetch(`/api/tickets/${ticketId}`);
    if (!res.ok) return;
    const data = await res.json();
    setTicket(data.ticket);
    setMessages(data.messages ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchTicket(); }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setSendError(null);

    const fd = new FormData();
    fd.append('message', reply.trim());
    const res = await fetch(`/api/tickets/${ticketId}/messages`, { method: 'POST', body: fd });
    setSending(false);

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setSendError(d.error ?? 'Errore invio');
      return;
    }
    setReply('');
    await fetchTicket();
  }

  const isClosed = ticket?.stato === 'CHIUSO';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl bg-gray-900 border border-gray-800 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="min-w-0">
            {ticket && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mb-1 ${STATUS_COLOR[ticket.stato]}`}>
                {TICKET_STATUS_LABELS[ticket.stato]}
              </span>
            )}
            <p className="text-sm font-semibold text-gray-100 truncate">
              {ticket?.oggetto ?? '…'}
            </p>
            {ticket && (
              <p className="text-xs text-gray-500 mt-0.5">{ticket.categoria}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {ticket && (
              <Link
                href={`/ticket/${ticketId}`}
                className="text-xs text-blue-400 hover:text-blue-300 transition"
                onClick={onClose}
              >
                Apri →
              </Link>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 transition text-lg leading-none"
              aria-label="Chiudi"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-6">Caricamento…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">Nessun messaggio.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex flex-col gap-0.5 ${m.is_own ? 'items-end' : 'items-start'}`}>
                <span className="text-[11px] text-gray-500">{m.author_label}</span>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  m.is_own
                    ? 'bg-blue-600/20 border border-blue-500/30 rounded-tr-sm text-gray-100'
                    : 'bg-gray-800 border border-gray-700 rounded-tl-sm text-gray-200'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  {m.signed_attachment_url && (
                    <a
                      href={m.signed_attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      📎 {m.attachment_name ?? 'Allegato'}
                    </a>
                  )}
                </div>
                <span className="text-[10px] text-gray-600">{formatTime(m.created_at)}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Reply form */}
        {!loading && !isClosed && (
          <form onSubmit={handleReply} className="border-t border-gray-800 px-4 py-3 flex-shrink-0">
            {sendError && (
              <p className="text-xs text-red-400 mb-2">{sendError}</p>
            )}
            <div className="flex gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder="Scrivi un messaggio…"
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
              />
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                className="self-end rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-2 text-sm font-medium text-white transition"
              >
                {sending ? '…' : 'Invia'}
              </button>
            </div>
          </form>
        )}
        {!loading && isClosed && (
          <div className="border-t border-gray-800 px-4 py-3 flex-shrink-0">
            <p className="text-xs text-gray-500 text-center">Ticket chiuso — nessun nuovo messaggio.</p>
          </div>
        )}
      </div>
    </div>
  );
}
