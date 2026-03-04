'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TicketStatus } from '@/lib/types';
import { TICKET_STATUS_LABELS } from '@/lib/types';
import TicketStatusBadge from './TicketStatusBadge';

const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  APERTO:         ['IN_LAVORAZIONE', 'CHIUSO'],
  IN_LAVORAZIONE: ['APERTO', 'CHIUSO'],
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
  const [error, setError] = useState<string | null>(null);

  const nextStati = STATUS_TRANSITIONS[currentStato] ?? [];

  async function handleChange(newStato: TicketStatus) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: newStato }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Errore');
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <TicketStatusBadge stato={currentStato} />
      {nextStati.map((s) => (
        <button
          key={s}
          onClick={() => handleChange(s)}
          disabled={loading}
          className="rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 px-3 py-1 text-xs font-medium text-gray-400 transition"
        >
          {loading ? '…' : `→ ${TICKET_STATUS_LABELS[s]}`}
        </button>
      ))}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
