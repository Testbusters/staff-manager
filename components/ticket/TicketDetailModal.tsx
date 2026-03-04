'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { TicketStatus } from '@/lib/types';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import TicketStatusBadge from './TicketStatusBadge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

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
    <Dialog open={true} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="w-full sm:max-w-lg max-h-[90vh] bg-gray-900 border-gray-800 p-0 gap-0 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-800 flex-shrink-0 pr-10">
          <div className="min-w-0">
            {ticket && <TicketStatusBadge stato={ticket.stato} />}
            <p className="text-sm font-semibold text-gray-100 truncate mt-1">
              {ticket?.oggetto ?? '…'}
            </p>
            {ticket && (
              <p className="text-xs text-gray-500 mt-0.5">{ticket.categoria}</p>
            )}
          </div>
          {ticket && (
            <Link
              href={`/ticket/${ticketId}`}
              className="text-xs text-blue-400 hover:text-blue-300 transition flex-shrink-0"
              onClick={onClose}
            >
              Apri →
            </Link>
          )}
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
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder="Scrivi un messaggio…"
                className="flex-1 resize-none"
              />
              <Button
                type="submit"
                disabled={sending || !reply.trim()}
                className="self-end bg-blue-600 hover:bg-blue-500 text-white"
              >
                {sending ? '…' : 'Invia'}
              </Button>
            </div>
          </form>
        )}
        {!loading && isClosed && (
          <div className="border-t border-gray-800 px-4 py-3 flex-shrink-0">
            <p className="text-xs text-gray-500 text-center">Ticket chiuso — nessun nuovo messaggio.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
