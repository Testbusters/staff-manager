'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { TicketStatus } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function TicketMessageForm({
  ticketId,
  ticketStato,
}: {
  ticketId: string;
  ticketStato: TicketStatus;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError('Inserisci un messaggio.');
      return;
    }
    setSending(true);
    setError(null);

    const fd = new FormData();
    fd.append('message', message.trim());
    const file = fileRef.current?.files?.[0];
    if (file) fd.append('file', file);

    const res = await fetch(`/api/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: fd,
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Errore durante l\'invio del messaggio.');
      setSending(false);
      return;
    }

    setMessage('');
    setFileName(null);
    if (fileRef.current) fileRef.current.value = '';
    setSending(false);
    router.refresh();
  }

  if (ticketStato === 'CHIUSO') return null;

  return (
    <form onSubmit={handleSend} className="space-y-3">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Scrivi un messaggio…"
          rows={4}
          className="resize-none"
        />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* File attachment */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="ticket-file"
              className="cursor-pointer rounded-lg border border-border bg-muted hover:bg-accent px-3 py-1.5 text-xs text-muted-foreground transition"
            >
              📎 Allega file
            </label>
            <input
              id="ticket-file"
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
            {fileName && (
              <span className="text-xs text-muted-foreground max-w-[160px] truncate">{fileName}</span>
            )}
          </div>

          <Button type="submit" disabled={sending || !message.trim()} className="bg-brand hover:bg-brand/90 text-white">
            {sending ? 'Invio…' : 'Invia risposta'}
          </Button>
        </div>
      </form>
  );
}
