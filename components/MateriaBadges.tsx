import { Badge } from '@/components/ui/badge';
import { MATERIA_COLORS } from '@/lib/corsi-utils';

interface MateriaBadgesProps {
  materie: string[];
  className?: string;
}

export function MateriaBadges({ materie, className }: MateriaBadgesProps) {
  if (!materie || materie.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className ?? ''}`}>
      {materie.map((m) => {
        const color = MATERIA_COLORS[m] ?? 'bg-gray-500';
        return (
          <Badge
            key={m}
            variant="outline"
            className={`text-xs shrink-0 ${color} text-white border-transparent`}
          >
            {m}
          </Badge>
        );
      })}
    </div>
  );
}
