'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface CalEntry {
  ruolo: string;
  data: string; // YYYY-MM-DD
  orario_inizio: string; // HH:MM or HH:MM:SS
  corso_codice: string;
}

const RUOLO_COLOR: Record<string, string> = {
  docente: 'bg-brand/20 text-brand dark:bg-brand/30',
  cocoda: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  qa: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export default function CorsiCalendario({ entries }: { entries: CalEntry[] }) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const lezioniByDay = new Map<number, CalEntry[]>();
  for (const e of entries) {
    const d = new Date(e.data);
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      const day = d.getDate();
      lezioniByDay.set(day, [...(lezioniByDay.get(day) ?? []), e]);
    }
  }

  const firstDow = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(currentYear, currentMonth, 1)
    .toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
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

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={prevMonth} aria-label="Mese precedente">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-foreground">{monthLabel}</span>
        <Button variant="ghost" size="icon" onClick={nextMonth} aria-label="Mese successivo">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="min-h-[52px]" />;
            const dayEntries = lezioniByDay.get(day) ?? [];
            const isToday = isCurrentMonth && day === today.getDate();
            return (
              <div
                key={i}
                className={`min-h-[52px] rounded-lg p-1 ${
                  isToday
                    ? 'bg-brand/10 ring-1 ring-brand/40'
                    : dayEntries.length > 0
                    ? 'bg-muted/40'
                    : ''
                }`}
              >
                <span
                  className={`text-xs font-medium block text-center mb-0.5 ${
                    isToday ? 'text-brand' : 'text-foreground'
                  }`}
                >
                  {day}
                </span>
                {dayEntries.slice(0, 3).map((e, j) => (
                  <div
                    key={j}
                    className={`rounded px-1 py-0.5 text-[10px] leading-tight truncate mb-0.5 ${
                      RUOLO_COLOR[e.ruolo] ?? 'bg-muted text-foreground'
                    }`}
                    title={`${e.corso_codice} · ${e.orario_inizio.slice(0, 5)} · ${e.ruolo}`}
                  >
                    {e.corso_codice} {e.orario_inizio.slice(0, 5)}
                  </div>
                ))}
                {dayEntries.length > 3 && (
                  <div className="text-[10px] text-muted-foreground text-center">+{dayEntries.length - 3}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
