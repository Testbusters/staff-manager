import { Skeleton } from '@/components/ui/skeleton';

export default function TicketDetailLoading() {
  return (
    <div className="p-6 max-w-3xl space-y-6">
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`flex gap-3 ${i % 2 === 1 ? 'flex-row-reverse' : ''}`}>
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <Skeleton className={`h-20 rounded-xl flex-1`} />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}
