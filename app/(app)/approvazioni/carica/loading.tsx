import { Skeleton } from '@/components/ui/skeleton';

export default function ApprovazioniCaricaLoading() {
  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>
    </div>
  );
}
