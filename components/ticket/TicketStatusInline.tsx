'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { TicketStatus } from '@/lib/types';
import { TICKET_STATUS_LABELS } from '@/lib/types';
import TicketStatusBadge from './TicketStatusBadge';
import { Button } from '@/components/ui/button';

const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  APERTO:         ['CHIUSO'],
  IN_LAVORAZIONE: ['CHIUSO'],
  CHIUSO:         [],
};

export default function TicketStatusInline({
  ticketId,
  currentStato,
}: {
  ticketId: string;
  currentStato: TicketStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const nextStati = STATUS_TRANSITIONS[currentStato] ?? [];

  async function handleChange(newStato: TicketStatus) {
    setLoading(true);
    const res = await fetch(`/api/tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: newStato }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? 'Errore', { duration: 5000 });
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <TicketStatusBadge stato={currentStato} />
      {nextStati.map((s) => (
        <Button
          key={s}
          variant="outline"
          size="sm"
          onClick={() => handleChange(s)}
          disabled={loading}
          className="text-xs font-medium text-muted-foreground"
        >
          {loading ? '…' : `→ ${TICKET_STATUS_LABELS[s]}`}
        </Button>
      ))}
    </div>
  );
}
