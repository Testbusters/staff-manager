'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Receipt, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Checkbox } from '@/components/ui/checkbox';
import type { Expense, ExpenseStatus, ExpenseCategory } from '@/lib/types';
import { EXPENSE_STATUS_LABELS, EXPENSE_CATEGORIES, EXPENSE_CATEGORIA_BADGE } from '@/lib/types';
import StatusBadge from '@/components/compensation/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

type ExpenseRow = Expense & {
  collaborators?: { nome: string; cognome: string } | null;
};

type Kpi = {
  inAttesa: number;
  totaleInAttesa: number;
  approvati: number;
  totaleApprovati: number;
  liquidato: number;
  totaleLiquidato: number;
};

const ALL_STATI: ExpenseStatus[] = ['IN_ATTESA', 'APPROVATO', 'RIFIUTATO', 'LIQUIDATO'];

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
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-2xl font-semibold tabular-nums ${countColor}`}>{count}</p>
        <p className="text-sm text-muted-foreground tabular-nums mt-0.5">{formatCurrency(amount)}</p>
      </CardContent>
    </Card>
  );
}

export default function ApprovazioniRimborsi({
  expenses,
  kpi,
}: {
  expenses: ExpenseRow[];
  kpi: Kpi;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [filterStato, setFilterStato] = useState<ExpenseStatus | 'ALL'>('ALL');
  const [filterCategoria, setFilterCategoria] = useState<ExpenseCategory | 'ALL'>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ExpenseRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = expenses
    .filter((e) => filterStato === 'ALL' || e.stato === filterStato)
    .filter((e) => filterCategoria === 'ALL' || e.categoria === filterCategoria)
    .filter((e) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const name = `${e.collaborators?.nome ?? ''} ${e.collaborators?.cognome ?? ''}`.toLowerCase();
      return name.includes(q);
    });

  const approvabiliInFiltered = filtered.filter((e) => e.stato === 'IN_ATTESA');
  const allFilteredSelected =
    approvabiliInFiltered.length > 0 && approvabiliInFiltered.every((e) => selectedIds.has(e.id));
  const totaleSelezionati = expenses
    .filter((e) => selectedIds.has(e.id))
    .reduce((s, e) => s + (e.importo ?? 0), 0);

  function toggleSelectAll() {
    const next = new Set(selectedIds);
    if (allFilteredSelected) {
      approvabiliInFiltered.forEach((e) => next.delete(e.id));
    } else {
      approvabiliInFiltered.forEach((e) => next.add(e.id));
    }
    setSelectedIds(next);
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  }

  async function handleDelete() {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/expenses/${toDelete.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Errore durante l'eliminazione");
      } else {
        toast.success('Rimborso eliminato');
        setSelectedIds((prev) => { const next = new Set(prev); next.delete(toDelete.id); return next; });
        router.refresh();
      }
    } catch {
      toast.error('Errore di rete');
    } finally {
      setIsDeleting(false);
      setToDelete(null);
    }
  }

  const columns: ColumnDef<ExpenseRow>[] = [
    {
      id: 'select',
      header: () => approvabiliInFiltered.length > 0 ? (
        <Checkbox checked={allFilteredSelected} onCheckedChange={() => toggleSelectAll()} />
      ) : null,
      cell: ({ row }) => row.original.stato === 'IN_ATTESA' ? (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => toggleOne(row.original.id)}
        />
      ) : <div className="w-4" />,
      enableSorting: false,
    },
    {
      id: 'collaboratore',
      accessorFn: (row) => `${row.collaborators?.cognome ?? ''} ${row.collaborators?.nome ?? ''}`,
      header: 'Collaboratore',
      cell: ({ row }) => (
        <Link href={`/rimborsi/${row.original.id}`} className="block min-w-0 hover:no-underline">
          <p className="text-sm font-semibold text-foreground truncate">
            {row.original.collaborators
              ? `${row.original.collaborators.nome} ${row.original.collaborators.cognome}`
              : '—'}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{row.original.descrizione ?? '—'}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${EXPENSE_CATEGORIA_BADGE[row.original.categoria]}`}>
              {row.original.categoria}
            </span>
            {row.original.data_spesa && (
              <span className="text-xs text-muted-foreground">Spesa: {formatDate(row.original.data_spesa)}</span>
            )}
          </div>
        </Link>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Inviato il',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.created_at)}</span>,
    },
    {
      accessorKey: 'importo',
      header: 'Importo',
      cell: ({ row }) => <span className="text-sm font-medium tabular-nums">{formatCurrency(row.original.importo)}</span>,
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
            aria-label="Elimina rimborso"
            className="text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.preventDefault(); setToDelete(row.original); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null,
    },
  ];

  async function handleBulkApprove() {
    setBulkLoading(true);
    setBulkError(null);
    try {
      const res = await fetch('/api/expenses/approve-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selectedIds] }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setBulkError(err.error ?? "Errore durante l'approvazione.");
      } else {
        setSelectedIds(new Set());
        startTransition(() => router.refresh());
      }
    } finally {
      setBulkLoading(false);
    }
  }

  const deleteCollabName = toDelete?.collaborators
    ? `${toDelete.collaborators.nome} ${toDelete.collaborators.cognome}`
    : 'questo collaboratore';

  return (
    <>
    <AlertDialog open={!!toDelete} onOpenChange={(open) => { if (!open) setToDelete(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Elimina rimborso</AlertDialogTitle>
          <AlertDialogDescription>
            Stai per eliminare il rimborso di <strong>{deleteCollabName}</strong>
            {toDelete?.descrizione ? ` — ${toDelete.descrizione}` : ''}.
            Questa operazione è irreversibile.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            variant="destructive"
          >
            {isDeleting ? 'Eliminazione...' : 'Elimina'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="In attesa" count={kpi.inAttesa} amount={kpi.totaleInAttesa} countColor="text-brand dark:text-brand" />
        <KpiCard label="Approvati" count={kpi.approvati} amount={kpi.totaleApprovati} countColor="text-amber-600 dark:text-amber-400" />
        <KpiCard label="Liquidati" count={kpi.liquidato} amount={kpi.totaleLiquidato} countColor="text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* List header */}
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Rimborsi{filtered.length !== expenses.length ? ` (${filtered.length} di ${expenses.length})` : ` (${expenses.length})`}
        </h2>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setSelectedIds(new Set()); }}
        placeholder="Cerca per nome cognome collaboratore"
        className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
      />

      {/* Filter chips — stato */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
        {(['ALL', ...ALL_STATI] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setFilterStato(s); setSelectedIds(new Set()); }}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
              filterStato === s
                ? 'bg-brand text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {s === 'ALL' ? 'Tutti' : EXPENSE_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Filter chips — categoria */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
        <button
          onClick={() => { setFilterCategoria('ALL'); setSelectedIds(new Set()); }}
          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
            filterCategoria === 'ALL'
              ? 'bg-brand text-white'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          Tutte le categorie
        </button>
        {EXPENSE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setFilterCategoria(cat); setSelectedIds(new Set()); }}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
              filterCategoria === cat
                ? 'bg-brand text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Bulk approve bar */}
      {selectedIds.size > 0 && (
        <Alert variant="info">
          <AlertDescription>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm">
                  {selectedIds.size} {selectedIds.size === 1 ? 'selezionato' : 'selezionati'}
                </span>
                <span className="text-xs tabular-nums">{formatCurrency(totaleSelezionati)}</span>
              </div>
              <div className="flex items-center gap-3">
                {bulkError && <span className="text-xs text-red-600 dark:text-red-400">{bulkError}</span>}
                <Button
                  onClick={handleBulkApprove}
                  disabled={bulkLoading || isPending}
                  className="bg-brand hover:bg-brand/90 text-white"
                >
                  {bulkLoading ? 'Approvazione...' : 'Approva selezionati'}
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <EmptyState icon={Receipt} title="Nessun rimborso trovato" description="Non ci sono rimborsi che corrispondono ai filtri selezionati." />
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
