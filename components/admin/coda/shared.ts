import { useState, useCallback } from 'react';

export type SortDir = 'asc' | 'desc' | null;

export function fmt(amount: number | null) {
  if (amount == null) return null;
  return `€\u202f${amount.toFixed(2)}`;
}

export function fmtTotal(amount: number) {
  return `€\u202f${amount.toFixed(2)}`;
}

export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allSelected = items.length > 0 && selectedIds.size === items.length;

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === items.length ? new Set() : new Set(items.map((i) => i.id)),
    );
  }, [items]);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  return { selectedIds, allSelected, toggle, toggleAll, clear };
}
