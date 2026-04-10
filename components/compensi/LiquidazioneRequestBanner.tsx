'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, AlertCircle, Info, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { LiquidazioneRequest } from '@/lib/types';

interface ApprovedComp {
  id: string;
  nome_servizio_ruolo: string;
  importo_netto: number;
}

interface ApprovedExp {
  id: string;
  categoria: string;
  importo: number;
}

interface Props {
  approvedCompensations: ApprovedComp[];
  approvedExpenses: ApprovedExp[];
  activeRequest: LiquidazioneRequest | null;
  iban: string | null;
}

const MIN_NETTO = 250;

export default function LiquidazioneRequestBanner({
  approvedCompensations,
  approvedExpenses,
  activeRequest,
  iban,
}: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompIds, setSelectedCompIds] = useState<string[]>([]);
  const [selectedExpIds, setSelectedExpIds] = useState<string[]>([]);
  const [haPartitaIva, setHaPartitaIva] = useState(false);
  const [datiCorretti, setDatiCorretti] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const totalApprovedNetto =
    approvedCompensations.reduce((s, c) => s + c.importo_netto, 0) +
    approvedExpenses.reduce((s, e) => s + e.importo, 0);

  const selectedNetto =
    approvedCompensations.filter((c) => selectedCompIds.includes(c.id)).reduce((s, c) => s + c.importo_netto, 0) +
    approvedExpenses.filter((e) => selectedExpIds.includes(e.id)).reduce((s, e) => s + e.importo, 0);

  const nettoMeetsThreshold = selectedNetto >= MIN_NETTO;
  const canSubmit = datiCorretti && nettoMeetsThreshold && (selectedCompIds.length + selectedExpIds.length) > 0;

  function toggleComp(id: string) {
    setSelectedCompIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleExp(id: string) {
    setSelectedExpIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function openDialog() {
    setSelectedCompIds(approvedCompensations.map((c) => c.id));
    setSelectedExpIds(approvedExpenses.map((e) => e.id));
    setHaPartitaIva(false);
    setDatiCorretti(false);
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    if (!open) {
      setSelectedCompIds([]);
      setSelectedExpIds([]);
      setHaPartitaIva(false);
      setDatiCorretti(false);
    }
    setDialogOpen(open);
  }

  async function handleRevoca() {
    if (!activeRequest) return;
    setRevoking(true);
    try {
      const res = await fetch(`/api/liquidazione-requests/${activeRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoca' }),
      });
      if (res.ok) {
        toast.success('Richiesta revocata con successo.');
        router.refresh();
      } else {
        const d = await res.json();
        toast.error(d.error ?? 'Errore durante la revoca.');
      }
    } finally {
      setRevoking(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/liquidazione-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compensation_ids: selectedCompIds,
          expense_ids: selectedExpIds,
          ha_partita_iva: haPartitaIva,
        }),
      });
      if (res.ok) {
        toast.success('Richiesta di liquidazione inviata con successo.');
        setDialogOpen(false);
        router.refresh();
      } else {
        const d = await res.json();
        toast.error(d.error ?? 'Errore durante l\'invio della richiesta.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // State 1: No APPROVATO records at all
  if (approvedCompensations.length === 0 && approvedExpenses.length === 0) {
    return null;
  }

  // State 2: Active request in attesa
  if (activeRequest) {
    return (
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/10 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Richiesta di liquidazione in attesa
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Importo netto: <strong>€{activeRequest.importo_netto_totale.toFixed(2)}</strong> — inviata il {new Date(activeRequest.created_at).toLocaleDateString('it-IT')}
            </p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={revoking} className="shrink-0 text-xs h-8">
              Revoca
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revocare la richiesta?</AlertDialogTitle>
              <AlertDialogDescription>
                La richiesta di liquidazione verrà annullata. Potrai inviarne una nuova in seguito.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleRevoca} disabled={revoking}>
                Revoca
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // State 3: Records exist but total net < €250
  if (totalApprovedNetto < MIN_NETTO) {
    return (
      <div className="mb-6 rounded-xl border border-border bg-muted/40 px-4 py-3 flex items-start gap-3">
        <Info className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Liquidazione non disponibile
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Il totale netto approvato (€{totalApprovedNetto.toFixed(2)}) è inferiore alla soglia minima di €{MIN_NETTO}.
            La liquidazione sarà disponibile quando il totale raggiungerà €{MIN_NETTO}.
          </p>
        </div>
      </div>
    );
  }

  // State 4: Eligible — CTA temporarily disabled until June 2026
  return (
    <>
      <div className="mb-6 rounded-xl border border-border bg-muted/40 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Liquidazione in arrivo
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Totale netto approvato: <strong>€{totalApprovedNetto.toFixed(2)}</strong> — La liquidazione sarà disponibile a partire da Giugno 2026.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 text-xs h-8"
          disabled
        >
          In arrivo
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto pr-10">
          <DialogHeader>
            <DialogTitle>Richiedi liquidazione</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Disclaimer */}
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Seleziona i compensi e i rimborsi da liquidare. L'importo netto totale deve essere almeno <strong>€{MIN_NETTO}</strong>.
                I record selezionati verranno liquidati integralmente — non è possibile richiedere importi parziali.
              </p>
            </div>

            {/* Compensation rows */}
            {approvedCompensations.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Compensi</p>
                <div className="space-y-2">
                  {approvedCompensations.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 cursor-pointer hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedCompIds.includes(c.id)}
                          onCheckedChange={() => toggleComp(c.id)}
                        />
                        <span className="text-sm text-foreground">{c.nome_servizio_ruolo}</span>
                      </div>
                      <span className="text-sm font-mono text-foreground shrink-0">
                        €{c.importo_netto.toFixed(2)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Expense rows */}
            {approvedExpenses.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Rimborsi</p>
                <div className="space-y-2">
                  {approvedExpenses.map((e) => (
                    <label
                      key={e.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 cursor-pointer hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedExpIds.includes(e.id)}
                          onCheckedChange={() => toggleExp(e.id)}
                        />
                        <span className="text-sm text-foreground">{e.categoria}</span>
                      </div>
                      <span className="text-sm font-mono text-foreground shrink-0">
                        €{e.importo.toFixed(2)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Running total */}
            <div className={`rounded-lg border px-3 py-2 flex items-center justify-between ${
              nettoMeetsThreshold
                ? 'border-green-200 bg-green-50 dark:border-green-800/50 dark:bg-green-900/10'
                : 'border-border bg-muted/40'
            }`}>
              <span className="text-sm font-medium text-foreground">Totale netto selezionato</span>
              <span className={`text-sm font-mono font-semibold ${
                nettoMeetsThreshold ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'
              }`}>
                €{selectedNetto.toFixed(2)}
                {!nettoMeetsThreshold && ` / min. €${MIN_NETTO}`}
              </span>
            </div>

            {/* IBAN read-only */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">IBAN di pagamento</p>
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
                <p className="text-sm font-mono text-foreground">{iban ?? '—'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Per modificare l'IBAN vai nel tuo profilo.
                </p>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={datiCorretti}
                  onCheckedChange={(v) => setDatiCorretti(!!v)}
                  className="mt-0.5"
                />
                <span className="text-sm text-foreground leading-relaxed">
                  Ho controllato che i dati siano corretti (IBAN, importi, record selezionati).
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={haPartitaIva}
                  onCheckedChange={(v) => setHaPartitaIva(!!v)}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-sm text-foreground leading-relaxed">
                    Sono possessore di Partita IVA.
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Emetterò fattura a Testbusters e la invierò a{' '}
                    <span className="font-mono">fatture@testbusters.it</span>
                  </p>
                </div>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
              Annulla
            </Button>
            <Button
              className="bg-brand hover:bg-brand/90 text-white"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
            >
              {submitting ? 'Invio...' : 'Invia richiesta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
