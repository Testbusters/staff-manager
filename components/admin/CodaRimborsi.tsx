'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, CreditCard, RotateCcw, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import MassimaleCheckModal, { type MassimaleImpact } from './MassimaleCheckModal';
import SortButton from './coda/SortButton';
import SectionToggle from './coda/SectionToggle';
import ArchiveTable, { type ArchiveRow } from './coda/ArchiveTable';
import RejectDialog from './coda/RejectDialog';
import RevertDialog from './coda/RevertDialog';
import BulkReceiptDialog, { type BulkReceiptItem } from './coda/BulkReceiptDialog';
import { type SortDir, fmt, fmtTotal, useBulkSelection } from './coda/shared';

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

function sortByDate(rows: ExpenseRow[], dir: SortDir): ExpenseRow[] {
  if (!dir) return rows;
  return [...rows].sort((a, b) => {
    const da = a.data_spesa ?? '';
    const db = b.data_spesa ?? '';
    return dir === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
  });
}

function toArchiveRows(rows: ExpenseRow[]): ArchiveRow[] {
  return rows.map((e) => ({
    id: e.id,
    collabName: e.collabName,
    subtitle: e.categoria,
    date: e.data_spesa,
    amount: e.importo,
    rejection_note: e.rejection_note,
  }));
}

