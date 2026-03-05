'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

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
    try {
      const res = await fetch('/api/compensations/import/preview', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setState({ phase: 'error', message: json.error ?? 'Errore durante la lettura del foglio.' });
        return;
      }
      setState({ phase: 'preview', rows: json.rows, errors: json.errors, total: json.total });
    } catch {
      setState({ phase: 'error', message: 'Errore di rete. Riprova.' });
    }
  }

  async function handleConfirm() {
    setState({ phase: 'confirming' });
    try {
      const res = await fetch('/api/compensations/import/confirm', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setState({ phase: 'error', message: json.error ?? 'Errore durante l\'importazione.' });
        return;
      }
      setState({ phase: 'done', imported: json.imported, skipped: json.skipped, errors: json.errors });
      startTransition(() => router.refresh());
    } catch {
      setState({ phase: 'error', message: 'Errore di rete. Riprova.' });
    }
  }

  function handleReset() {
    setState({ phase: 'idle' });
  }

  return (
    <div className="rounded-xl bg-card border border-border p-5 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">Importa da Google Sheet</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Legge le righe con stato <code className="text-muted-foreground">TO_PROCESS</code> e le importa come compensi IN_ATTESA.
          </p>
        </div>

        {state.phase === 'idle' && (
          <button
            onClick={handlePreview}
            className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-medium text-white transition"
          >
            Anteprima
          </button>
        )}
        {state.phase === 'loading' && (
          <span className="shrink-0 text-xs text-muted-foreground animate-pulse">Lettura foglio…</span>
        )}
        {state.phase === 'done' && (
          <button
            onClick={handleReset}
            className="shrink-0 rounded-lg bg-accent hover:bg-gray-600 px-3 py-1.5 text-xs font-medium text-foreground transition"
          >
            Nuova importazione
          </button>
        )}
        {state.phase === 'error' && (
          <button
            onClick={handleReset}
            className="shrink-0 rounded-lg bg-accent hover:bg-gray-600 px-3 py-1.5 text-xs font-medium text-foreground transition"
          >
            Riprova
          </button>
        )}
      </div>

      {/* Error state */}
      {state.phase === 'error' && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3">
          {state.message}
        </p>
      )}

      {/* Done state */}
      {state.phase === 'done' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-green-950/40 border border-green-800/50 px-4 py-3">
            <span className="text-sm text-green-300 font-medium">
              {state.imported} {state.imported === 1 ? 'compenso importato' : 'compensi importati'}
            </span>
            {state.skipped > 0 && (
              <span className="text-sm text-amber-400">
                · {state.skipped} {state.skipped === 1 ? 'riga saltata' : 'righe saltate'}
              </span>
            )}
          </div>
          {state.errors.length > 0 && <ErrorList errors={state.errors} />}
        </div>
      )}

      {/* Preview state */}
      {(state.phase === 'preview' || state.phase === 'confirming') && (
        <div className="space-y-4">
          {/* Summary line */}
          <p className="text-xs text-muted-foreground">
            {state.phase === 'preview'
              ? `${state.rows.length} righe valide · ${state.errors.length} con errori · ${state.total} totali in TO_PROCESS`
              : 'Importazione in corso…'}
          </p>

          {/* Error rows */}
          {state.phase === 'preview' && state.errors.length > 0 && (
            <ErrorList errors={state.errors} />
          )}

          {/* Valid rows table */}
          {state.phase === 'preview' && state.rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Riga</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Collaboratore</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Data</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Competenza</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nome servizio / Ruolo</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Lordo</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Netto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {state.rows.map((r) => (
                    <tr key={r.rowIndex} className="hover:bg-muted/30">
                      <td className="px-3 py-2 text-muted-foreground">{r.rowIndex}</td>
                      <td className="px-3 py-2 text-foreground">{r.collaboratore}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDate(r.data_competenza)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.competenza ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[180px] truncate">{r.nome_servizio_ruolo ?? '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground">{formatCurrency(r.importo_lordo)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground">{formatCurrency(r.importo_netto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* No valid rows */}
          {state.phase === 'preview' && state.rows.length === 0 && state.errors.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nessuna riga con stato TO_PROCESS trovata nel foglio.
            </p>
          )}

          {/* Action buttons */}
          {state.phase === 'preview' && (
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleReset}
                className="rounded-lg bg-muted hover:bg-accent px-4 py-2 text-sm font-medium text-muted-foreground transition"
              >
                Annulla
              </button>
              {state.rows.length > 0 && (
                <button
                  onClick={handleConfirm}
                  className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-medium text-white transition"
                >
                  Importa {state.rows.length} {state.rows.length === 1 ? 'compenso' : 'compensi'}
                </button>
              )}
            </div>
          )}

          {state.phase === 'confirming' && (
            <div className="flex justify-end">
              <span className="text-xs text-muted-foreground animate-pulse">Importazione in corso…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ErrorList({ errors }: { errors: RowError[] }) {
  return (
    <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-3 space-y-1">
      <p className="text-xs font-medium text-amber-400 mb-1.5">
        {errors.length} {errors.length === 1 ? 'riga con errore' : 'righe con errori'} (saltate):
      </p>
      {errors.map((e) => (
        <p key={e.rowIndex} className="text-xs text-amber-300/80">
          <span className="text-muted-foreground">Riga {e.rowIndex}</span>
          {e.collaboratore && <span className="text-muted-foreground"> · {e.collaboratore}</span>}
          {' — '}
          {e.reason}
        </p>
      ))}
    </div>
  );
}
