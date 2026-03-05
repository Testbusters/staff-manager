'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { EXPENSE_CATEGORIA_BADGE } from '@/lib/types';
import type { ExpenseCategory } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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
  corsi:                'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700/50',
  sb:                   'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700/50',
  produzione_materiale: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50',
  extra:                'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50',
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
    <Dialog open={true} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">Dettaglio compenso</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ) : !data ? (
          <p className="text-sm text-red-600 dark:text-red-400 text-center py-4">Errore caricamento.</p>
        ) : (
          <div className="space-y-3 text-sm">
            {data.nome_servizio_ruolo && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Servizio / Ruolo</p>
                <p className="text-foreground">{data.nome_servizio_ruolo}</p>
              </div>
            )}
            {data.competenza && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Competenza</p>
                <Badge variant="outline" className={COMP_COMPETENZA_BADGE[data.competenza] ?? 'border-border text-muted-foreground'}>
                  {data.competenza}
                </Badge>
              </div>
            )}
            {data.data_competenza && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Data competenza</p>
                <p className="text-foreground">{new Date(data.data_competenza).toLocaleDateString('it-IT')}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Lordo</p>
                <p className="text-foreground tabular-nums font-medium">{formatCurrency(data.importo_lordo)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Netto</p>
                <p className="text-amber-600 dark:text-amber-300 tabular-nums font-medium">{formatCurrency(data.importo_netto)}</p>
              </div>
            </div>
            {data.info_specifiche && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Note</p>
                <p className="text-muted-foreground text-xs">{data.info_specifiche}</p>
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
      </DialogContent>
    </Dialog>
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
      .then((d) => { setData(d.reimbursement); setLoading(false); })
      .catch(() => setLoading(false));
  }, [expId]);

  return (
    <Dialog open={true} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">Dettaglio rimborso</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ) : !data ? (
          <p className="text-sm text-red-600 dark:text-red-400 text-center py-4">Errore caricamento.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Categoria</p>
              <Badge variant="outline" className={EXPENSE_CATEGORIA_BADGE[data.categoria as ExpenseCategory] ?? 'border-border text-muted-foreground'}>
                {data.categoria}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Data spesa</p>
              <p className="text-foreground">{new Date(data.data_spesa).toLocaleDateString('it-IT')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Importo</p>
              <p className="text-amber-600 dark:text-amber-300 tabular-nums font-medium">{formatCurrency(data.importo)}</p>
            </div>
            {data.descrizione && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Descrizione</p>
                <p className="text-muted-foreground text-xs">{data.descrizione}</p>
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
      </DialogContent>
    </Dialog>
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
        <div className="rounded-2xl bg-card border border-border">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Compensi in attesa</h2>
            <Link href="/approvazioni?tab=compensi" className="text-xs text-muted-foreground hover:text-foreground transition">
              Vedi tutti →
            </Link>
          </div>
          {pendingComps.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground text-center">Nessun compenso in attesa.</p>
          ) : (
            <div className="divide-y divide-border">
              {pendingComps.slice(0, 8).map((c) => (
                <Button
                  key={c.id}
                  variant="ghost"
                  onClick={() => setSelectedComp(c.id)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted text-left cursor-pointer h-auto rounded-none justify-start"
                >
                  {c.competenza && (
                    <Badge variant="outline" className={`shrink-0 ${COMP_COMPETENZA_BADGE[c.competenza] ?? 'border-border text-muted-foreground'}`}>
                      {c.competenza}
                    </Badge>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{collabNameMap[c.collaborator_id] ?? 'Collaboratore'}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(c.importo_lordo)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">{formatAge(c.created_at)}</span>
                  <span className="text-xs text-muted-foreground shrink-0">→</span>
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Rimborsi da approvare */}
        <div className="rounded-2xl bg-card border border-border">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Rimborsi in attesa</h2>
            <Link href="/approvazioni?tab=rimborsi" className="text-xs text-muted-foreground hover:text-foreground transition">
              Vedi tutti →
            </Link>
          </div>
          {pendingExps.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground text-center">Nessun rimborso in attesa.</p>
          ) : (
            <div className="divide-y divide-border">
              {pendingExps.slice(0, 8).map((e) => (
                <Button
                  key={e.id}
                  variant="ghost"
                  onClick={() => setSelectedExp(e.id)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted text-left cursor-pointer h-auto rounded-none justify-start"
                >
                  <Badge variant="outline" className={`shrink-0 ${EXPENSE_CATEGORIA_BADGE[e.categoria as ExpenseCategory] ?? 'border-border text-muted-foreground'}`}>
                    {e.categoria}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{collabNameMap[e.collaborator_id] ?? 'Collaboratore'}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(e.importo)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">{formatAge(e.created_at)}</span>
                  <span className="text-xs text-muted-foreground shrink-0">→</span>
                </Button>
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
