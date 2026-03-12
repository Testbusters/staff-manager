'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, CreditCard, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
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
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import MassimaleCheckModal, { type MassimaleImpact } from './MassimaleCheckModal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

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

function fmt(amount: number | null) {
  if (amount == null) return <span className="text-muted-foreground/40">—</span>;
  return `€\u202f${amount.toFixed(2)}`;
}

function fmtTotal(amount: number) {
  return `€\u202f${amount.toFixed(2)}`;
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

function archiveColumns(showRejectionNote: boolean): ColumnDef<ExpenseRow>[] {
  return [
    {
      id: 'collaboratore',
      accessorKey: 'collabName',
      header: 'Collaboratore',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground leading-tight">{row.original.collabName}</p>
          {row.original.categoria && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{row.original.categoria}</p>
          )}
          {showRejectionNote && row.original.rejection_note && (
            <p className="text-xs text-destructive mt-0.5 leading-tight">↳ {row.original.rejection_note}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'data_spesa',
      header: 'Data spesa',
      cell: ({ row }) => row.original.data_spesa
        ? <span className="text-sm text-muted-foreground tabular-nums">{new Date(row.original.data_spesa).toLocaleDateString('it-IT')}</span>
        : <span className="text-muted-foreground/40">—</span>,
    },
    {
      accessorKey: 'importo',
      header: 'Importo',
      cell: ({ row }) => <span className="text-sm text-muted-foreground tabular-nums">{fmt(row.original.importo)}</span>,
    },
  ];
}

export default function CodaRimborsi({ expenses, hasReceiptTemplate }: { expenses: ExpenseRow[]; hasReceiptTemplate?: boolean }) {
  const router = useRouter();

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
  const [liquidateTarget, setLiquidateTarget] = useState<ExpenseRow | null>(null);
  const [bulkReceiptItems, setBulkReceiptItems] = useState<Array<{ id: string; collabName: string; importo: number }> | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Sections ───────────────────────────────────────────────────
  const inAttesa  = useMemo(() => expenses.filter((e) => e.stato === 'IN_ATTESA'),  [expenses]);
  const approvati = useMemo(() => expenses.filter((e) => e.stato === 'APPROVATO'), [expenses]);
  const liquidati = useMemo(() => expenses.filter((e) => e.stato === 'LIQUIDATO'), [expenses]);
  const rifiutati = useMemo(() => expenses.filter((e) => e.stato === 'RIFIUTATO'), [expenses]);

  const totalInAttesa  = useMemo(() => inAttesa.reduce((s, e)  => s + (e.importo ?? 0), 0), [inAttesa]);
  const totalApprovati = useMemo(() => approvati.reduce((s, e) => s + (e.importo ?? 0), 0), [approvati]);
  const archivioCount  = liquidati.length + rifiutati.length;
  const archivioTotal  = useMemo(
    () => [...liquidati, ...rifiutati].reduce((s, e) => s + (e.importo ?? 0), 0),
    [liquidati, rifiutati],
  );

  const allInAttesaSelected  = inAttesa.length > 0  && selectedInAttesaIds.size === inAttesa.length;
  const allApprovatiSelected = approvati.length > 0 && selectedApprovatiIds.size === approvati.length;

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
    try {
      if (ids.length > 1) {
        const toastId = toast.loading('Elaborazione approvazioni…');
        const res = await fetch('/api/expenses/bulk-approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        toast.dismiss(toastId);
        const data = await res.json();
        if (!res.ok) { toast.error(data.error ?? 'Errore.', { duration: 5000 }); return; }
        if ((data.approved?.length ?? 0) > 0) {
          toast.success(`${data.approved.length} rimborsi approvati.`);
          setSelectedInAttesaIds(new Set());
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
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        });
        const d = await res.json();
        if (!res.ok) {
          toast.error(d.error ?? 'Errore.', { duration: 5000 });
          if (d.blocked?.length > 0) setMassimaleWarning(d.blocked);
          return;
        }
        toast.success('Rimborso approvato.');
        setSelectedInAttesaIds(new Set());
        router.refresh();
      }
    } finally { setLoading(false); }
  }

  async function doLiquidate(ids: string[], generateReceipt = false, expenseId?: string) {
    if (ids.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/expenses/bulk-liquidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Errore.', { duration: 5000 }); return; }
      setSelectedApprovatiIds(new Set());
      setLiquidateTarget(null);

      if (ids.length > 1 && hasReceiptTemplate) {
        const items = ids
          .map((id) => {
            const exp = approvati.find((e) => e.id === id);
            return exp ? { id, collabName: exp.collabName, importo: exp.importo ?? 0 } : null;
          })
          .filter((x): x is { id: string; collabName: string; importo: number } => x !== null);
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
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  function handleApproveSingle(id: string) {
    doApprove([id]);
  }

  function handleApproveSelected() {
    if (selectedInAttesaIds.size === 0) return;
    doApprove([...selectedInAttesaIds]);
  }

  async function handleReject() {
    if (!rejectTargetId || rejectionNote.trim().length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses/${rejectTargetId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', note: rejectionNote }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Errore.', { duration: 5000 }); return; }
      setRejectTargetId(null);
      setRejectionNote('');
      router.refresh();
    } finally { setLoading(false); }
  }

  const rejectTarget = rejectTargetId ? expenses.find((e) => e.id === rejectTargetId) : null;

  return (
    <div className="space-y-3">
      {/* ── SECTION 1 — Da processare ──────────────────────────── */}
      <Collapsible open={section1Open} onOpenChange={setSection1Open} className="rounded-xl border border-border border-l-4 border-l-amber-500 bg-card overflow-hidden">
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
            <CollapsibleTrigger asChild>
              <button
                className="group text-muted-foreground hover:text-foreground transition-colors"
                aria-label={section1Open ? 'Comprimi sezione' : 'Espandi sezione'}
                type="button"
              >
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          {inAttesa.length === 0 ? (
            <div className="px-4 py-8">
              <EmptyState icon={CheckCircle} title="Nessun rimborso in attesa" description="Tutti i rimborsi sono stati processati." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
                  <TableHead className="w-10" />
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Collaboratore</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Data</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground text-right">Importo</TableHead>
                  <TableHead className="w-16 text-xs uppercase tracking-wide text-muted-foreground text-right">Azioni</TableHead>
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
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* ── SECTION 2 — Approvati · da liquidare ──────────────── */}
      <Collapsible open={section2Open} onOpenChange={setSection2Open} className="rounded-xl border border-border border-l-4 border-l-green-500 bg-card overflow-hidden">
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
            <CollapsibleTrigger asChild>
              <button
                className="group text-muted-foreground hover:text-foreground transition-colors"
                aria-label={section2Open ? 'Comprimi sezione' : 'Espandi sezione'}
                type="button"
              >
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          {approvati.length === 0 ? (
            <div className="px-4 py-8">
              <EmptyState icon={CreditCard} title="Nessun rimborso da liquidare" description="Non ci sono rimborsi approvati in attesa di liquidazione." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
                  <TableHead className="w-10" />
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Collaboratore</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Data</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground text-right">Importo</TableHead>
                  <TableHead className="w-16 text-xs uppercase tracking-wide text-muted-foreground text-right">Azione</TableHead>
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
                            onClick={() => setLiquidateTarget(exp)}
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
        </CollapsibleContent>
      </Collapsible>

      {/* ── SECTION 3 — Archivio ──────────────────────────────── */}
      <Collapsible open={section3Open} onOpenChange={setSection3Open} className="rounded-xl border border-border border-l-4 border-l-border bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            className="group w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/60 transition-colors"
            type="button"
            aria-label={section3Open ? 'Comprimi sezione' : 'Espandi sezione'}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Archivio</span>
              <span className="text-xs text-muted-foreground/60">
                · {archivioCount} {archivioCount === 1 ? 'voce' : 'voci'} · {fmtTotal(archivioTotal)}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-data-[state=open]:rotate-180" />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
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
                    <DataTable columns={archiveColumns(false)} data={liquidati} className="[&_tbody_tr]:opacity-70" />
                  )}
                </TabsContent>
                <TabsContent value="rifiutati" className="mt-0">
                  {rifiutati.length === 0 ? (
                    <div className="px-4 py-6">
                      <EmptyState icon={XCircle} title="Nessun rimborso rifiutato" description="Non ci sono rimborsi rifiutati." />
                    </div>
                  ) : (
                    <DataTable columns={archiveColumns(true)} data={rifiutati} className="[&_tbody_tr]:opacity-70" />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

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

      {/* ── Liquidate confirm dialog ─────────────────────────────── */}
      <Dialog open={liquidateTarget !== null} onOpenChange={(open) => { if (!open) setLiquidateTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conferma liquidazione</DialogTitle>
            <DialogDescription>
              Stai per liquidare il rimborso di{' '}
              <span className="font-medium text-foreground">{liquidateTarget?.collabName}</span>.
            </DialogDescription>
          </DialogHeader>
          {liquidateTarget && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm space-y-1">
                {liquidateTarget.categoria && (
                  <p><span className="text-muted-foreground">Categoria:</span> {liquidateTarget.categoria}</p>
                )}
                {liquidateTarget.data_spesa && (
                  <p><span className="text-muted-foreground">Data:</span> {new Date(liquidateTarget.data_spesa).toLocaleDateString('it-IT')}</p>
                )}
                <p><span className="text-muted-foreground">Importo:</span> <span className="font-medium">{liquidateTarget.importo != null ? `€\u202f${liquidateTarget.importo.toFixed(2)}` : '—'}</span></p>
              </div>
              {hasReceiptTemplate && (
                <Alert variant="info">
                  <AlertDescription>
                    <span className="font-medium">Ricevuta di pagamento</span>
                    <span className="block mt-0.5 text-xs">
                      Una ricevuta verrà generata automaticamente e inviata al collaboratore.
                    </span>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLiquidateTarget(null)} disabled={loading}>Annulla</Button>
            <Button
              className="bg-brand hover:bg-brand/90 text-white"
              disabled={loading}
              onClick={() => {
                if (!liquidateTarget) return;
                const target = liquidateTarget;
                setLiquidateTarget(null);
                doLiquidate([target.id], !!hasReceiptTemplate, target.id);
              }}
            >
              Conferma liquidazione
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk receipt confirmation dialog ─────────────────── */}
      <Dialog open={receiptModalOpen} onOpenChange={(open) => { if (!open) setReceiptModalOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Genera ricevute di pagamento</DialogTitle>
            <DialogDescription>
              Verranno generate le ricevute per i {bulkReceiptItems?.length ?? 0} rimborsi liquidati.
            </DialogDescription>
          </DialogHeader>
          {bulkReceiptItems && (
            <ScrollArea className="h-60">
              <div className="space-y-1">
                {bulkReceiptItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
                    <span className="text-foreground">{item.collabName}</span>
                    <span className="text-muted-foreground tabular-nums">€{item.importo.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border">
                  <span>Totale</span>
                  <span className="tabular-nums">€{bulkReceiptItems.reduce((s, i) => s + i.importo, 0).toFixed(2)}</span>
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setReceiptModalOpen(false); setBulkReceiptItems(null); }}>
              Annulla
            </Button>
            <Button className="bg-brand hover:bg-brand/90 text-white" onClick={handleGenerateBulkReceipts}>
              Genera
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
