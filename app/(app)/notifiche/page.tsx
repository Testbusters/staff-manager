import { Suspense } from 'react';
import NotificationPageClient from '@/components/notifications/NotificationPageClient';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotifichePage() {
  return (
    <div className="p-6">
      <Suspense fallback={<div className="py-12"><Skeleton className="h-16 w-full" /></div>}>
        <NotificationPageClient />
      </Suspense>
    </div>
  );
}