export default function CodaRimborsi({ expenses, hasReceiptTemplate }: { expenses: ExpenseRow[]; hasReceiptTemplate?: boolean }) {
  const router = useRouter();
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [section1Open, setSection1Open] = useState(true);
  const [section2Open, setSection2Open] = useState(true);
  const [section3Open, setSection3Open] = useState(false);

  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [revertTarget, setRevertTarget] = useState<ExpenseRow | null>(null);
  const [revertNote, setRevertNote] = useState('');
  const [massimaleWarning, setMassimaleWarning] = useState<MassimaleImpact[] | null>(null);
  const [liquidateTarget, setLiquidateTarget] = useState<ExpenseRow | null>(null);
  const [bulkReceiptItems, setBulkReceiptItems] = useState<BulkReceiptItem[] | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const inAttesa  = useMemo(() => sortByDate(expenses.filter((e) => e.stato === 'IN_ATTESA'),  sortDir), [expenses, sortDir]);
  const approvati = useMemo(() => sortByDate(expenses.filter((e) => e.stato === 'APPROVATO'), sortDir), [expenses, sortDir]);
  const liquidati = useMemo(() => sortByDate(expenses.filter((e) => e.stato === 'LIQUIDATO'), sortDir), [expenses, sortDir]);
  const rifiutati = useMemo(() => sortByDate(expenses.filter((e) => e.stato === 'RIFIUTATO'), sortDir), [expenses, sortDir]);

  const selInAttesa  = useBulkSelection(inAttesa);
  const selApprovati = useBulkSelection(approvati);

  const totalInAttesa  = useMemo(() => inAttesa.reduce((s, e) => s + (e.importo ?? 0), 0), [inAttesa]);
  const totalApprovati = useMemo(() => approvati.reduce((s, e) => s + (e.importo ?? 0), 0), [approvati]);
  const archivioCount  = liquidati.length + rifiutati.length;
  const archivioTotal  = useMemo(() => [...liquidati, ...rifiutati].reduce((s, e) => s + (e.importo ?? 0), 0), [liquidati, rifiutati]);

  function cycleSortDir() {
    setSortDir((d) => (d === null ? 'asc' : d === 'asc' ? 'desc' : null));
  }

  async function doApprove(ids: string[]) {
    setLoading(true);
    try {
      if (ids.length > 1) {
        const toastId = toast.loading('Elaborazione approvazioni…');
        const res = await fetch('/api/expenses/bulk-approve', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        toast.dismiss(toastId);
        const data = await res.json();
        if (!res.ok) { toast.error(data.error ?? 'Errore.', { duration: 5000 }); return; }
        if ((data.approved?.length ?? 0) > 0) {
          toast.success(`${data.approved.length} rimborsi approvati.`);
          selInAttesa.clear();
          router.refresh();
        }
        if ((data.blocked?.length ?? 0) > 0) {
          toast.error(`${data.blocked.length} collaborator${data.blocked.length > 1 ? 'i bloccati' : 'e bloccata'} per massimale`, { duration: 6000 });
          setMassimaleWarning(data.blocked);
        }
        if (!data.approved?.length && !data.blocked?.length) {
          toast.error('Nessun rimborso approvato.', { duration: 5000 });
        }
      } else {
        const res = await fetch(`/api/expenses/${ids[0]}/transition`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        });
        const d = await res.json();
        if (!res.ok) {
          toast.error(d.error ?? 'Errore.', { duration: 5000 });
          if (d.blocked?.length > 0) setMassimaleWarning(d.blocked);
          return;
        }
        toast.success('Rimborso approvato.');
        selInAttesa.clear();
        router.refresh();
      }
    } finally { setLoading(false); }
  }

  async function doLiquidate(ids: string[], generateReceipt = false, expenseId?: string) {
    if (ids.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/expenses/bulk-liquidate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Errore.', { duration: 5000 }); return; }
      selApprovati.clear();
      setLiquidateTarget(null);

      if (ids.length > 1 && hasReceiptTemplate) {
        const items = ids
          .map((id) => { const e = approvati.find((x) => x.id === id); return e ? { id, collabName: e.collabName, importo: e.importo ?? 0 } : null; })
          .filter((x): x is BulkReceiptItem => x !== null);
        if (items.length > 0) {
          setBulkReceiptItems(items);
          toast.success(`${ids.length} rimborsi liquidati.`, {
            action: { label: `Genera ricevute (${items.length})`, onClick: () => setReceiptModalOpen(true) },
            duration: 8000,
          });
        } else {
          toast.success(`${ids.length} rimborsi liquidati.`);
        }
      } else {
        toast.success(ids.length === 1 ? 'Rimborso liquidato.' : `${ids.length} rimborsi liquidati.`);
        if (generateReceipt && expenseId) {
          fetch('/api/documents/generate-receipts', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'single', expense_id: expenseId }),
          }).catch(() => {});
        }
      }
      router.refresh();
    } finally { setLoading(false); }
  }

  async function handleGenerateBulkReceipts() {
    if (!bulkReceiptItems) return;
    setReceiptModalOpen(false);
    const toastId = toast.loading('Generazione ricevute in corso…');
    try {
      await fetch('/api/documents/generate-receipts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'bulk' }),
      });
      toast.dismiss(toastId);
      toast.success('Ricevute generate.');
    } catch {
      toast.dismiss(toastId);
      toast.error('Errore durante la generazione delle ricevute.');
    } finally {
      setBulkReceiptItems(null);
    }
  }

  async function handleReject() {
    if (!rejectTargetId || rejectionNote.trim().length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses/${rejectTargetId}/transition`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', note: rejectionNote }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Errore.', { duration: 5000 }); return; }
      setRejectTargetId(null);
      setRejectionNote('');
      router.refresh();
    } finally { setLoading(false); }
  }

  async function handleRevert() {
    if (!revertTarget || revertNote.trim().length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses/${revertTarget.id}/transition`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revert_to_pending', note: revertNote }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Errore.', { duration: 5000 }); return; }
      setRevertTarget(null);
      setRevertNote('');
      toast.success('Rimborso rimesso in attesa.');
      router.refresh();
    } finally { setLoading(false); }
  }

  const rejectTarget = rejectTargetId ? expenses.find((e) => e.id === rejectTargetId) : null;

  return (
    <div className="space-y-3">
      {/* ── SECTION 1 — Da processare ──────────────────────────── */}
      <Collapsible open={section1Open} onOpenChange={setSection1Open} className="rounded-xl border border-border border-l-4 border-l-amber-500 bg-card overflow-hidden">
        <div className={`flex items-center gap-3 px-4 py-3 bg-amber-500/5 ${section1Open ? 'border-b border-border' : ''}`}>
          <SectionToggle label="Da processare" count={inAttesa.length} total={totalInAttesa} accentClass="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15" onToggle={() => setSection1Open((o) => !o)} />
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {section1Open && inAttesa.length > 0 && (
              <button onClick={selInAttesa.toggleAll} className="text-xs text-link hover:text-link/80 transition-colors">
                {selInAttesa.allSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
              </button>
            )}
            <Button size="sm" onClick={() => { if (selInAttesa.selectedIds.size > 0) doApprove([...selInAttesa.selectedIds]); }} disabled={loading || selInAttesa.selectedIds.size === 0} className="bg-brand hover:bg-brand/90 text-white">
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Approva selezionati{selInAttesa.selectedIds.size > 0 ? ` (${selInAttesa.selectedIds.size})` : ''}
            </Button>
            <CollapsibleTrigger asChild>
              <button className="group text-muted-foreground hover:text-foreground transition-colors" aria-label={section1Open ? 'Comprimi sezione' : 'Espandi sezione'} type="button">
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          {inAttesa.length === 0 ? (
            <div className="px-4 py-8"><EmptyState icon={CheckCircle} title="Nessun rimborso in attesa" description="Tutti i rimborsi sono stati processati." /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
                  <TableHead className="w-10" />
                  <TableHead className="text-xs font-medium text-muted-foreground">Collaboratore</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground"><SortButton sortDir={sortDir} onCycle={cycleSortDir} /></TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">Importo</TableHead>
                  <TableHead className="w-16 text-xs font-medium text-muted-foreground text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inAttesa.map((exp) => {
                  const isSelected = selInAttesa.selectedIds.has(exp.id);
                  return (
                    <TableRow key={exp.id} className={isSelected ? 'bg-brand/5' : ''}>
                      <TableCell className="py-3"><Checkbox checked={isSelected} onCheckedChange={() => selInAttesa.toggle(exp.id)} aria-label={`Seleziona ${exp.collabName}`} /></TableCell>
                      <TableCell className="py-3">
                        <p className="text-sm font-medium text-foreground leading-tight">{exp.collabName}</p>
                        {exp.categoria && <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{exp.categoria}</p>}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground tabular-nums">
                        {exp.data_spesa ? new Date(exp.data_spesa).toLocaleDateString('it-IT') : <span className="text-muted-foreground/40">—</span>}
                      </TableCell>
                      <TableCell className="py-3 text-sm font-medium text-foreground text-right tabular-nums">{fmt(exp.importo) ?? <span className="text-muted-foreground/40">—</span>}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-500/10" onClick={() => doApprove([exp.id])} disabled={loading} aria-label="Approva"><CheckCircle className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { setRejectTargetId(exp.id); setRejectionNote(''); }} disabled={loading} aria-label="Rifiuta"><XCircle className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="border-t border-border bg-muted/20 hover:bg-muted/20">
                  <TableCell /><TableCell className="py-2.5 text-xs text-muted-foreground">{inAttesa.length} {inAttesa.length === 1 ? 'voce' : 'voci'}</TableCell><TableCell />
                  <TableCell className="py-2.5 text-sm font-semibold text-foreground text-right tabular-nums">{fmtTotal(totalInAttesa)}</TableCell><TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* ── SECTION 2 — Approvati · da liquidare ──────────────── */}
      <Collapsible open={section2Open} onOpenChange={setSection2Open} className="rounded-xl border border-border border-l-4 border-l-green-500 bg-card overflow-hidden">
        <div className={`flex items-center gap-3 px-4 py-3 bg-green-500/5 ${section2Open ? 'border-b border-border' : ''}`}>
          <SectionToggle label="Approvati · da liquidare" count={approvati.length} total={totalApprovati} accentClass="bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/15" onToggle={() => setSection2Open((o) => !o)} />
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {section2Open && approvati.length > 0 && (
              <button onClick={selApprovati.toggleAll} className="text-xs text-link hover:text-link/80 transition-colors">
                {selApprovati.allSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
              </button>
            )}
            <Button size="sm" onClick={() => doLiquidate([...selApprovati.selectedIds])} disabled={loading || selApprovati.selectedIds.size === 0} className="bg-brand hover:bg-brand/90 text-white">
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              Liquida selezionati{selApprovati.selectedIds.size > 0 ? ` (${selApprovati.selectedIds.size})` : ''}
            </Button>
            <CollapsibleTrigger asChild>
              <button className="group text-muted-foreground hover:text-foreground transition-colors" aria-label={section2Open ? 'Comprimi sezione' : 'Espandi sezione'} type="button">
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          {approvati.length === 0 ? (
            <div className="px-4 py-8"><EmptyState icon={CreditCard} title="Nessun rimborso da liquidare" description="Non ci sono rimborsi approvati in attesa di liquidazione." /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
                  <TableHead className="w-10" /><TableHead className="text-xs font-medium text-muted-foreground">Collaboratore</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground"><SortButton sortDir={sortDir} onCycle={cycleSortDir} /></TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">Importo</TableHead>
                  <TableHead className="w-16 text-xs font-medium text-muted-foreground text-right">Azione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvati.map((exp) => {
                  const isSelected = selApprovati.selectedIds.has(exp.id);
                  return (
                    <TableRow key={exp.id} className={isSelected ? 'bg-brand/5' : ''}>
                      <TableCell className="py-3"><Checkbox checked={isSelected} onCheckedChange={() => selApprovati.toggle(exp.id)} aria-label={`Seleziona ${exp.collabName}`} /></TableCell>
                      <TableCell className="py-3">
                        <p className="text-sm font-medium text-foreground leading-tight">{exp.collabName}</p>
                        {exp.categoria && <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{exp.categoria}</p>}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground tabular-nums">
                        {exp.data_spesa ? new Date(exp.data_spesa).toLocaleDateString('it-IT') : <span className="text-muted-foreground/40">—</span>}
                      </TableCell>
                      <TableCell className="py-3 text-sm font-medium text-foreground text-right tabular-nums">{fmt(exp.importo) ?? <span className="text-muted-foreground/40">—</span>}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10" onClick={() => { setRevertTarget(exp); setRevertNote(''); }} disabled={loading} aria-label="Rimetti in attesa"><RotateCcw className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => setLiquidateTarget(exp)} disabled={loading} aria-label="Liquida"><CreditCard className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="border-t border-border bg-muted/20 hover:bg-muted/20">
                  <TableCell /><TableCell className="py-2.5 text-xs text-muted-foreground">{approvati.length} {approvati.length === 1 ? 'voce' : 'voci'}</TableCell><TableCell />
                  <TableCell className="py-2.5 text-sm font-semibold text-foreground text-right tabular-nums">{fmtTotal(totalApprovati)}</TableCell><TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* ── SECTION 3 — Archivio ──────────────────────────────── */}
      <Collapsible open={section3Open} onOpenChange={setSection3Open} className="rounded-xl border border-border border-l-4 border-l-border bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="group w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/60 transition-colors" type="button" aria-label={section3Open ? 'Comprimi sezione' : 'Espandi sezione'}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Archivio</span>
              <span className="text-xs text-muted-foreground/60">· {archivioCount} {archivioCount === 1 ? 'voce' : 'voci'} · {fmtTotal(archivioTotal)}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-data-[state=open]:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border">
            {archivioCount === 0 ? (
              <div className="px-4 py-8"><EmptyState icon={CheckCircle} title="Archivio vuoto" description="Non ci sono rimborsi liquidati o rifiutati." /></div>
            ) : (
              <Tabs defaultValue="liquidati" className="w-full">
                <div className="px-4 pt-3 pb-0">
                  <TabsList className="h-8">
                    <TabsTrigger value="liquidati" className="text-xs">Liquidati ({liquidati.length})</TabsTrigger>
                    <TabsTrigger value="rifiutati" className="text-xs">Rifiutati ({rifiutati.length})</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="liquidati" className="mt-0">
                  {liquidati.length === 0 ? (
                    <div className="px-4 py-6"><EmptyState icon={CreditCard} title="Nessun rimborso liquidato" description="Non ci sono rimborsi liquidati." /></div>
                  ) : (
                    <ArchiveTable rows={toArchiveRows(liquidati)} showRejectionNote={false} sortDir={sortDir} onCycleSort={cycleSortDir} />
                  )}
                </TabsContent>
                <TabsContent value="rifiutati" className="mt-0">
                  {rifiutati.length === 0 ? (
                    <div className="px-4 py-6"><EmptyState icon={XCircle} title="Nessun rimborso rifiutato" description="Non ci sono rimborsi rifiutati." /></div>
                  ) : (
                    <ArchiveTable rows={toArchiveRows(rifiutati)} showRejectionNote={true} sortDir={sortDir} onCycleSort={cycleSortDir} />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Dialogs ───────────────────────────────────────────── */}
      <RejectDialog
        open={rejectTargetId !== null}
        onClose={() => { setRejectTargetId(null); setRejectionNote(''); }}
        title="Rifiuta rimborso"
        description={rejectTarget ? `${rejectTarget.collabName}${rejectTarget.importo != null ? ` — €\u202f${rejectTarget.importo.toFixed(2)}` : ''}${rejectTarget.categoria ? ` — ${rejectTarget.categoria}` : ''}` : ''}
        note={rejectionNote}
        onNoteChange={setRejectionNote}
        onConfirm={handleReject}
        loading={loading}
      />

      <RevertDialog
        open={revertTarget !== null}
        onClose={() => { setRevertTarget(null); setRevertNote(''); }}
        description={revertTarget ? `${revertTarget.collabName}${revertTarget.importo != null ? ` — €\u202f${revertTarget.importo.toFixed(2)}` : ''}${revertTarget.categoria ? ` — ${revertTarget.categoria}` : ''}` : ''}
        note={revertNote}
        onNoteChange={setRevertNote}
        onConfirm={handleRevert}
        loading={loading}
      />

      {/* Single liquidate confirm — entity-specific layout */}
      <Dialog open={liquidateTarget !== null} onOpenChange={(open) => { if (!open) setLiquidateTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conferma liquidazione</DialogTitle>
            <DialogDescription>Stai per liquidare il rimborso di <span className="font-medium text-foreground">{liquidateTarget?.collabName}</span>.</DialogDescription>
          </DialogHeader>
          {liquidateTarget && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm space-y-1">
                {liquidateTarget.categoria && <p><span className="text-muted-foreground">Categoria:</span> {liquidateTarget.categoria}</p>}
                {liquidateTarget.data_spesa && <p><span className="text-muted-foreground">Data:</span> {new Date(liquidateTarget.data_spesa).toLocaleDateString('it-IT')}</p>}
                <p><span className="text-muted-foreground">Importo:</span> <span className="font-medium">{liquidateTarget.importo != null ? `€\u202f${liquidateTarget.importo.toFixed(2)}` : '—'}</span></p>
              </div>
              {hasReceiptTemplate && (
                <Alert variant="info"><AlertDescription><span className="font-medium">Ricevuta di pagamento</span><span className="block mt-0.5 text-xs">Una ricevuta verrà generata automaticamente e inviata al collaboratore.</span></AlertDescription></Alert>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLiquidateTarget(null)} disabled={loading}>Annulla</Button>
            <Button className="bg-brand hover:bg-brand/90 text-white" disabled={loading} onClick={() => { if (!liquidateTarget) return; const target = liquidateTarget; setLiquidateTarget(null); doLiquidate([target.id], !!hasReceiptTemplate, target.id); }}>
              Conferma liquidazione
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {bulkReceiptItems && (
        <BulkReceiptDialog
          open={receiptModalOpen}
          onClose={() => { setReceiptModalOpen(false); setBulkReceiptItems(null); }}
          items={bulkReceiptItems}
          onConfirm={handleGenerateBulkReceipts}
          entityLabel="rimborsi"
        />
      )}

      {massimaleWarning && (
        <MassimaleCheckModal open onClose={() => setMassimaleWarning(null)} impacts={massimaleWarning} entityType="rimborsi" />
      )}
    </div>
  );
}
