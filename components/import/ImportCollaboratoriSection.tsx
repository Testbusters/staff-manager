'use client';

import { useState } from 'react';
import { ExternalLink, AlertTriangle, Info, CheckCircle2, XCircle, Loader2, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import type { PreviewResponse, PreviewRow } from '@/app/api/import/collaboratori/preview/route';
import type { RunResult } from '@/app/api/import/collaboratori/run/route';

const SHEET_URL = `https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_IMPORT_COLLABORATORI_SHEET_ID ?? '1NeVxbfQAl0z4OPAyihHISUfF7Edj1aNZ9tCwwXgMBz0'}/edit`;

// ── Infobox modal ─────────────────────────────────────────────────────────────

function ImportRulesModal({
  open,
  validCount,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  validCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-brand" />
            Regole di importazione collaboratori
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1 text-sm">
          {/* Disclaimer principale */}
          <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-amber-200">
              <strong>Nessun contratto verrà generato.</strong> Gli utenti importati completano
              l&apos;onboarding autonomamente ma la firma del contratto non viene mai richiesta
              tramite questa procedura. I contratti devono essere caricati separatamente dal
              tab <strong>Contratti</strong> nella stessa sezione.
            </p>
          </div>

          {/* Regole */}
          <div className="space-y-2">
            <p className="font-medium text-foreground">Requisiti del foglio Google:</p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span>Tab denominato <code className="text-xs bg-muted px-1 py-0.5 rounded">import_collaboratori</code></li>
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span>Colonne in ordine: <code className="text-xs bg-muted px-1 py-0.5 rounded">nome · cognome · email · username · stato · note_errore</code></li>
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span>Tutti i campi obbligatori (nome, cognome, email, username) devono essere valorizzati</li>
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span>Email: formato valido e non già registrata nel sistema</li>
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span>Username: solo lettere minuscole, cifre e <code className="text-xs bg-muted px-1 py-0.5 rounded">_</code>, 3–50 caratteri, non già in uso</li>
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span>Nessun duplicato di email o username all&apos;interno dello stesso foglio</li>
              <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span>Massimo 1000 righe per sessione di import</li>
            </ul>
          </div>

          {/* Password note */}
          <div className="flex gap-3 rounded-lg border border-border bg-muted/50 p-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              Le password temporanee generate vengono scritte nella{' '}
              <strong className="text-foreground">colonna G</strong> del foglio Google al termine
              dell&apos;import. Comunicale ai collaboratori tramite il foglio.
            </p>
          </div>

          {/* Row count */}
          <p className="text-foreground font-medium">
            Righe valide da importare:{' '}
            <span className="text-brand">{validCount}</span>
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Annulla
            </Button>
            <Button
              className="bg-brand hover:bg-brand/90 text-white"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Importazione in corso…' : `Conferma e importa ${validCount} collaboratori`}
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
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">#</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Cognome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Stato</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const isImported = r.stato === 'IMPORTED';
            const hasErrors  = r.errors.length > 0;
            return (
              <TableRow key={r.rowIndex} className={hasErrors ? 'bg-destructive/5' : ''}>
                <TableCell className="text-muted-foreground text-xs">{r.rowIndex}</TableCell>
                <TableCell>{r.nome || <span className="text-destructive text-xs">—</span>}</TableCell>
                <TableCell>{r.cognome || <span className="text-destructive text-xs">—</span>}</TableCell>
                <TableCell className="font-mono text-xs">{r.email || <span className="text-destructive text-xs">—</span>}</TableCell>
                <TableCell className="font-mono text-xs">{r.username || <span className="text-destructive text-xs">—</span>}</TableCell>
                <TableCell>
                  {isImported ? (
                    <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border gap-1">
                      <SkipForward className="h-3 w-3" /> Già importato
                    </Badge>
                  ) : hasErrors ? (
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
            <strong className="text-foreground">colonna G</strong> del{' '}
            <a href={SHEET_URL} target="_blank" rel="noreferrer" className="text-link hover:text-link/80 underline-offset-4 underline">
              foglio Google
            </a>.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ImportCollaboratoriSection() {
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview]               = useState<PreviewResponse | null>(null);
  const [modalOpen, setModalOpen]           = useState(false);
  const [runLoading, setRunLoading]         = useState(false);
  const [runResult, setRunResult]           = useState<RunResult | null>(null);

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
    const res  = await fetch('/api/import/collaboratori/run', { method: 'POST' });
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

  return (
    <div className="space-y-5">
      {/* Sheet link + disclaimer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">Foglio Google di importazione</p>
          <p className="text-xs text-muted-foreground">
            Tab richiesto: <code className="bg-muted px-1 py-0.5 rounded text-xs">import_collaboratori</code>
            {' · '}Colonne A–D: nome, cognome, email, username
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

      {/* Disclaimer */}
      <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-200">
          <strong>Questa procedura non genera mai la richiesta di firma del contratto.</strong>{' '}
          Gli utenti importati completano l&apos;onboarding in autonomia. I contratti devono essere
          caricati tramite il tab <strong>Contratti</strong> nella stessa sezione.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
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
            {preview.alreadyImportedCount > 0 && <span>{preview.alreadyImportedCount} già importati</span>}
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

      {/* Confirmation modal */}
      <ImportRulesModal
        open={modalOpen}
        validCount={preview?.validCount ?? 0}
        onConfirm={handleRunImport}
        onCancel={() => setModalOpen(false)}
        loading={runLoading}
      />
    </div>
  );
}
