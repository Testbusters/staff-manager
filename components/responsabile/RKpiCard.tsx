'use client';

import Link from 'next/link';
import CountUp from 'react-countup';

export default function RKpiCard({ label, count, sub, color, href, highlight }: {
  label: string;
  count: number;
  sub: string | null;
  color: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl bg-card border px-4 py-4 hover:bg-muted/80 transition animate-in fade-in slide-in-from-bottom-2 duration-500 ${
        highlight
          ? 'border-amber-300/70 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-800/50'
          : 'border-border dark:border-white/[0.12]'
      }`}
    >
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${color}`}>
        <CountUp end={count} duration={1.2} />
      </p>
      {sub && <p className="text-sm text-muted-foreground tabular-nums mt-0.5">{sub}</p>}
    </Link>
  );
}
