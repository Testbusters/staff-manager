'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { EXPENSE_CATEGORIA_BADGE } from '@/lib/types';
import type { ExpenseCategory } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PendingComp = {
  id: string;
  collaborator_id: string;
  importo_lordo: number | null;
  stato: string;
  competenza: string | null;
  created_at: string;
};

export type PendingExp = {
  id: string;
  collaborator_id: string;
  importo: number | null;
  categoria: string;
  stato: string;
  created_at: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const COMP_COMPETENZA_BADGE: Record<string, string> = {
  corsi:                'bg-blue-900/40 text-blue-300 border-blue-700/50',
  sb:                   'bg-violet-900/40 text-violet-300 border-violet-700/50',
  produzione_materiale: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
  extra:                'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
};

function formatAge(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'Oggi';
  if (days === 1) return '1g';
  return `${days}g`;
}

function formatCurrency(n: number | null) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
}

// ── Comp detail modal ─────────────────────────────────────────────────────────

type CompDetail = {
  id: string;
  stato: string;
  importo_lordo: number | null;
  importo_netto: number | null;
  nome_servizio_ruolo: string | null;
  competenza: string | null;
  data_competenza: string | null;
  info_specifiche: string | null;
};

function CompModal({ compId, onClose }: { compId: string; onClose: () => void }) {
  const [data, setData] = useState<CompDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/compensations/${compId}`)
      .then((r) => r.json())
      .then((d) => { setData(d.compensation); setLoading(false); })
      .catch(() => setLoading(false));
  }, [compId]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-100">Dettaglio compenso</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none" aria-label="Chiudi">✕</button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 text-center py-4">Caricamento…</p>
        ) : !data ? (
          <p className="text-sm text-red-400 text-center py-4">Errore caricamento.</p>
        ) : (
          <div className="space-y-3 text-sm">
            {data.nome_servizio_ruolo && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Servizio / Ruolo</p>
                <p className="text-gray-200">{data.nome_servizio_ruolo}</p>
              </div>
            )}
            {data.competenza && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Competenza</p>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${COMP_COMPETENZA_BADGE[data.competenza] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                  {data.competenza}
                </span>
              </div>
            )}
            {data.data_competenza && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Data competenza</p>
                <p className="text-gray-300">{new Date(data.data_competenza).toLocaleDateString('it-IT')}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Lordo</p>
                <p className="text-gray-300 tabular-nums font-medium">{formatCurrency(data.importo_lordo)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Netto</p>
                <p className="text-amber-300 tabular-nums font-medium">{formatCurrency(data.importo_netto)}</p>
              </div>
            </div>
            {data.info_specifiche && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Note</p>
                <p className="text-gray-400 text-xs">{data.info_specifiche}</p>
              </div>
            )}
            <div className="pt-2">
              <Link
                href={`/compensi/${compId}`}
                onClick={onClose}
                className="text-xs text-blue-400 hover:text-blue-300 transition"
              >
                Apri pagina completa →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Expense detail modal ──────────────────────────────────────────────────────

type ExpDetail = {
  id: string;
  stato: string;
  importo: number | null;
  categoria: string;
  descrizione: string | null;
  data_spesa: string;
};

function ExpModal({ expId, onClose }: { expId: string; onClose: () => void }) {
  const [data, setData] = useState<ExpDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/expenses/${expId}`)
      .then((r) => r.json())
      .then((d) => { setData(d.expense); setLoading(false); })
      .catch(() => setLoading(false));
  }, [expId]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-100">Dettaglio rimborso</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none" aria-label="Chiudi">✕</button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 text-center py-4">Caricamento…</p>
        ) : !data ? (
          <p className="text-sm text-red-400 text-center py-4">Errore caricamento.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Categoria</p>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${EXPENSE_CATEGORIA_BADGE[data.categoria as ExpenseCategory] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                {data.categoria}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Data spesa</p>
              <p className="text-gray-300">{new Date(data.data_spesa).toLocaleDateString('it-IT')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Importo</p>
              <p className="text-amber-300 tabular-nums font-medium">{formatCurrency(data.importo)}</p>
            </div>
            {data.descrizione && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Descrizione</p>
                <p className="text-gray-400 text-xs">{data.descrizione}</p>
              </div>
            )}
            <div className="pt-2">
              <Link
                href={`/rimborsi/${expId}`}
                onClick={onClose}
                className="text-xs text-blue-400 hover:text-blue-300 transition"
              >
                Apri pagina completa →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardPendingItems({
  comps,
  exps,
  collabNameMap,
}: {
  comps: PendingComp[];
  exps: PendingExp[];
  collabNameMap: Record<string, string>;
}) {
  const [selectedComp, setSelectedComp] = useState<string | null>(null);
  const [selectedExp, setSelectedExp] = useState<string | null>(null);

  const pendingComps = comps.filter((c) => c.stato === 'IN_ATTESA');
  const pendingExps  = exps.filter((e) => e.stato === 'IN_ATTESA');

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Compensi da approvare */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-200">Compensi in attesa</h2>
            <Link href="/approvazioni?tab=compensi" className="text-xs text-gray-500 hover:text-gray-300 transition">
              Vedi tutti →
            </Link>
          </div>
          {pendingComps.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-500 text-center">Nessun compenso in attesa.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {pendingComps.slice(0, 8).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedComp(c.id)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-800 transition text-left cursor-pointer"
                >
                  {c.competenza && (
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${COMP_COMPETENZA_BADGE[c.competenza] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                      {c.competenza}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{collabNameMap[c.collaborator_id] ?? 'Collaboratore'}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(c.importo_lordo)}</p>
                  </div>
                  <span className="text-xs text-gray-600 tabular-nums shrink-0">{formatAge(c.created_at)}</span>
                  <span className="text-xs text-gray-600 shrink-0">→</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Rimborsi da approvare */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-200">Rimborsi in attesa</h2>
            <Link href="/approvazioni?tab=rimborsi" className="text-xs text-gray-500 hover:text-gray-300 transition">
              Vedi tutti →
            </Link>
          </div>
          {pendingExps.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-500 text-center">Nessun rimborso in attesa.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {pendingExps.slice(0, 8).map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedExp(e.id)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-800 transition text-left cursor-pointer"
                >
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${EXPENSE_CATEGORIA_BADGE[e.categoria as ExpenseCategory] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                    {e.categoria}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{collabNameMap[e.collaborator_id] ?? 'Collaboratore'}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(e.importo)}</p>
                  </div>
                  <span className="text-xs text-gray-600 tabular-nums shrink-0">{formatAge(e.created_at)}</span>
                  <span className="text-xs text-gray-600 shrink-0">→</span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {selectedComp && (
        <CompModal compId={selectedComp} onClose={() => setSelectedComp(null)} />
      )}
      {selectedExp && (
        <ExpModal expId={selectedExp} onClose={() => setSelectedExp(null)} />
      )}
    </>
  );
}
