'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, CreditCard, RotateCcw, ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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

export default function CodaCompensazioni({ compensations, hasReceiptTemplate }: { compensations: CompensationRow[]; hasReceiptTemplate?: boolean }) {
  const router = useRouter();
  const [sortDir, setSortDir] = useState<SortDir>(null);

  // Section open/closed
  const [section1Open, setSection1Open] = useState(true);
  const [section2Open, setSection2Open] = useState(true);
  const [section3Open, setSection3Open] = useState(false);

  // Selection state per section
  const [selectedInAttesaIds, setSelectedInAttesaIds]   = useState<Set<string>>(new Set());
  const [selectedApprovatiIds, setSelectedApprovatiIds] = useState<Set<string>>(new Set());

  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote]   = useState('');
  const [revertTarget, setRevertTarget]     = useState<CompensationRow | null>(null);
  const [revertNote, setRevertNote]         = useState('');
  const [massimaleWarning, setMassimaleWarning] = useState<MassimaleImpact[] | null>(null);
  const [liquidateTarget, setLiquidateTarget] = useState<CompensationRow | null>(null);
  const [bulkReceiptItems, setBulkReceiptItems] = useState<Array<{ id: string; collabName: string; importo: number }> | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
    setSelectedInAttesaIds(allInAttesaSelected ? new Set() : new Set(inAttesa.map((c) => c.id)));
  }

  function toggleSelectApprovati(id: string) {
    setSelectedApprovatiIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAllApprovati() {
    setSelectedApprovatiIds(allApprovatiSelected ? new Set() : new Set(approvati.map((c) => c.id)));
  }

  async function doApprove(ids: string[]) {
    setLoading(true);
    try {
      if (ids.length > 1) {
        const toastId = toast.loading('Elaborazione approvazioni…');
        const res = await fetch('/api/compensations/bulk-approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        toast.dismiss(toastId);
        const data = await res.json();
        if (!res.ok) { toast.error(data.error ?? 'Errore.', { duration: 5000 }); return; }
        if ((data.approved?.length ?? 0) > 0) {
          toast.success(`${data.approved.length} compensi approvati.`);
          setSelectedInAttesaIds(new Set());
          router.refresh();
        }
        if ((data.blocked?.length ?? 0) > 0) {
          toast.error(`${data.blocked.length} collaborator${data.blocked.length > 1 ? 'i bloccati' : 'e bloccata'} per massimale`, { duration: 6000 });
          setMassimaleWarning(data.blocked);
        }
        if (!data.approved?.length && !data.blocked?.length) {
          toast.error('Nessun compenso approvato.', { duration: 5000 });
        }
      } else {
        const res = await fetch(`/api/compensations/${ids[0]}/transition`, {
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
        toast.success('Compenso approvato.');
        setSelectedInAttesaIds(new Set());
        router.refresh();
      }
    } finally { setLoading(false); }
  }

  async function doLiquidate(ids: string[], generateReceipt = false, compensationId?: string) {
    if (ids.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/compensations/bulk-liquidate', {
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
            const comp = approvati.find((c) => c.id === id);
            return comp ? { id, collabName: comp.collabName, importo: comp.importo_lordo ?? 0 } : null;
          })
          .filter((x): x is { id: string; collabName: string; importo: number } => x !== null);
        if (items.length > 0) {
          setBulkReceiptItems(items);
          toast.success(`${ids.length} compensi liquidati.`, {
            action: { label: `Genera ricevute (${items.length})`, onClick: () => setReceiptModalOpen(true) },
            duration: 8000,
          });
        } else {
          toast.success(`${ids.length} compensi liquidati.`);
        }
      } else {
        toast.success(ids.length === 1 ? 'Compenso liquidato.' : `${ids.length} compensi liquidati.`);
        if (generateReceipt && compensationId) {
          await fetch('/api/documents/generate-receipts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'single', compensation_id: compensationId }),
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
      const res = await fetch(`/api/compensations/${rejectTargetId}/transition`, {
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

  const rejectTarget = rejectTargetId ? compensations.find((c) => c.id === rejectTargetId) : null;

  async function handleRevert() {
    if (!revertTarget || revertNote.trim().length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/compensations/${revertTarget.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revert_to_pending', note: revertNote }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Errore.', { duration: 5000 }); return; }
      setRevertTarget(null);
      setRevertNote('');
      toast.success('Compenso rimesso in attesa.');
      router.refresh();
    } finally { setLoading(false); }
  }

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
              <EmptyState icon={CheckCircle} title="Nessun compenso in attesa" description="Tutti i compensi sono stati processati." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
                  <TableHead className="w-10" />
                  <TableHead className="text-xs font-medium text-muted-foreground">Collaboratore</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    <SortButton sortDir={sortDir} onCycle={cycleSortDir} />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">Importo lordo</TableHead>
                  <TableHead className="w-16 text-xs font-medium text-muted-foreground text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inAttesa.map((comp) => {
                  const isSelected = selectedInAttesaIds.has(comp.id);
                  return (
                    <TableRow key={comp.id} className={isSelected ? 'bg-brand/5' : ''}>
                      <TableCell className="py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectInAttesa(comp.id)}
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
              <EmptyState icon={CreditCard} title="Nessun compenso da liquidare" description="Non ci sono compensi approvati in attesa di liquidazione." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
                  <TableHead className="w-10" />
                  <TableHead className="text-xs font-medium text-muted-foreground">Collaboratore</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    <SortButton sortDir={sortDir} onCycle={cycleSortDir} />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">Importo</TableHead>
                  <TableHead className="w-16 text-xs font-medium text-muted-foreground text-right">Azione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvati.map((comp) => {
                  const isSelected = selectedApprovatiIds.has(comp.id);
                  return (
                    <TableRow key={comp.id} className={isSelected ? 'bg-brand/5' : ''}>
                      <TableCell className="py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectApprovati(comp.id)}
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
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                            onClick={() => { setRevertTarget(comp); setRevertNote(''); }}
                            disabled={loading}
                            aria-label="Rimetti in attesa"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => setLiquidateTarget(comp)}
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
        </CollapsibleContent>
      </Collapsible>

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

      {/* ── Revert to pending dialog ──────────────────────────────── */}
      <Dialog
        open={revertTarget !== null}
        onOpenChange={(open) => { if (!open) { setRevertTarget(null); setRevertNote(''); } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rimetti in attesa</DialogTitle>
            {revertTarget && (
              <DialogDescription>
                {revertTarget.collabName}
                {revertTarget.importo_lordo != null && ` — €\u202f${revertTarget.importo_lordo.toFixed(2)}`}
                {revertTarget.nome_servizio_ruolo && ` — ${revertTarget.nome_servizio_ruolo}`}
              </DialogDescription>
            )}
          </DialogHeader>
          <Textarea
            placeholder="Motivazione obbligatoria…"
            value={revertNote}
            onChange={(e) => setRevertNote(e.target.value)}
            rows={4}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRevertTarget(null); setRevertNote(''); }}>
              Annulla
            </Button>
            <Button
              variant="outline"
              className="border-amber-500 text-amber-700 hover:bg-amber-500/10"
              onClick={handleRevert}
              disabled={loading || revertNote.trim().length === 0}
            >
              Conferma
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
                <Alert variant="info">
                  <AlertDescription>
                    Verrà generata una ricevuta di pagamento per {liquidateTarget.collabName}.
                  </AlertDescription>
                </Alert>
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

      {/* ── Bulk receipt confirmation dialog ─────────────────── */}
      <Dialog open={receiptModalOpen} onOpenChange={(open) => { if (!open) setReceiptModalOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Genera ricevute di pagamento</DialogTitle>
            <DialogDescription>
              Verranno generate le ricevute per i {bulkReceiptItems?.length ?? 0} compensi liquidati.
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
          entityType="compensi"
        />
      )}
    </div>
  );
}
