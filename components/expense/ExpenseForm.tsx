'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { EXPENSE_CATEGORIES } from '@/lib/types';
import type { ExpenseCategory } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FormData {
  categoria: ExpenseCategory | '';
  data_spesa: string;
  importo: string;
  descrizione: string;
}

const INITIAL_FORM: FormData = {
  categoria: '',
  data_spesa: '',
  importo: '',
  descrizione: '',
};


function formatCurrency(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

function ProgressBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-1.5 mb-6">
      {([1, 2, 3] as const).map((s) => (
        <div
          key={s}
          className={`h-1 flex-1 rounded-full transition-colors ${
            s < step ? 'bg-brand' : s === step ? 'bg-brand' : 'bg-accent'
          }`}
        />
      ))}
    </div>
  );
}

export default function ExpenseForm() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const set = (field: keyof FormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const importoNum = parseFloat(form.importo);
  const step1Valid =
    form.categoria !== '' &&
    form.data_spesa !== '' &&
    !isNaN(importoNum) && importoNum > 0;

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

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // 1. Create expense (always INVIATO)
      const body: Record<string, unknown> = {
        categoria: form.categoria,
        data_spesa: form.data_spesa,
        importo: importoNum,
      };
      if (form.descrizione.trim()) body.descrizione = form.descrizione.trim();

      const createRes = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error ?? 'Errore creazione rimborso');

      const expenseId: string = createData.reimbursement.id;

      // 2. Upload files to Supabase Storage (bucket: 'expenses')
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
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      {/* Step indicator */}
      <div className="mb-5">
        <p className="text-xs text-muted-foreground mb-2">Step {step} di 3</p>
        <ProgressBar step={step} />
      </div>

      {/* ── Step 1 — Dati rimborso ─────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <h2 className="text-base font-semibold text-foreground">Dati rimborso</h2>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">
              Categoria <span className="text-red-500">*</span>
            </label>
            <Select value={form.categoria || undefined} onValueChange={(v) => set('categoria', v)}>
              <SelectTrigger><SelectValue placeholder="— Seleziona —" /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">
                Data spesa <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={form.data_spesa}
                onChange={(e) => set('data_spesa', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">
                Importo (€) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.importo}
                onChange={(e) => set('importo', e.target.value)}
                placeholder="0.00"
              />
              {!isNaN(importoNum) && importoNum > 0 && (
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">{formatCurrency(importoNum)}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">
              Descrizione{' '}
              <span className="text-muted-foreground">(opzionale)</span>
            </label>
            <Textarea
              value={form.descrizione}
              onChange={(e) => set('descrizione', e.target.value)}
              rows={3}
              placeholder="Descrivi la spesa sostenuta…"
            />
          </div>

          <div className="flex justify-between pt-1">
            <Button type="button" variant="outline" onClick={() => router.push('/rimborsi')}>
              ← Annulla
            </Button>
            <Button onClick={() => setStep(2)} disabled={!step1Valid} className="bg-brand hover:bg-brand/90 text-white">
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
            <Button onClick={() => setStep(3)} disabled={files.length === 0} className="bg-brand hover:bg-brand/90 text-white">
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
              <dd className="text-sm text-foreground">{form.categoria}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-xs text-muted-foreground">Data spesa</dt>
              <dd className="text-sm text-foreground">
                {new Date(form.data_spesa + 'T00:00:00').toLocaleDateString('it-IT')}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-xs text-muted-foreground">Importo</dt>
              <dd className="text-sm font-semibold text-green-700 dark:text-green-400">{formatCurrency(importoNum)}</dd>
            </div>
            {form.descrizione.trim() && (
              <div className="flex justify-between py-2.5 gap-4">
                <dt className="text-xs text-muted-foreground shrink-0">Descrizione</dt>
                <dd className="text-sm text-foreground text-right">{form.descrizione.trim()}</dd>
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
    </div>
  );
}
