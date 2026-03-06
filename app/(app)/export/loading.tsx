import { Skeleton } from '@/components/ui/skeleton';

export default function ExportLoading() {
  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-64" />
      </div>
      {/* Tab bar + CTA */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-52 rounded-lg" />
      </div>
      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Skeleton className="h-10 w-full rounded-none" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-none border-t border-border" />
        ))}
      </div>
    </div>
  );
}
