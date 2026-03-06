import { Skeleton } from '@/components/ui/skeleton';

export default function ComunicazioneDetailLoading() {
  return (
    <div className="p-6 max-w-3xl space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="rounded-xl border border-border p-6 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${i % 3 === 2 ? 'w-3/4' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
}
