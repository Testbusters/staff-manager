'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, CreditCard, ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

type SortDir = 'asc' | 'desc' | null;

function fmt(amount: number | null) {
  if (amount == null) return <span className="text-muted-foreground/40">—</span>;
  return `€\u202f${amount.toFixed(2)}`;
}

function fmtTotal(amount: number) {
  return `€\u202f${amount.toFixed(2)}`;
}

function sortByDate(rows: CompensationRow[], dir: SortDir): CompensationRow[] {
  if (!dir) return rows;
  return [...rows].sort((a, b) => {
    const da = a.data_competenza ?? '';
    const db = b.data_competenza ?? '';
    return dir === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
  });
}

function checkMassimale(items: CompensationRow[]): MassimaleImpact[] {
  const byCollab = new Map<string, CompensationRow[]>();
  for (const c of items) {
    if (!byCollab.has(c.collaborator_id)) byCollab.set(c.collaborator_id, []);
    byCollab.get(c.collaborator_id)!.push(c);
  }
  const impacts: MassimaleImpact[] = [];
  for (const [, comps] of byCollab) {
    const first = comps[0];
    if (!first.massimale) continue;
    const totale = comps.reduce((s, c) => s + (c.importo_lordo ?? 0), 0);
    if (totale > first.massimale) {
      impacts.push({
        collaboratorId: first.collaborator_id,
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

function SortButton({ sortDir, onCycle }: { sortDir: SortDir; onCycle: () => void }) {
  const Icon = sortDir === 'asc' ? ArrowUp : sortDir === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <button
      onClick={onCycle}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      aria-label="Ordina per data"
    >
      Data <Icon className="h-3 w-3" />
    </button>
  );
}

function ArchiveTable({
  rows,
  showRejectionNote,
  sortDir,
  onCycleSort,
}: {
  rows: CompensationRow[];
  showRejectionNote: boolean;
  sortDir: SortDir;
  onCycleSort: () => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/20 hover:bg-muted/20 border-b border-border">
          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Collaboratore</TableHead>
          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
            <SortButton sortDir={sortDir} onCycle={onCycleSort} />
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground text-right">Importo lordo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((comp) => (
          <TableRow key={comp.id} className="opacity-70">
            <TableCell className="py-3">
              <p className="text-sm font-medium text-foreground leading-tight">{comp.collabName}</p>
              {comp.nome_servizio_ruolo && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{comp.nome_servizio_ruolo}</p>
              )}
              {showRejectionNote && comp.rejection_note && (
                <p className="text-xs text-destructive mt-0.5 leading-tight">↳ {comp.rejection_note}</p>
              )}
            </TableCell>
            <TableCell className="py-3 text-sm text-muted-foreground tabular-nums">
              {comp.data_competenza
                ? new Date(comp.data_competenza).toLocaleDateString('it-IT')
                : <span className="text-muted-foreground/40">—</span>}
            </TableCell>
            <TableCell className="py-3 text-sm text-muted-foreground text-right tabular-nums">
              {fmt(comp.importo_lordo)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function CodaCompensazioni({ compensations }: { compensations: CompensationRow[] }) {
  const router = useRouter();
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [archiviOpen, setArchiviOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [massimaleWarning, setMassimaleWarning] = useState<MassimaleImpact[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Sections ───────────────────────────────────────────────────
  const inAttesa  = useMemo(() => sortByDate(compensations.filter((c) => c.stato === 'IN_ATTESA'),  sortDir), [compensations, sortDir]);
  const approvati = useMemo(() => sortByDate(compensations.filter((c) => c.stato === 'APPROVATO'), sortDir), [compensations, sortDir]);
  const liquidati = useMemo(() => sortByDate(compensations.filter((c) => c.stato === 'LIQUIDATO'), sortDir), [compensations, sortDir]);
  const rifiutati = useMemo(() => sortByDate(compensations.filter((c) => c.stato === 'RIFIUTATO'), sortDir), [compensations, sortDir]);

  const totalInAttesa  = useMemo(() => inAttesa.reduce((s, c)  => s + (c.importo_lordo ?? 0), 0), [inAttesa]);
  const totalApprovati = useMemo(() => approvati.reduce((s, c) => s + (c.importo_lordo ?? 0), 0), [approvati]);
  const archivioCount  = liquidati.length + rifiutati.length;
  const archivioTotal  = useMemo(
    () => [...liquidati, ...rifiutati].reduce((s, c) => s + (c.importo_lordo ?? 0), 0),
    [liquidati, rifiutati],
  );

  const approvedIds        = approvati.map((c) => c.id);
  const allApprovedSelected = approvati.length > 0 && selectedIds.size === approvati.length;

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
      const url  = ids.length === 1 ? `/api/compensations/${ids[0]}/transition` : '/api/compensations/bulk-approve';
      const body = ids.length === 1 ? { action: 'approve' } : { ids };
      const res  = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Errore'); return; }
      router.refresh();
    } finally { setLoading(false); }
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
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Errore'); return; }
      setSelectedIds(new Set());
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
      const res = await fetch(`/api/compensations/${rejectTargetId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', note: rejectionNote }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Errore'); return; }
      setRejectTargetId(null);
      setRejectionNote('');
      router.refresh();
    } finally { setLoading(false); }
  }

  const rejectTarget = rejectTargetId ? compensations.find((c) => c.id === rejectTargetId) : null;

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* ── SECTION 1 — Da processare ──────────────────────────── */}
      <div className="rounded-xl border border-border border-l-4 border-l-amber-500 bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-amber-500/5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-semibold text-foreground">Da processare</span>
            <Badge className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 hover:bg-amber-500/15">
              {inAttesa.length}
            </Badge>
            <span className="text-xs text-muted-foreground">{fmtTotal(totalInAttesa)}</span>
          </div>
          <Button
            size="sm"
            onClick={handleApproveTutti}
            disabled={loading || inAttesa.length === 0}
            className="bg-brand hover:bg-brand/90 text-white shrink-0"
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            Approva tutti ({inAttesa.length})
          </Button>
        </div>

        {inAttesa.length === 0 ? (
          <div className="px-4 py-8">
            <EmptyState icon={CheckCircle} title="Nessun compenso in attesa" description="Tutti i compensi sono stati processati." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Collaboratore</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <SortButton sortDir={sortDir} onCycle={cycleSortDir} />
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground text-right">Importo lordo</TableHead>
                <TableHead className="w-24 text-xs uppercase tracking-wide text-muted-foreground text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inAttesa.map((comp) => (
                <TableRow key={comp.id}>
                  <TableCell className="py-3">
                    <p className="text-sm font-medium text-foreground leading-tight">{comp.collabName}</p>
                    {comp.nome_servizio_ruolo && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{comp.nome_servizio_ruolo}</p>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-muted-foreground tabular-nums">
                    {comp.data_competenza
                      ? new Date(comp.data_competenza).toLocaleDateString('it-IT')
                      : <span className="text-muted-foreground/40">—</span>}
                  </TableCell>
                  <TableCell className="py-3 text-sm font-medium text-foreground text-right tabular-nums">
                    {fmt(comp.importo_lordo)}
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center justify-end gap-1">
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="border-t border-border bg-muted/20 hover:bg-muted/20">
                <TableCell className="py-2.5 text-xs text-muted-foreground">
                  {inAttesa.length} {inAttesa.length === 1 ? 'voce' : 'voci'}
                </TableCell>
                <TableCell />
                <TableCell className="py-2.5 text-sm font-semibold text-foreground text-right tabular-nums">
                  {fmtTotal(totalInAttesa)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </div>

      {/* ── SECTION 2 — Approvati · da liquidare ──────────────── */}
      <div className="rounded-xl border border-border border-l-4 border-l-green-500 bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-green-500/5">
          <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
            <span className="text-sm font-semibold text-foreground">Approvati · da liquidare</span>
            <Badge className="text-xs bg-green-500/15 text-green-700 dark:text-green-400 border-0 hover:bg-green-500/15">
              {approvati.length}
            </Badge>
            <span className="text-xs text-muted-foreground">{fmtTotal(totalApprovati)}</span>
            {approvati.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="text-xs text-link hover:text-link/80 transition-colors ml-1"
              >
                {allApprovedSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
              </button>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => doLiquidate([...selectedIds])}
            disabled={loading || selectedIds.size === 0}
            className="bg-brand hover:bg-brand/90 text-white shrink-0"
          >
            <CreditCard className="h-3.5 w-3.5 mr-1.5" />
            Liquida selezionati{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </Button>
        </div>

        {approvati.length === 0 ? (
          <div className="px-4 py-8">
            <EmptyState icon={CreditCard} title="Nessun compenso da liquidare" description="Non ci sono compensi approvati in attesa di liquidazione." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
                <TableHead className="w-10" />
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Collaboratore</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <SortButton sortDir={sortDir} onCycle={cycleSortDir} />
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-muted-foreground text-right">Importo</TableHead>
                <TableHead className="w-12 text-xs uppercase tracking-wide text-muted-foreground text-right">Azione</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvati.map((comp) => {
                const isSelected = selectedIds.has(comp.id);
                return (
                  <TableRow key={comp.id} className={isSelected ? 'bg-brand/5' : ''}>
                    <TableCell className="py-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(comp.id)}
                        aria-label={`Seleziona ${comp.collabName}`}
                      />
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="text-sm font-medium text-foreground leading-tight">{comp.collabName}</p>
                      {comp.nome_servizio_ruolo && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{comp.nome_servizio_ruolo}</p>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground tabular-nums">
                      {comp.data_competenza
                        ? new Date(comp.data_competenza).toLocaleDateString('it-IT')
                        : <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell className="py-3 text-sm font-medium text-foreground text-right tabular-nums">
                      {fmt(comp.importo_lordo)}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex justify-end">
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => doLiquidate([comp.id])}
                          disabled={loading}
                          aria-label="Liquida"
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="border-t border-border bg-muted/20 hover:bg-muted/20">
                <TableCell />
                <TableCell className="py-2.5 text-xs text-muted-foreground">
                  {approvati.length} {approvati.length === 1 ? 'voce' : 'voci'}
                </TableCell>
                <TableCell />
                <TableCell className="py-2.5 text-sm font-semibold text-foreground text-right tabular-nums">
                  {fmtTotal(totalApprovati)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </div>

      {/* ── SECTION 3 — Archivio ──────────────────────────────── */}
      <div className="rounded-xl border border-border border-l-4 border-l-border bg-card overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
          onClick={() => setArchiviOpen((o) => !o)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Archivio</span>
            <span className="text-xs text-muted-foreground/60">
              · {archivioCount} {archivioCount === 1 ? 'voce' : 'voci'} · {fmtTotal(archivioTotal)}
            </span>
          </div>
          {archiviOpen
            ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        </button>

        {archiviOpen && (
          <div className="border-t border-border">
            {archivioCount === 0 ? (
              <div className="px-4 py-8">
                <EmptyState icon={CheckCircle} title="Archivio vuoto" description="Non ci sono compensi liquidati o rifiutati." />
              </div>
            ) : (
              <Tabs defaultValue="liquidati" className="w-full">
                <div className="px-4 pt-3 pb-0">
                  <TabsList className="h-8">
                    <TabsTrigger value="liquidati" className="text-xs">
                      Liquidati ({liquidati.length})
                    </TabsTrigger>
                    <TabsTrigger value="rifiutati" className="text-xs">
                      Rifiutati ({rifiutati.length})
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="liquidati" className="mt-0">
                  {liquidati.length === 0 ? (
                    <div className="px-4 py-6">
                      <EmptyState icon={CreditCard} title="Nessun compenso liquidato" description="Non ci sono compensi liquidati." />
                    </div>
                  ) : (
                    <ArchiveTable rows={liquidati} showRejectionNote={false} sortDir={sortDir} onCycleSort={cycleSortDir} />
                  )}
                </TabsContent>

                <TabsContent value="rifiutati" className="mt-0">
                  {rifiutati.length === 0 ? (
                    <div className="px-4 py-6">
                      <EmptyState icon={XCircle} title="Nessun compenso rifiutato" description="Non ci sono compensi rifiutati." />
                    </div>
                  ) : (
                    <ArchiveTable rows={rifiutati} showRejectionNote={true} sortDir={sortDir} onCycleSort={cycleSortDir} />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </div>

      {/* ── Reject dialog ─────────────────────────────────────── */}
      <Dialog
        open={rejectTargetId !== null}
        onOpenChange={(open) => { if (!open) { setRejectTargetId(null); setRejectionNote(''); } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rifiuta compenso</DialogTitle>
            {rejectTarget && (
              <DialogDescription>
                {rejectTarget.collabName}
                {rejectTarget.importo_lordo != null && ` — €\u202f${rejectTarget.importo_lordo.toFixed(2)}`}
                {rejectTarget.nome_servizio_ruolo && ` — ${rejectTarget.nome_servizio_ruolo}`}
              </DialogDescription>
            )}
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

      {/* ── Massimale warning modal ────────────────────────────── */}
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
