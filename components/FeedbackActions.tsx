'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface Props {
  id: string;
  stato: string;
}

export default function FeedbackActions({ id, stato }: Props) {
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
        {stato === 'nuovo' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleComplete}
            disabled={loading !== null}
            className="text-green-700 dark:text-green-400 hover:text-green-700 dark:hover:text-green-400"
          >
            {loading === 'complete' ? '…' : 'Completa'}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          disabled={loading !== null}
          className="text-red-700 dark:text-red-400 hover:text-red-700 dark:hover:text-red-400"
        >
          Rimuovi
        </Button>

      </div>
    </>
  );
}
