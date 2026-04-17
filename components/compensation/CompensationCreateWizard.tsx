'use client';

import { useState, useEffect, useCallback } from 'react';
import { Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, useForm, zodResolver } from '@/components/ui/form';
import { compensationWizardSchema, type CompensationWizardFormValues } from '@/lib/schemas/compensation';
import { calcRitenuta } from '@/lib/ritenuta';

type Community = { id: string; name: string };

type CollaboratorResult = {
  id: string;
  nome: string;
  cognome: string;
  username: string | null;
  codice_fiscale: string | null;
  is_active: boolean;
  member_status: string | null;
  communities: Community[];
};

type WizardStep = 'step1' | 'step2' | 'step3';

type Competenza = { key: string; label: string };

function formatCurrency(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {([1, 2, 3] as const).map((step) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
              step === current
                ? 'bg-brand text-white'
                : step < current
                ? 'bg-green-700 dark:bg-green-800 text-white'
                : 'bg-accent text-muted-foreground'
            }`}
          >
            {step}
          </div>
          {step < 3 && <div className="w-8 h-px bg-accent" />}
        </div>
      ))}
      <span className="ml-2 text-xs text-muted-foreground">{current} di 3</span>
    </div>
  );
}

export default function CompensationCreateWizard({
  managedCommunities,
  competenze,
}: {
  managedCommunities: Community[];
  competenze: Competenza[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>('step1');

  // Step 1 state
  const [searchQ, setSearchQ] = useState('');
  const [communityFilter, setCommunityFilter] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [collaborators, setCollaborators] = useState<CollaboratorResult[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedCollab, setSelectedCollab] = useState<CollaboratorResult | null>(null);

  // Step 2 state (react-hook-form)
  const form = useForm<CompensationWizardFormValues>({
    resolver: zodResolver(compensationWizardSchema),
    defaultValues: {
      data_competenza: '',
      nome_servizio_ruolo: '',
      competenza: '',
      info_specifiche: '',
      importo_lordo: '',
    },
  });

  // Step 3 state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetchCollaborators = useCallback(async () => {
    setLoadingSearch(true);
    try {
      const params = new URLSearchParams();
      if (searchQ) params.set('q', searchQ);
      if (communityFilter) params.set('community_id', communityFilter);
      params.set('active_only', String(activeOnly));
      const res = await fetch(`/api/admin/collaboratori?${params}`);
      if (res.ok) {
        const json = await res.json();
        setCollaborators(json.collaborators ?? []);
      }
    } finally {
      setLoadingSearch(false);
    }
  }, [searchQ, communityFilter, activeOnly]);

  useEffect(() => {
    if (step === 'step1') {
      const timeout = setTimeout(fetchCollaborators, 300);
      return () => clearTimeout(timeout);
    }
  }, [step, fetchCollaborators]);

  function handleSelectCollab(c: CollaboratorResult) {
    setSelectedCollab(c);
    setStep('step2');
  }

  async function handleStep2Next() {
    const valid = await form.trigger(['nome_servizio_ruolo', 'data_competenza', 'competenza', 'importo_lordo']);
    if (!valid) return;
    setStep('step3');
  }

  async function handleSubmit() {
    if (!selectedCollab) return;
    setSubmitting(true);
    setSubmitError('');

    const values = form.getValues();
    const lordo = parseFloat(values.importo_lordo);
    const communityName = selectedCollab.communities[0]?.name ?? '';
    const ritenuta = calcRitenuta(communityName, lordo);
    const netto = Math.round((lordo - ritenuta) * 100) / 100;

    const payload: Record<string, unknown> = {
      collaborator_id: selectedCollab.id,
      nome_servizio_ruolo: values.nome_servizio_ruolo.trim(),
      data_competenza: values.data_competenza,
      competenza: values.competenza,
      importo_lordo: lordo,
      ritenuta_acconto: ritenuta,
      importo_netto: netto,
    };
    if (values.info_specifiche?.trim()) payload.info_specifiche = values.info_specifiche.trim();

    try {
      const res = await fetch('/api/compensations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json();
        setSubmitError(json.error ?? 'Errore nella creazione del compenso');
        return;
      }
      router.push('/approvazioni?tab=compensi');
    } catch {
      setSubmitError('Errore di rete. Riprova.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Choice screen ──────────────────────────────────────────────────────────
  // ── Step 1 — Seleziona collaboratore ──────────────────────────────────────
  if (step === 'step1') {
    return (
      <div className="p-6 max-w-3xl">
        <div className="mb-2">
          <h1 className="text-xl font-semibold text-foreground">Carica compensi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Seleziona il collaboratore</p>
        </div>
        <StepIndicator current={1} />

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            type="text"
            placeholder="Cerca per nome, cognome o username..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="flex-1"
          />
          <Select value={communityFilter || 'all'} onValueChange={(v) => setCommunityFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-auto"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le community</SelectItem>
              {managedCommunities.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
            <Checkbox
              checked={activeOnly}
              onCheckedChange={(v) => setActiveOnly(!!v)}
            />
            Solo attivi
          </label>
        </div>

        <Card>
          <CardContent className="overflow-hidden p-0">
          {loadingSearch ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-24 hidden sm:block" />
                  <Skeleton className="h-4 w-28 hidden md:block" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : collaborators.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">
              {searchQ || communityFilter ? 'Nessun collaboratore trovato.' : 'Inserisci un termine di ricerca o seleziona una community.'}
            </p>
          ) : (
            <Table className="w-auto">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Username</TableHead>
                  <TableHead className="hidden md:table-cell">Community</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {collaborators.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/60">
                    <TableCell className="text-foreground">
                      {c.cognome} {c.nome}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {c.username ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {c.communities.map((cc) => cc.name).join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectCollab(c)}
                      >
                        Seleziona →
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          </CardContent>
        </Card>

        <div className="mt-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
          >
            ← Indietro
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 2 — Dati compenso ────────────────────────────────────────────────
  if (step === 'step2' && selectedCollab) {
    const importoLordoRaw = form.watch('importo_lordo');
    const lordo = parseFloat(importoLordoRaw) || 0;
    const communityName = selectedCollab.communities[0]?.name ?? '';
    const ritenuta = calcRitenuta(communityName, lordo);
    const netto = Math.round((lordo - ritenuta) * 100) / 100;

    return (
      <div className="p-6 max-w-xl">
        <div className="mb-2">
          <h1 className="text-xl font-semibold text-foreground">Carica compensi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Dati del compenso per {selectedCollab.cognome} {selectedCollab.nome}
          </p>
        </div>
        <StepIndicator current={2} />

        <Form {...form}>
          <div className="space-y-4">
            <FormField control={form.control} name="nome_servizio_ruolo" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Nome servizio / Ruolo <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input type="text" {...field} placeholder="Es. Compenso lezioni marzo" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="data_competenza" render={() => (
              <FormItem>
                <FormLabel className="text-xs">Data di competenza <span className="text-destructive">*</span></FormLabel>
                <Controller
                  control={form.control}
                  name="data_competenza"
                  render={({ field: { value, onChange } }) => (
                    <DatePicker value={value} onChange={onChange} />
                  )}
                />
                <FormMessage />
              </FormItem>
            )} />

            {competenze.length > 0 && (
              <FormField control={form.control} name="competenza" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Competenza <span className="text-destructive">*</span></FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="— Nessuna —" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {competenze.map((c) => (
                        <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="info_specifiche" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Info specifiche <span className="text-muted-foreground">(opzionale)</span></FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} className="resize-none" placeholder="Note aggiuntive sul compenso" />
                </FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="importo_lordo" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Importo lordo (€) <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field} placeholder="0,00" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {lordo > 0 && (
              <div className="rounded-lg bg-muted/60 border border-border p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ritenuta d&apos;acconto (20%)</span>
                  <span className="text-red-600 dark:text-red-400 tabular-nums">-{formatCurrency(ritenuta)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-foreground">Importo netto</span>
                  <span className="text-green-700 dark:text-green-400 tabular-nums">{formatCurrency(netto)}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() => setStep('step1')}
              >
                ← Indietro
              </Button>
              <Button
                onClick={handleStep2Next}
                className="bg-brand hover:bg-brand/90 text-white"
              >
                Avanti →
              </Button>
            </div>
          </div>
        </Form>
      </div>
    );
  }

  // ── Step 3 — Riepilogo ────────────────────────────────────────────────────
  if (step === 'step3' && selectedCollab) {
    const formValues = form.getValues();
    const lordo = parseFloat(formValues.importo_lordo) || 0;
    const communityName = selectedCollab.communities[0]?.name ?? '';
    const ritenuta = calcRitenuta(communityName, lordo);
    const netto = Math.round((lordo - ritenuta) * 100) / 100;
    const competenzaLabel = competenze.find((c) => c.key === formValues.competenza)?.label;

    const rows: { label: string; value: string }[] = [
      { label: 'Collaboratore', value: `${selectedCollab.cognome} ${selectedCollab.nome}` },
      { label: 'Stato', value: 'In attesa' },
    ];
    if (competenzaLabel) rows.push({ label: 'Competenza', value: competenzaLabel });
    if (formValues.data_competenza) rows.push({ label: 'Data competenza', value: new Date(formValues.data_competenza).toLocaleDateString('it-IT') });
    if (formValues.nome_servizio_ruolo.trim()) rows.push({ label: 'Nome servizio / Ruolo', value: formValues.nome_servizio_ruolo.trim() });
    if (formValues.info_specifiche?.trim()) rows.push({ label: 'Info specifiche', value: formValues.info_specifiche.trim() });
    rows.push(
      { label: 'Importo lordo', value: formatCurrency(lordo) },
      { label: 'Ritenuta acconto', value: `-${formatCurrency(ritenuta)}` },
      { label: 'Importo netto', value: formatCurrency(netto) },
    );

    return (
      <div className="p-6 max-w-xl">
        <div className="mb-2">
          <h1 className="text-xl font-semibold text-foreground">Carica compensi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Riepilogo</p>
        </div>
        <StepIndicator current={3} />

        <Card>
          <CardContent className="divide-y divide-border p-0">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <span className="text-sm text-foreground">{row.value}</span>
            </div>
          ))}
          </CardContent>
        </Card>

        {submitError && (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400">{submitError}</p>
        )}

        <div className="flex items-center justify-between mt-4">
          <Button
            variant="ghost"
            onClick={() => setStep('step2')}
            disabled={submitting}
          >
            ← Indietro
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-brand hover:bg-brand/90 text-white"
          >
            {submitting ? 'Creazione...' : 'Crea compenso'}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
