'use client';

import { useState } from 'react';
import TicketDetailModal from './TicketDetailModal';
import TicketStatusBadge from './TicketStatusBadge';
import type { TicketStatus } from '@/lib/types';

type OpenTicket = {
  id: string;
  oggetto: string;
  stato: string;
  priority: string;
};

const PRIORITY_DOT: Record<string, string> = {
  ALTA:    'bg-red-500',
  NORMALE: 'bg-yellow-500',
  BASSA:   'bg-gray-500',
};


export default function CollabOpenTicketsSection({ tickets }: { tickets: OpenTicket[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (tickets.length === 0) return null;

  return (
    <>
      <div className="rounded-2xl bg-card border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">I tuoi ticket aperti</h2>
        </div>
        <div className="divide-y divide-border">
          {tickets.slice(0, 3).map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted transition text-left cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{t.oggetto}</p>
              </div>
              <span
                className={`shrink-0 h-2 w-2 rounded-full ${PRIORITY_DOT[t.priority] ?? 'bg-gray-500'}`}
                title={t.priority}
              />
              <TicketStatusBadge stato={t.stato as TicketStatus} />
              <span className="shrink-0 text-xs text-muted-foreground">→</span>
            </button>
          ))}
        </div>
      </div>

      {selectedId && (
        <TicketDetailModal
          ticketId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
