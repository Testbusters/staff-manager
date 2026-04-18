'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const STORAGE_KEY = 'pdi_backfill_dismiss_count';
const SESSION_KEY = 'pdi_backfill_shown_session';
const MAX_DISMISSALS = 3;

export default function ProfileBackfillToast({ needsBackfill }: { needsBackfill: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!needsBackfill) return;
    if (typeof window === 'undefined') return;

    if (sessionStorage.getItem(SESSION_KEY) === '1') return;

    const raw = localStorage.getItem(STORAGE_KEY);
    const count = raw ? Number.parseInt(raw, 10) : 0;
    if (Number.isFinite(count) && count >= MAX_DISMISSALS) return;

    sessionStorage.setItem(SESSION_KEY, '1');

    const increment = () => {
      const current = Number.parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10);
      localStorage.setItem(STORAGE_KEY, String((Number.isFinite(current) ? current : 0) + 1));
    };

    toast.info('Completa il tuo profilo', {
      description: 'Aggiungi documento identità, preferenze alimentari e indirizzo di spedizione.',
      duration: 10000,
      action: {
        label: 'Completa ora',
        onClick: () => {
          localStorage.setItem(STORAGE_KEY, String(MAX_DISMISSALS));
          router.push('/profilo');
        },
      },
      onDismiss: increment,
      onAutoClose: increment,
    });
  }, [needsBackfill, router]);

  return null;
}
