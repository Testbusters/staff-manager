'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Banknote, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import MassimaleCheckModal, { type MassimaleImpact } from './MassimaleCheckModal';

type CompensationRow = {
  id: string;
  collaborator_id: string;
  importo_lordo: number | null;
  importo_netto: number | null;
  data_competenza: string | null;
  nome_servizio_ruolo: string | null;
  stato: string;
  rejection_note: string | null;
  created_at: string;
  collabName: string;
  massimale: number | null;
};

type FilterStato = 'TUTTI' | 'IN_ATTESA' | 'APPROVATO' | 'RIFIUTATO' | 'LIQUIDATO';

const FILTER_LABELS: Record<FilterStato, string> = {
  TUTTI: 'Tutti',
  IN_ATTESA: 'In attesa',
  APPROVATO: 'Approvato',
  RIFIUTATO: 'Rifiutato',
  LIQUIDATO: 'Liquidato',
};

const STATO_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  IN_ATTESA:  { label: 'In attesa',  variant: 'secondary' },
  APPROVATO:  { label: 'Approvato',  variant: 'default' },
  RIFIUTATO:  { label: 'Rifiutato',  variant: 'destructive' },
  LIQUIDATO:  { label: 'Liquidato',  variant: 'outline' },
};

function checkMassimale(items: CompensationRow[]): MassimaleImpact[] {
  const byCollab = new Map<string, CompensationRow[]>();
  for (const c of items) {
    if (!byCollab.has(c.collaborator_id)) byCollab.set(c.collaborator_id, []);
    byCollab.get(c.collaborator_id)!.push(c);
  }
  const impacts: MassimaleImpact[] = [];
  for (const [collabId, comps] of byCollab) {
    const first = comps[0];
    if (!first.massimale) continue;
    const totale = comps.reduce((s, c) => s + (c.importo_lordo ?? 0), 0);
    if (totale > first.massimale) {
      impacts.push({
        collaboratorId: collabId,
        collabName: first.collabName,
        massimale: first.massimale,
        totale,
        eccedenza: totale - first.massimale,
        items: comps.map((c) => ({
          id: c.id,
          importo: c.importo_lordo ?? 0,
          label: c.nome_servizio_ruolo,
          date: c.data_competenza,
        })),
      });
    }
  }
  return impacts;
}

