'use client';

import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import SectionAccordion from './SectionAccordion';
import type { Stats } from './types';

const PILLS = [
  { key: 'compensi_in_attesa', label: 'Compensi in attesa', link: '/coda?tab=compensi', warn: 10 },
  { key: 'rimborsi_in_attesa', label: 'Rimborsi in attesa', link: '/coda?tab=rimborsi', warn: 5 },
  { key: 'doc_da_firmare', label: 'Doc. da firmare', link: '/documenti', warn: 1 },
  { key: 'ticket_aperti', label: 'Ticket aperti', link: '/ticket', warn: 5 },
  { key: 'onboarding_incompleti', label: 'Onboarding incompleti', link: '/impostazioni?tab=collaboratori', warn: 1 },
] as const;

export default function StatoSistema({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  return (
    <SectionAccordion title="Stato sistema" description="Contatori in tempo reale sulle entità in attesa.">
      <div className="p-5 flex flex-wrap gap-3">
        {PILLS.map((pill) => {
          const count = stats?.[pill.key] ?? 0;
          const isWarning = count >= pill.warn;
          return loading ? (
            <Skeleton key={pill.key} className="h-9 w-40 rounded-full" />
          ) : (
            <Link
              key={pill.key}
              href={pill.link}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition border ${
                isWarning
                  ? 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
              }`}
            >
              <span className={`inline-flex h-5 min-w-5 px-1 items-center justify-center rounded-full text-xs font-bold ${
                isWarning ? 'bg-amber-600 text-white dark:bg-amber-500' : 'bg-emerald-600 text-white dark:bg-emerald-500'
              }`}>
                {count}
              </span>
              {pill.label}
            </Link>
          );
        })}
      </div>
    </SectionAccordion>
  );
}
