'use client';

import { useEffect, useState } from 'react';
import { Download, History, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { ImportRunWithUrl, ImportTipo } from '@/lib/import-history-utils';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const dd  = String(d.getDate()).padStart(2, '0');
  const mm  = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh  = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function formatDuration(ms: number | null): string {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

interface Props {
  tipo: ImportTipo;
}

export default function ImportHistoryTab({ tipo }: Props) {
  const [runs, setRuns]     = useState<ImportRunWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/import/history?tipo=${tipo}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setRuns(d.runs ?? []);
      })
      .catch(() => setError('Impossibile caricare lo storico'))
      .finally(() => setLoading(false));
  }, [tipo]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (runs.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Nessun import eseguito"
        description="Gli import futuri appariranno qui con il relativo file XLS scaricabile."
      />
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => (
        <div
          key={run.id}
          className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 gap-4"
        >
          <div className="space-y-0.5 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {formatDateTime(run.created_at)}
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 dark:text-green-400">{run.imported} importati</span>
              {run.skipped > 0 && <span className="ml-2 text-muted-foreground">{run.skipped} saltati</span>}
              {run.errors  > 0 && <span className="ml-2 text-destructive">{run.errors} errori</span>}
              {run.duration_ms != null && (
                <span className="ml-2 text-muted-foreground">· {formatDuration(run.duration_ms)}</span>
              )}
            </p>
          </div>

          {run.download_url ? (
            <Button variant="outline" size="sm" asChild>
              <a href={run.download_url} download aria-label="Scarica XLS">
                <Download className="h-4 w-4 mr-1.5" />
                Scarica XLS
              </a>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground shrink-0">File non disponibile</span>
          )}
        </div>
      ))}
    </div>
  );
}
