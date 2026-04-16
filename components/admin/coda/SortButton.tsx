'use client';

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { SortDir } from './shared';

export default function SortButton({ sortDir, onCycle }: { sortDir: SortDir; onCycle: () => void }) {
  const Icon = sortDir === 'asc' ? ArrowUp : sortDir === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <button
      onClick={onCycle}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      aria-label="Ordina per data"
    >
      Data <Icon className="h-3 w-3" />
    </button>
  );
}
