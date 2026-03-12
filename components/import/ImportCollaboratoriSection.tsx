'use client';

import { useState } from 'react';
import { ExternalLink, AlertTriangle, Info, CheckCircle2, XCircle, Loader2, SkipForward } from 'lucide-react';
import ImportHistoryTab from './ImportHistoryTab';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import type { PreviewResponse, PreviewRow } from '@/app/api/import/collaboratori/preview/route';
import type { RunResult } from '@/app/api/import/collaboratori/run/route';

const SHEET_URL = `https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_IMPORT_COLLABORATORI_SHEET_ID ?? '1NeVxbfQAl0z4OPAyihHISUfF7Edj1aNZ9tCwwXgMBz0'}/edit`;

// ── Rules infobox (inline) ─────────────────────────────────────────────────────

function ImportRulesPanel() {
  return (
    <aside className="rounded-xl border border-border bg-card p-4 space-y-4 text-sm sticky top-6">
      <p className="font-medium text-foreground flex items-center gap-2">
        <Info className="h-4 w-4 text-brand shrink-0" />
        Regole di importazione
      </p>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-foreground">Requisiti foglio Google:</p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li className="flex items-start gap-1.5">
            <span className="text-brand mt-0.5 shrink-0">•</span>
            Tab: <code className="bg-muted px-1 py-0.5 rounded ml-1">import_collaboratori_tb</code>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-brand mt-0.5 shrink-0">•</span>
            <span><strong>A</strong> nome · <strong>B</strong> cognome · <strong>C</strong> email · <strong>D</strong> username</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-brand mt-0.5 shrink-0">•</span>
            <span><strong>E</strong> stato (scritto dall&apos;import) · <strong>F</strong> community · <strong>G</strong> data_ingresso · <strong>H</strong> data_fine_contratto</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-brand mt-0.5 shrink-0">•</span>
            <span><strong>I</strong> password (scritto dall&apos;import) · <strong>J</strong> note_errore</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-brand mt-0.5 shrink-0">•</span>
            Community F: <code className="bg-muted px-1 py-0.5 rounded">testbusters</code> o <code className="bg-muted px-1 py-0.5 rounded">peer4med</code>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-brand mt-0.5 shrink-0">•</span>
            Data ingresso G: formato <code className="bg-muted px-1 py-0.5 rounded">YYYY-MM-DD</code>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-brand mt-0.5 shrink-0">•</span>
            Email: formato valido e non già registrata
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-brand mt-0.5 shrink-0">•</span>
            Username: a-z, 0–9,{' '}
            <code className="bg-muted px-1 py-0.5 rounded">_</code>
            , 3–50 caratteri, non in uso
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-brand mt-0.5 shrink-0">•</span>
            Nessun duplicato email/username nel foglio
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-brand mt-0.5 shrink-0">•</span>
            Max 1000 righe per sessione
          </li>
        </ul>
      </div>

    </aside>
  );
}

// ── Confirmation modal ────────────────────────────────────────────────────────

