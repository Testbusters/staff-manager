'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Props {
  documentId: string;
}

export default function DocumentDeleteButton({ documentId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Eliminare definitivamente questo contratto? L\'azione è irreversibile.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore eliminazione');
      router.push('/documenti');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore imprevisto', { duration: 5000 });
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="rounded-lg bg-red-50 dark:bg-red-900/40 hover:bg-red-100 dark:hover:bg-red-800/60 border border-red-200 dark:border-red-800/60 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 transition"
      >
        {loading ? 'Eliminazione…' : 'Elimina contratto'}
      </button>
    </div>
  );
}
