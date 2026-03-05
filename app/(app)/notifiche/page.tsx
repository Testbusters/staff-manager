import { Suspense } from 'react';
import NotificationPageClient from '@/components/notifications/NotificationPageClient';

export default function NotifichePage() {
  return (
    <div className="p-6">
      <Suspense fallback={<p className="text-sm text-muted-foreground py-12 text-center">Caricamento…</p>}>
        <NotificationPageClient />
      </Suspense>
    </div>
  );
}
