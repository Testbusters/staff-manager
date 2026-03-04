'use client';

import { useState } from 'react';
import TicketDetailModal from './TicketDetailModal';
import type { TicketStatus } from '@/lib/types';
import { TICKET_STATUS_LABELS } from '@/lib/types';

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

const STATUS_BADGE: Record<string, string> = {
  IN_LAVORAZIONE: 'bg-yellow-900/30 text-yellow-300 border-yellow-800/30',
  CHIUSO:         'bg-green-900/30 text-green-300 border-green-800/30',
};

export default function CollabOpenTicketsSection({ tickets }: { tickets: OpenTicket[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (tickets.length === 0) return null;

  return (
    <>
      <div className="rounded-2xl bg-gray-900 border border-gray-800">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-medium text-gray-200">I tuoi ticket aperti</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {tickets.slice(0, 3).map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-800 transition text-left cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 truncate">{t.oggetto}</p>
              </div>
              <span
                className={`shrink-0 h-2 w-2 rounded-full ${PRIORITY_DOT[t.priority] ?? 'bg-gray-500'}`}
                title={t.priority}
              />
              <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[t.stato] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                {TICKET_STATUS_LABELS[t.stato as TicketStatus] ?? t.stato}
              </span>
              <span className="shrink-0 text-xs text-gray-500">→</span>
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
