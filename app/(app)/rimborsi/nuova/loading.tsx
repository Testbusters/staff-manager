import { Skeleton } from '@/components/ui/skeleton';

export default function NuovoRimborsoLoading() {
  return (
    <div className="p-6 max-w-xl space-y-6">
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>
    </div>
  );
}
