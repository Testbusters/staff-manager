import { Skeleton } from '@/components/ui/skeleton';

export default function ValutazioniLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-7 w-64 mb-2" />
      <Skeleton className="h-4 w-48 mb-8" />
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-5 w-48 mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
