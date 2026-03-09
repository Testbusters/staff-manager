'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ReceiptPreviewItem } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Phase = 'loading' | 'preview' | 'generating' | 'done' | 'error';

function fmt(n: number) {
  return `€\u202f${n.toFixed(2).replace('.', ',')}`;
}

export default function ReceiptGenerationModal({ open, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [items, setItems] = useState<ReceiptPreviewItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [result, setResult] = useState<{ generated: number; errors: string[] } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhase('loading');
    setItems([]);
    setResult(null);
    setFetchError(null);

    fetch('/api/documents/receipts/preview')
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items ?? []);
        setPendingCount(data.pending_approvato_count ?? 0);
        setPhase('preview');
      })
      .catch(() => {
        setFetchError('Impossibile caricare il riepilogo.');
        setPhase('error');
      });
  }, [open]);

  async function handleConfirm() {
    setPhase('generating');
    try {
      const res = await fetch('/api/documents/generate-receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'bulk' }),
      });
      const data = await res.json();
      setResult({ generated: data.generated ?? 0, errors: data.errors ?? [] });
      setPhase('done');
    } catch {
      setFetchError('Errore durante la generazione delle ricevute.');
      setPhase('error');
    }
  }

  const totLordoCompensi = items.reduce((s, i) => s + i.lordo_compensi, 0);
  const totLordoRimborsi = items.reduce((s, i) => s + i.lordo_rimborsi, 0);
  const totLordo = items.reduce((s, i) => s + i.totale_lordo, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Genera ricevute di pagamento</DialogTitle>
        </DialogHeader>

        {phase === 'loading' && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Caricamento riepilogo…
          </div>
        )}

        {phase === 'preview' && (
          <div className="space-y-4">
            {pendingCount > 0 && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 px-4 py-3">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                  Attenzione: {pendingCount} voci ancora in stato Approvato non ancora liquidate
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  Queste voci non saranno incluse nelle ricevute. Considera di liquidarle prima di procedere.
                </p>
              </div>
            )}

            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nessun elemento da ricevutare. Tutti i compensi e rimborsi liquidati hanno già una ricevuta.
              </p>
            ) : (
              <>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Collaboratore</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Lordo</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Ritenuta</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Netto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.collaborator_id} className="border-t border-border">
                          <td className="px-3 py-2 text-foreground">{item.nome} {item.cognome}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-foreground">{fmt(item.totale_lordo)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(item.ritenuta)}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium text-foreground">{fmt(item.netto)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 border-t border-border">
                      <tr>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{items.length} collaboratori</td>
                        <td className="px-3 py-2 text-right tabular-nums text-sm font-semibold text-foreground">{fmt(totLordo)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-sm text-muted-foreground">
                          {fmt(totLordoCompensi * 0.2)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-sm font-semibold text-foreground">
                          {fmt(totLordo - totLordoCompensi * 0.2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  Lordo compensi: {fmt(totLordoCompensi)} · Lordo rimborsi: {fmt(totLordoRimborsi)}
                </p>
              </>
            )}
          </div>
        )}

        {phase === 'generating' && (
          <div className="py-8 text-center space-y-2">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generazione in corso…
            </div>
          </div>
        )}

        {phase === 'done' && result && (
          <div className="space-y-3">
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 px-4 py-3">
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                Ricevute generate: {result.generated}
              </p>
              {result.errors.length > 0 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Errori: {result.errors.length}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Le ricevute sono disponibili nella sezione Documenti di ogni collaboratore.
            </p>
          </div>
        )}

        {phase === 'error' && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {fetchError ?? 'Errore imprevisto.'}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {phase === 'done' ? 'Chiudi' : 'Annulla'}
          </Button>
          {phase === 'preview' && items.length > 0 && (
            <Button onClick={handleConfirm} className="bg-brand hover:bg-brand/90 text-white">
              Conferma e genera
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
