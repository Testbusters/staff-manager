'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  id: string;
  stato: string;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
}

export default function FeedbackActions({ id, stato, selected, onSelect }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<'complete' | 'delete' | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  async function handleComplete() {
    setLoading('complete');
    await fetch(`/api/feedback/${id}`, { method: 'PATCH' });
    setLoading(null);
    router.refresh();
  }

  async function handleDelete() {
    setLoading('delete');
    await fetch(`/api/feedback/${id}`, { method: 'DELETE' });
    setLoading(null);
    setShowDeleteDialog(false);
    router.refresh();
  }

  return (
    <>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovi feedback</AlertDialogTitle>
            <AlertDialogDescription>
              Rimuovere questo feedback? L&apos;operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center gap-2 shrink-0">
        {onSelect !== undefined && (
          <Checkbox
            checked={selected ?? false}
            onCheckedChange={(v) => onSelect(!!v)}
          />
        )}
        {stato === 'nuovo' && (
          <button
            onClick={handleComplete}
            disabled={loading !== null}
            className="text-xs px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 transition disabled:opacity-50"
          >
            {loading === 'complete' ? '…' : 'Completa'}
          </button>
        )}
        <button
          onClick={() => setShowDeleteDialog(true)}
          disabled={loading !== null}
          className="text-xs px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition disabled:opacity-50"
        >
          Rimuovi
        </button>
      </div>
    </>
  );
}
