'use client';

import Link from 'next/link';
import CountUp from 'react-countup';

export default function RKpiCard({ label, count, sub, color, href }: {
  label: string;
  count: number;
  sub: string | null;
  color: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl bg-card border border-border px-4 py-4 hover:bg-muted/80 transition animate-in fade-in slide-in-from-bottom-2 duration-500"
    >
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${color}`}>
        <CountUp end={count} duration={1.2} />
      </p>
      {sub && <p className="text-sm text-muted-foreground tabular-nums mt-0.5">{sub}</p>}
    </Link>
  );
}
