'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, CreditCard, ArrowUpDown, ArrowUp, ArrowDown, Clock, Banknote, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
type SortDir = 'asc' | 'desc' | null;

const FILTER_LABELS: Record<FilterStato, string> = {
  TUTTI: 'Tutti',
  IN_ATTESA: 'In attesa',
  APPROVATO: 'Approvato',
  RIFIUTATO: 'Rifiutato',
  LIQUIDATO: 'Liquidato',
};

const STATO_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  IN_ATTESA: { label: 'In attesa', variant: 'secondary' },
  APPROVATO: { label: 'Approvato', variant: 'default' },
  RIFIUTATO: { label: 'Rifiutato', variant: 'destructive' },
  LIQUIDATO: { label: 'Liquidato', variant: 'outline' },
};

// Left accent stripe colors per stato
const STATO_STRIPE: Record<string, string> = {
  IN_ATTESA: 'bg-amber-400/80',
  APPROVATO: 'bg-green-500/80',
  RIFIUTATO: 'bg-destructive/70',
  LIQUIDATO: 'bg-border',
};

function fmt(amount: number | null) {
  if (amount == null) return <span className="text-muted-foreground/40">—</span>;
  return `€\u202f${amount.toFixed(2)}`;
}

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

export default function CodaCompensazioni({ compensations, hasReceiptTemplate }: { compensations: CompensationRow[]; hasReceiptTemplate?: boolean }) {
  const router = useRouter();
  const [filterStato, setFilterStato] = useState<FilterStato>('TUTTI');
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [massimaleWarning, setMassimaleWarning] = useState<MassimaleImpact[] | null>(null);
  const [liquidateTarget, setLiquidateTarget] = useState<CompensationRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Derived data ──────────────────────────────────────────────

  const stats = useMemo(() => {
    const sum = (stato: string) => compensations
      .filter((c) => c.stato === stato)
      .reduce((s, c) => s + (c.importo_lordo ?? 0), 0);
    return {
      inAttesa:  { count: compensations.filter((c) => c.stato === 'IN_ATTESA').length,  total: sum('IN_ATTESA') },
      approvato: { count: compensations.filter((c) => c.stato === 'APPROVATO').length, total: sum('APPROVATO') },
      liquidato: { count: compensations.filter((c) => c.stato === 'LIQUIDATO').length, total: sum('LIQUIDATO') },
    };
  }, [compensations]);

  const filtered = useMemo(() => {
    let rows = filterStato === 'TUTTI' ? compensations : compensations.filter((c) => c.stato === filterStato);
    if (sortDir) {
      rows = [...rows].sort((a, b) => {
        const da = a.data_competenza ?? '';
        const db = b.data_competenza ?? '';
        return sortDir === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
      });
    }
    return rows;
  }, [compensations, filterStato, sortDir]);

  const filteredTotal = useMemo(
    () => filtered.reduce((s, c) => s + (c.importo_lordo ?? 0), 0),
    [filtered],
  );

  const countByStato = (stato: FilterStato) =>
    stato === 'TUTTI' ? compensations.length : compensations.filter((c) => c.stato === stato).length;

  const approvedIds = compensations.filter((c) => c.stato === 'APPROVATO').map((c) => c.id);
  const inAttesaCount = stats.inAttesa.count;
  const allApprovedSelected = approvedIds.length > 0 && selectedIds.size === approvedIds.length;

  function cycleSortDir() {
    setSortDir((d) => (d === null ? 'asc' : d === 'asc' ? 'desc' : null));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(allApprovedSelected ? new Set() : new Set(approvedIds));
  }

  async function doApprove(ids: string[]) {
    setLoading(true);
    setError(null);
    try {
      const url = ids.length === 1 ? `/api/compensations/${ids[0]}/transition` : '/api/compensations/bulk-approve';
      const body = ids.length === 1 ? { action: 'approve' } : { ids };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Errore'); return; }
      router.refresh();
    } finally { setLoading(false); }
  }

  async function doLiquidate(ids: string[], generateReceipt = false, compensationId?: string) {
    if (ids.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/compensations/bulk-liquidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Errore'); return; }
      setSelectedIds(new Set());
      setLiquidateTarget(null);

      // Best-effort receipt generation for single item
      if (generateReceipt && compensationId) {
        await fetch('/api/documents/generate-receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'single', compensation_id: compensationId }),
        }).catch(() => {});
      }

      router.refresh();
    } finally { setLoading(false); }
  }

  function handleApproveSingle(id: string) {
    const comp = compensations.find((c) => c.id === id)!;
    const impacts = checkMassimale([comp]);
    if (impacts.length > 0) { setMassimaleWarning(impacts); return; }
    doApprove([id]);
  }

  function handleApproveTutti() {
    const inAttesa = compensations.filter((c) => c.stato === 'IN_ATTESA');
    if (inAttesa.length === 0) return;
    const impacts = checkMassimale(inAttesa);
    if (impacts.length > 0) { setMassimaleWarning(impacts); return; }
    doApprove(inAttesa.map((c) => c.id));
  }

  async function handleReject() {
    if (!rejectTargetId || rejectionNote.trim().length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/compensations/${rejectTargetId}/transition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject', note: rejectionNote }) });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Errore'); return; }
      setRejectTargetId(null);
      setRejectionNote('');
      router.refresh();
    } finally { setLoading(false); }
  }

  const SortIcon = sortDir === 'asc' ? ArrowUp : sortDir === 'desc' ? ArrowDown : ArrowUpDown;

  return (
    <div className="space-y-4">

      {/* ── Stats strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-amber-500/15 flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">In attesa</p>
            <p className="text-sm font-semibold text-foreground leading-tight">
              {stats.inAttesa.count} <span className="text-xs font-normal text-muted-foreground">· €{stats.inAttesa.total.toFixed(2)}</span>
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-green-500/15 flex items-center justify-center shrink-0">
            <CheckCheck className="h-4 w-4 text-green-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Approvati</p>
            <p className="text-sm font-semibold text-foreground leading-tight">
              {stats.approvato.count} <span className="text-xs font-normal text-muted-foreground">· €{stats.approvato.total.toFixed(2)}</span>
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Liquidati</p>
            <p className="text-sm font-semibold text-foreground leading-tight">
              {stats.liquidato.count} <span className="text-xs font-normal text-muted-foreground">· €{stats.liquidato.total.toFixed(2)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Actions bar ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={handleApproveTutti}
          disabled={loading || inAttesaCount === 0}
          className="bg-brand hover:bg-brand/90 text-white"
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
          Approva tutti ({inAttesaCount})
        </Button>

        {approvedIds.length > 0 && (
          <Button size="sm" variant="ghost" onClick={toggleSelectAll} disabled={loading}>
            {allApprovedSelected ? 'Deseleziona tutti' : 'Seleziona tutti approvati'}
          </Button>
        )}

        {selectedIds.size > 0 && (
          <Button size="sm" variant="outline" onClick={() => doLiquidate([...selectedIds])} disabled={loading}>
            <CreditCard className="h-3.5 w-3.5 mr-1.5" />
            Liquida ({selectedIds.size})
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* ── Sub-filter pills ─────────────────────────────────────── */}
      <div className="flex gap-1.5 flex-wrap">
        {(Object.keys(FILTER_LABELS) as FilterStato[]).map((stato) => (
          <button
            key={stato}
            onClick={() => setFilterStato(stato)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterStato === stato
                ? 'bg-brand text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/60'
            }`}
          >
            {FILTER_LABELS[stato]} <span className="opacity-60">({countByStato(stato)})</span>
          </button>
        ))}
      </div>

      {/* ── Table ────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState icon={CheckCircle} title="Nessun compenso" description="Non ci sono compensi per questo filtro." />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border">
                {/* Stripe col */}
                <TableHead className="w-1 p-0" />
                {/* Checkbox col */}
                <TableHead className="w-10 text-xs uppercase tracking-wide text-muted-foreground" />
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Collaboratore</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <button
                    onClick={cycleSortDir}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    aria-label="Ordina per data"
                  >
                    Data <SortIcon className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground text-right">Importo lordo</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Stato</TableHead>
                <TableHead className="w-24 text-xs uppercase tracking-wide text-muted-foreground text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((comp) => {
                const isApprovato = comp.stato === 'APPROVATO';
                const isInAttesa  = comp.stato === 'IN_ATTESA';
                const badgeDef    = STATO_BADGE[comp.stato] ?? { label: comp.stato, variant: 'outline' as const };
                const isSelected  = selectedIds.has(comp.id);

                return (
                  <TableRow key={comp.id} className={isSelected ? 'bg-brand/5 hover:bg-brand/8' : ''}>
                    {/* Left accent stripe */}
                    <TableCell className={`p-0 w-1 ${STATO_STRIPE[comp.stato] ?? 'bg-border'}`} />

                    {/* Checkbox */}
                    <TableCell className="py-3">
                      {isApprovato && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(comp.id)}
                          aria-label={`Seleziona ${comp.collabName}`}
                        />
                      )}
                    </TableCell>

                    {/* Collaboratore */}
                    <TableCell className="py-3">
                      <p className="text-sm font-medium text-foreground leading-tight">{comp.collabName}</p>
                      {comp.nome_servizio_ruolo && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{comp.nome_servizio_ruolo}</p>
                      )}
                      {comp.stato === 'RIFIUTATO' && comp.rejection_note && (
                        <p className="text-xs text-destructive mt-0.5 leading-tight">↳ {comp.rejection_note}</p>
                      )}
                    </TableCell>

                    {/* Data */}
                    <TableCell className="py-3 text-sm text-muted-foreground tabular-nums">
                      {comp.data_competenza
                        ? new Date(comp.data_competenza).toLocaleDateString('it-IT')
                        : <span className="text-muted-foreground/40">—</span>}
                    </TableCell>

                    {/* Importo */}
                    <TableCell className="py-3 text-sm font-medium text-foreground text-right tabular-nums">
                      {fmt(comp.importo_lordo)}
                    </TableCell>

                    {/* Stato */}
                    <TableCell className="py-3">
                      <Badge variant={badgeDef.variant} data-stato={comp.stato} className="text-xs">
                        {badgeDef.label}
                      </Badge>
                    </TableCell>

                    {/* Azioni */}
                    <TableCell className="py-3">
                      <div className="flex items-center justify-end gap-1">
                        {isInAttesa && (
                          <>
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                              onClick={() => handleApproveSingle(comp.id)}
                              disabled={loading}
                              aria-label="Approva"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
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
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => setLiquidateTarget(comp)}
                            disabled={loading}
                            aria-label="Liquida"
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>

            {/* ── Footer totals ─────────────────────────────────── */}
            <TableFooter>
              <TableRow className="border-t border-border bg-muted/30 hover:bg-muted/30">
                <TableCell className="p-0 w-1" />
                <TableCell />
                <TableCell className="py-2.5 text-xs text-muted-foreground">
                  {filtered.length} voce{filtered.length !== 1 ? '' : ''}
                </TableCell>
                <TableCell />
                <TableCell className="py-2.5 text-sm font-semibold text-foreground text-right tabular-nums">
                  €{filteredTotal.toFixed(2)}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}

      {/* ── Reject dialog ────────────────────────────────────────── */}
      <Dialog open={rejectTargetId !== null} onOpenChange={(open) => { if (!open) { setRejectTargetId(null); setRejectionNote(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rifiuta compenso</DialogTitle>
            <DialogDescription>Inserisci la motivazione. Sarà visibile al collaboratore.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivazione obbligatoria…"
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
            rows={4}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectTargetId(null); setRejectionNote(''); }}>Annulla</Button>
            <Button variant="destructive" onClick={handleReject} disabled={loading || rejectionNote.trim().length === 0}>
              Conferma rifiuto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Single liquidate confirmation dialog ─────────────────── */}
      <Dialog open={liquidateTarget !== null} onOpenChange={(open) => { if (!open) setLiquidateTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conferma liquidazione</DialogTitle>
            <DialogDescription>
              Stai per liquidare il compenso di <strong>{liquidateTarget?.collabName}</strong>.
            </DialogDescription>
          </DialogHeader>
          {liquidateTarget && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted border border-border px-4 py-3 space-y-1.5 text-sm">
                {liquidateTarget.nome_servizio_ruolo && (
                  <p className="text-muted-foreground">{liquidateTarget.nome_servizio_ruolo}</p>
                )}
                <p className="font-semibold text-foreground">
                  Importo lordo: {liquidateTarget.importo_lordo != null ? `€\u202f${liquidateTarget.importo_lordo.toFixed(2)}` : '—'}
                </p>
              </div>
              {hasReceiptTemplate && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 px-3 py-2 text-xs text-blue-800 dark:text-blue-200">
                  Verrà generata una ricevuta di pagamento per {liquidateTarget.collabName}.
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLiquidateTarget(null)}>Annulla</Button>
            <Button
              className="bg-brand hover:bg-brand/90 text-white"
              disabled={loading}
              onClick={() => {
                if (!liquidateTarget) return;
                doLiquidate([liquidateTarget.id], !!hasReceiptTemplate, liquidateTarget.id);
              }}
            >
              Conferma liquidazione
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Massimale warning modal ───────────────────────────────── */}
      {massimaleWarning && (
        <MassimaleCheckModal
          open
          onClose={() => setMassimaleWarning(null)}
          impacts={massimaleWarning}
          entityType="compensi"
        />
      )}
    </div>
  );
}
