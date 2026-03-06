import { Skeleton } from '@/components/ui/skeleton';

export default function DocumentoDetailLoading() {
  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-1/2" />
        <div className="flex gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <Skeleton className="h-96 w-full rounded-none" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}
