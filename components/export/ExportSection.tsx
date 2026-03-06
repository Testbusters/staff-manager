'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, History, Table2 } from 'lucide-react';
import type { ExportCollaboratorRow, ExportRunWithUrl } from '@/lib/export-utils';
import ExportPreviewTable from './ExportTable';
import ExportHistoryTab from './ExportHistoryTab';
import { Button } from '@/components/ui/button';

type Tab = 'anteprima' | 'storico';

interface Props {
  rows: ExportCollaboratorRow[];
  runs: ExportRunWithUrl[];
}

export default function ExportSection({ rows, runs }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('anteprima');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/export/gsheet', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setExportError(data.error ?? 'Errore durante l\'export');
        return;
      }
      setSuccessMsg(
        `Export completato: ${data.collaborator_count} collaboratori, ${data.item_count} voci.`,
      );
      router.refresh();
    } catch {
      setExportError('Errore di rete. Riprova.');
    } finally {
      setExporting(false);
    }
  };

  const tabCls = (t: Tab) =>
    `flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
      tab === t
        ? 'bg-brand text-white'
        : 'bg-muted text-muted-foreground hover:bg-accent'
    }`;

  return (
    <div className="space-y-6">
      {/* Tab bar + export CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            className={tabCls('anteprima')}
            onClick={() => setTab('anteprima')}
          >
            <Table2 className="h-4 w-4" />
            Anteprima
          </button>
          <button
            type="button"
            className={tabCls('storico')}
            onClick={() => setTab('storico')}
          >
            <History className="h-4 w-4" />
            Storico
          </button>
        </div>

        {tab === 'anteprima' && (
          <Button
            onClick={handleExport}
            disabled={exporting || rows.length === 0}
            className="bg-brand hover:bg-brand/90 text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            {exporting ? 'Esportazione…' : 'Esporta su Google Sheets'}
          </Button>
        )}
      </div>

      {/* Feedback messages */}
      {exportError && (
        <p className="text-sm text-red-600 dark:text-red-400">{exportError}</p>
      )}
      {successMsg && (
        <p className="text-sm text-green-600 dark:text-green-400">{successMsg}</p>
      )}

      {/* Tab content */}
      {tab === 'anteprima' ? (
        <ExportPreviewTable rows={rows} />
      ) : (
        <ExportHistoryTab runs={runs} />
      )}
    </div>
  );
}
