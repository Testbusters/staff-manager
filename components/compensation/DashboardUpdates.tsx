'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DOCUMENT_TYPE_LABELS } from '@/lib/types';
import type { DocumentType, ResourceCategoria, EventTipo, OpportunityTipo } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';

export type DashboardDocItem = {
  id: string;
  titolo: string | null;
  tipo: DocumentType;
  created_at: string;
};

export type DashboardEventItem = {
  id: string;
  titolo: string;
  start_datetime: string | null;
  tipo: EventTipo | null;
};

export type DashboardCommItem = {
  id: string;
  titolo: string;
  date: string;
  categoria?: ResourceCategoria;
  kind: 'comm' | 'resource';
};

export type DashboardOppItem = {
  id: string;
  titolo: string;
  date: string;
  tipo?: OpportunityTipo | string;
  kind: 'opp' | 'discount';
};

// Colored badge classes per content category
const EVENT_BADGE_CLS  = 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/60 dark:text-cyan-300 dark:border-cyan-800/60';
const COMM_BADGE_CLS   = 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/60 dark:text-green-300 dark:border-green-800/60';
const RES_BADGE_CLS    = 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/60 dark:text-blue-300 dark:border-blue-800/60';
const OPP_BADGE_CLS    = 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/60 dark:text-indigo-300 dark:border-indigo-800/60';
const DISC_BADGE_CLS   = 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/60 dark:text-rose-300 dark:border-rose-800/60';

const BADGE_BASE = 'flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide';

type Tab = { key: string; label: string };
type UnreadCounts = { events: number; communicationsResources: number; opportunitiesDiscounts: number };

const TABS: Tab[] = [
  { key: 'eventi',        label: 'Eventi' },
  { key: 'comunicazioni', label: 'Comunicazioni e risorse' },
  { key: 'opportunita',   label: 'Opportunità e sconti' },
  { key: 'documenti',     label: 'Documenti' },
];

const PAGE_SIZE = 4;

export default function DashboardUpdates({
  documents,
  events,
  comunicazioni,
  opportunita,
  unreadCounts,
}: {
  documents: DashboardDocItem[];
  events: DashboardEventItem[];
  comunicazioni: DashboardCommItem[];
  opportunita: DashboardOppItem[];
  unreadCounts?: UnreadCounts;
}) {
  const [activeTab, setActiveTab] = useState<string>('eventi');
  const [page, setPage] = useState(0);

  const currentItems =
    activeTab === 'documenti'     ? documents :
    activeTab === 'eventi'        ? events :
    activeTab === 'comunicazioni' ? comunicazioni :
    activeTab === 'opportunita'   ? opportunita :
    [];

  const pageCount = Math.max(1, Math.ceil(currentItems.length / PAGE_SIZE));
  const visible = currentItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleTabChange(key: string) {
    setActiveTab(key);
    setPage(0);
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="rounded-2xl bg-card border border-border"
    >
      {/* Tab header */}
      <div className="flex flex-wrap items-center gap-1 px-5 py-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground mr-3">Ultimi aggiornamenti</h2>
        <TabsList className="h-auto bg-transparent p-0 gap-0.5 flex-wrap justify-start">
          {TABS.map((tab) => {
            const count =
              tab.key === 'eventi'        ? (unreadCounts?.events ?? 0) :
              tab.key === 'comunicazioni' ? (unreadCounts?.communicationsResources ?? 0) :
              tab.key === 'opportunita'   ? (unreadCounts?.opportunitiesDiscounts ?? 0) : 0;
            return (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition
                           text-muted-foreground hover:text-foreground hover:bg-muted
                           data-[state=active]:bg-accent data-[state=active]:text-foreground
                           data-[state=active]:shadow-none bg-transparent"
              >
                {tab.label}
                {count > 0 && (
                  <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white leading-none tabular-nums">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      {/* Content */}
      <div className="divide-y divide-border/50">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {activeTab === 'documenti' ? 'Nessun documento in attesa di firma.' :
             activeTab === 'eventi'    ? 'Nessun evento in programma.' :
             activeTab === 'comunicazioni' ? 'Nessuna comunicazione recente.' :
             'Nessuna opportunità recente.'}
          </p>
        ) : activeTab === 'documenti' ? (
          (visible as DashboardDocItem[]).map((doc) => (
            <Link
              key={doc.id}
              href={`/documenti/${doc.id}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">
                  {doc.titolo || DOCUMENT_TYPE_LABELS[doc.tipo]}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(doc.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <span className="flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/60 dark:text-yellow-300 dark:border-yellow-800/60">
                {DOCUMENT_TYPE_LABELS[doc.tipo]}
              </span>
              <span className="text-muted-foreground group-hover:text-foreground text-sm transition flex-shrink-0">→</span>
            </Link>
          ))
        ) : activeTab === 'eventi' ? (
          (visible as DashboardEventItem[]).map((ev) => (
            <Link
              key={ev.id}
              href={`/eventi/${ev.id}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{ev.titolo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ev.start_datetime
                    ? new Date(ev.start_datetime).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'}
                </p>
              </div>
              {ev.tipo && (
                <span className={`${BADGE_BASE} ${EVENT_BADGE_CLS}`}>
                  {ev.tipo}
                </span>
              )}
              <span className="text-muted-foreground group-hover:text-foreground text-sm transition flex-shrink-0">→</span>
            </Link>
          ))
        ) : activeTab === 'comunicazioni' ? (
          (visible as DashboardCommItem[]).map((item) => (
            <Link
              key={item.id}
              href={item.kind === 'comm' ? `/comunicazioni/${item.id}` : `/risorse/${item.id}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{item.titolo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(item.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <span className={`${BADGE_BASE} ${item.kind === 'comm' ? COMM_BADGE_CLS : RES_BADGE_CLS}`}>
                {item.kind === 'comm' ? 'Comunicazione' : (item.categoria ?? 'Risorsa')}
              </span>
              <span className="text-muted-foreground group-hover:text-foreground text-sm transition flex-shrink-0">→</span>
            </Link>
          ))
        ) : (
          (visible as DashboardOppItem[]).map((item) => (
            <Link
              key={item.id}
              href={item.kind === 'opp' ? `/opportunita/${item.id}` : `/sconti/${item.id}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{item.titolo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(item.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <span className={`${BADGE_BASE} ${item.kind === 'opp' ? OPP_BADGE_CLS : DISC_BADGE_CLS}`}>
                {item.kind === 'opp' ? (item.tipo ?? 'Opportunità') : 'Sconto'}
              </span>
              <span className="text-muted-foreground group-hover:text-foreground text-sm transition flex-shrink-0">→</span>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <Pagination className="w-full mx-0 px-5 py-3 border-t border-border justify-between">
          <PaginationContent className="w-full justify-between gap-0">
            <PaginationItem>
              <PaginationPrevious
                onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(0, p - 1)); }}
                className={cn(
                  "text-xs text-muted-foreground hover:text-foreground",
                  page === 0 && "pointer-events-none text-muted-foreground opacity-50"
                )}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="text-xs text-muted-foreground">{page + 1} / {pageCount}</span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(pageCount - 1, p + 1)); }}
                className={cn(
                  "text-xs text-muted-foreground hover:text-foreground",
                  page === pageCount - 1 && "pointer-events-none text-muted-foreground opacity-50"
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </Tabs>
  );
}
