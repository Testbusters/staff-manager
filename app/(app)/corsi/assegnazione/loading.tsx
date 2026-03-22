import { Skeleton } from '@/components/ui/skeleton';

export default function AssegnazioneLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-7 w-64 mb-2" />
      <Skeleton className="h-4 w-48 mb-8" />
      <Skeleton className="h-5 w-40 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-5 w-40 mt-8 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
