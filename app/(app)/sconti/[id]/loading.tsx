import { Skeleton } from '@/components/ui/skeleton';

export default function ScontoDetailLoading() {
  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-7 w-1/2" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="rounded-xl border border-border p-6 space-y-4">
        <Skeleton className="h-8 w-36 rounded-lg" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${i % 3 === 2 ? 'w-3/4' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
}
