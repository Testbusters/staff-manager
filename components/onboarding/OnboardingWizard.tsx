'use client';

import { useState, useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { TSHIRT_SIZES } from '@/lib/types';
import type { ContractTemplateType } from '@/lib/types';
import { generateUsername } from '@/lib/username';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, useForm, zodResolver } from '@/components/ui/form';
import { onboardingSchema, type OnboardingFormValues } from '@/lib/schemas/collaborator';

type PrefillData = {
  nome: string | null;
  cognome: string | null;
  username: string | null;
  codice_fiscale: string | null;
  data_nascita: string | null;
  luogo_nascita: string | null;
  provincia_nascita: string | null;
  comune: string | null;
  provincia_residenza: string | null;
  indirizzo: string | null;
  civico_residenza: string | null;
  telefono: string | null;
  iban: string | null;
  intestatario_pagamento: string | null;
  tshirt_size: string | null;
  sono_un_figlio_a_carico: boolean;
  importo_lordo_massimale: number | null;
  citta: string | null;
} | null;

type LookupOption = { id: string; nome: string };

interface Props {
  prefill: PrefillData;
  tipoContratto: ContractTemplateType | null;
  tipoLabel: string | null;
  community: string;
}

const sectionTitle = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 mt-1';

export default function OnboardingWizard({ prefill, tipoContratto, tipoLabel, community }: Props) {
  const router = useRouter();

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onTouched',
    defaultValues: {
      nome:                     prefill?.nome ?? '',
      cognome:                  prefill?.cognome ?? '',
      codice_fiscale:           prefill?.codice_fiscale ?? null,
      data_nascita:             prefill?.data_nascita ?? null,
      luogo_nascita:            prefill?.luogo_nascita ?? null,
      provincia_nascita:        prefill?.provincia_nascita ?? null,
      comune:                   prefill?.comune ?? null,
      provincia_residenza:      prefill?.provincia_residenza ?? null,
      indirizzo:                prefill?.indirizzo ?? null,
      civico_residenza:         prefill?.civico_residenza ?? null,
      telefono:                 prefill?.telefono ?? null,
      iban:                     prefill?.iban ?? '',
      intestatario_pagamento:   prefill?.intestatario_pagamento ?? null,
      tshirt_size:              (prefill?.tshirt_size as OnboardingFormValues['tshirt_size']) ?? null,
      sono_un_figlio_a_carico:  prefill?.sono_un_figlio_a_carico ?? false,
      importo_lordo_massimale:  prefill?.importo_lordo_massimale ?? null,
      citta:                    prefill?.citta ?? '',
      materie_insegnate:        [],
    },
  });

  // Activity — città e materie (lookup options)
  const [cittaOptions, setCittaOptions]       = useState<LookupOption[]>([]);
  const [materiaOptions, setMateriaOptions]   = useState<LookupOption[]>([]);

  useEffect(() => {
    const comm = community || 'testbusters';
    fetch(`/api/lookup-options?type=citta&community=${comm}`)
      .then((r) => r.json()).then((d) => setCittaOptions(d.options ?? [])).catch(() => {});
    fetch(`/api/lookup-options?type=materia&community=${comm}`)
      .then((r) => r.json()).then((d) => setMateriaOptions(d.options ?? [])).catch(() => {});
  }, [community]);

  // Username preview (readonly — shows pre-set or computed from nome+cognome)
  const watchedNome = form.watch('nome');
  const watchedCognome = form.watch('cognome');
  const previewUsername = prefill?.username ?? generateUsername(watchedNome, watchedCognome);

  // Step tracking
  const [step, setStep]           = useState<1 | 2>(1);
  const [loading, setLoading]     = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [contractGenerated, setContractGenerated] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Validate step 1 — watch all fields to derive button-disabled state
  const w = form.watch();
  const step1Valid =
    (w.nome ?? '').trim() !== '' && (w.cognome ?? '').trim() !== '' &&
    (w.codice_fiscale ?? '').trim() !== '' &&
    !!w.data_nascita && (w.luogo_nascita ?? '').trim() !== '' &&
    (w.provincia_nascita ?? '').trim() !== '' &&
    (w.comune ?? '').trim() !== '' && (w.provincia_residenza ?? '').trim() !== '' &&
    (w.indirizzo ?? '').trim() !== '' && (w.civico_residenza ?? '').trim() !== '' &&
    (w.telefono ?? '').trim() !== '' && (w.iban ?? '').trim() !== '' &&
    (w.intestatario_pagamento ?? '').trim() !== '' && !!w.tshirt_size &&
    (w.citta ?? '').trim() !== '' &&
    (w.materie_insegnate ?? []).length > 0 &&
    w.importo_lordo_massimale != null && w.importo_lordo_massimale > 0 && w.importo_lordo_massimale <= 5000;

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    const v = form.getValues();

    const res = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome:                     (v.nome ?? '').trim(),
        cognome:                  (v.cognome ?? '').trim(),
        codice_fiscale:           (v.codice_fiscale ?? '').trim().toUpperCase(),
        data_nascita:             v.data_nascita,
        luogo_nascita:            (v.luogo_nascita ?? '').trim(),
        provincia_nascita:        (v.provincia_nascita ?? '').trim().toUpperCase(),
        comune:                   (v.comune ?? '').trim(),
        provincia_residenza:      (v.provincia_residenza ?? '').trim().toUpperCase(),
        indirizzo:                (v.indirizzo ?? '').trim(),
        civico_residenza:         (v.civico_residenza ?? '').trim(),
        telefono:                 (v.telefono ?? '').trim(),
        iban:                     (v.iban ?? '').trim().toUpperCase().replace(/\s/g, ''),
        intestatario_pagamento:   (v.intestatario_pagamento ?? '').trim(),
        tshirt_size:              v.tshirt_size,
        sono_un_figlio_a_carico:  v.sono_un_figlio_a_carico,
        importo_lordo_massimale:  v.importo_lordo_massimale,
        citta:                    (v.citta ?? '').trim(),
        materie_insegnate:        v.materie_insegnate,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error ?? 'Errore durante il salvataggio.', { duration: 5000 });
      return;
    }

    if (data.download_url) {
      setDownloadUrl(data.download_url);
      setContractGenerated(true);
    } else {
      // No template available or generation failed — onboarding still completed
      setOnboardingCompleted(true);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    window.open(downloadUrl, '_blank');
  };

  const handleFinish = () => {
    router.push('/profilo?tab=documenti');
    router.refresh();
  };

  // ── Step 2 — contratto ───────────────────────────────────────
  if (step === 2) {
    return (
      <Card>
        <CardContent className="p-6 space-y-6">
        <Progress value={100} className="w-full" />
        {/* Progress */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs text-muted-foreground">Dati personali</span>
          </div>
          <div className="flex-1 h-px bg-accent" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-xs font-bold text-white">2</div>
            <span className="text-xs text-foreground font-medium">Contratto</span>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground mb-1">Il tuo contratto</h2>
          <p className="text-sm text-muted-foreground">
            Tipologia:{' '}
            <span className="text-foreground font-medium">{tipoLabel ?? tipoContratto}</span>
          </p>
        </div>

        {onboardingCompleted ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Account configurato</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Il tuo profilo è stato salvato correttamente. Puoi accedere alla piattaforma.
              </p>
            </div>
            <Button onClick={handleFinish} className="w-full bg-brand hover:bg-brand/90 text-white">
              Accedi alla piattaforma
            </Button>
          </div>
        ) : contractGenerated && downloadUrl ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Contratto generato</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Il contratto è stato generato con i tuoi dati. Puoi scaricarne una copia. La firma avverrà digitalmente nella sezione <strong className="text-foreground">Documenti</strong>, dove l&apos;amministrazione caricherà il documento da firmare.
              </p>
            </div>

            <button
              onClick={handleDownload}
              className="w-full rounded-lg bg-accent hover:bg-muted py-2.5 text-sm font-medium text-foreground transition flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Scarica contratto
            </button>

            <Button onClick={handleFinish} className="w-full bg-brand hover:bg-brand/90 text-white">
              Ho scaricato il contratto — Accedi alla piattaforma
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {tipoContratto ? (
              <p className="text-sm text-muted-foreground">
                Clicca il pulsante per generare il tuo contratto precompilato con i dati inseriti.
              </p>
            ) : (
              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/40 p-3">
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  Nessun tipo di rapporto associato al tuo account. Contatta l&apos;amministrazione.
                </p>
              </div>
            )}

            {tipoContratto ? (
              <Button
                onClick={handleCompleteOnboarding}
                disabled={loading}
                className="w-full bg-brand hover:bg-brand/90 text-white"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generazione in corso…
                  </>
                ) : 'Genera e scarica contratto'}
              </Button>
            ) : (
              <Button onClick={handleFinish} className="w-full bg-brand hover:bg-brand/90 text-white">
                Accedi alla piattaforma
              </Button>
            )}
          </div>
        )}
        </CardContent>
      </Card>
    );
  }

  // ── Step 1 — dati anagrafici ─────────────────────────────────
  return (
    <Card>
      <CardContent className="p-6">
      <Progress value={50} className="w-full mb-4" />
      {/* Progress */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-xs font-bold text-white">1</div>
          <span className="text-xs text-foreground font-medium">Dati personali</span>
        </div>
        <div className="flex-1 h-px bg-accent" />
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-muted-foreground">2</div>
          <span className="text-xs text-muted-foreground">Contratto</span>
        </div>
      </div>

      <Form {...form}>
      <form
        onSubmit={(e) => { e.preventDefault(); setStep(2); }}
        noValidate
        className="space-y-5">

        <p className="text-sm text-muted-foreground -mt-2 mb-4">
          Completa tutti i campi per procedere alla generazione del contratto.
        </p>

        {/* Identità */}
        <div>
          <p className={sectionTitle}>Identità</p>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Nome <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="Mario" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cognome" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Cognome <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="Rossi" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            {previewUsername && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Username</label>
                <div className="w-full rounded-lg bg-muted border border-border px-3 py-2.5 text-sm text-muted-foreground font-mono select-all">
                  @{previewUsername}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Il tuo username sarà assegnato automaticamente e non è modificabile.</p>
              </div>
            )}
            <FormField control={form.control} name="codice_fiscale" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Codice fiscale <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    placeholder="RSSMRA80A01H501U"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') || null)}
                    maxLength={16}
                    className="font-mono"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Controller control={form.control} name="data_nascita" render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-xs">Data di nascita <span className="text-destructive">*</span></FormLabel>
                  <DatePicker
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    captionLayout="dropdown"
                    fromYear={1940}
                    toYear={new Date().getFullYear() - 16}
                  />
                  {fieldState.error && <p className="text-destructive text-xs font-medium">{fieldState.error.message}</p>}
                </FormItem>
              )} />
              <FormField control={form.control} name="luogo_nascita" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Città di nascita <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="Roma" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="provincia_nascita" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Provincia di nascita (sigla) <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    placeholder="RM"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase() || null)}
                    maxLength={2}
                    className="font-mono uppercase"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField control={form.control} name="indirizzo" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel className="text-xs">Via/Piazza di residenza <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="Via Roma" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="civico_residenza" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Civico <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="1" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} maxLength={10} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>
        </div>

        {/* Residenza */}
        <div>
          <p className={sectionTitle}>Residenza</p>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField control={form.control} name="comune" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Comune <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="Milano" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="provincia_residenza" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Provincia (sigla) <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="MI"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase() || null)}
                      maxLength={2}
                      className="font-mono uppercase"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="telefono" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Telefono di contatto <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input type="tel" placeholder="+39 333 0000000" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* Pagamento e preferenze */}
        <div>
          <p className={sectionTitle}>Pagamento e preferenze</p>
          <div className="space-y-3">
            <FormField control={form.control} name="intestatario_pagamento" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Intestatario del conto bancario <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="Mario Rossi" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} maxLength={100} /></FormControl>
                <p className="text-xs text-muted-foreground mt-1">
                  Nome e cognome dell&apos;intestatario del conto su cui riceverai il pagamento. Può essere diverso dal tuo se non hai un conto a tuo nome.
                </p>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="iban" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">IBAN <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="IT60 X054 2811 1010 0000 0123 456" {...field} maxLength={34} className="font-mono" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Controller control={form.control} name="tshirt_size" render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="text-xs">Taglia t-shirt <span className="text-destructive">*</span></FormLabel>
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="— Seleziona —" /></SelectTrigger>
                  <SelectContent>
                    {TSHIRT_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {fieldState.error && <p className="text-destructive text-xs font-medium">{fieldState.error.message}</p>}
              </FormItem>
            )} />
          </div>
        </div>

        {/* Dati fiscali */}
        <div>
          <div className="flex items-center justify-between mb-3 mt-1">
            <p className={sectionTitle} style={{ margin: 0 }}>Dati fiscali</p>
            <a
              href="https://www.agenziaentrate.gov.it/portale/schede/pagamenti/versamento-modello-f24-ritenute-su-reddito-di-lavoro-autonomo-f24_rit_red_lav_aut/aliquote-f24_rit_red_lav_aut"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-link hover:text-link/80"
            >
              Come funziona la prestazione occasionale?
            </a>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-3.5">
              <Controller control={form.control} name="sono_un_figlio_a_carico" render={({ field }) => (
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(!!v)}
                    className="mt-0.5 shrink-0"
                  />
                  <div>
                    <span className="text-sm font-medium text-foreground">Sono fiscalmente a carico</span>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Seleziona questa opzione se sei fiscalmente a carico di un genitore o di un familiare — ovvero se il tuo reddito annuo complessivo non supera le soglie fiscali previste:{' '}
                      <strong className="text-foreground">€4.000</strong> (under 24 anni) oppure{' '}
                      <strong className="text-foreground">€2.840,51</strong> (24 anni e oltre).
                      Ci permetterà di applicare la ritenuta d&apos;acconto nella misura corretta.
                    </p>
                  </div>
                </label>
              )} />
            </div>

            <Controller control={form.control} name="importo_lordo_massimale" render={({ field, fieldState }) => (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs text-muted-foreground mb-1" style={{ margin: 0 }}>
                    Massimale lordo annuo <span className="text-destructive">*</span>
                  </label>
                  <a
                    href="https://www.inps.it/it/it/dettaglio-approfondimento.schede-informative.49893.i-contributi-dei-lavoratori-autonomi-occasionali.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-link hover:text-link/80"
                  >
                    Come scegliere il valore?
                  </a>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                  <Input
                    type="number"
                    min={1}
                    max={5000}
                    step={1}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      field.onChange(isNaN(v) ? null : v);
                    }}
                    className="pl-7 font-mono"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Il massimale contrattuale che intendi raggiungere. La prestazione occasionale non può superare{' '}
                  <strong className="text-foreground">€5.000 lordi/anno</strong> dallo stesso committente (max €5.000).
                </p>
                {fieldState.error && <p className="text-destructive text-xs font-medium">{fieldState.error.message}</p>}
              </div>
            )} />
          </div>
        </div>

        {/* Attività */}
        <div>
          <p className={sectionTitle}>Attività</p>
          <div className="space-y-3">
            <Controller control={form.control} name="citta" render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="text-xs">Città di attività <span className="text-destructive">*</span></FormLabel>
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={cittaOptions.length === 0 ? 'Caricamento...' : '— Seleziona città —'} />
                  </SelectTrigger>
                  <SelectContent>
                    {cittaOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.nome}>{opt.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">La città in cui svolgi la tua attività con noi.</p>
                {fieldState.error && <p className="text-destructive text-xs font-medium">{fieldState.error.message}</p>}
              </FormItem>
            )} />
            <Controller control={form.control} name="materie_insegnate" render={({ field, fieldState }) => (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Materie insegnate <span className="text-destructive">*</span></label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {materiaOptions.map((opt) => {
                    const active = (field.value ?? []).includes(opt.nome);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          field.onChange(
                            active ? (field.value ?? []).filter((m: string) => m !== opt.nome) : [...(field.value ?? []), opt.nome],
                          )
                        }
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                          active
                            ? 'bg-brand text-white border-brand'
                            : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                        }`}
                      >
                        {opt.nome}
                      </button>
                    );
                  })}
                </div>
                {(field.value ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Seleziona almeno una materia.</p>
                )}
                {fieldState.error && <p className="text-destructive text-xs font-medium">{fieldState.error.message}</p>}
              </div>
            )} />
          </div>
        </div>

        <Button type="submit" disabled={!step1Valid} className="w-full bg-brand hover:bg-brand/90 text-white">
          Avanti — Genera contratto
        </Button>
      </form>
      </Form>
      </CardContent>
    </Card>
  );
}
