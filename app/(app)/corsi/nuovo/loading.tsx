import { Skeleton } from '@/components/ui/skeleton';

export default function NuovoCorsoLoading() {
  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-32 mt-4" />
      </div>
    </div>
  );
}
