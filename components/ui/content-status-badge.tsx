import { getExpiryBadgeData } from '@/lib/content-badge-maps';

export function TipoBadge({
  tipo,
  label,
  colorMap,
}: {
  tipo: string;
  label: string;
  colorMap: Record<string, string>;
}) {
  const cls = colorMap[tipo] ?? colorMap['ALTRO'] ?? 'bg-muted border-border text-muted-foreground';
  return (
    <span className={`inline-block rounded-full border px-3 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

export function ExpiryBadge({ valid_to }: { valid_to: string | null }) {
  const data = getExpiryBadgeData(valid_to);
  if (!data) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${data.cls}`}>
      {data.label}
    </span>
  );
}
