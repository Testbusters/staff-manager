'use client';

import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

interface CorsiKpiData {
  assegnatiDocente: number;
  svoltiDocente: number;
  valMediaDocente: number | null;
  valMediaCocoda: number | null;
  assegnatiQA: number;
  svoltiQA: number;
}

function KpiBox({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href="/corsi"
      className="flex flex-col gap-2 rounded-2xl bg-card border border-border p-4 hover:bg-muted/60 transition-colors"
    >
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums leading-tight ${highlight ? 'text-brand' : 'text-foreground'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Link>
  );
}

export default function DashboardCorsiKpi({ kpi }: { kpi: CorsiKpiData }) {
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <GraduationCap className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Corsi</h2>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiBox
          label="Corsi assegnati (Docente)"
          value={kpi.assegnatiDocente}
          sub="programmato / attivo"
        />
        <KpiBox
          label="Corsi svolti (Docente)"
          value={kpi.svoltiDocente}
          sub="con valutazione"
        />
        <KpiBox
          label="Valutazione media docente"
          value={kpi.valMediaDocente !== null ? kpi.valMediaDocente.toFixed(1) : '—'}
          sub="su 10"
          highlight={kpi.valMediaDocente !== null}
        />
        <KpiBox
          label="Valutazione media CoCoDà"
          value={kpi.valMediaCocoda !== null ? kpi.valMediaCocoda.toFixed(1) : '—'}
          sub="su 10"
          highlight={kpi.valMediaCocoda !== null}
        />
        <KpiBox
          label="Q&A assegnati"
          value={kpi.assegnatiQA}
          sub="ore: —"
        />
        <KpiBox
          label="Q&A svolti"
          value={kpi.svoltiQA}
          sub="ore: —"
        />
      </div>
    </div>
  );
}
