import { Skeleton } from '@/components/ui/skeleton';

function FeedbackSectionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-8 rounded-full" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

export default function FeedbackLoading() {
  return (
    <div className="p-6 space-y-8">
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <FeedbackSectionSkeleton />
      <FeedbackSectionSkeleton />
    </div>
  );
}
