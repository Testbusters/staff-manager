'use client';

import { useState } from 'react';
import { Database } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import SectionAccordion from './SectionAccordion';
import type { TopQuery, TableStat } from './types';

export default function DBPerformance({
  topQueries,
  tableStats,
  loading,
  onReset,
  resetting,
}: {
  topQueries: TopQuery[];
  tableStats: TableStat[];
  loading: boolean;
  onReset: () => void;
  resetting: boolean;
}) {
  const [tab, setTab] = useState<'queries' | 'tables'>('queries');

  const controls = (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        <Button size="sm" onClick={() => setTab('queries')} className={`text-xs ${tab === 'queries' ? 'bg-brand hover:bg-brand/90 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/60'}`}>Query</Button>
        <Button size="sm" onClick={() => setTab('tables')} className={`text-xs ${tab === 'tables' ? 'bg-brand hover:bg-brand/90 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/60'}`}>Tabelle</Button>
      </div>
      <Button variant="outline" size="sm" onClick={onReset} disabled={resetting} className="text-xs">
        {resetting ? 'Reset…' : 'Reset stats'}
      </Button>
    </div>
  );

  return (
    <SectionAccordion title="Performance DB" description="Top query per tempo totale di esecuzione · statistiche tabelle." controls={controls}>
      <div className="overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : tab === 'queries' ? (
          topQueries.length === 0 ? (
            <EmptyState icon={Database} title="Nessun dato. Esegui alcune query e ricarica." />
          ) : (
            <>
              {topQueries.length >= 2 && (
                <div className="px-4 pt-4 pb-2">
                  <p className="text-xs text-muted-foreground mb-2">Top {Math.min(5, topQueries.length)} per media ms</p>
                  <ResponsiveContainer width="100%" height={Math.min(5, topQueries.length) * 28}>
                    <BarChart
                      layout="vertical"
                      data={topQueries.slice(0, 5).map((q) => ({ name: q.query.slice(0, 40), mean_ms: q.mean_ms }))}
                      margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                    >
                      <XAxis type="number" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={160} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v: number | undefined) => [`${(v ?? 0).toLocaleString('it-IT')} ms`, 'Media']}
                        contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-foreground)' }}
                        labelStyle={{ color: 'var(--color-muted-foreground)' }}
                        cursor={{ fill: 'rgba(128,128,128,0.06)' }}
                      />
                      <Bar dataKey="mean_ms" radius={[0, 3, 3, 0]} maxBarSize={16}>
                        {topQueries.slice(0, 5).map((_, i) => (
                          <Cell key={i} fill={i === 0 ? 'var(--color-brand)' : 'var(--color-muted-foreground)'} fillOpacity={i === 0 ? 1 : 0.5} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Query</TableHead>
                  <TableHead className="text-right">Chiamate</TableHead>
                  <TableHead className="text-right">Totale ms</TableHead>
                  <TableHead className="text-right">Media ms</TableHead>
                  <TableHead className="text-right">Righe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topQueries.map((q, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-mono max-w-sm truncate" title={q.query}>{q.query}</TableCell>
                    <TableCell className="text-right text-xs">{q.calls.toLocaleString('it-IT')}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{q.total_ms.toLocaleString('it-IT')}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{q.mean_ms.toLocaleString('it-IT')}</TableCell>
                    <TableCell className="text-right text-xs">{q.rows_total.toLocaleString('it-IT')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </>
          )
        ) : (
          tableStats.length === 0 ? (
            <EmptyState icon={Database} title="Nessun dato tabelle." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tabella</TableHead>
                  <TableHead className="text-right">Seq scan</TableHead>
                  <TableHead className="text-right">Idx scan</TableHead>
                  <TableHead className="text-right">Righe vive</TableHead>
                  <TableHead className="text-right">Dead tuples</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableStats.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-mono">{t.table_name}</TableCell>
                    <TableCell className="text-right text-xs">{t.seq_scan.toLocaleString('it-IT')}</TableCell>
                    <TableCell className="text-right text-xs">{(t.idx_scan ?? 0).toLocaleString('it-IT')}</TableCell>
                    <TableCell className="text-right text-xs">{t.n_live_tup.toLocaleString('it-IT')}</TableCell>
                    <TableCell className={`text-right text-xs ${t.n_dead_tup > 1000 ? 'text-amber-500 font-medium' : ''}`}>{t.n_dead_tup.toLocaleString('it-IT')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}
      </div>
    </SectionAccordion>
  );
}
