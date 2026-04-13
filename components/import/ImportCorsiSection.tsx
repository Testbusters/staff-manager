'use client';

import { useState } from 'react';
import {
  ExternalLink, CheckCircle2, XCircle, MinusCircle, Loader2, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import type { ImportResult, TabOutcome } from '@/lib/corsi-import-sheet';

const SHEET_URL = `https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_IMPORT_CORSI_SHEET_ID ?? '1UC8LXU430ks0CXWnjmzI2SDlWFYYcf8eKbVb6wHFwAk'}/edit`;

// ── Source card (idle) ────────────────────────────────────────────────────────

function SourceCard({
  notify, onNotifyChange, onRun, loading,
}: {
  notify: boolean;
  onNotifyChange: (v: boolean) => void;
  onRun: () => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground mb-0.5">Sorgente configurata</p>
        <p className="text-xs text-muted-foreground">
          Ogni tab del foglio rappresenta un corso (col A-E lezioni, col G-H metadati). Solo i tab marcati TO_PROCESS vengono importati.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Foglio Google</span>
          <a
            href={SHEET_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-link hover:text-link/80"
          >
            Apri foglio Corsi
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
        <div>
          <p className="text-sm font-medium text-foreground">Notifica collaboratori</p>
          <p className="text-xs text-muted-foreground">
            Invia email E17 ai collaboratori della città del corso (uno per corso creato).
          </p>
        </div>
        <Switch
          checked={notify}
          onCheckedChange={onNotifyChange}
          disabled={loading}
          aria-label="Notifica collaboratori"
        />
      </div>

      <Button
        onClick={onRun}
        disabled={loading}
        className="w-full bg-brand hover:bg-brand/90 text-white"
      >
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {loading ? 'Import in corso…' : 'Esegui import'}
      </Button>
    </div>
  );
}

// ── Stats strip ───────────────────────────────────────────────────────────────

function StatsStrip({ total, processed, errors, skipped }: {
  total: number; processed: number; errors: number; skipped: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: 'Totale',     value: total,     cls: 'text-foreground' },
        { label: 'Importati',  value: processed, cls: 'text-emerald-400' },
        { label: 'Saltati',    value: skipped,   cls: 'text-muted-foreground' },
        { label: 'Errori',     value: errors,    cls: 'text-destructive' },
      ].map(({ label, value, cls }) => (
        <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
          <p className={`text-xl font-bold ${cls}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TabOutcome['status'] }) {
  if (status === 'PROCESSED') {
    return (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Importato
      </Badge>
    );
  }
  if (status === 'ERROR') {
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
        <XCircle className="h-3 w-3 mr-1" />
        Errore
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
      <MinusCircle className="h-3 w-3 mr-1" />
      Saltato
    </Badge>
  );
}

// ── Result panel ──────────────────────────────────────────────────────────────

function RunResultPanel({ result, onReset }: { result: ImportResult; onReset: () => void }) {
  const { results, summary } = result;
  const total = summary.processed + summary.errorCount + summary.skipped;

  return (
    <div className="space-y-4">
      <StatsStrip
        total={total}
        processed={summary.processed}
        errors={summary.errorCount}
        skipped={summary.skipped}
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table className="w-auto">
          <TableHeader>
            <TableRow>
              <TableHead>Tab</TableHead>
              <TableHead>Codice</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Dettagli</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                  Nessun tab elaborato.
                </TableCell>
              </TableRow>
            ) : (
              results.map((r) => (
                <TableRow key={r.tabName}>
                  <TableCell className="font-mono text-xs">{r.tabName}</TableCell>
                  <TableCell className="font-mono text-xs">{r.codice_identificativo ?? '—'}</TableCell>
                  <TableCell className="text-sm">{r.nome ?? '—'}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-md">
                    {r.error ?? (r.status === 'PROCESSED' ? 'OK' : '—')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onReset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Nuovo import
        </Button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ImportCorsiSection() {
  const [notify, setNotify] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleRun() {
    setRunning(true);
    const toastId = toast.loading('Import corsi in corso…');
    try {
      const res = await fetch('/api/admin/import-corsi/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notify }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? 'Errore durante l\'import');
      }
      setResult(data as ImportResult);
      const summary = (data as ImportResult).summary;
      if (summary.errorCount > 0) {
        toast.error(
          `Import completato con ${summary.errorCount} errori (${summary.processed} importati, ${summary.skipped} saltati)`,
          { id: toastId },
        );
      } else {
        toast.success(
          `Import completato: ${summary.processed} corsi importati, ${summary.skipped} saltati`,
          { id: toastId },
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore sconosciuto';
      toast.error(message, { id: toastId });
    } finally {
      setRunning(false);
    }
  }

  function handleReset() {
    setResult(null);
  }

  return (
    <div className="space-y-6">
      {!result ? (
        <SourceCard
          notify={notify}
          onNotifyChange={setNotify}
          onRun={handleRun}
          loading={running}
        />
      ) : (
        <RunResultPanel result={result} onReset={handleReset} />
      )}
    </div>
  );
}
