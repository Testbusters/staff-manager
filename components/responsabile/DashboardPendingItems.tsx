'use client';

import { useState } from 'react';
import Link from 'next/link';
import { EXPENSE_CATEGORIA_BADGE } from '@/lib/types';
import { MS_PER_DAY } from '@/lib/constants';
import type { ExpenseCategory } from '@/lib/types';
import { Receipt, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PendingComp = {
  id: string;
  collaborator_id: string;
  importo_lordo: number | null;
  importo_netto: number | null;
  nome_servizio_ruolo: string | null;
  competenza: string | null;
  data_competenza: string | null;
  info_specifiche: string | null;
  stato: string;
  created_at: string;
};

export type PendingExp = {
  id: string;
  collaborator_id: string;
  importo: number | null;
  categoria: string;
  descrizione: string | null;
  data_spesa: string;
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
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / MS_PER_DAY);
  if (days === 0) return 'Oggi';
  if (days === 1) return '1g';
  return `${days}g`;
}

function formatCurrency(n: number | null) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
}

// ── Comp detail modal ─────────────────────────────────────────────────────────

function CompModal({ comp, onClose }: { comp: PendingComp; onClose: () => void }) {
  return (
    <Dialog open={true} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">Dettaglio compenso</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {comp.nome_servizio_ruolo && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Servizio / Ruolo</p>
              <p className="text-foreground">{comp.nome_servizio_ruolo}</p>
            </div>
          )}
          {comp.competenza && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Competenza</p>
              <Badge variant="outline" className={COMP_COMPETENZA_BADGE[comp.competenza] ?? 'border-border text-muted-foreground'}>
                {comp.competenza}
              </Badge>
            </div>
          )}
          {comp.data_competenza && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Data competenza</p>
              <p className="text-foreground">{new Date(comp.data_competenza).toLocaleDateString('it-IT')}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Lordo</p>
              <p className="text-foreground tabular-nums font-medium">{formatCurrency(comp.importo_lordo)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Netto</p>
              <p className="text-amber-600 dark:text-amber-300 tabular-nums font-medium">{formatCurrency(comp.importo_netto)}</p>
            </div>
          </div>
          {comp.info_specifiche && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Note</p>
              <p className="text-muted-foreground text-xs">{comp.info_specifiche}</p>
            </div>
          )}
          <div className="pt-2">
            <Link
              href={`/compensi/${comp.id}`}
              onClick={onClose}
              className="text-xs text-link hover:text-link/80 transition"
            >
              Apri pagina completa →
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Expense detail modal ──────────────────────────────────────────────────────

function ExpModal({ exp, onClose }: { exp: PendingExp; onClose: () => void }) {
  return (
    <Dialog open={true} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">Dettaglio rimborso</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Categoria</p>
            <Badge variant="outline" className={EXPENSE_CATEGORIA_BADGE[exp.categoria as ExpenseCategory] ?? 'border-border text-muted-foreground'}>
              {exp.categoria}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Data spesa</p>
            <p className="text-foreground">{new Date(exp.data_spesa).toLocaleDateString('it-IT')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Importo</p>
            <p className="text-amber-600 dark:text-amber-300 tabular-nums font-medium">{formatCurrency(exp.importo)}</p>
          </div>
          {exp.descrizione && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Descrizione</p>
              <p className="text-muted-foreground text-xs">{exp.descrizione}</p>
            </div>
          )}
          <div className="pt-2">
            <Link
              href={`/rimborsi/${exp.id}`}
              onClick={onClose}
              className="text-xs text-link hover:text-link/80 transition"
            >
              Apri pagina completa →
            </Link>
          </div>
        </div>
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
  const [selectedComp, setSelectedComp] = useState<PendingComp | null>(null);
  const [selectedExp, setSelectedExp] = useState<PendingExp | null>(null);

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
            <EmptyState icon={Wallet} title="Nessun compenso in attesa." />
          ) : (
            <div className="divide-y divide-border">
              {pendingComps.slice(0, 5).map((c) => (
                <Button
                  key={c.id}
                  variant="ghost"
                  onClick={() => setSelectedComp(c)}
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
            <EmptyState icon={Receipt} title="Nessun rimborso in attesa." />
          ) : (
            <div className="divide-y divide-border">
              {pendingExps.slice(0, 5).map((e) => (
                <Button
                  key={e.id}
                  variant="ghost"
                  onClick={() => setSelectedExp(e)}
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
        <CompModal comp={selectedComp} onClose={() => setSelectedComp(null)} />
      )}
      {selectedExp && (
        <ExpModal exp={selectedExp} onClose={() => setSelectedExp(null)} />
      )}
    </>
  );
}
