'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  communities: { id: string; name: string }[];
}

export default function CorsiFilterBar({ communities }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [community, setCommunity] = useState(searchParams.get('community') ?? '');
  const [stato, setStato] = useState(searchParams.get('stato') ?? '');
  const [q, setQ] = useState(searchParams.get('q') ?? '');

  function apply() {
    const params = new URLSearchParams();
    if (community) params.set('community', community);
    if (stato) params.set('stato', stato);
    if (q.trim()) params.set('q', q.trim());
    router.push(`/corsi${params.size > 0 ? `?${params.toString()}` : ''}`);
  }

  function reset() {
    setCommunity('');
    setStato('');
    setQ('');
    router.push('/corsi');
  }

  const hasFilters = community || stato || q;

  return (
    <div className="flex gap-3 mb-6 flex-wrap items-center">
      <Select value={community || '__all__'} onValueChange={(v) => setCommunity(v === '__all__' ? '' : v)}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Tutte le community" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Tutte le community</SelectItem>
          {communities.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={stato || '__all__'} onValueChange={(v) => setStato(v === '__all__' ? '' : v)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Tutti gli stati" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Tutti gli stati</SelectItem>
          <SelectItem value="programmato">Programmato</SelectItem>
          <SelectItem value="attivo">Attivo</SelectItem>
          <SelectItem value="concluso">Concluso</SelectItem>
        </SelectContent>
      </Select>

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && apply()}
        placeholder="Cerca per nome o codice…"
        className="w-64"
      />

      <Button onClick={apply} variant="outline">Filtra</Button>

      {hasFilters && (
        <Button onClick={reset} variant="ghost" className="text-muted-foreground">
          Reset
        </Button>
      )}
    </div>
  );
}
