'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  id: string;
  stato: string;
}

export default function FeedbackActions({ id, stato }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<'complete' | 'delete' | null>(null);

  async function handleComplete() {
    setLoading('complete');
    await fetch(`/api/feedback/${id}`, { method: 'PATCH' });
    setLoading(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm('Rimuovere questo feedback? L\'operazione non può essere annullata.')) return;
    setLoading('delete');
    await fetch(`/api/feedback/${id}`, { method: 'DELETE' });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
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
        onClick={handleDelete}
        disabled={loading !== null}
        className="text-xs px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition disabled:opacity-50"
      >
        {loading === 'delete' ? '…' : 'Rimuovi'}
      </button>
    </div>
  );
}
