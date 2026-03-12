import type { OpportunityTipo, EventTipo } from '@/lib/types';

export const OPP_TIPO_COLORS: Record<OpportunityTipo, string> = {
  Volontariato: 'bg-green-100 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400',
  Formazione:   'bg-indigo-100 border-indigo-200 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-800 dark:text-indigo-300',
  Lavoro:       'bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400',
  Altro:        'bg-muted border-border text-muted-foreground',
};

export const EVENT_TIPO_COLORS: Record<EventTipo, string> = {
  Convention:       'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:border-violet-800 dark:text-violet-300',
  Attivita_interna: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400',
  Workshop:         'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400',
  Formazione:       'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-300',
  Altro:            'bg-muted border-border text-muted-foreground',
};

export function getExpiryBadgeData(valid_to: string | null): { label: string; cls: string } | null {
  if (!valid_to) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((new Date(valid_to).getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return { label: 'Scaduto', cls: 'bg-muted text-muted-foreground' };
  if (diffDays <= 7) return { label: 'In scadenza', cls: 'bg-yellow-100 border border-yellow-200 text-yellow-700 dark:bg-yellow-900/40 dark:border-yellow-700 dark:text-yellow-300' };
  return { label: 'Attivo', cls: 'bg-green-100 border border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' };
}
