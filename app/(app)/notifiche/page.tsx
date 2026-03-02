import { Suspense } from 'react';
import NotificationPageClient from '@/components/notifications/NotificationPageClient';

export default function NotifichePage() {
  return (
    <div className="p-6">
      <Suspense fallback={<p className="text-sm text-gray-500 py-12 text-center">Caricamento…</p>}>
        <NotificationPageClient />
      </Suspense>
    </div>
  );
}
