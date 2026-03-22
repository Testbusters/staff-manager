import { Skeleton } from '@/components/ui/skeleton';

export default function CorsoDetailLoading() {
  return (
    <div className="p-6">
      <div className="mb-2">
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-6 w-64" />
        <div className="flex gap-2 mt-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <div className="flex gap-2 mt-4 mb-6">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <div className="max-w-3xl rounded-2xl bg-card border border-border p-6 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
