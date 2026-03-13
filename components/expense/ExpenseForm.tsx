'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { EXPENSE_CATEGORIES } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';

const expenseSchema = z.object({
  categoria: z.string().min(1, 'Seleziona una categoria'),
  data_spesa: z.string().min(1, 'Data obbligatoria'),
  importo: z.string().min(1, 'Importo obbligatorio').refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
    { message: 'Importo deve essere maggiore di 0' },
  ),
  descrizione: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

function formatCurrency(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

const STEP_LABELS: Record<1 | 2 | 3, string> = { 1: 'Dati', 2: 'Allegati', 3: 'Riepilogo' };

function ProgressBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="mb-6">
      <div className="flex gap-1.5 mb-1.5">
        {([1, 2, 3] as const).map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-brand' : 'bg-accent'
            }`}
          />
        ))}
      </div>
      <div className="flex">
        {([1, 2, 3] as const).map((s) => (
          <div key={s} className="flex-1 text-center">
            <span className={`text-[10px] font-medium ${s === step ? 'text-brand' : s < step ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
              {STEP_LABELS[s]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExpenseForm() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { categoria: undefined, data_spesa: '', importo: '', descrizione: '' },
  });

  const watchImporto = form.watch('importo');
  const watchDataSpesa = form.watch('data_spesa');
  const importoNum = parseFloat(watchImporto);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...selected.filter((f) => !names.has(f.name))];
    });
    e.target.value = '';
  };

  const removeFile = (name: string) =>
    setFiles((prev) => prev.filter((f) => f.name !== name));

  async function handleStep1Next() {
    const valid = await form.trigger(['categoria', 'data_spesa', 'importo']);
    if (valid) setStep(2);
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        categoria: values.categoria,
        data_spesa: values.data_spesa,
        importo: parseFloat(values.importo),
      };
      if (values.descrizione?.trim()) body.descrizione = values.descrizione.trim();

      const createRes = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error ?? 'Errore creazione rimborso');

      const expenseId: string = createData.reimbursement.id;

      if (files.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Sessione scaduta');

        const uploadFailed: string[] = [];

        for (const file of files) {
          const path = `${user.id}/${expenseId}/${file.name}`;
          const { error: uploadErr } = await supabase.storage
            .from('expenses')
            .upload(path, file, { upsert: true });

          if (uploadErr) {
            uploadFailed.push(`${file.name}: ${uploadErr.message}`);
            continue;
          }

          const { data: urlData } = supabase.storage.from('expenses').getPublicUrl(path);

          await fetch(`/api/expenses/${expenseId}/attachments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_url: urlData.publicUrl, file_name: file.name }),
          });
        }

        if (uploadFailed.length > 0) {
          toast.error(
            `Rimborso salvato, ma ${uploadFailed.length} allegato/i non caricato/i: ${uploadFailed.join(', ')}`,
            { duration: 5000 },
          );
          setLoading(false);
          router.push(`/rimborsi/${expenseId}`);
          return;
        }
      }

      router.push('/rimborsi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore imprevisto', { duration: 5000 });
      setLoading(false);
    }
  });

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      {/* Step indicator */}
      <div className="mb-5">
        <ProgressBar step={step} />
      </div>

      <Form {...form}>
        {/* ── Step 1 — Dati rimborso ─────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-foreground">Dati rimborso</h2>

            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria <span className="text-destructive">*</span></FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="— Seleziona —" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data_spesa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data spesa <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="importo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importo (€) <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        {...field}
                        placeholder="0.00"
                      />
                    </FormControl>
                    {!isNaN(importoNum) && importoNum > 0 && (
                      <p className="text-xs text-green-700 dark:text-green-400">{formatCurrency(importoNum)}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descrizione"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione <span className="text-muted-foreground">(opzionale)</span></FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      placeholder="Descrivi la spesa sostenuta…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-xs text-muted-foreground">
              Al passo successivo dovrai allegare almeno un documento giustificativo.
            </p>

            <div className="flex justify-between pt-1">
              <Button type="button" variant="outline" onClick={() => router.push('/rimborsi')}>
                ← Annulla
              </Button>
              <Button type="button" onClick={handleStep1Next} className="bg-brand hover:bg-brand/90 text-white">
                Avanti →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2 — Allegati ─────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-foreground">Allegati</h2>

            <div>
              <label className="block text-xs text-muted-foreground mb-2">
                Documenti giustificativi{' '}
                <span className="text-muted-foreground">(PDF, JPG, PNG — max 10 MB ciascuno — obbligatori, almeno uno)</span>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-6 cursor-pointer hover:border-border transition">
                <svg className="w-5 h-5 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="text-sm text-muted-foreground">Clicca per selezionare file</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {files.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {files.map((f) => (
                    <li key={f.name} className="flex items-center gap-3 rounded-lg bg-muted border border-border px-3 py-2">
                      <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="flex-1 text-sm text-foreground truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                      <button
                        onClick={() => removeFile(f.name)}
                        className="shrink-0 text-muted-foreground hover:text-red-400 transition"
                        aria-label="Rimuovi"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-between pt-1">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                ← Indietro
              </Button>
              <Button type="button" onClick={() => setStep(3)} disabled={files.length === 0} className="bg-brand hover:bg-brand/90 text-white">
                Avanti →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3 — Riepilogo ────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-foreground">Riepilogo</h2>

            <dl className="divide-y divide-border">
              <div className="flex justify-between py-2.5">
                <dt className="text-xs text-muted-foreground">Categoria</dt>
                <dd className="text-sm text-foreground">{form.getValues('categoria')}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-xs text-muted-foreground">Data spesa</dt>
                <dd className="text-sm text-foreground">
                  {watchDataSpesa ? new Date(watchDataSpesa + 'T00:00:00').toLocaleDateString('it-IT') : '—'}
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-xs text-muted-foreground">Importo</dt>
                <dd className="text-sm font-semibold text-green-700 dark:text-green-400">{formatCurrency(importoNum)}</dd>
              </div>
              {form.getValues('descrizione')?.trim() && (
                <div className="flex justify-between py-2.5 gap-4">
                  <dt className="text-xs text-muted-foreground shrink-0">Descrizione</dt>
                  <dd className="text-sm text-foreground text-right">{form.getValues('descrizione')?.trim()}</dd>
                </div>
              )}
              <div className="flex justify-between py-2.5">
                <dt className="text-xs text-muted-foreground">Allegati</dt>
                <dd className="text-sm text-foreground">
                  {files.length === 0 ? (
                    <span className="text-muted-foreground">Nessuno</span>
                  ) : (
                    <span>{files.length} {files.length === 1 ? 'file' : 'file'}</span>
                  )}
                </dd>
              </div>
              {files.length > 0 && (
                <div className="py-2">
                  <ul className="space-y-1 text-right">
                    {files.map((f) => (
                      <li key={f.name} className="text-xs text-muted-foreground">{f.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </dl>

            <div className="flex justify-between pt-1">
              <Button type="button" variant="ghost" onClick={() => setStep(2)} disabled={loading}>
                ← Indietro
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="bg-brand hover:bg-brand/90 text-white">
                {loading ? 'Invio in corso…' : 'Conferma e invia'}
              </Button>
            </div>
          </div>
        )}
      </Form>
    </div>
  );
}
