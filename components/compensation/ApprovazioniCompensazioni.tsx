'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import type { Compensation, CompensationStatus } from '@/lib/types';
import { COMPENSATION_STATUS_LABELS } from '@/lib/types';
import StatusBadge from './StatusBadge';
import ImportSection from './ImportSection';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type CompensationRow = Compensation & {
  collaborators?: { nome: string; cognome: string } | null;
};

type Kpi = {
  inAttesa: number;
  totaleLordoInAttesa: number;
  approvati: number;
  totaleLordoApprovati: number;
  liquidato: number;
  totaleLordoLiquidato: number;
};

const ALL_STATI: CompensationStatus[] = ['IN_ATTESA', 'APPROVATO', 'RIFIUTATO', 'LIQUIDATO'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

function KpiCard({ label, count, amount, countColor }: { label: string; count: number; amount: number; countColor: string }) {
  return (
    <Card>
      <CardContent className="px-4 py-4">
        <p className="text-xs text-muted-foreground mb-2">{label}</p>
        <p className={`text-2xl font-semibold tabular-nums ${countColor}`}>{count}</p>
        <p className="text-sm tabular-nums text-muted-foreground mt-0.5">{formatCurrency(amount)}</p>
      </CardContent>
    </Card>
  );
}


export default function ApprovazioniCompensazioni({
  compensations,
  kpi,
}: {
  compensations: CompensationRow[];
  kpi: Kpi;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterStato, setFilterStato] = useState<CompensationStatus | 'ALL'>('ALL');
  const [toDelete, setToDelete] = useState<CompensationRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = compensations
    .filter((c) => filterStato === 'ALL' || c.stato === filterStato)
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const name = `${c.collaborators?.nome ?? ''} ${c.collaborators?.cognome ?? ''}`.toLowerCase();
      return name.includes(q);
    });

  async function handleDelete() {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/compensations/${toDelete.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? 'Errore durante l\'eliminazione');
      } else {
        toast.success('Compenso eliminato');
        router.refresh();
      }
    } catch {
      toast.error('Errore di rete');
    } finally {
      setIsDeleting(false);
      setToDelete(null);
    }
  }

  const columns: ColumnDef<CompensationRow>[] = [
    {
      id: 'collaboratore',
      accessorFn: (row) => `${row.collaborators?.cognome ?? ''} ${row.collaborators?.nome ?? ''}`,
      header: 'Collaboratore',
      cell: ({ row }) => (
        <Link href={`/compensi/${row.original.id}`} className="block min-w-0 hover:no-underline">
          <p className="text-sm font-semibold text-foreground truncate">
            {row.original.collaborators
              ? `${row.original.collaborators.nome} ${row.original.collaborators.cognome}`
              : '—'}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{row.original.nome_servizio_ruolo ?? '—'}</p>
        </Link>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Data',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.created_at)}</span>,
    },
    {
      accessorKey: 'importo_lordo',
      header: 'Importo',
      cell: ({ row }) => <span className="text-sm font-medium tabular-nums">{formatCurrency(row.original.importo_lordo)}</span>,
    },
    {
      accessorKey: 'stato',
      header: 'Stato',
      cell: ({ row }) => <StatusBadge stato={row.original.stato} />,
    },
    {
      id: 'azioni',
      header: '',
      cell: ({ row }) =>
        row.original.stato === 'IN_ATTESA' ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Elimina compenso"
            className="text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.preventDefault(); setToDelete(row.original); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null,
    },
  ];

  const deleteName = toDelete?.collaborators
    ? `${toDelete.collaborators.nome} ${toDelete.collaborators.cognome}`
    : 'questo collaboratore';

  return (
    <>
    <AlertDialog open={!!toDelete} onOpenChange={(open) => { if (!open) setToDelete(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Elimina compenso</AlertDialogTitle>
          <AlertDialogDescription>
            Stai per eliminare il compenso di <strong>{deleteName}</strong>
            {toDelete?.nome_servizio_ruolo ? ` — ${toDelete.nome_servizio_ruolo}` : ''}.
            Questa operazione è irreversibile.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90 text-white"
          >
            {isDeleting ? 'Eliminazione...' : 'Elimina'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <div className="space-y-6">
      {/* KPI cards — 3 unified cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="In attesa" count={kpi.inAttesa} amount={kpi.totaleLordoInAttesa} countColor="text-brand dark:text-brand" />
        <KpiCard label="Approvati" count={kpi.approvati} amount={kpi.totaleLordoApprovati} countColor="text-amber-600 dark:text-amber-400" />
        <KpiCard label="Liquidati" count={kpi.liquidato} amount={kpi.totaleLordoLiquidato} countColor="text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* Creation modes — two stacked peer cards */}
      <div className="space-y-3">
        <Card>
          <CardContent className="px-4 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Inserimento manuale</p>
              <p className="text-xs text-muted-foreground mt-0.5">Crea un compenso per un singolo collaboratore.</p>
            </div>
            <Link
              href="/approvazioni/carica"
              className="shrink-0 rounded-lg bg-brand hover:bg-brand/90 px-3 py-1.5 text-xs font-medium text-white transition"
            >
              + Inserimento manuale
            </Link>
          </CardContent>
        </Card>
        <ImportSection />
      </div>

      {/* List header */}
      <div className="flex items-center gap-4 mt-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Compensi{filtered.length !== compensations.length ? ` (${filtered.length} di ${compensations.length})` : ` (${compensations.length})`}
        </h2>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); }}
        placeholder="Cerca per nome o cognome..."
        className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
      />

      {/* Filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
        {(['ALL', ...ALL_STATI] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStato(s)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
              filterStato === s
                ? 'bg-brand text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {s === 'ALL' ? 'Tutti' : COMPENSATION_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <EmptyState icon={Wallet} title="Nessun compenso trovato" description="Non ci sono compensi che corrispondono ai filtri selezionati." />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable columns={columns} data={filtered} pagination pageSize={20} />
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}
