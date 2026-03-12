'use client';
import Link from 'next/link';
import { BarChart2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { EmptyState } from '@/components/ui/empty-state';

const tooltipStyle = {
  contentStyle: {
    background: 'var(--color-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--color-foreground)',
  },
  labelStyle: { color: 'var(--color-muted-foreground)' },
  cursor: { fill: 'rgba(128,128,128,0.06)' },
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

const fmtCurrencyShort = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

type CompYearBreakdown = { year: number; netto: number; lordo: number };
type ExpYearBreakdown  = { year: number; total: number };

type Props = {
  compensPaidByYear: CompYearBreakdown[];
  compensApprovedLordo: number;
  compensApprovedNetto: number;
  compensInAttesaNetto: number;
  expensePaidByYear: ExpYearBreakdown[];
  expenseApproved: number;
  expenseInAttesa: number;
  massimale: number | null;
  paidCurrentYear: number;
  currentYear: number;
};


const TIP_RITENUTA =
  "La ritenuta d'acconto (20%) viene trattenuta alla fonte e versata dall'associazione all'Agenzia delle Entrate a tuo nome. È un acconto IRPEF — non è un costo aggiuntivo. Il netto è l'importo che ricevi sul conto.";

const TIP_NETTO_APPROVATO =
  "Importo netto che verrà accreditato sul tuo conto una volta che il compenso sarà liquidato. Corrisponde al lordo meno la ritenuta d'acconto del 20%.";

function CompensazioniCard({
  paidByYear,
  approvedLordo,
  approvedNetto,
  inAttesaNetto,
}: {
  paidByYear: CompYearBreakdown[];
  approvedLordo: number;
  approvedNetto: number;
  inAttesaNetto: number;
}) {
  const isEmpty = paidByYear.length === 0 && approvedNetto === 0 && inAttesaNetto === 0;

  const chartData = paidByYear.map(({ year, netto }) => ({ anno: String(year), netto }));

  return (
    <div className="rounded-2xl bg-card border border-border w-full sm:flex-1 sm:min-w-[260px]">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Compensi liquidati</h2>
      </div>
      {!isEmpty && paidByYear.length >= 2 && (
        <div className="px-2 pt-4 pb-0">
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="nettoGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="anno" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip
                formatter={(v: number | undefined) => [fmtCurrencyShort(v ?? 0), 'Netto']}
                contentStyle={tooltipStyle.contentStyle}
                labelStyle={tooltipStyle.labelStyle}
                cursor={tooltipStyle.cursor}
              />
              <Area type="monotone" dataKey="netto" stroke="var(--color-brand)" strokeWidth={2} fill="url(#nettoGradient)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="p-5 space-y-3">
        {isEmpty ? (
          <EmptyState icon={BarChart2} title="Nessun dato disponibile." />
        ) : (
          <>
            {paidByYear.map(({ year, netto, lordo }) => (
              <div key={year} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Netto ricevuto nel {year}</span>
                  <span className="text-sm font-semibold text-green-700 dark:text-green-400 tabular-nums">{fmtCurrency(netto)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    Ritenuta trattenuta (20%)
                    <InfoTooltip tip={TIP_RITENUTA} />
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">− {fmtCurrency(lordo - netto)}</span>
                </div>
              </div>
            ))}

            {approvedNetto > 0 && (
              <div className={`space-y-1.5 ${paidByYear.length > 0 ? 'pt-3 border-t border-border' : ''}`}>
                <p className="text-xs font-medium text-muted-foreground">Approvato — in attesa di liquidazione</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Lordo approvato</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{fmtCurrency(approvedLordo)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    Netto che riceverai
                    <InfoTooltip tip={TIP_NETTO_APPROVATO} />
                  </span>
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400 tabular-nums">{fmtCurrency(approvedNetto)}</span>
                </div>
              </div>
            )}

            {inAttesaNetto > 0 && (
              <div className={`flex items-center justify-between ${(paidByYear.length > 0 || approvedNetto > 0) ? 'pt-2 border-t border-border' : ''}`}>
                <span className="text-xs text-muted-foreground">In valutazione (netto stimato)</span>
                <span className="text-xs text-muted-foreground tabular-nums">{fmtCurrency(inAttesaNetto)}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RimborsiCard({
  paidByYear,
  approved,
  inAttesa,
}: {
  paidByYear: ExpYearBreakdown[];
  approved: number;
  inAttesa: number;
}) {
  const totalPaid = paidByYear.reduce((s, r) => s + r.total, 0);
  const isEmpty = paidByYear.length === 0 && approved === 0 && inAttesa === 0;

  return (
    <div className="rounded-2xl bg-card border border-border w-full sm:flex-1 sm:min-w-[260px]">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Rimborsi liquidati</h2>
      </div>
      <div className="p-5 space-y-3">
        {isEmpty ? (
          <EmptyState icon={BarChart2} title="Nessun dato disponibile." />
        ) : (
          <>
            {paidByYear.map(({ year, total }) => (
              <div key={year} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Ricevuto nel {year}</span>
                <span className="text-sm font-semibold text-green-700 dark:text-green-400 tabular-nums">{fmtCurrency(total)}</span>
              </div>
            ))}
            {paidByYear.length > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">Totale rimborsi ricevuti</span>
                <span className="text-sm font-semibold text-green-700 dark:text-green-400 tabular-nums">{fmtCurrency(totalPaid)}</span>
              </div>
            )}
            {approved > 0 && (
              <div className={`flex items-center justify-between ${paidByYear.length > 0 ? 'pt-2 border-t border-border' : ''}`}>
                <span className="text-xs text-muted-foreground">Approvato — da liquidare</span>
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400 tabular-nums">{fmtCurrency(approved)}</span>
              </div>
            )}
            {inAttesa > 0 && (
              <div className={`flex items-center justify-between ${(paidByYear.length > 0 || approved > 0) ? 'pt-2 border-t border-border' : ''}`}>
                <span className="text-xs text-muted-foreground">In valutazione</span>
                <span className="text-xs text-muted-foreground tabular-nums">{fmtCurrency(inAttesa)}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentOverview({
  compensPaidByYear, compensApprovedLordo, compensApprovedNetto, compensInAttesaNetto,
  expensePaidByYear, expenseApproved, expenseInAttesa,
  massimale, paidCurrentYear, currentYear,
}: Props) {
  const hasData =
    compensPaidByYear.length > 0 || compensApprovedNetto > 0 || compensInAttesaNetto > 0 ||
    expensePaidByYear.length > 0 || expenseApproved > 0 || expenseInAttesa > 0;

  const showMassimale = massimale != null && massimale > 0;
  const pct = showMassimale ? Math.min(100, (paidCurrentYear / massimale) * 100) : 0;
  const isNearLimit = pct >= 80;
  const barColor = pct >= 100 ? 'bg-red-500 dark:bg-red-400' : isNearLimit ? 'bg-yellow-400 dark:bg-yellow-300' : 'bg-green-500 dark:bg-green-400';

  if (!hasData && !showMassimale) return null;

  return (
    <div className="mb-8 space-y-5">
      {showMassimale && (
        <div className="rounded-2xl bg-card border border-border p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-foreground">
              Massimale annuo {currentYear} lordo
            </h2>
            <span className={`text-xs font-mono ${pct >= 100 ? 'text-red-600 dark:text-red-400' : isNearLimit ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground'}`}>
              {fmtCurrency(paidCurrentYear)} / {fmtCurrency(massimale)}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-accent overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {pct >= 100 && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">Hai raggiunto il massimale impostato.</p>
          )}
          {isNearLimit && pct < 100 && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
              Stai avvicinandoti al massimale ({pct.toFixed(0)}%).
            </p>
          )}
          <div className="mt-3 flex justify-end">
            <Link
              href="/profilo?tab=impostazioni"
              className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors"
            >
              Modifica massimale →
            </Link>
          </div>
        </div>
      )}

      {hasData && (
        <>
          <h2 className="text-sm font-medium text-muted-foreground">I miei pagamenti</h2>
          <div className="flex gap-4 flex-wrap">
            <CompensazioniCard
              paidByYear={compensPaidByYear}
              approvedLordo={compensApprovedLordo}
              approvedNetto={compensApprovedNetto}
              inAttesaNetto={compensInAttesaNetto}
            />
            <RimborsiCard
              paidByYear={expensePaidByYear}
              approved={expenseApproved}
              inAttesa={expenseInAttesa}
            />
          </div>
        </>
      )}
    </div>
  );
}
