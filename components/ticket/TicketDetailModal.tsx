'use client';

import { useEffect, useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';
import Link from 'next/link';
import type { TicketStatus } from '@/lib/types';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import TicketStatusBadge from './TicketStatusBadge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage, useForm, zodResolver } from '@/components/ui/form';
import { ticketMessageSchema, type TicketMessageFormValues } from '@/lib/schemas/ticket';
import { toast } from 'sonner';

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
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const form = useForm<TicketMessageFormValues>({
    resolver: zodResolver(ticketMessageSchema),
    defaultValues: { message: '' },
  });

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

  async function onReply(values: TicketMessageFormValues) {
    setSending(true);

    const fd = new FormData();
    fd.append('message', values.message.trim());
    const res = await fetch(`/api/tickets/${ticketId}/messages`, { method: 'POST', body: fd });
    setSending(false);

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? 'Errore invio', { duration: 5000 });
      return;
    }
    form.reset();
    await fetchTicket();
  }

  const isClosed = ticket?.stato === 'CHIUSO';

  return (
    <Dialog open={true} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="w-full sm:max-w-lg max-h-[90vh] bg-card border-border p-0 gap-0 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border flex-shrink-0 pr-10">
          <div className="min-w-0">
            {ticket && <TicketStatusBadge stato={ticket.stato} />}
            <p className="text-sm font-semibold text-foreground truncate mt-1">
              {ticket?.oggetto ?? '…'}
            </p>
            {ticket && (
              <p className="text-xs text-muted-foreground mt-0.5">{ticket.categoria}</p>
            )}
          </div>
          {ticket && (
            <Link
              href={`/ticket/${ticketId}`}
              className="text-xs text-link hover:text-link/80 transition flex-shrink-0"
              onClick={onClose}
            >
              Apri →
            </Link>
          )}
        </div>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Caricamento…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nessun messaggio.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex flex-col gap-0.5 ${m.is_own ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-muted-foreground">{m.author_label}</span>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  m.is_own
                    ? 'bg-brand/20 border border-brand/30 rounded-tr-sm text-foreground'
                    : 'bg-muted border border-border rounded-tl-sm text-foreground'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  {m.signed_attachment_url && (
                    <a
                      href={m.signed_attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-xs text-link hover:text-link/80 underline"
                    >
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />{m.attachment_name ?? 'Allegato'}
                    </a>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{formatTime(m.created_at)}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Reply form */}
        {!loading && !isClosed && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onReply)} className="border-t border-border px-4 py-3 flex-shrink-0">
              <div className="flex gap-2">
                <FormField control={form.control} name="message" render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Textarea {...field} rows={2} placeholder="Scrivi un messaggio…" className="resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button
                  type="submit"
                  disabled={sending || !form.watch('message').trim()}
                  className="self-end bg-brand hover:bg-brand/90 text-white"
                >
                  {sending ? '…' : 'Invia'}
                </Button>
              </div>
            </form>
          </Form>
        )}
        {!loading && isClosed && (
          <div className="border-t border-border px-4 py-3 flex-shrink-0">
            <p className="text-xs text-muted-foreground text-center">Ticket chiuso — nessun nuovo messaggio.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
