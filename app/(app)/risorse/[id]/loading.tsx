import { Skeleton } from '@/components/ui/skeleton';

export default function RisorsaDetailLoading() {
  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-7 w-2/3" />
        </div>
      </div>
      <div className="rounded-xl border border-border p-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${i % 3 === 2 ? 'w-3/4' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
}
