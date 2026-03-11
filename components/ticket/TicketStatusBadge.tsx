import type { TicketStatus } from '@/lib/types';
import { TICKET_STATUS_LABELS } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const STATUS_CONFIG: Record<TicketStatus, { variant: BadgeVariant; className?: string }> = {
  APERTO:         { variant: 'outline', className: 'bg-muted text-foreground border-border' },
  IN_LAVORAZIONE: { variant: 'outline', className: 'border-amber-500 text-amber-700 dark:border-amber-600 dark:text-amber-400' },
  CHIUSO:         { variant: 'secondary' },
};

export default function TicketStatusBadge({ stato }: { stato: TicketStatus }) {
  const config = STATUS_CONFIG[stato] ?? { variant: 'outline' as const };
  return (
    <Badge
      variant={config.variant}
      className={config.className}
      data-ticket-stato={stato}
    >
      {TICKET_STATUS_LABELS[stato]}
    </Badge>
  );
}
