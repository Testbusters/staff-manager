'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TICKET_CATEGORIES, TICKET_PRIORITY_LABELS } from '@/lib/types';
import type { TicketPriority } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function TicketQuickModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [categoria, setCategoria] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('NORMALE');
  const [oggetto, setOggetto] = useState('');
  const [messaggio, setMessaggio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setOpen(false);
    setCategoria('');
    setPriority('NORMALE');
    setOggetto('');
    setMessaggio('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoria || !oggetto.trim()) {
      setError('Riferimento e oggetto sono obbligatori.');
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoria,
        priority,
        oggetto: oggetto.trim(),
        messaggio: messaggio.trim() || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Errore durante la creazione del ticket.');
      setLoading(false);
      return;
    }

    router.push(`/ticket/${data.ticket.id}`);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white">
        Apri ticket
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-gray-100">Apri un ticket</DialogTitle>
          </DialogHeader>

          {error && (
            <div className="rounded-lg bg-red-900/30 border border-red-800 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">
                Riferimento <span className="text-red-400">*</span>
              </label>
              <Select value={categoria || undefined} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue placeholder="Seleziona un riferimento" /></SelectTrigger>
                <SelectContent>
                  {TICKET_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">
                Oggetto <span className="text-red-400">*</span>
              </label>
              <Input
                type="text"
                value={oggetto}
                onChange={(e) => setOggetto(e.target.value)}
                placeholder="Descrivi brevemente il problema o la richiesta"
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">
                Messaggio <span className="text-gray-500 font-normal">(opzionale)</span>
              </label>
              <Textarea
                value={messaggio}
                onChange={(e) => setMessaggio(e.target.value)}
                placeholder="Aggiungi dettagli o contesto..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="quick-priority" className="block text-sm font-medium text-gray-300">
                Priorità
              </label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger id="quick-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>{TICKET_PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white">
                {loading ? 'Apertura…' : 'Apri ticket'}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                Annulla
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
