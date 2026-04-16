'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, GraduationCap, Users, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface CalEntry {
  ruolo: string;
  data: string; // YYYY-MM-DD
  orario_inizio: string; // HH:MM or HH:MM:SS
  orario_fine: string; // HH:MM or HH:MM:SS
  ore: number;
  corso_codice: string;
  corso_id: string;
  lezione_id: string;
  materie: string[];
}

const MATERIA_PILL: Record<string, { bg: string; text: string; dot: string }> = {
  Logica:      { bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-700 dark:text-red-300',    dot: 'bg-red-500' },
  Biologia:    { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  Chimica:     { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  Fisica:      { bg: 'bg-blue-100 dark:bg-blue-900/30',  text: 'text-blue-700 dark:text-blue-300',  dot: 'bg-blue-500' },
  Matematica:  { bg: 'bg-blue-100 dark:bg-blue-900/30',  text: 'text-blue-700 dark:text-blue-300',  dot: 'bg-blue-500' },
  Simulazione: { bg: 'bg-gray-100 dark:bg-gray-800',     text: 'text-gray-700 dark:text-gray-300',  dot: 'bg-gray-500' },
  'CoCoDà':   { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500' },
};

const RUOLO_LABEL: Record<string, string> = {
  docente: 'Docenza',
  cocoda: "CoCoD'à",
  qa: 'Q&A',
};

const RUOLO_CONFIG: Record<string, { icon: typeof GraduationCap; label: string; bg: string; text: string; dot: string }> = {
  docente: {
    icon: GraduationCap,
    label: 'Docenza',
    bg: 'bg-brand/15 dark:bg-brand/20',
    text: 'text-brand',
    dot: 'bg-brand',
  },
  cocoda: {
    icon: Users,
    label: "CoCoD'à",
    bg: 'bg-amber-500/15 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  qa: {
    icon: HelpCircle,
    label: 'Q&A',
    bg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
};

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export default function CorsiCalendario({ entries }: { entries: CalEntry[] }) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [activeRoles, setActiveRoles] = useState<Set<string>>(
    () => new Set(Object.keys(RUOLO_CONFIG))
  );

  function toggleRole(ruolo: string) {
    setActiveRoles((prev) => {
      const next = new Set(prev);
      if (next.has(ruolo)) {
        if (next.size === 1) return prev; // keep at least one active
        next.delete(ruolo);
      } else {
        next.add(ruolo);
      }
      return next;
    });
  }

  const lezioniByDay = useMemo(() => {
    const map = new Map<number, CalEntry[]>();
    for (const e of entries) {
      if (!activeRoles.has(e.ruolo)) continue;
      const d = new Date(e.data);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate();
        map.set(day, [...(map.get(day) ?? []), e]);
      }
    }
    return map;
  }, [entries, currentYear, currentMonth, activeRoles]);

  const firstDow = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthName = new Date(currentYear, currentMonth, 1)
    .toLocaleDateString('it-IT', { month: 'long' })
    .replace(/^\w/, (c) => c.toUpperCase());

  function prevMonth() {
    if (currentMonth === 0) { setCurrentYear((y) => y - 1); setCurrentMonth(11); }
    else setCurrentMonth((m) => m - 1);
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentYear((y) => y + 1); setCurrentMonth(0); }
    else setCurrentMonth((m) => m + 1);
  }

  const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();
  const totalEntries = entries.filter((e) => {
    const d = new Date(e.data);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  }).length;

  // Count entries by role for the legend
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      const d = new Date(e.data);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        counts[e.ruolo] = (counts[e.ruolo] ?? 0) + 1;
      }
    }
    return counts;
  }, [entries, currentYear, currentMonth]);

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={prevMonth} aria-label="Mese precedente" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-baseline gap-2 select-none">
            <span className="text-lg font-semibold tracking-tight text-foreground">{monthName}</span>
            <span className="text-sm text-muted-foreground tabular-nums">{currentYear}</span>
          </div>
          <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Mese successivo" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentMonth && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => { setCurrentYear(today.getFullYear()); setCurrentMonth(today.getMonth()); }}
            >
              Oggi
            </Button>
          )}
        </div>

        {/* Role filter toggles — always visible */}
        <div className="hidden sm:flex items-center gap-2">
          {Object.entries(RUOLO_CONFIG).map(([ruolo, config]) => {
            const count = roleCounts[ruolo] ?? 0;
            const isActive = activeRoles.has(ruolo);
            return (
              <button
                key={ruolo}
                onClick={() => toggleRole(ruolo)}
                aria-label={`Filtra ${config.label}`}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors border ${
                  isActive
                    ? `${config.bg} ${config.text} border-transparent`
                    : 'bg-transparent text-muted-foreground border-border opacity-50 hover:opacity-75'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isActive ? config.dot : 'bg-muted-foreground'}`} />
                {config.label}
                <span className="tabular-nums font-medium">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="p-3 sm:p-4 overflow-x-auto">
        {/* Day header row */}
        <div className="grid grid-cols-7 mb-2 min-w-[320px]">
          {DAY_LABELS.map((d, i) => (
            <div
              key={d}
              className={`text-center text-xs uppercase tracking-wider font-medium py-1.5 ${
                i >= 5 ? 'text-muted-foreground/60' : 'text-muted-foreground'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1 min-w-[320px]">
          {cells.map((day, i) => {
            const colIndex = i % 7;
            const isWeekend = colIndex >= 5;

            if (!day) {
              return (
                <div
                  key={i}
                  className={`min-h-[68px] rounded-lg ${isWeekend ? 'bg-muted/30' : ''}`}
                />
              );
            }

            const dayEntries = lezioniByDay.get(day) ?? [];
            const isToday = isCurrentMonth && day === today.getDate();
            const hasEntries = dayEntries.length > 0;

            return (
              <div
                key={i}
                className={`rounded-lg p-1.5 transition-colors ${
                  hasEntries ? 'min-h-[80px]' : 'min-h-[52px]'
                } ${
                  isToday
                    ? 'ring-1 ring-brand/50 ring-inset'
                    : hasEntries
                    ? 'bg-muted/50 hover:bg-muted/70'
                    : isWeekend
                    ? 'bg-muted/30 hover:bg-muted/40'
                    : 'hover:bg-muted/30'
                }`}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  {isToday ? (
                    <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-brand text-white text-xs font-bold">
                      {day}
                    </span>
                  ) : (
                    <span
                      className={`text-xs font-medium pl-0.5 tabular-nums ${
                        isWeekend ? 'text-muted-foreground/60' : hasEntries ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {day}
                    </span>
                  )}
                  {dayEntries.length > 3 && (
                    <span className="text-xs text-muted-foreground font-medium tabular-nums">
                      +{dayEntries.length - 3}
                    </span>
                  )}
                </div>

                {/* Event pills */}
                <div className="space-y-0.5">
                  {dayEntries.slice(0, 3).map((e, j) => {
                    const config = RUOLO_CONFIG[e.ruolo] ?? {
                      icon: GraduationCap,
                      label: e.ruolo,
                      bg: 'bg-muted',
                      text: 'text-foreground',
                      dot: 'bg-muted-foreground',
                    };
                    const pill = MATERIA_PILL[e.materie[0] ?? ''] ?? { bg: 'bg-muted', text: 'text-foreground', dot: 'bg-muted-foreground' };
                    const ruoloLabel = RUOLO_LABEL[e.ruolo] ?? e.ruolo;
                    return (
                      <Link
                        key={j}
                        href={`/corsi/${e.corso_id}`}
                        className={`flex flex-col gap-0.5 rounded-md px-1.5 py-1 ${pill.bg} hover:brightness-95 dark:hover:brightness-110 transition-[filter]`}
                        title={`${e.corso_codice} · ${ruoloLabel} · ${e.orario_inizio.slice(0, 5)}-${e.orario_fine.slice(0, 5)}, ${e.ore}h`}
                      >
                        <div className="flex items-center gap-1">
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${pill.dot}`} />
                          <span className={`text-xs font-medium leading-none truncate ${pill.text}`}>
                            {e.corso_codice}
                          </span>
                        </div>
                        <span className={`text-xs leading-none tabular-nums pl-2.5 ${pill.text} opacity-80`}>
                          {ruoloLabel} · {e.orario_inizio.slice(0, 5)}-{e.orario_fine.slice(0, 5)}, {e.ore}h
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer — month summary, always visible */}
      <div className="px-5 py-2.5 border-t border-border bg-muted/30">
        <span className="text-xs text-muted-foreground">
          <span className="tabular-nums font-medium text-foreground">{totalEntries}</span>
          {' '}{totalEntries === 1 ? 'lezione' : 'lezioni'} in {monthName.toLowerCase()} {currentYear}
        </span>
      </div>
    </div>
  );
}
