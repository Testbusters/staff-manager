import type { HistoryEvent } from '@/lib/types';
import { COMPENSATION_STATUS_LABELS } from '@/lib/types';
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from '@/components/ui/timeline';

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

function buildTitle(ev: HistoryEvent): string {
  const actor = ev.changed_by_name ? `${ev.changed_by_name} (${ev.role_label})` : ev.role_label;
  if (!ev.stato_precedente) {
    return `${actor} — Creato come ${labelStato(ev.stato_nuovo)}`;
  }
  return `${actor} → ${labelStato(ev.stato_nuovo)}`;
}

export default function CompensationTimeline({ events }: { events: HistoryEvent[] }) {
  if (!events.length) return null;

  return (
    <Timeline value={events.length}>
      {events.map((ev, i) => (
        <TimelineItem key={ev.id} step={i + 1}>
          <TimelineIndicator />
          <TimelineSeparator />
          <TimelineHeader>
            <TimelineTitle>{buildTitle(ev)}</TimelineTitle>
            <TimelineDate>{formatDate(ev.created_at)}</TimelineDate>
          </TimelineHeader>
          {ev.note && (
            <TimelineContent className="text-xs bg-muted rounded-lg px-3 py-2 border border-border">
              {ev.note}
            </TimelineContent>
          )}
        </TimelineItem>
      ))}
    </Timeline>
  );
}
