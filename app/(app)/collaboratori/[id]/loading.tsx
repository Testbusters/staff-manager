import { Skeleton } from '@/components/ui/skeleton';

export default function CollaboratoreDetailLoading() {
  return (
    <div className="p-6 space-y-8">
      <div className="flex items-start gap-4">
        <Skeleton className="h-14 w-14 rounded-full flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-40" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="rounded-xl border border-border overflow-hidden">
          <Skeleton className="h-10 w-full rounded-none" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-none border-t border-border" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <div className="rounded-xl border border-border overflow-hidden">
          <Skeleton className="h-10 w-full rounded-none" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-none border-t border-border" />
          ))}
        </div>
      </div>
    </div>
  );
}
