'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TICKET_CATEGORIES, TICKET_PRIORITY_LABELS } from '@/lib/types';
import type { TicketPriority } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function TicketForm() {
  const router = useRouter();
  const [categoria, setCategoria] = useState('');
  const [oggetto, setOggetto] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('NORMALE');
  const [messaggio, setMessaggio] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoria || !oggetto.trim()) {
      toast.error('Riferimento e oggetto sono obbligatori.', { duration: 5000 });
      return;
    }
    setLoading(true);

    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoria,
        oggetto: oggetto.trim(),
        priority,
        messaggio: messaggio.trim() || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? 'Errore durante la creazione del ticket.', { duration: 5000 });
      setLoading(false);
      return;
    }

    toast.success('Ticket aperto con successo.');
    router.push(`/ticket/${data.ticket.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Riferimento + Priorità — 2-col grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="categoria" className="block text-sm font-medium text-foreground">
            Riferimento <span className="text-destructive">*</span>
          </label>
          <Select value={categoria || undefined} onValueChange={setCategoria}>
            <SelectTrigger id="categoria"><SelectValue placeholder="Seleziona un riferimento" /></SelectTrigger>
            <SelectContent>
              {TICKET_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="priority" className="block text-sm font-medium text-foreground">
            Priorità
          </label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
            <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['BASSA', 'NORMALE', 'ALTA'] as TicketPriority[]).map((p) => (
                <SelectItem key={p} value={p}>{TICKET_PRIORITY_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Oggetto */}
      <div className="space-y-1.5">
        <label htmlFor="oggetto" className="block text-sm font-medium text-foreground">
          Oggetto <span className="text-destructive">*</span>
        </label>
        <Input
          id="oggetto"
          type="text"
          value={oggetto}
          onChange={(e) => setOggetto(e.target.value)}
          placeholder="Descrivi brevemente il problema o la richiesta"
          maxLength={200}
          required
        />
      </div>

      {/* Messaggio iniziale */}
      <div className="space-y-1.5">
        <label htmlFor="messaggio" className="block text-sm font-medium text-foreground">
          Messaggio iniziale <span className="text-muted-foreground font-normal">(opzionale)</span>
        </label>
        <Textarea
          id="messaggio"
          value={messaggio}
          onChange={(e) => setMessaggio(e.target.value)}
          placeholder="Aggiungi dettagli, contesto o eventuali allegati potranno essere aggiunti dopo la creazione..."
          rows={5}
          className="resize-none"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={loading} className="bg-brand hover:bg-brand/90 text-white">
          {loading ? 'Apertura…' : 'Apri ticket'}
        </Button>
        <Link href="/ticket" className="text-sm text-muted-foreground hover:text-foreground transition">
          ← Annulla
        </Link>
      </div>
    </form>
  );
}