export default function CodaCompensazioni({ compensations }: { compensations: CompensationRow[] }) {
  const router = useRouter();
  const [filterStato, setFilterStato] = useState<FilterStato>('TUTTI');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [massimaleWarning, setMassimaleWarning] = useState<MassimaleImpact[] | null>(null);
  const [pendingApproveIds, setPendingApproveIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = filterStato === 'TUTTI'
    ? compensations
    : compensations.filter((c) => c.stato === filterStato);

  const countByStato = (stato: FilterStato) =>
    stato === 'TUTTI'
      ? compensations.length
      : compensations.filter((c) => c.stato === stato).length;

  const approvedIds = compensations.filter((c) => c.stato === 'APPROVATO').map((c) => c.id);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === approvedIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(approvedIds));
    }
  }

  async function doApprove(ids: string[]) {
    setLoading(true);
    setError(null);
    try {
      const url = ids.length === 1
        ? `/api/compensations/${ids[0]}/transition`
        : '/api/compensations/bulk-approve';
      const body = ids.length === 1
        ? { action: 'approve' }
        : { ids };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Errore durante l\'approvazione');
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function handleApproveSingle(id: string) {
    const comp = compensations.find((c) => c.id === id)!;
    const impacts = checkMassimale([comp]);
    if (impacts.length > 0) {
      setMassimaleWarning(impacts);
      setPendingApproveIds([id]);
      return;
    }
    doApprove([id]);
  }

  function handleApproveTutti() {
    const inAttesa = compensations.filter((c) => c.stato === 'IN_ATTESA');
    if (inAttesa.length === 0) return;
    const impacts = checkMassimale(inAttesa);
    if (impacts.length > 0) {
      setMassimaleWarning(impacts);
      setPendingApproveIds(inAttesa.map((c) => c.id));
      return;
    }
    doApprove(inAttesa.map((c) => c.id));
  }

  function handleMassimaleClose() {
    setMassimaleWarning(null);
    setPendingApproveIds([]);
  }

  async function handleReject() {
    if (!rejectTargetId || rejectionNote.trim().length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/compensations/${rejectTargetId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', note: rejectionNote }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Errore durante il rifiuto');
        return;
      }
      setRejectTargetId(null);
      setRejectionNote('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function doLiquidate(ids: string[]) {
    if (ids.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/compensations/bulk-liquidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Errore durante la liquidazione');
        return;
      }
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function handleBulkLiquidate() {
    doLiquidate([...selectedIds]);
  }

  const inAttesaCount = compensations.filter((c) => c.stato === 'IN_ATTESA').length;

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={handleApproveTutti}
          disabled={loading || inAttesaCount === 0}
          className="bg-brand hover:bg-brand/90 text-white"
        >
          <CheckCircle className="h-4 w-4 mr-1.5" />
          Approva tutti IN_ATTESA ({inAttesaCount})
        </Button>

        {selectedIds.size > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkLiquidate}
            disabled={loading}
          >
            <Banknote className="h-4 w-4 mr-1.5" />
            Liquida selezionati ({selectedIds.size})
          </Button>
        )}

        {approvedIds.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleSelectAll}
            disabled={loading}
          >
            {selectedIds.size === approvedIds.length ? 'Deseleziona tutti' : 'Seleziona tutti approvati'}
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Sub-filter pills */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(FILTER_LABELS) as FilterStato[]).map((stato) => (
          <button
            key={stato}
            onClick={() => setFilterStato(stato)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filterStato === stato
                ? 'bg-brand text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/60'
            }`}
          >
            {FILTER_LABELS[stato]}{' '}
            <span className="opacity-70">({countByStato(stato)})</span>
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon={CheckCircle} title="Nessun compenso" description="Non ci sono compensi per questo filtro." />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 px-4 py-2.5 bg-muted text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span />
            <span>Collaboratore / Servizio</span>
            <span>Data</span>
            <span>Importo lordo</span>
            <span>Stato</span>
            <span />
          </div>

          {filtered.map((comp) => {
            const isApprovato = comp.stato === 'APPROVATO';
            const isInAttesa = comp.stato === 'IN_ATTESA';
            const badgeDef = STATO_BADGE[comp.stato] ?? { label: comp.stato, variant: 'outline' as const };

            return (
              <div
                key={comp.id}
                className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 items-center px-4 py-3 border-t border-border hover:bg-muted/60 transition"
              >
                {/* Checkbox for APPROVATO */}
                <div className="w-5">
                  {isApprovato ? (
                    <Checkbox
                      checked={selectedIds.has(comp.id)}
                      onCheckedChange={() => toggleSelect(comp.id)}
                      aria-label={`Seleziona ${comp.collabName}`}
                    />
                  ) : (
                    <span />
                  )}
                </div>

                {/* Name + service */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{comp.collabName}</p>
                  {comp.nome_servizio_ruolo && (
                    <p className="text-xs text-muted-foreground truncate">{comp.nome_servizio_ruolo}</p>
                  )}
                  {comp.stato === 'RIFIUTATO' && comp.rejection_note && (
                    <p className="text-xs text-destructive mt-0.5 truncate">
                      Motivo: {comp.rejection_note}
                    </p>
                  )}
                </div>

                {/* Date */}
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {comp.data_competenza
                    ? new Date(comp.data_competenza).toLocaleDateString('it-IT')
                    : '—'}
                </span>

                {/* Amount */}
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  {comp.importo_lordo != null ? `€${comp.importo_lordo.toFixed(2)}` : '—'}
                </span>

                {/* Badge */}
                <Badge variant={badgeDef.variant} data-stato={comp.stato}>
                  {badgeDef.label}
                </Badge>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {isInAttesa && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                        onClick={() => handleApproveSingle(comp.id)}
                        disabled={loading}
                        aria-label="Approva"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        onClick={() => { setRejectTargetId(comp.id); setRejectionNote(''); }}
                        disabled={loading}
                        aria-label="Rifiuta"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {isApprovato && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => doLiquidate([comp.id])}
                      disabled={loading}
                      aria-label="Liquida"
                    >
                      <Banknote className="h-4 w-4" />
                    </Button>
                  )}
                  {comp.stato === 'RIFIUTATO' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-muted-foreground"
                      disabled
                      aria-label="Riaperto dal collaboratore"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject dialog */}
      <Dialog
        open={rejectTargetId !== null}
        onOpenChange={(open) => {
          if (!open) { setRejectTargetId(null); setRejectionNote(''); }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rifiuta compenso</DialogTitle>
            <DialogDescription>
              Inserisci la motivazione del rifiuto. Sarà visibile al collaboratore.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivazione obbligatoria…"
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
            rows={4}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectTargetId(null); setRejectionNote(''); }}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading || rejectionNote.trim().length === 0}
            >
              Conferma rifiuto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Massimale warning modal */}
      {massimaleWarning && (
        <MassimaleCheckModal
          open={massimaleWarning !== null}
          onClose={handleMassimaleClose}
          impacts={massimaleWarning}
          entityType="compensi"
        />
      )}
    </div>
  );
}
