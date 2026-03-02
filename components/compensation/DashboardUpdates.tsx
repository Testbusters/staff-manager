'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DOCUMENT_TYPE_LABELS } from '@/lib/types';
import type { DocumentType } from '@/lib/types';

export type DashboardDocItem = {
  id: string;
  titolo: string | null;
  tipo: DocumentType;
  created_at: string;
};

type Tab = { key: string; label: string; disabled?: true };

const TABS: Tab[] = [
  { key: 'documenti',     label: 'Documenti' },
  { key: 'eventi',        label: 'Eventi',                   disabled: true },
  { key: 'comunicazioni', label: 'Comunicazioni e risorse',  disabled: true },
  { key: 'opportunita',   label: 'Opportunità e sconti',     disabled: true },
];

const PAGE_SIZE = 4;

export default function DashboardUpdates({ documents }: { documents: DashboardDocItem[] }) {
  const [activeTab, setActiveTab] = useState<string>('documenti');
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(documents.length / PAGE_SIZE));
  const visible = documents.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800">
      {/* Tab header */}
      <div className="flex flex-wrap items-center gap-1 px-5 py-4 border-b border-gray-800">
        <h2 className="text-sm font-medium text-gray-200 mr-3">Ultimi aggiornamenti</h2>
        <div className="flex items-center gap-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                if (!tab.disabled) {
                  setActiveTab(tab.key);
                  setPage(0);
                }
              }}
              disabled={tab.disabled}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                tab.disabled
                  ? 'text-gray-700 cursor-not-allowed'
                  : activeTab === tab.key
                    ? 'bg-gray-700 text-gray-100'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documenti content */}
      {activeTab === 'documenti' && (
        <>
          <div className="divide-y divide-gray-800/50">
            {visible.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                Nessun documento in attesa di firma.
              </p>
            ) : (
              visible.map((doc) => (
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
                      {new Date(doc.created_at).toLocaleDateString('it-IT', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className="flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
                    {DOCUMENT_TYPE_LABELS[doc.tipo]}
                  </span>
                  <span className="text-gray-600 group-hover:text-gray-300 text-sm transition flex-shrink-0">→</span>
                </Link>
              ))
            )}
          </div>

          {/* Prev/next pagination */}
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
        </>
      )}
    </div>
  );
}
