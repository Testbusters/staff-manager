'use client';

import { useState } from 'react';
import Link from 'next/link';
import { KeyRound, ClipboardList, Briefcase, Receipt, CheckCircle2, type LucideIcon } from 'lucide-react';
import type { AdminBlockItem } from './types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const BLOCK_LABELS: Record<AdminBlockItem['blockType'], string> = {
  must_change_password:  'Cambio password non completato',
  onboarding_incomplete: 'Onboarding non completato',
  stalled_comp:          'Compenso in stallo',
  stalled_exp:           'Rimborso in stallo',
};

const BLOCK_ICONS: Record<AdminBlockItem['blockType'], LucideIcon> = {
  must_change_password:  KeyRound,
  onboarding_incomplete: ClipboardList,
  stalled_comp:          Briefcase,
  stalled_exp:           Receipt,
};

const BLOCK_DESCRIPTIONS: Record<AdminBlockItem['blockType'], string> = {
  must_change_password:  'L\'utente non ha ancora cambiato la password temporanea.',
  onboarding_incomplete: 'L\'utente non ha completato il wizard di onboarding.',
  stalled_comp:          'Compenso in attesa di azione da oltre 3 giorni.',
  stalled_exp:           'Rimborso in attesa di azione da oltre 3 giorni.',
};

type Props = {
  items: AdminBlockItem[];
  open: boolean;
  onClose: () => void;
};

export default function BlocksDrawer({ items, open, onClose }: Props) {
  const [clearing, setClearing] = useState<string | null>(null);
  const [cleared, setCleared] = useState<Set<string>>(new Set());

  const visibleItems = items.filter(i => !cleared.has(i.key));

  async function handleClearFlag(item: AdminBlockItem) {
    setClearing(item.key);
    try {
      const res = await fetch('/api/admin/blocks/clear-flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: item.userId }),
      });
      if (res.ok) {
        setCleared(prev => new Set([...prev, item.key]));
      }
    } finally {
      setClearing(null);
    }
  }

  const grouped = (
    ['must_change_password', 'onboarding_incomplete', 'stalled_comp', 'stalled_exp'] as const
  ).map(type => ({
    type,
    items: visibleItems.filter(i => i.blockType === type),
  })).filter(g => g.items.length > 0);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full max-w-lg bg-card border-l border-border p-0 flex flex-col sm:max-w-lg">
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-border flex-shrink-0 space-y-0">
          <SheetTitle className="text-base font-semibold text-foreground">Situazioni di blocco</SheetTitle>
          <p className="text-xs text-muted-foreground">{visibleItems.length} element{visibleItems.length === 1 ? 'o' : 'i'} da risolvere</p>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <CheckCircle2 className="h-8 w-8 mb-2 text-green-500" />
              <p className="text-sm text-muted-foreground">Nessuna situazione di blocco attiva.</p>
            </div>
          ) : (
            grouped.map(group => (
              <div key={group.type}>
                <div className="flex items-center gap-2 mb-3">
                  {(() => { const Icon = BLOCK_ICONS[group.type]; return <Icon className="h-4 w-4 text-muted-foreground shrink-0" />; })()}
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {BLOCK_LABELS[group.type]} ({group.items.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {group.items.map(item => (
                    <div
                      key={item.key}
                      className="rounded-xl bg-muted/60 border border-border/50 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.collabName}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.collabEmail}</p>
                          <p className="text-xs text-muted-foreground mt-1">{BLOCK_DESCRIPTIONS[item.blockType]}</p>
                          {item.daysWaiting !== undefined && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                              In attesa da {item.daysWaiting} giorni
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {item.blockType === 'must_change_password' && (
                            <button
                              onClick={() => handleClearFlag(item)}
                              disabled={clearing === item.key}
                              className="rounded-lg bg-brand hover:bg-brand/90 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-white transition"
                            >
                              {clearing === item.key ? '...' : 'Azzera flag'}
                            </button>
                          )}
                          {item.blockType === 'onboarding_incomplete' && (
                            <Link
                              href={item.href}
                              onClick={onClose}
                              className="rounded-lg bg-accent hover:bg-gray-600 px-3 py-1.5 text-xs font-medium text-foreground transition inline-block"
                            >
                              Vai al profilo
                            </Link>
                          )}
                          {(item.blockType === 'stalled_comp' || item.blockType === 'stalled_exp') && (
                            <Link
                              href={item.href}
                              onClick={onClose}
                              className="rounded-lg bg-accent hover:bg-gray-600 px-3 py-1.5 text-xs font-medium text-foreground transition inline-block"
                            >
                              Vai alla coda
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
