'use client';

import { useState } from 'react';
import {
  ExternalLink, AlertTriangle, CheckCircle2, XCircle,
  Loader2, RefreshCw,
} from 'lucide-react';
import ImportHistoryTab from './ImportHistoryTab';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import type { ContrattoPreviewResponse, ContrattoPreviewRow } from '@/app/api/import/contratti/preview/route';
import type { ContrattoRunResult } from '@/app/api/import/contratti/run/route';

const SHEET_URL  = `https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_CONTRATTI_SHEET_ID ?? ''}/edit`;
const DRIVE_URL  = `https://drive.google.com/drive/folders/${process.env.NEXT_PUBLIC_CONTRATTI_DRIVE_FOLDER_ID ?? ''}`;
const PAGE_SIZE  = 50;

type FilterType = 'all' | 'valid' | 'warning' | 'error';

// ── Source card (idle) ────────────────────────────────────────────────────────

function SourceCard({ onPreview, loading }: { onPreview: () => void; loading: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground mb-0.5">Sorgente configurata</p>
        <p className="text-xs text-muted-foreground">
          Legge i contratti firmati dal foglio Google e scarica i PDF dalla cartella Drive condivisa.
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
            Tab contratti · Colonne A–F
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Cartella Drive</span>
          <a
            href={DRIVE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-link hover:text-link/80"
          >
            Contratti firmati
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-3">
        <p className="font-medium text-foreground">Come funziona</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Legge le righe del foglio non ancora elaborate</li>
          <li>Verifica la presenza del file PDF nella cartella Drive</li>
          <li>Mostra anteprima con eventuali errori o avvisi</li>
          <li>Importa i contratti validi come documenti FIRMATO</li>
        </ol>
      </div>

      <Button
        onClick={onPreview}
        disabled={loading}
        className="w-full bg-brand hover:bg-brand/90 text-white"
      >
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {loading ? 'Caricamento anteprima…' : 'Avvia analisi'}
      </Button>
    </div>
  );
}

// ── Stats strip ───────────────────────────────────────────────────────────────

function StatsStrip({ total, valid, warning, error }: {
  total: number; valid: number; warning: number; error: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: 'Totale',       value: total,   cls: 'text-foreground' },
        { label: 'Importabili',  value: valid,   cls: 'text-emerald-400' },
        { label: 'Già presenti', value: warning, cls: 'text-amber-400' },
        { label: 'Errori',       value: error,   cls: 'text-destructive' },
      ].map(({ label, value, cls }) => (
        <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
          <p className={`text-xl font-bold ${cls}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Blocking banner ───────────────────────────────────────────────────────────

function BlockingBanner({ usernames }: { usernames: string[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm font-medium text-destructive">
            {usernames.length} username non trovat{usernames.length === 1 ? 'o' : 'i'} nel sistema — importazione bloccata
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="text-xs text-destructive/70 hover:text-destructive shrink-0"
        >
          {expanded ? 'Nascondi' : 'Mostra'}
        </button>
      </div>
      {expanded && (
        <ul className="space-y-0.5 pl-6">
          {usernames.map(u => (
            <li key={u} className="text-xs text-destructive font-mono">{u}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Filter tabs ───────────────────────────────────────────────────────────────

function FilterTabs({ filter, onChange, counts }: {
  filter:   FilterType;
  onChange: (f: FilterType) => void;
  counts:   Record<FilterType, number>;
}) {
  const tabs: { id: FilterType; label: string }[] = [
    { id: 'all',     label: `Tutti (${counts.all})` },
    { id: 'valid',   label: `Importabili (${counts.valid})` },
    { id: 'warning', label: `Già presenti (${counts.warning})` },
    { id: 'error',   label: `Errori (${counts.error})` },
  ];
  return (
    <div className="flex gap-1.5 flex-wrap">
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            filter === t.id ? 'bg-brand text-white' : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Row status badge ──────────────────────────────────────────────────────────

function RowBadge({ row }: { row: ContrattoPreviewRow }) {
  if (row.stato === 'valid') {
    return (
      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/25 gap-1">
        <CheckCircle2 className="h-3 w-3" /> Valido
      </Badge>
    );
  }
  if (row.stato === 'warning') {
    return (
      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/25 gap-1">
        <AlertTriangle className="h-3 w-3" /> Già presente
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/25 gap-1">
      <XCircle className="h-3 w-3" /> Errore
    </Badge>
  );
}

// ── Preview table ─────────────────────────────────────────────────────────────

function PreviewTable({ rows }: { rows: ContrattoPreviewRow[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows   = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border overflow-hidden">
        <Table className="w-auto">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>File PDF</TableHead>
              <TableHead className="w-16">Anno</TableHead>
              <TableHead className="w-28">Stato</TableHead>
              <TableHead>Dettaglio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map(r => (
              <TableRow key={r.rowIndex} className={r.stato === 'error' ? 'bg-destructive/5' : ''}>
                <TableCell className="text-muted-foreground text-xs">{r.rowIndex}</TableCell>
                <TableCell className="font-mono text-xs">
                  {r.username || <span className="text-destructive">—</span>}
                </TableCell>
                <TableCell className="font-mono text-xs max-w-[240px] truncate" title={r.nome_pdf}>
                  {r.nome_pdf || <span className="text-destructive">—</span>}
                </TableCell>
                <TableCell className="text-xs">
                  {r.anno ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell><RowBadge row={r} /></TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    {r.errors.map((e, i) => (
                      <p key={i} className="text-xs text-destructive">{e}</p>
                    ))}
                    {r.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-400">{w}</p>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Pagina {page} di {totalPages}</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Pagina precedente"
              className="rounded px-2 py-1 bg-muted hover:bg-muted/80 disabled:opacity-50"
            >‹</button>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Pagina successiva"
              className="rounded px-2 py-1 bg-muted hover:bg-muted/80 disabled:opacity-50"
            >›</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Confirm modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ open, count, loading, onConfirm, onCancel }: {
  open:      boolean;
  count:     number;
  loading:   boolean;
  onConfirm: () => void;
  onCancel:  () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Conferma importazione contratti</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1 text-sm">
          <p className="text-muted-foreground">
            Stai per importare{' '}
            <span className="font-medium text-foreground">{count} contratt{count === 1 ? 'o' : 'i'}</span>.{' '}
            I PDF verranno scaricati da Drive e salvati in Storage come documenti FIRMATO.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Annulla
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="bg-brand hover:bg-brand/90 text-white"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Import in corso…' : `Importa ${count} contratt${count === 1 ? 'o' : 'i'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Run result panel ──────────────────────────────────────────────────────────

function RunResultPanel({ result, onReset }: { result: ContrattoRunResult; onReset: () => void }) {
  const [errorsExpanded, setErrorsExpanded] = useState(false);
  const errorDetails = result.details.filter(d => d.status === 'error');
  const total        = result.imported + result.skipped + result.errors;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Importati', value: result.imported, cls: 'text-emerald-400' },
          { label: 'Saltati',   value: result.skipped,  cls: 'text-muted-foreground' },
          { label: 'Errori',    value: result.errors,   cls: 'text-destructive' },
          { label: 'Totale',    value: total,            cls: 'text-foreground' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${cls}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {errorDetails.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-destructive">
              Righe con errore ({errorDetails.length})
            </p>
            <button
              type="button"
              onClick={() => setErrorsExpanded(v => !v)}
              className="text-xs text-destructive/70 hover:text-destructive"
            >
              {errorsExpanded ? 'Nascondi' : 'Mostra'}
            </button>
          </div>
          {errorsExpanded && (
            <div className="space-y-0.5">
              {errorDetails.map(d => (
                <p key={d.rowIndex} className="text-xs text-muted-foreground font-mono">
                  Riga {d.rowIndex} — {d.username} / {d.nome_pdf}: {d.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <Button variant="outline" onClick={onReset} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Nuovo import
      </Button>
    </div>
  );
}

// ── Tab toggle ────────────────────────────────────────────────────────────────

function TabToggle({ tab, onChange }: { tab: 'importa' | 'storico'; onChange: (t: 'importa' | 'storico') => void }) {
  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => onChange('importa')} className={`text-sm font-medium ${tab === 'importa' ? 'bg-brand hover:bg-brand/90 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/60'}`}>Importa</Button>
      <Button size="sm" onClick={() => onChange('storico')} className={`text-sm font-medium ${tab === 'storico' ? 'bg-brand hover:bg-brand/90 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/60'}`}>Storico</Button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ImportContrattiSection() {
  const [tab, setTab]                       = useState<'importa' | 'storico'>('importa');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview]               = useState<ContrattoPreviewResponse | null>(null);
  const [filter, setFilter]                 = useState<FilterType>('all');
  const [modalOpen, setModalOpen]           = useState(false);
  const [runLoading, setRunLoading]         = useState(false);
  const [runResult, setRunResult]           = useState<ContrattoRunResult | null>(null);

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreview(null);
    setRunResult(null);
    setFilter('all');

    const res  = await fetch('/api/import/contratti/preview', { method: 'POST' });
    const data = await res.json();
    setPreviewLoading(false);

    if (!res.ok) {
      toast.error(data.error ?? 'Errore caricamento anteprima.', { duration: 6000 });
      return;
    }
    setPreview(data as ContrattoPreviewResponse);
  };

  const handleRun = async () => {
    setRunLoading(true);
    const tid = toast.loading('Importazione contratti in corso…');

    const res  = await fetch('/api/import/contratti/run', { method: 'POST' });
    const data = await res.json();
    setRunLoading(false);
    setModalOpen(false);
    toast.dismiss(tid);

    if (!res.ok) {
      toast.error(data.error ?? "Errore durante l'import.", { duration: 6000 });
      return;
    }

    const result = data as ContrattoRunResult;
    setRunResult(result);
    setPreview(null);

    if (result.errors === 0) {
      toast.success(`Import completato: ${result.imported} contratt${result.imported === 1 ? 'o' : 'i'} importat${result.imported === 1 ? 'o' : 'i'}.`);
    } else {
      toast.error(`Import completato con ${result.errors} error${result.errors === 1 ? 'e' : 'i'}.`, { duration: 8000 });
    }
  };

  const handleReset = () => {
    setRunResult(null);
    setPreview(null);
    setFilter('all');
  };

  // ── Idle / Loading ──────────────────────────────────────────────────────────
  if (!preview && !runResult) {
    return (
      <div className="space-y-4">
        <TabToggle tab={tab} onChange={setTab} />
        {tab === 'importa' ? (
          <div className="max-w-md">
            <SourceCard onPreview={handlePreview} loading={previewLoading} />
          </div>
        ) : (
          <ImportHistoryTab tipo="contratti" />
        )}
      </div>
    );
  }

  // ── Result ──────────────────────────────────────────────────────────────────
  if (runResult) {
    return <RunResultPanel result={runResult} onReset={handleReset} />;
  }

  // ── Preview ─────────────────────────────────────────────────────────────────
  const isBlocked  = (preview?.blockingUsernames.length ?? 0) > 0;
  const hasErrors  = (preview?.errorCount ?? 0) > 0;
  const validCount = preview?.validCount ?? 0;
  const canConfirm = !isBlocked && !hasErrors && validCount > 0;

  const counts: Record<FilterType, number> = {
    all:     preview?.totalCount  ?? 0,
    valid:   preview?.validCount  ?? 0,
    warning: preview?.warningCount ?? 0,
    error:   preview?.errorCount  ?? 0,
  };

  const filteredRows = (preview?.rows ?? []).filter(r => {
    if (filter === 'all')     return true;
    if (filter === 'valid')   return r.stato === 'valid';
    if (filter === 'warning') return r.stato === 'warning';
    if (filter === 'error')   return r.stato === 'error';
    return true;
  });

  return (
    <div className="space-y-4">
      <StatsStrip
        total={preview!.totalCount}
        valid={preview!.validCount}
        warning={preview!.warningCount}
        error={preview!.errorCount}
      />

      {isBlocked && <BlockingBanner usernames={preview!.blockingUsernames} />}

      <FilterTabs filter={filter} onChange={f => setFilter(f)} counts={counts} />

      {filteredRows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nessuna riga corrisponde al filtro selezionato.
        </p>
      ) : (
        <PreviewTable rows={filteredRows} />
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setPreview(null)}>
            ← Torna
          </Button>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <a href={SHEET_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-link hover:text-link/80">
              Foglio <ExternalLink className="h-3 w-3" />
            </a>
            <a href={DRIVE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-link hover:text-link/80">
              Drive <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          disabled={!canConfirm || runLoading}
          title={isBlocked ? 'Correggi gli username bloccanti prima di procedere.' : hasErrors ? 'Risolvi gli errori prima di procedere.' : undefined}
          className="bg-brand hover:bg-brand/90 text-white"
        >
          Conferma import ({validCount}) →
        </Button>
      </div>

      <ConfirmModal
        open={modalOpen}
        count={validCount}
        loading={runLoading}
        onConfirm={handleRun}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
}