function ConfirmImportModal({
  open,
  validCount,
  generateContract,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  validCount: number;
  generateContract: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Conferma importazione</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1 text-sm">
          <p className="text-muted-foreground">
            Stai per creare{' '}
            <span className="text-foreground font-medium">{validCount} account</span>.{' '}
            L&apos;operazione non può essere annullata.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg border border-border bg-muted/40 px-3 py-2">
            <span className="text-foreground font-medium">Contratto:</span>
            {generateContract ? (
              <span className="text-emerald-400">Sì — verrà richiesta la firma durante l&apos;onboarding</span>
            ) : (
              <span>No — onboarding senza contratto</span>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Annulla
            </Button>
            <Button
              className="bg-brand hover:bg-brand/90 text-white"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Importazione in corso…' : `Importa ${validCount} collaboratori`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Preview table ─────────────────────────────────────────────────────────────

function PreviewTable({ rows }: { rows: PreviewRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="w-full rounded-xl border border-border overflow-x-auto">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">#</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Cognome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Community</TableHead>
            <TableHead>Data ingresso</TableHead>
            <TableHead>Fine contratto</TableHead>
            <TableHead>Stato</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const hasErrors = r.errors.length > 0;
            return (
              <TableRow key={r.rowIndex} className={hasErrors ? 'bg-destructive/5' : ''}>
                <TableCell className="text-muted-foreground text-xs">{r.rowIndex}</TableCell>
                <TableCell>{r.nome || <span className="text-destructive text-xs">—</span>}</TableCell>
                <TableCell>{r.cognome || <span className="text-destructive text-xs">—</span>}</TableCell>
                <TableCell className="font-mono text-xs">{r.email || <span className="text-destructive text-xs">—</span>}</TableCell>
                <TableCell className="font-mono text-xs">{r.username || <span className="text-destructive text-xs">—</span>}</TableCell>
                <TableCell className="text-xs">{r.community || <span className="text-destructive text-xs">—</span>}</TableCell>
                <TableCell className="font-mono text-xs">{r.data_ingresso || <span className="text-destructive text-xs">—</span>}</TableCell>
                <TableCell className="font-mono text-xs">{r.data_fine_contratto || <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                <TableCell>
                  {hasErrors ? (
                    <div className="space-y-0.5">
                      {r.errors.map((e, i) => (
                        <p key={i} className="text-xs text-destructive flex items-center gap-1">
                          <XCircle className="h-3 w-3 shrink-0" />{e}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/25 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Valido
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Run result summary ────────────────────────────────────────────────────────

function RunResultPanel({ result }: { result: RunResult }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Importati',  value: result.imported, color: 'text-emerald-400' },
          { label: 'Saltati',    value: result.skipped,  color: 'text-muted-foreground' },
          { label: 'Errori',     value: result.errors,   color: 'text-destructive' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {result.errors > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
          <p className="text-sm font-medium text-destructive">Righe con errore:</p>
          {result.details.filter(d => d.status === 'error').map(d => (
            <p key={d.rowIndex} className="text-xs text-muted-foreground">
              Riga {d.rowIndex} — {d.email}: {d.message}
            </p>
          ))}
        </div>
      )}

      {result.imported > 0 && (
        <div className="flex gap-3 rounded-lg border border-border bg-muted/50 p-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Le password temporanee sono disponibili nella{' '}
            <strong className="text-foreground">colonna H</strong> del{' '}
            <a href={SHEET_URL} target="_blank" rel="noreferrer" className="text-link hover:text-link/80 underline-offset-4 underline">
              foglio Google
            </a>.
            Un&apos;email di invito è stata inviata a ciascun collaboratore.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Tab toggle ────────────────────────────────────────────────────────────────

function TabToggle({ tab, onChange }: { tab: 'importa' | 'storico'; onChange: (t: 'importa' | 'storico') => void }) {
  const cls = (id: 'importa' | 'storico') =>
    `px-4 py-1.5 rounded-lg text-sm font-medium transition ${
      tab === id ? 'bg-brand text-white' : 'bg-muted text-muted-foreground hover:bg-accent'
    }`;
  return (
    <div className="flex gap-2">
      <button type="button" className={cls('importa')} onClick={() => onChange('importa')}>Importa</button>
      <button type="button" className={cls('storico')} onClick={() => onChange('storico')}>Storico</button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ImportCollaboratoriSection() {
  const [tab, setTab]                       = useState<'importa' | 'storico'>('importa');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview]               = useState<PreviewResponse | null>(null);
  const [modalOpen, setModalOpen]           = useState(false);
  const [runLoading, setRunLoading]         = useState(false);
  const [runResult, setRunResult]           = useState<RunResult | null>(null);
  const [generateContract, setGenerateContract] = useState(false);

  const canImport = preview !== null && preview.validCount > 0 && preview.errorCount === 0;

  const handleLoadPreview = async () => {
    setPreviewLoading(true);
    setPreview(null);
    setRunResult(null);

    const res  = await fetch('/api/import/collaboratori/preview', { method: 'POST' });
    const data = await res.json();
    setPreviewLoading(false);

    if (!res.ok) {
      toast.error(data.error ?? 'Errore caricamento anteprima.', { duration: 6000 });
      return;
    }
    setPreview(data as PreviewResponse);
  };

  const handleRunImport = async () => {
    setRunLoading(true);
    const res  = await fetch('/api/import/collaboratori/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skipContract: !generateContract }),
    });
    const data = await res.json();
    setRunLoading(false);
    setModalOpen(false);

    if (!res.ok) {
      toast.error(data.error ?? 'Errore durante l\'import.', { duration: 6000 });
      return;
    }

    const result = data as RunResult;
    setRunResult(result);
    setPreview(null);

    if (result.errors === 0) {
      toast.success(`Import completato: ${result.imported} collaboratori creati.`);
    } else {
      toast.error(`Import completato con ${result.errors} errori. Controlla i dettagli.`, { duration: 6000 });
    }
  };

  // ── Storico tab (idle only) ──────────────────────────────────────────────────
  if (tab === 'storico' && !preview && !runResult) {
    return (
      <div className="space-y-4">
        <TabToggle tab={tab} onChange={setTab} />
        <ImportHistoryTab tipo="collaboratori" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!preview && !runResult && <TabToggle tab={tab} onChange={setTab} />}
      {/* Sheet link card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">Foglio Google di importazione</p>
          <p className="text-xs text-muted-foreground">
            Tab richiesto: <code className="bg-muted px-1 py-0.5 rounded text-xs">import_collaboratori_tb</code>
            {' · '}Colonne A–I (vedi regole)
          </p>
        </div>
        <a
          href={SHEET_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-link hover:text-link/80 shrink-0"
        >
          <ExternalLink className="h-4 w-4" />
          Apri foglio
        </a>
      </div>

      {/* Two-column layout: left = actions + preview/result, right = rules infobox */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start">

        {/* Left column */}
        <div className="min-w-0 space-y-4">
          {/* Contract toggle */}
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/40">
            <Checkbox
              id="genera-contratto"
              checked={generateContract}
              onCheckedChange={(v) => setGenerateContract(v === true)}
            />
            <label htmlFor="genera-contratto" className="cursor-pointer space-y-0.5">
              <span className="text-sm font-medium text-foreground">Genera contratto e richiedi firma</span>
              <span className="text-xs text-muted-foreground block">
                Se disabilitato, i collaboratori non riceveranno un contratto da firmare durante l&apos;onboarding
              </span>
            </label>
          </div>

          {/* Actions bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleLoadPreview}
              disabled={previewLoading}
              className="bg-brand hover:bg-brand/90 text-white"
            >
              {previewLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {previewLoading ? 'Caricamento…' : 'Carica anteprima'}
            </Button>

            {preview && !runResult && (
              <Button
                onClick={() => setModalOpen(true)}
                disabled={!canImport || runLoading}
                title={!canImport && preview.errorCount > 0 ? 'Correggi gli errori prima di importare.' : undefined}
                variant="outline"
              >
                Importa collaboratori
              </Button>
            )}

            {preview && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="text-emerald-400 font-medium">{preview.validCount} validi</span>
                {preview.errorCount > 0 && <span className="text-destructive font-medium">{preview.errorCount} errori</span>}
              </div>
            )}
          </div>

          {/* Preview table */}
          {preview && !runResult && (
            preview.rows.length === 0
              ? <EmptyState icon={Info} title="Nessuna riga nel foglio" description="Aggiungi collaboratori nel foglio Google e ricarica l'anteprima." />
              : <PreviewTable rows={preview.rows} />
          )}

          {/* Run result */}
          {runResult && <RunResultPanel result={runResult} />}
        </div>

        {/* Right column: rules infobox (always visible) */}
        <ImportRulesPanel />
      </div>

      {/* Confirmation modal */}
      <ConfirmImportModal
        open={modalOpen}
        validCount={preview?.validCount ?? 0}
        generateContract={generateContract}
        onConfirm={handleRunImport}
        onCancel={() => setModalOpen(false)}
        loading={runLoading}
      />
    </div>
  );
}
