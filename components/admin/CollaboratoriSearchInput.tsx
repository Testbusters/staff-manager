'use client';

import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { useRef, useState } from 'react';

export default function CollaboratoriSearchInput({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue ?? '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = (q: string) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('page', '1');
    router.push(`/collaboratori?${params.toString()}`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setValue(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => push(q), 300);
  };

  return (
    <InputGroup className="w-full max-w-sm">
      <InputGroupAddon align="inline-start">
        <Search className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        value={value}
        onChange={handleChange}
        placeholder="Cerca per nome, cognome, username o email…"
      />
    </InputGroup>
  );
}
