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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, useForm, zodResolver } from '@/components/ui/form';
import { createTicketSchema, type CreateTicketFormValues } from '@/lib/schemas/ticket';
import { toast } from 'sonner';

export default function TicketQuickModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateTicketFormValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { categoria: '', oggetto: '', messaggio: '', priority: 'NORMALE' },
  });

  async function onSubmit(values: CreateTicketFormValues) {
    setLoading(true);

    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoria: values.categoria,
        priority: values.priority,
        oggetto: values.oggetto.trim(),
        messaggio: values.messaggio?.trim() || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? 'Errore durante la creazione del ticket.', { duration: 5000 });
      setLoading(false);
      return;
    }

    router.push(`/ticket/${data.ticket.id}`);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="shrink-0 bg-brand hover:bg-brand/90 text-white">
        Apri ticket
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) form.reset(); setOpen(v); }}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">Apri un ticket</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
              <FormField control={form.control} name="categoria" render={({ field }) => (
                <FormItem>
                  <FormLabel>Riferimento <span className="text-destructive">*</span></FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleziona un riferimento" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {TICKET_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="oggetto" render={({ field }) => (
                <FormItem>
                  <FormLabel>Oggetto <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Descrivi brevemente il problema o la richiesta" maxLength={200} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="messaggio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Messaggio <span className="text-muted-foreground font-normal">(opzionale)</span></FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Aggiungi dettagli o contesto..." rows={4} className="resize-none" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Priorità</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((p) => (
                        <SelectItem key={p} value={p}>{TICKET_PRIORITY_LABELS[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex items-center gap-3 pt-1">
                <Button type="submit" disabled={loading} className="bg-brand hover:bg-brand/90 text-white">
                  {loading ? 'Apertura…' : 'Apri ticket'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { form.reset(); setOpen(false); }}>
                  Annulla
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
