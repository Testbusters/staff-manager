import type { HistoryEvent } from '@/lib/types';
import { COMPENSATION_STATUS_LABELS } from '@/lib/types';

function labelStato(stato: string): string {
  return (COMPENSATION_STATUS_LABELS as Record<string, string>)[stato] ?? stato;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Timeline({ events }: { events: HistoryEvent[] }) {
  if (!events.length) return null;

  return (
    <div className="space-y-0">
      {events.map((ev, i) => (
        <div key={ev.id} className="flex gap-3">
          {/* Line + dot */}
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-gray-500 mt-1.5 shrink-0" />
            {i < events.length - 1 && <div className="w-px flex-1 bg-accent my-1" />}
          </div>

          {/* Content */}
          <div className="pb-4 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-foreground">
                {ev.changed_by_name ? `${ev.changed_by_name} (${ev.role_label})` : ev.role_label}
              </span>
              {ev.stato_precedente && (
                <>
                  <span className="text-xs text-muted-foreground">→</span>
                  <span className="text-xs text-muted-foreground">{labelStato(ev.stato_nuovo)}</span>
                </>
              )}
              {!ev.stato_precedente && (
                <span className="text-xs text-muted-foreground">Creato come {labelStato(ev.stato_nuovo)}</span>
              )}
              <span className="text-xs text-muted-foreground">{formatDate(ev.created_at)}</span>
            </div>
            {ev.note && (
              <p className="mt-1 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 border border-border">
                {ev.note}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
