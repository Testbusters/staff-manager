'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, useForm, zodResolver } from '@/components/ui/form';
import { createCorsoSchema, type CreateCorsoFormValues } from '@/lib/schemas/corso';
import type { Corso, CorsoStato } from '@/lib/types';

interface Props {
  mode: 'create' | 'edit';
  initialData?: Corso & { stato: CorsoStato };
  communities: { id: string; name: string }[];
  cittaList: string[];
  materieList: string[];
}


export default function CorsoForm({ mode, initialData, communities, cittaList }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CreateCorsoFormValues>({
    resolver: zodResolver(createCorsoSchema),
    defaultValues: {
      nome: initialData?.nome ?? '',
      codice_identificativo: initialData?.codice_identificativo ?? '',
      community_id: initialData?.community_id ?? (communities[0]?.id ?? ''),
      modalita: initialData?.modalita ?? 'online',
      citta: initialData?.citta ?? '',
      linea: initialData?.linea ?? '',
      responsabile_doc: initialData?.responsabile_doc ?? '',
      licenza_zoom: initialData?.licenza_zoom ?? '',
      data_inizio: initialData?.data_inizio ?? '',
      data_fine: initialData?.data_fine ?? '',
      max_docenti_per_lezione: initialData?.max_docenti_per_lezione ?? 8,
      max_qa_per_lezione: initialData?.max_qa_per_lezione ?? 6,
      link_lw: initialData?.link_lw ?? '',
      link_zoom: initialData?.link_zoom ?? '',
      link_telegram_corsisti: initialData?.link_telegram_corsisti ?? '',
      link_qa_assignments: initialData?.link_qa_assignments ?? '',
      link_questionari: initialData?.link_questionari ?? '',
      link_emergenza: initialData?.link_emergenza ?? '',
    },
  });

  const modalita = form.watch('modalita');

  async function onSubmit(values: CreateCorsoFormValues) {
    setSaving(true);
    setError(null);

    const payload = {
      ...values,
      citta: values.citta || null,
      linea: values.linea || null,
      responsabile_doc: values.responsabile_doc || null,
      licenza_zoom: values.licenza_zoom || null,
      link_lw: values.link_lw || null,
      link_zoom: values.link_zoom || null,
      link_telegram_corsisti: values.link_telegram_corsisti || null,
      link_qa_assignments: values.link_qa_assignments || null,
      link_questionari: values.link_questionari || null,
      link_emergenza: values.link_emergenza || null,
      max_docenti_per_lezione: values.max_docenti_per_lezione ?? 8,
      max_qa_per_lezione: values.max_qa_per_lezione ?? 6,
    };

    const url = mode === 'create' ? '/api/corsi' : `/api/corsi/${initialData!.id}`;
    const method = mode === 'create' ? 'POST' : 'PATCH';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Errore durante il salvataggio');
        return;
      }
      if (mode === 'create') {
        router.push(`/corsi/${json.corso.id}`);
      } else {
        toast.success('Corso aggiornato');
        router.refresh();
      }
    } catch {
      setError('Errore di rete');
      toast.error('Errore di rete');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="rounded-2xl bg-card border border-border p-6 space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="nome" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Nome <span className="text-destructive">*</span></FormLabel>
            <FormControl><Input {...field} placeholder="Corso Medicina 2026" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="codice_identificativo" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Codice identificativo <span className="text-destructive">*</span></FormLabel>
            <FormControl><Input {...field} placeholder="MED-2026-01" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="community_id" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Community <span className="text-destructive">*</span></FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl><SelectTrigger><SelectValue placeholder="Seleziona community" /></SelectTrigger></FormControl>
              <SelectContent>
                {communities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="modalita" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Modalità <span className="text-destructive">*</span></FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="in_aula">In aula</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="citta" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Città</FormLabel>
            <Select value={field.value || '__candidatura__'} onValueChange={(v) => field.onChange(v === '__candidatura__' ? '' : v)}>
              <FormControl><SelectTrigger><SelectValue placeholder="Aperta a candidatura" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="__candidatura__">Aperta a candidatura città</SelectItem>
                {cittaList.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="linea" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Linea</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ''} placeholder="Linea A" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="data_inizio" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Data inizio <span className="text-destructive">*</span></FormLabel>
            <FormControl><Input type="date" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="data_fine" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Data fine <span className="text-destructive">*</span></FormLabel>
            <FormControl><Input type="date" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="max_docenti_per_lezione" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Max docenti per lezione</FormLabel>
            <FormControl>
              <Input type="number" min={1} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10) || 0)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        {modalita === 'online' && (
          <FormField control={form.control} name="max_qa_per_lezione" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Max Q&A per lezione</FormLabel>
              <FormControl>
                <Input type="number" min={0} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10) || 0)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="responsabile_doc" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Responsabile DOC</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ''} placeholder="Nome responsabile" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="licenza_zoom" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Licenza Zoom</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ''} placeholder="licenza@email.com" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-sm font-medium text-muted-foreground mb-3">Link utili</p>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="link_lw" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Link LW</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ''} placeholder="https://..." /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="link_zoom" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Link Zoom</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ''} placeholder="https://..." /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="link_telegram_corsisti" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Telegram corsisti</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ''} placeholder="https://t.me/..." /></FormControl>
            </FormItem>
          )} />
          {modalita === 'online' && (
            <FormField control={form.control} name="link_qa_assignments" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Q&A assignments</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ''} placeholder="https://..." /></FormControl>
              </FormItem>
            )} />
          )}
          <FormField control={form.control} name="link_questionari" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Questionari</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ''} placeholder="https://..." /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="link_emergenza" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Emergenza</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ''} placeholder="https://..." /></FormControl>
            </FormItem>
          )} />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={saving}
          className="bg-brand hover:bg-brand/90 text-white"
        >
          {saving ? 'Salvataggio…' : mode === 'create' ? 'Crea corso' : 'Salva modifiche'}
        </Button>
        {mode === 'create' && (
          <Button type="button" variant="outline" onClick={() => router.push('/corsi')}>
            Annulla
          </Button>
        )}
      </div>
      </form>
    </Form>
  );
}
