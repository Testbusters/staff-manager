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

type ExpenseRow = {
  id: string;
  collaborator_id: string;
  importo: number | null;
  categoria: string | null;
  data_spesa: string | null;
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

function sortByDate(rows: ExpenseRow[], dir: SortDir): ExpenseRow[] {
  if (!dir) return rows;
  return [...rows].sort((a, b) => {
    const da = a.data_spesa ?? '';
    const db = b.data_spesa ?? '';
    return dir === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
  });
}

function checkMassimale(items: ExpenseRow[]): MassimaleImpact[] {
  const byCollab = new Map<string, ExpenseRow[]>();
  for (const e of items) {
    if (!byCollab.has(e.collaborator_id)) byCollab.set(e.collaborator_id, []);
    byCollab.get(e.collaborator_id)!.push(e);
  }
  const impacts: MassimaleImpact[] = [];
  for (const [, exps] of byCollab) {
    const first = exps[0];
    if (!first.massimale) continue;
    const totale = exps.reduce((s, e) => s + (e.importo ?? 0), 0);
    if (totale > first.massimale) {
      impacts.push({
        collaboratorId: first.collaborator_id,
        collabName: first.collabName,
        massimale: first.massimale,
        totale,
        eccedenza: totale - first.massimale,
        items: exps.map((e) => ({
          id: e.id,
          importo: e.importo ?? 0,
          label: e.categoria,
          date: e.data_spesa,
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

function SectionToggle({
  label,
  count,
  total,
  accentClass,
  onToggle,
}: {
  label: string;
  count: number;
  total: number;
  accentClass: string;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 min-w-0 text-left"
      type="button"
    >
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <Badge className={`text-xs border-0 ${accentClass}`}>{count}</Badge>
      <span className="text-xs text-muted-foreground">{fmtTotal(total)}</span>
    </button>
  );
}

function ArchiveTable({
  rows,
  showRejectionNote,
  sortDir,
  onCycleSort,
}: {
  rows: ExpenseRow[];
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
          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground text-right">Importo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((exp) => (
          <TableRow key={exp.id} className="opacity-70">
            <TableCell className="py-3">
              <p className="text-sm font-medium text-foreground leading-tight">{exp.collabName}</p>
              {exp.categoria && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{exp.categoria}</p>
              )}
              {showRejectionNote && exp.rejection_note && (
                <p className="text-xs text-destructive mt-0.5 leading-tight">↳ {exp.rejection_note}</p>
              )}
            </TableCell>
            <TableCell className="py-3 text-sm text-muted-foreground tabular-nums">
              {exp.data_spesa
                ? new Date(exp.data_spesa).toLocaleDateString('it-IT')
                : <span className="text-muted-foreground/40">—</span>}
            </TableCell>
            <TableCell className="py-3 text-sm text-muted-foreground text-right tabular-nums">
              {fmt(exp.importo)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function CodaRimborsi({ expenses }: { expenses: ExpenseRow[] }) {
  const router = useRouter();
  const [sortDir, setSortDir] = useState<SortDir>(null);

  // Section open/closed
  const [section1Open, setSection1Open] = useState(true);
  const [section2Open, setSection2Open] = useState(true);
  const [section3Open, setSection3Open] = useState(false);

  // Selection state per section
  const [selectedInAttesaIds,  setSelectedInAttesaIds]  = useState<Set<string>>(new Set());
  const [selectedApprovatiIds, setSelectedApprovatiIds] = useState<Set<string>>(new Set());

  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote]   = useState('');
  const [massimaleWarning, setMassimaleWarning] = useState<MassimaleImpact[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // ── Sections ───────────────────────────────────────────────────
  const inAttesa  = useMemo(() => sortByDate(expenses.filter((e) => e.stato === 'IN_ATTESA'),  sortDir), [expenses, sortDir]);
  const approvati = useMemo(() => sortByDate(expenses.filter((e) => e.stato === 'APPROVATO'), sortDir), [expenses, sortDir]);
  const liquidati = useMemo(() => sortByDate(expenses.filter((e) => e.stato === 'LIQUIDATO'), sortDir), [expenses, sortDir]);
  const rifiutati = useMemo(() => sortByDate(expenses.filter((e) => e.stato === 'RIFIUTATO'), sortDir), [expenses, sortDir]);

  const totalInAttesa  = useMemo(() => inAttesa.reduce((s, e)  => s + (e.importo ?? 0), 0), [inAttesa]);
  const totalApprovati = useMemo(() => approvati.reduce((s, e) => s + (e.importo ?? 0), 0), [approvati]);
  const archivioCount  = liquidati.length + rifiutati.length;
  const archivioTotal  = useMemo(
    () => [...liquidati, ...rifiutati].reduce((s, e) => s + (e.importo ?? 0), 0),
    [liquidati, rifiutati],
  );

  const allInAttesaSelected  = inAttesa.length > 0  && selectedInAttesaIds.size === inAttesa.length;
  const allApprovatiSelected = approvati.length > 0 && selectedApprovatiIds.size === approvati.length;

  function cycleSortDir() {
    setSortDir((d) => (d === null ? 'asc' : d === 'asc' ? 'desc' : null));
  }

  function toggleSelectInAttesa(id: string) {
    setSelectedInAttesaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAllInAttesa() {
    setSelectedInAttesaIds(allInAttesaSelected ? new Set() : new Set(inAttesa.map((e) => e.id)));
  }

  function toggleSelectApprovati(id: string) {
    setSelectedApprovatiIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAllApprovati() {
    setSelectedApprovatiIds(allApprovatiSelected ? new Set() : new Set(approvati.map((e) => e.id)));
  }

  async function doApprove(ids: string[]) {
    setLoading(true);
    setError(null);
    try {
      const url  = ids.length === 1 ? `/api/expenses/${ids[0]}/transition` : '/api/expenses/bulk-approve';
      const body = ids.length === 1 ? { action: 'approve' } : { ids };
      const res  = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Errore'); return; }
      setSelectedInAttesaIds(new Set());
      router.refresh();
    } finally { setLoading(false); }
  }

  async function doLiquidate(ids: string[]) {
    if (ids.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/expenses/bulk-liquidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Errore'); return; }
      setSelectedApprovatiIds(new Set());
      router.refresh();
    } finally { setLoading(false); }
  }

  function handleApproveSingle(id: string) {
    const exp = expenses.find((e) => e.id === id)!;
    const impacts = checkMassimale([exp]);
    if (impacts.length > 0) { setMassimaleWarning(impacts); return; }
    doApprove([id]);
  }

  function handleApproveSelected() {
    if (selectedInAttesaIds.size === 0) return;
    const selected = inAttesa.filter((e) => selectedInAttesaIds.has(e.id));
    const impacts  = checkMassimale(selected);
    if (impacts.length > 0) { setMassimaleWarning(impacts); return; }
    doApprove([...selectedInAttesaIds]);
  }

  async function handleReject() {
    if (!rejectTargetId || rejectionNote.trim().length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/expenses/${rejectTargetId}/transition`, {
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

  const rejectTarget = rejectTargetId ? expenses.find((e) => e.id === rejectTargetId) : null;

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* ── SECTION 1 — Da processare ──────────────────────────── */}
      <div className="rounded-xl border border-border border-l-4 border-l-amber-500 bg-card overflow-hidden">
        <div className={`flex items-center gap-3 px-4 py-3 bg-amber-500/5 ${section1Open ? 'border-b border-border' : ''}`}>
          <SectionToggle
            label="Da processare"
            count={inAttesa.length}
            total={totalInAttesa}
            accentClass="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15"
            onToggle={() => setSection1Open((o) => !o)}
          />
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {section1Open && inAttesa.length > 0 && (
              <button
                onClick={toggleSelectAllInAttesa}
                className="text-xs text-link hover:text-link/80 transition-colors"
              >
                {allInAttesaSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
              </button>
            )}
            <Button
              size="sm"
              onClick={handleApproveSelected}
              disabled={loading || selectedInAttesaIds.size === 0}
              className="bg-brand hover:bg-brand/90 text-white"
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Approva selezionati{selectedInAttesaIds.size > 0 ? ` (${selectedInAttesaIds.size})` : ''}
            </Button>
            <button
              onClick={() => setSection1Open((o) => !o)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={section1Open ? 'Comprimi sezione' : 'Espandi sezione'}
              type="button"
            >
              {section1Open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {section1Open && (
          inAttesa.length === 0 ? (
            <div className="px-4 py-8">
              <EmptyState icon={CheckCircle} title="Nessun rimborso in attesa" description="Tutti i rimborsi sono stati processati." />
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
                  <TableHead className="w-24 text-xs uppercase tracking-wide text-muted-foreground text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inAttesa.map((exp) => {
                  const isSelected = selectedInAttesaIds.has(exp.id);
                  return (
                    <TableRow key={exp.id} className={isSelected ? 'bg-brand/5' : ''}>
                      <TableCell className="py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectInAttesa(exp.id)}
                          aria-label={`Seleziona ${exp.collabName}`}
                        />
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-sm font-medium text-foreground leading-tight">{exp.collabName}</p>
                        {exp.categoria && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{exp.categoria}</p>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground tabular-nums">
                        {exp.data_spesa
                          ? new Date(exp.data_spesa).toLocaleDateString('it-IT')
                          : <span className="text-muted-foreground/40">—</span>}
                      </TableCell>
                      <TableCell className="py-3 text-sm font-medium text-foreground text-right tabular-nums">
                        {fmt(exp.importo)}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                            onClick={() => handleApproveSingle(exp.id)}
                            disabled={loading}
                            aria-label="Approva"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => { setRejectTargetId(exp.id); setRejectionNote(''); }}
                            disabled={loading}
                            aria-label="Rifiuta"
                          >
                            <XCircle className="h-4 w-4" />
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
          )
        )}
      </div>

      {/* ── SECTION 2 — Approvati · da liquidare ──────────────── */}
      <div className="rounded-xl border border-border border-l-4 border-l-green-500 bg-card overflow-hidden">
        <div className={`flex items-center gap-3 px-4 py-3 bg-green-500/5 ${section2Open ? 'border-b border-border' : ''}`}>
          <SectionToggle
            label="Approvati · da liquidare"
            count={approvati.length}
            total={totalApprovati}
            accentClass="bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/15"
            onToggle={() => setSection2Open((o) => !o)}
          />
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {section2Open && approvati.length > 0 && (
              <button
                onClick={toggleSelectAllApprovati}
                className="text-xs text-link hover:text-link/80 transition-colors"
              >
                {allApprovatiSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
              </button>
            )}
            <Button
              size="sm"
              onClick={() => doLiquidate([...selectedApprovatiIds])}
              disabled={loading || selectedApprovatiIds.size === 0}
              className="bg-brand hover:bg-brand/90 text-white"
            >
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              Liquida selezionati{selectedApprovatiIds.size > 0 ? ` (${selectedApprovatiIds.size})` : ''}
            </Button>
            <button
              onClick={() => setSection2Open((o) => !o)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={section2Open ? 'Comprimi sezione' : 'Espandi sezione'}
              type="button"
            >
              {section2Open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {section2Open && (
          approvati.length === 0 ? (
            <div className="px-4 py-8">
              <EmptyState icon={CreditCard} title="Nessun rimborso da liquidare" description="Non ci sono rimborsi approvati in attesa di liquidazione." />
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
                {approvati.map((exp) => {
                  const isSelected = selectedApprovatiIds.has(exp.id);
                  return (
                    <TableRow key={exp.id} className={isSelected ? 'bg-brand/5' : ''}>
                      <TableCell className="py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectApprovati(exp.id)}
                          aria-label={`Seleziona ${exp.collabName}`}
                        />
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-sm font-medium text-foreground leading-tight">{exp.collabName}</p>
                        {exp.categoria && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{exp.categoria}</p>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground tabular-nums">
                        {exp.data_spesa
                          ? new Date(exp.data_spesa).toLocaleDateString('it-IT')
                          : <span className="text-muted-foreground/40">—</span>}
                      </TableCell>
                      <TableCell className="py-3 text-sm font-medium text-foreground text-right tabular-nums">
                        {fmt(exp.importo)}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex justify-end">
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => doLiquidate([exp.id])}
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
          )
        )}
      </div>

      {/* ── SECTION 3 — Archivio ──────────────────────────────── */}
      <div className="rounded-xl border border-border border-l-4 border-l-border bg-card overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
          onClick={() => setSection3Open((o) => !o)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Archivio</span>
            <span className="text-xs text-muted-foreground/60">
              · {archivioCount} {archivioCount === 1 ? 'voce' : 'voci'} · {fmtTotal(archivioTotal)}
            </span>
          </div>
          {section3Open
            ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        </button>

        {section3Open && (
          <div className="border-t border-border">
            {archivioCount === 0 ? (
              <div className="px-4 py-8">
                <EmptyState icon={CheckCircle} title="Archivio vuoto" description="Non ci sono rimborsi liquidati o rifiutati." />
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
                      <EmptyState icon={CreditCard} title="Nessun rimborso liquidato" description="Non ci sono rimborsi liquidati." />
                    </div>
                  ) : (
                    <ArchiveTable rows={liquidati} showRejectionNote={false} sortDir={sortDir} onCycleSort={cycleSortDir} />
                  )}
                </TabsContent>
                <TabsContent value="rifiutati" className="mt-0">
                  {rifiutati.length === 0 ? (
                    <div className="px-4 py-6">
                      <EmptyState icon={XCircle} title="Nessun rimborso rifiutato" description="Non ci sono rimborsi rifiutati." />
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
            <DialogTitle>Rifiuta rimborso</DialogTitle>
            {rejectTarget && (
              <DialogDescription>
                {rejectTarget.collabName}
                {rejectTarget.importo != null && ` — €\u202f${rejectTarget.importo.toFixed(2)}`}
                {rejectTarget.categoria && ` — ${rejectTarget.categoria}`}
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
          entityType="rimborsi"
        />
      )}
    </div>
  );
}
