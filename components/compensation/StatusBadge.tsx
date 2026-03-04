import type { CompensationStatus, ExpenseStatus } from '@/lib/types';
import { COMPENSATION_STATUS_LABELS, EXPENSE_STATUS_LABELS } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';
import type { badgeVariants } from '@/components/ui/badge';

type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

const STATUS_LABELS: Record<CompensationStatus | ExpenseStatus, string> = {
  ...COMPENSATION_STATUS_LABELS,
  ...EXPENSE_STATUS_LABELS,
};

const STATUS_CONFIG: Record<CompensationStatus, { variant: BadgeVariant; className?: string }> = {
  IN_ATTESA: { variant: 'outline', className: 'border-amber-600 text-amber-400' },
  APPROVATO: { variant: 'outline', className: 'border-green-600 text-green-400' },
  RIFIUTATO: { variant: 'destructive' },
  LIQUIDATO: { variant: 'outline', className: 'border-blue-600 text-blue-400' },
};

export default function StatusBadge({ stato }: { stato: CompensationStatus | ExpenseStatus }) {
  const config = STATUS_CONFIG[stato as CompensationStatus] ?? { variant: 'outline' as const };
  return (
    <Badge data-stato={stato} variant={config.variant} className={config.className}>
      {STATUS_LABELS[stato]}
    </Badge>
  );
}
