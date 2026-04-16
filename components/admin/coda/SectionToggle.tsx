'use client';

import { Badge } from '@/components/ui/badge';
import { fmtTotal } from './shared';

export default function SectionToggle({
  label,
  count,
  total,
  accentClass,
  onToggle,
}: {
  label: string;
  count: number;
  total: number;
  accentClass: string;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 min-w-0 text-left"
      type="button"
    >
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <Badge className={`text-xs border-0 ${accentClass}`}>{count}</Badge>
      <span className="text-xs text-muted-foreground">{fmtTotal(total)}</span>
    </button>
  );
}
