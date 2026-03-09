'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, History, Table2 } from 'lucide-react';
import type { ExportCollaboratorRow, ExportRunWithUrl } from '@/lib/export-utils';
import ExportPreviewTable from './ExportTable';
import ExportHistoryTab from './ExportHistoryTab';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Tab = 'anteprima' | 'storico';

interface Props {
  rows: ExportCollaboratorRow[];
  runs: ExportRunWithUrl[];
}

export default function ExportSection({ rows, runs }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('anteprima');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/export/gsheet', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Errore durante l\'export.', { duration: 5000 });
        return;
      }
      toast.success(`Export completato: ${data.collaborator_count} collaboratori, ${data.item_count} voci.`);
      router.refresh();
    } catch {
      toast.error('Errore di rete. Riprova.', { duration: 5000 });
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

      {/* Tab content */}
      {tab === 'anteprima' ? (
        <ExportPreviewTable rows={rows} />
      ) : (
        <ExportHistoryTab runs={runs} />
      )}
    </div>
  );
}
