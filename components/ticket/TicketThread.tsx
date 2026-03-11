'use client';

import { useEffect, useState } from 'react';
import { Paperclip } from 'lucide-react';
import type { TicketStatus } from '@/lib/types';
import { TICKET_STATUS_LABELS } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';

export type MessageDisplay = {
  id: string;
  author_label: string;
  is_own: boolean;
  message: string;
  attachment_name: string | null;
  signed_attachment_url: string | null;
  created_at: string;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TicketThread({
  messages,
  ticketStato,
  ticketId,
}: {
  messages: MessageDisplay[];
  ticketStato: TicketStatus;
  ticketId: string;
}) {
  const [lastVisitTs, setLastVisitTs] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`ticket_last_visit_${ticketId}`);
    setLastVisitTs(stored ? Number(stored) : null);
    return () => {
      localStorage.setItem(`ticket_last_visit_${ticketId}`, Date.now().toString());
    };
  }, [ticketId]);

  return (
    <div className="space-y-2">
      {messages.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nessun messaggio ancora. Aggiungi il primo messaggio qui sotto.
            </p>
          </CardContent>
        </Card>
      ) : (
        messages.map((m) => {
          const isNew =
            lastVisitTs !== null &&
            !m.is_own &&
            new Date(m.created_at).getTime() > lastVisitTs;

          return (
            <div
              key={m.id}
              className={`flex ${m.is_own ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                  m.is_own
                    ? 'bg-brand/20 border border-brand/30 rounded-tr-sm'
                    : 'bg-card border border-border rounded-tl-sm'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-4 mb-1.5">
                  <span className={`text-xs font-semibold ${m.is_own ? 'text-brand' : 'text-muted-foreground'}`}>
                    {m.author_label}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">{formatDateTime(m.created_at)}</span>
                </div>

                {/* "Nuovo" badge */}
                {isNew && (
                  <span className="inline-block text-[10px] font-medium text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5 mb-1.5 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-700/40">
                    Nuovo
                  </span>
                )}

                {/* Message body */}
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">{m.message}</p>

                {/* Attachment */}
                {m.attachment_name && (
                  <div className="mt-2.5">
                    {m.signed_attachment_url ? (
                      <a
                        href={m.signed_attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs text-link hover:text-link/80 transition"
                      >
                        <Paperclip className="h-3.5 w-3.5 shrink-0" />{m.attachment_name}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Paperclip className="h-3.5 w-3.5 shrink-0" />{m.attachment_name}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      {ticketStato === 'CHIUSO' && (
        <div className="rounded-xl bg-muted/50 border border-border p-4 text-center mt-4">
          <p className="text-sm text-muted-foreground">
            Questo ticket è <span className="font-medium text-muted-foreground">{TICKET_STATUS_LABELS.CHIUSO}</span>. Non è possibile aggiungere nuovi messaggi.
          </p>
        </div>
      )}
    </div>
  );
}
