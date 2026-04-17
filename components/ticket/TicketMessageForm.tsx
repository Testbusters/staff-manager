'use client';

import { useState, useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { TicketStatus } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage, useForm, zodResolver } from '@/components/ui/form';
import { ticketMessageSchema, type TicketMessageFormValues } from '@/lib/schemas/ticket';
import { toast } from 'sonner';

export default function TicketMessageForm({
  ticketId,
  ticketStato,
}: {
  ticketId: string;
  ticketStato: TicketStatus;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const form = useForm<TicketMessageFormValues>({
    resolver: zodResolver(ticketMessageSchema),
    defaultValues: { message: '' },
  });

  async function onSubmit(values: TicketMessageFormValues) {
    setSending(true);

    const fd = new FormData();
    fd.append('message', values.message.trim());
    const file = fileRef.current?.files?.[0];
    if (file) fd.append('file', file);

    const res = await fetch(`/api/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: fd,
    });

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Errore durante l'invio del messaggio.", { duration: 5000 });
      setSending(false);
      return;
    }

    form.reset();
    setFileName(null);
    if (fileRef.current) fileRef.current.value = '';
    setSending(false);
    router.refresh();
  }

  if (ticketStato === 'CHIUSO') return null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField control={form.control} name="message" render={({ field }) => (
          <FormItem>
            <FormControl>
              <Textarea {...field} placeholder="Scrivi un messaggio…" aria-label="Messaggio" rows={4} className="resize-none" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* File attachment */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="ticket-file"
              className="cursor-pointer rounded-lg border border-border bg-muted hover:bg-accent px-3 py-1.5 text-xs text-muted-foreground transition"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0" />Allega file
            </label>
            <input
              id="ticket-file"
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
            {fileName && (
              <span className="text-xs text-muted-foreground max-w-[160px] truncate">{fileName}</span>
            )}
          </div>

          <Button type="submit" disabled={sending || !form.watch('message').trim()} className="bg-brand hover:bg-brand/90 text-white">
            {sending ? 'Invio…' : 'Invia risposta'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
