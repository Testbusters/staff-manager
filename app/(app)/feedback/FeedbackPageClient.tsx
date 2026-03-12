'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import FeedbackActions from '@/components/FeedbackActions';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { FeedbackRow } from './page';

const CATEGORIA_COLORS: Record<string, string> = {
  Bug:          'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30',
  Suggerimento: 'bg-muted text-muted-foreground border-border/30',
  Domanda:      'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/30',
  Altro:        'text-muted-foreground bg-muted/40 border-border/30',
};

const ROLE_LABELS: Record<string, string> = {
  collaboratore:   'Collaboratore',
  responsabile:    'Responsabile',
  amministrazione: 'Admin',
};

function FeedbackCard({
  item,
  selected,
  onSelect,
}: {
  item: FeedbackRow;
  selected: boolean;
  onSelect: (checked: boolean) => void;
}) {
  return (
    <div className={`rounded-2xl bg-card border p-5 space-y-3 transition ${selected ? 'border-brand/60 bg-brand/5' : 'border-border'}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelect(!!v)}
          className="mt-0.5 shrink-0"
        />
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                  CATEGORIA_COLORS[item.categoria] ?? CATEGORIA_COLORS.Altro
                }`}
              >
                {item.categoria}
              </span>
              <span className="text-xs text-muted-foreground">
                {ROLE_LABELS[item.role] ?? item.role}
              </span>
              {item.pagina && (
                <span className="text-xs text-muted-foreground font-mono">{item.pagina}</span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-muted-foreground">
                {new Date(item.created_at).toLocaleString('it-IT', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
              <FeedbackActions id={item.id} stato={item.stato} />
            </div>
          </div>

          <p className="text-sm text-foreground whitespace-pre-wrap">{item.messaggio}</p>

          {item.screenshot_url && (
            <a
              href={item.screenshot_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-link hover:text-link/80 transition"
            >
              🖼 Visualizza screenshot
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FeedbackPageClient({ feedback }: { feedback: FeedbackRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);

  const nuovi      = feedback.filter(f => f.stato === 'nuovo');
  const completati = feedback.filter(f => f.stato === 'completato');

  function toggleSelect(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  function toggleSelectAll(items: FeedbackRow[], checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      items.forEach((item) => checked ? next.add(item.id) : next.delete(item.id));
      return next;
    });
  }

  function allSelected(items: FeedbackRow[]) {
    return items.length > 0 && items.every((item) => selected.has(item.id));
  }

  function someSelected(items: FeedbackRow[]) {
    return items.some((item) => selected.has(item.id));
  }

  async function handleBulkComplete() {
    await Promise.all(
      [...selected].map((id) => fetch(`/api/feedback/${id}`, { method: 'PATCH' })),
    );
    toast.success(`${selected.size} feedback completati.`);
    setSelected(new Set());
    router.refresh();
  }

  async function handleBulkDelete() {
    await Promise.all(
      [...selected].map((id) => fetch(`/api/feedback/${id}`, { method: 'DELETE' })),
    );
    toast.success(`${selected.size} feedback rimossi.`);
    setSelected(new Set());
    setBulkDeleteDialog(false);
    router.refresh();
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10">
      <AlertDialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovi feedback selezionati</AlertDialogTitle>
            <AlertDialogDescription>
              Rimuovere {selected.size} feedback selezionat{selected.size === 1 ? 'o' : 'i'}? L&apos;operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Rimuovi tutti
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div>
        <h1 className="text-xl font-semibold text-foreground">Feedback ricevuti</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{feedback.length} segnalazioni totali</p>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-card border border-border px-4 py-3">
          <span className="text-sm text-foreground">{selected.size} selezionat{selected.size === 1 ? 'o' : 'i'}</span>
          <Button
            size="sm"
            onClick={handleBulkComplete}
            className="bg-green-700 hover:bg-green-800 text-white"
          >
            Completa tutti
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setBulkDeleteDialog(true)}
          >
            Rimuovi tutti
          </Button>
        </div>
      )}

      {/* Nuovi */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Nuovi</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800/40 text-yellow-700 dark:text-yellow-400 font-medium">
            {nuovi.length}
          </span>
          {nuovi.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => toggleSelectAll(nuovi, !allSelected(nuovi))}
            >
              {allSelected(nuovi) ? 'Deseleziona tutti' : 'Seleziona tutti'}
            </Button>
          )}
        </div>

        {nuovi.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">
            Nessun feedback in attesa.
          </div>
        ) : (
          <div className="space-y-3">
            {nuovi.map(item => (
              <FeedbackCard
                key={item.id}
                item={item}
                selected={selected.has(item.id)}
                onSelect={(checked) => toggleSelect(item.id, checked)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Completati */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Completati</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground font-medium">
            {completati.length}
          </span>
          {completati.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => toggleSelectAll(completati, !allSelected(completati))}
            >
              {allSelected(completati) ? 'Deseleziona tutti' : 'Seleziona tutti'}
            </Button>
          )}
        </div>

        {completati.length === 0 ? (
          <div className="rounded-2xl bg-card/50 border border-border/50 p-8 text-center text-muted-foreground text-sm">
            Nessun feedback completato.
          </div>
        ) : (
          <div className="space-y-3 opacity-70">
            {completati.map(item => (
              <FeedbackCard
                key={item.id}
                item={item}
                selected={selected.has(item.id)}
                onSelect={(checked) => toggleSelect(item.id, checked)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
