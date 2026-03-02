'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DOCUMENT_TYPE_LABELS } from '@/lib/types';
import type { DocumentType, ResourceCategoria, EventTipo, OpportunityTipo } from '@/lib/types';

export type DashboardDocItem = {
  id: string;
  titolo: string | null;
  tipo: DocumentType;
  created_at: string;
};

export type DashboardEventItem = {
  id: string;
  titolo: string;
  start_datetime: string | null;
  tipo: EventTipo | null;
};

export type DashboardCommItem = {
  id: string;
  titolo: string;
  date: string;
  categoria?: ResourceCategoria;
  kind: 'comm' | 'resource';
};

export type DashboardOppItem = {
  id: string;
  titolo: string;
  date: string;
  tipo?: OpportunityTipo | string;
  kind: 'opp' | 'discount';
};

type Tab = { key: string; label: string };

const TABS: Tab[] = [
  { key: 'documenti',     label: 'Documenti' },
  { key: 'eventi',        label: 'Eventi' },
  { key: 'comunicazioni', label: 'Comunicazioni e risorse' },
  { key: 'opportunita',   label: 'Opportunità e sconti' },
];

const PAGE_SIZE = 4;

export default function DashboardUpdates({
  documents,
  events,
  comunicazioni,
  opportunita,
}: {
  documents: DashboardDocItem[];
  events: DashboardEventItem[];
  comunicazioni: DashboardCommItem[];
  opportunita: DashboardOppItem[];
}) {
  const [activeTab, setActiveTab] = useState<string>('documenti');
  const [page, setPage] = useState(0);

  const currentItems =
    activeTab === 'documenti'     ? documents :
    activeTab === 'eventi'        ? events :
    activeTab === 'comunicazioni' ? comunicazioni :
    activeTab === 'opportunita'   ? opportunita :
    [];

  const pageCount = Math.max(1, Math.ceil(currentItems.length / PAGE_SIZE));
  const visible = currentItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleTabChange(key: string) {
    setActiveTab(key);
    setPage(0);
  }

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800">
      {/* Tab header */}
      <div className="flex flex-wrap items-center gap-1 px-5 py-4 border-b border-gray-800">
        <h2 className="text-sm font-medium text-gray-200 mr-3">Ultimi aggiornamenti</h2>
        <div className="flex items-center gap-0.5 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === tab.key
                  ? 'bg-gray-700 text-gray-100'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-800/50">
        {visible.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            {activeTab === 'documenti' ? 'Nessun documento in attesa di firma.' :
             activeTab === 'eventi'    ? 'Nessun evento in programma.' :
             activeTab === 'comunicazioni' ? 'Nessuna comunicazione recente.' :
             'Nessuna opportunità recente.'}
          </p>
        ) : activeTab === 'documenti' ? (
          (visible as DashboardDocItem[]).map((doc) => (
            <Link
              key={doc.id}
              href={`/documenti/${doc.id}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-800/40 transition group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 group-hover:text-white truncate transition">
                  {doc.titolo || DOCUMENT_TYPE_LABELS[doc.tipo]}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(doc.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <span className="flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
                {DOCUMENT_TYPE_LABELS[doc.tipo]}
              </span>
              <span className="text-gray-600 group-hover:text-gray-300 text-sm transition flex-shrink-0">→</span>
            </Link>
          ))
        ) : activeTab === 'eventi' ? (
          (visible as DashboardEventItem[]).map((ev) => (
            <Link
              key={ev.id}
              href={`/eventi/${ev.id}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-800/40 transition group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 group-hover:text-white truncate transition">{ev.titolo}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {ev.start_datetime
                    ? new Date(ev.start_datetime).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'}
                </p>
              </div>
              {ev.tipo && (
                <span className="flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
                  {ev.tipo}
                </span>
              )}
              <span className="text-gray-600 group-hover:text-gray-300 text-sm transition flex-shrink-0">→</span>
            </Link>
          ))
        ) : activeTab === 'comunicazioni' ? (
          (visible as DashboardCommItem[]).map((item) => (
            <Link
              key={item.id}
              href={item.kind === 'comm' ? `/comunicazioni/${item.id}` : `/risorse/${item.id}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-800/40 transition group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 group-hover:text-white truncate transition">{item.titolo}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(item.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <span className="flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
                {item.kind === 'comm' ? 'Comunicazione' : (item.categoria ?? 'Risorsa')}
              </span>
              <span className="text-gray-600 group-hover:text-gray-300 text-sm transition flex-shrink-0">→</span>
            </Link>
          ))
        ) : (
          (visible as DashboardOppItem[]).map((item) => (
            <Link
              key={item.id}
              href={item.kind === 'opp' ? `/opportunita/${item.id}` : `/sconti/${item.id}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-800/40 transition group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 group-hover:text-white truncate transition">{item.titolo}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(item.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <span className="flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
                {item.kind === 'opp' ? (item.tipo ?? 'Opportunità') : 'Sconto'}
              </span>
              <span className="text-gray-600 group-hover:text-gray-300 text-sm transition flex-shrink-0">→</span>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-xs text-gray-400 hover:text-gray-200 disabled:text-gray-700 disabled:cursor-not-allowed transition"
          >
            ← Precedente
          </button>
          <span className="text-xs text-gray-600">{page + 1} / {pageCount}</span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page === pageCount - 1}
            className="text-xs text-gray-400 hover:text-gray-200 disabled:text-gray-700 disabled:cursor-not-allowed transition"
          >
            Successivo →
          </button>
        </div>
      )}
    </div>
  );
}
