'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const SHEET_URL = `https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_COMPENSATION_SHEET_ID ?? '1Kr6wqASphajjZkntw7JZfttHQtjFBuiM5ptIoyuS634'}/edit`;
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface PreviewRow {
  rowIndex: number;
  collaboratore: string;
  collaborator_id: string;
  data_competenza: string;
  importo_lordo: number;
  ritenuta_acconto: number;
  importo_netto: number;
  nome_servizio_ruolo: string | null;
  info_specifiche: string | null;
  competenza: string | null;
}

interface RowError {
  rowIndex: number;
  collaboratore: string;
  reason: string;
}

type State =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'preview'; rows: PreviewRow[]; errors: RowError[]; total: number }
  | { phase: 'confirming' }
  | { phase: 'done'; imported: number; skipped: number; errors: RowError[] }
  | { phase: 'error'; message: string };

function formatCurrency(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export default function ImportSection() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setState] = useState<State>({ phase: 'idle' });

  async function handlePreview() {
    setState({ phase: 'loading' });
    const toastId = toast.loading('Lettura foglio in corso…');
    try {
      const res = await fetch('/api/compensations/import/preview', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Errore durante la lettura del foglio.', { id: toastId });
        setState({ phase: 'error', message: json.error ?? 'Errore durante la lettura del foglio.' });
        return;
      }
      toast.dismiss(toastId);
      setState({ phase: 'preview', rows: json.rows, errors: json.errors, total: json.total });
    } catch {
      toast.error('Errore di rete. Riprova.', { id: toastId });
      setState({ phase: 'error', message: 'Errore di rete. Riprova.' });
    }
  }

  async function handleConfirm() {
    // Close the dialog immediately (phase 'confirming' sets open=false)
    setState({ phase: 'confirming' });
    const toastId = toast.loading('Importazione in corso…');
    try {
      const res = await fetch('/api/compensations/import/confirm', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Errore durante l'importazione.", { id: toastId });
        setState({ phase: 'error', message: json.error ?? "Errore durante l'importazione." });
        return;
      }
      const { imported } = json;
      toast.success(
        `${imported} ${imported === 1 ? 'compenso importato' : 'compensi importati'}`,
        { id: toastId }
      );
      setState({ phase: 'done', imported: json.imported, skipped: json.skipped, errors: json.errors });
      startTransition(() => router.refresh());
    } catch {
      toast.error('Errore di rete. Riprova.', { id: toastId });
      setState({ phase: 'error', message: 'Errore di rete. Riprova.' });
    }
  }

  function handleReset() {
    setState({ phase: 'idle' });
  }

  return (
    <>
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-foreground">Importa da Google Sheet</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Legge le righe contrassegnate per l&apos;elaborazione e le importa come compensi in attesa.{' '}
                <a
                  href={SHEET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link hover:text-link/80"
                >
                  Apri foglio ↗
                </a>
              </p>
            </div>

            {(state.phase === 'idle' || state.phase === 'loading') && (
              <Button
                onClick={handlePreview}
                disabled={state.phase === 'loading'}
                className="shrink-0 bg-brand hover:bg-brand/90 text-white"
              >
                Anteprima
              </Button>
            )}
            {state.phase === 'done' && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="shrink-0">
                Nuova importazione
              </Button>
            )}
            {state.phase === 'error' && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="shrink-0">
                Riprova
              </Button>
            )}
          </div>

          {/* Error state */}
          {state.phase === 'error' && (
            <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-lg px-4 py-3">
              {state.message}
            </p>
          )}

          {/* Done state */}
          {state.phase === 'done' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/50 px-4 py-3">
                <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                  {state.imported} {state.imported === 1 ? 'compenso importato' : 'compensi importati'}
                </span>
                {state.skipped > 0 && (
                  <span className="text-sm text-amber-600 dark:text-amber-400">
                    · {state.skipped} {state.skipped === 1 ? 'riga saltata' : 'righe saltate'}
                  </span>
                )}
              </div>
              {state.errors.length > 0 && <ErrorList errors={state.errors} />}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog
        open={state.phase === 'preview'}
        onOpenChange={(open) => {
          if (!open && state.phase === 'preview') setState({ phase: 'idle' });
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Anteprima importazione</DialogTitle>
          </DialogHeader>

          {state.phase === 'preview' && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <p className="text-xs text-muted-foreground">
                {state.rows.length} righe valide · {state.errors.length} con errori · {state.total} totali da elaborare
              </p>

              {state.errors.length > 0 && <ErrorList errors={state.errors} />}

              {state.rows.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-border">
                  <Table className="w-auto">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Riga</TableHead>
                        <TableHead>Collaboratore</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Competenza</TableHead>
                        <TableHead>Nome servizio / Ruolo</TableHead>
                        <TableHead className="text-right">Lordo</TableHead>
                        <TableHead className="text-right">Netto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {state.rows.map((r) => (
                        <TableRow key={r.rowIndex} className="hover:bg-muted/60">
                          <TableCell className="text-muted-foreground">{r.rowIndex}</TableCell>
                          <TableCell className="text-foreground">{r.collaboratore}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(r.data_competenza)}</TableCell>
                          <TableCell className="text-muted-foreground">{r.competenza ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground max-w-[180px] truncate">{r.nome_servizio_ruolo ?? '—'}</TableCell>
                          <TableCell className="text-right tabular-nums text-foreground">{formatCurrency(r.importo_lordo)}</TableCell>
                          <TableCell className="text-right tabular-nums text-foreground">{formatCurrency(r.importo_netto)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {state.rows.length === 0 && state.errors.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessuna riga da elaborare trovata nel foglio.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setState({ phase: 'idle' })}>
              Annulla
            </Button>
            {state.phase === 'preview' && state.rows.length > 0 && (
              <Button onClick={handleConfirm} className="bg-brand hover:bg-brand/90 text-white">
                Importa {state.rows.length} {state.rows.length === 1 ? 'compenso' : 'compensi'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ErrorList({ errors }: { errors: RowError[] }) {
  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 space-y-1">
      <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1.5">
        {errors.length} {errors.length === 1 ? 'riga con errore' : 'righe con errori'} (saltate):
      </p>
      {errors.map((e) => (
        <p key={e.rowIndex} className="text-xs text-amber-600 dark:text-amber-300/80">
          <span className="text-muted-foreground">Riga {e.rowIndex}</span>
          {e.collaboratore && <span className="text-muted-foreground"> · {e.collaboratore}</span>}
          {' — '}
          {e.reason}
        </p>
      ))}
    </div>
  );
}
