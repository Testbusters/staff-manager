'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export type BarMonthData = {
  month: string;
  compensi: number;
  rimborsi: number;
};

const fmt = (v: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

const tooltipStyle = {
  contentStyle: {
    background: '#111827',
    border: '1px solid #1f2937',
    borderRadius: 8,
    fontSize: 12,
    color: '#e5e7eb',
  },
  labelStyle: { color: '#9ca3af', marginBottom: 4 },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
};

function tooltipFormatter(value: number | undefined, name: string | undefined) {
  return [fmt(value ?? 0), name === 'compensi' ? 'Compensi' : 'Rimborsi'];
}

export default function DashboardBarChart({ data }: { data: BarMonthData[] }) {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        barCategoryGap="35%"
        barGap={3}
      >
        <XAxis
          dataKey="month"
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v > 0 ? String(v) : '')}
        />
        <Tooltip
          formatter={tooltipFormatter}
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
          cursor={tooltipStyle.cursor}
        />
        <Bar dataKey="compensi" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={24} />
        <Bar dataKey="rimborsi" fill="#14b8a6" radius={[3, 3, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
