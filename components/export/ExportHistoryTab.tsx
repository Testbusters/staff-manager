'use client';

import { Download, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { ExportRunWithUrl } from '@/lib/export-utils';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

interface Props {
  runs: ExportRunWithUrl[];
}

export default function ExportHistoryTab({ runs }: Props) {
  if (runs.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Nessun export eseguito"
        description="Gli export futuri appariranno qui con il relativo file XLS scaricabile."
      />
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => (
        <div
          key={run.id}
          className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
        >
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              {formatDateTime(run.exported_at)}
            </p>
            <p className="text-xs text-muted-foreground">
              {run.collaborator_count} collaboratori ·{' '}
              {run.compensation_count + run.expense_count} voci
            </p>
          </div>

          {run.download_url ? (
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={run.download_url} download aria-label="Scarica XLS">
                <Download className="h-4 w-4 mr-1.5" />
                Scarica XLS
              </a>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">File non disponibile</span>
          )}
        </div>
      ))}
    </div>
  );
}
