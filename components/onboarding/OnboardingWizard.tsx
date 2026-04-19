'use client';

import { useState, useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { TSHIRT_SIZES } from '@/lib/types';
import type { ContractTemplateType } from '@/lib/types';
import { generateUsername } from '@/lib/username';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Info } from 'lucide-react';
import { toast } from 'sonner';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, useForm, zodResolver } from '@/components/ui/form';
import {
  onboardingSchema, type OnboardingFormValues,
  TIPO_DOCUMENTO_IDENTITA, REGIME_ALIMENTARE,
  TIPO_DOCUMENTO_LABELS, REGIME_ALIMENTARE_LABELS, REGIME_ALIMENTARE_DEFAULT,
} from '@/lib/schemas/collaborator';

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
  numero_documento_identita: string | null;
  tipo_documento_identita: string | null;
  scadenza_documento_identita: string | null;
} | null;

type LookupOption = { id: string; nome: string };
type StepNumber = 1 | 2 | 3 | 4;

interface Props {
  prefill: PrefillData;
  tipoContratto: ContractTemplateType | null;
  tipoLabel: string | null;
  community: string;
}

const sectionTitle = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 mt-1';

const STEP_LABELS: Record<StepNumber, string> = {
  1: 'Dati personali',
  2: 'Residenza',
  3: 'Preferenze',
  4: 'Contratto',
};

function StepIndicator({ current }: { current: StepNumber }) {
  const steps: StepNumber[] = [1, 2, 3, 4];
  return (
    <div className="flex items-center gap-2 sm:gap-3 mb-6">
      {steps.map((s, idx) => {
        const isActive = s === current;
        const isDone = s < current;
        const isPending = s > current;
        return (
          <div key={s} className="flex items-center gap-1.5 sm:gap-2 flex-1">
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                isActive || isDone ? 'bg-brand text-white' : 'bg-accent text-muted-foreground'
              }`}
            >
              {isDone ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : s}
            </div>
            <span
              className={`text-xs truncate ${
                isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}
            >
              {STEP_LABELS[s]}
            </span>
            {idx < steps.length - 1 && <div className="flex-1 h-px bg-accent hidden sm:block" />}
          </div>
        );
      })}
    </div>
  );
}

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
      numero_documento_identita:   prefill?.numero_documento_identita ?? null,
      tipo_documento_identita:     (prefill?.tipo_documento_identita as OnboardingFormValues['tipo_documento_identita']) ?? null,
      scadenza_documento_identita: prefill?.scadenza_documento_identita ?? null,
      ha_allergie_alimentari:      false,
      allergie_note:               null,
      consenso_dati_salute:        false,
      regime_alimentare:           REGIME_ALIMENTARE_DEFAULT,
      spedizione_usa_residenza:    true,
      spedizione_indirizzo:        null,
      spedizione_civico:           null,
      spedizione_cap:              null,
      spedizione_citta:            null,
      spedizione_provincia:        null,
      spedizione_nazione:          'IT',
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

  // Conditional reveals
  const haAllergie = form.watch('ha_allergie_alimentari');
  const spedizioneUsaResidenza = form.watch('spedizione_usa_residenza');
  const consensoDatiSalute = form.watch('consenso_dati_salute');
  const allergieNote = form.watch('allergie_note');

  // Step tracking
  const [step, setStep]           = useState<StepNumber>(1);
  const [loading, setLoading]     = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [contractGenerated, setContractGenerated] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  const handleNext = async () => {
    const fieldsByStep: Record<StepNumber, Array<keyof OnboardingFormValues>> = {
      1: ['nome', 'cognome', 'codice_fiscale', 'data_nascita', 'luogo_nascita', 'provincia_nascita',
          'tipo_documento_identita', 'numero_documento_identita', 'scadenza_documento_identita'],
      2: ['indirizzo', 'civico_residenza', 'comune', 'provincia_residenza',
          'spedizione_usa_residenza', 'spedizione_indirizzo', 'spedizione_civico',
          'spedizione_cap', 'spedizione_citta', 'spedizione_provincia'],
      3: ['ha_allergie_alimentari', 'allergie_note', 'consenso_dati_salute', 'regime_alimentare',
          'tshirt_size', 'sono_un_figlio_a_carico', 'importo_lordo_massimale',
          'citta', 'materie_insegnate', 'intestatario_pagamento', 'telefono', 'iban'],
      4: [],
    };

    const valid = await form.trigger(fieldsByStep[step]);
    if (!valid) return;

    if (step < 4) setStep((step + 1) as StepNumber);
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as StepNumber);
  };

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
        // Documento identità
        numero_documento_identita:   v.numero_documento_identita,
        tipo_documento_identita:     v.tipo_documento_identita,
        scadenza_documento_identita: v.scadenza_documento_identita,
        // Allergie / regime
        ha_allergie_alimentari:      v.ha_allergie_alimentari,
        allergie_note:               v.allergie_note,
        consenso_dati_salute:        v.consenso_dati_salute,
        regime_alimentare:           v.regime_alimentare,
        // Spedizione
        spedizione_usa_residenza:    v.spedizione_usa_residenza,
        spedizione_indirizzo:        v.spedizione_indirizzo,
        spedizione_civico:           v.spedizione_civico,
        spedizione_cap:              v.spedizione_cap,
        spedizione_citta:            v.spedizione_citta,
        spedizione_provincia:        v.spedizione_provincia,
        spedizione_nazione:          v.spedizione_nazione,
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

  const progressValue = step * 25;

  return (
    <Card>
      <CardContent className="p-6">
        <Progress value={progressValue} className="w-full mb-4" />
        <StepIndicator current={step} />

        <Form {...form}>
          <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} noValidate className="space-y-5">
            {step === 1 && (
              <>
                <p className="text-sm text-muted-foreground -mt-2 mb-4">
                  Completa i campi anagrafici e il tuo documento d&apos;identità.
                </p>

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
                  </div>
                </div>

                <div>
                  <p className={sectionTitle}>Documento identità</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Controller control={form.control} name="tipo_documento_identita" render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Tipo documento <span className="text-destructive">*</span></FormLabel>
                          <Select value={field.value || undefined} onValueChange={field.onChange}>
                            <SelectTrigger><SelectValue placeholder="— Seleziona —" /></SelectTrigger>
                            <SelectContent>
                              {TIPO_DOCUMENTO_IDENTITA.map((t) => (
                                <SelectItem key={t} value={t}>{TIPO_DOCUMENTO_LABELS[t]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.error && <p className="text-destructive text-xs font-medium">{fieldState.error.message}</p>}
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="numero_documento_identita" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Numero documento <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input
                              placeholder="AA1234567"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                              maxLength={50}
                              className="font-mono"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <Controller control={form.control} name="scadenza_documento_identita" render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Scadenza documento <span className="text-destructive">*</span></FormLabel>
                        <DatePicker
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          captionLayout="dropdown"
                          fromYear={new Date().getFullYear()}
                          toYear={new Date().getFullYear() + 20}
                        />
                        {fieldState.error && <p className="text-destructive text-xs font-medium">{fieldState.error.message}</p>}
                      </FormItem>
                    )} />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-sm text-muted-foreground -mt-2 mb-4">
                  Dove vivi? E dove ti spediamo materiali e gadget?
                </p>

                <div>
                  <p className={sectionTitle}>Residenza</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <FormField control={form.control} name="indirizzo" render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel className="text-xs">Via/Piazza <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input placeholder="Via Roma" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="civico_residenza" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Civico <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input placeholder="12" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} maxLength={10} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
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
                  </div>
                </div>

                <div>
                  <p className={sectionTitle}>Indirizzo di spedizione</p>
                  <div className="space-y-3">
                    <Controller control={form.control} name="spedizione_usa_residenza" render={({ field }) => (
                      <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 flex items-start justify-between gap-3">
                        <div>
                          <span className="text-sm font-medium text-foreground">Usa stesso indirizzo di residenza</span>
                          <p className="text-xs text-muted-foreground mt-1">
                            {field.value
                              ? 'Spediremo al tuo indirizzo di residenza.'
                              : "Inserisci l'indirizzo dove ricevere materiali."}
                          </p>
                        </div>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                    )} />

                    {!spedizioneUsaResidenza && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <FormField control={form.control} name="spedizione_indirizzo" render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel className="text-xs">Via/Piazza <span className="text-destructive">*</span></FormLabel>
                              <FormControl><Input placeholder="Via Milano" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="spedizione_civico" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Civico <span className="text-destructive">*</span></FormLabel>
                              <FormControl><Input placeholder="45" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} maxLength={10} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <FormField control={form.control} name="spedizione_cap" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">CAP <span className="text-destructive">*</span></FormLabel>
                              <FormControl><Input placeholder="20121" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} maxLength={10} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="spedizione_citta" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Città <span className="text-destructive">*</span></FormLabel>
                              <FormControl><Input placeholder="Milano" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="spedizione_provincia" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Provincia <span className="text-destructive">*</span></FormLabel>
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
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">Nazione</label>
                          <div className="w-full rounded-lg bg-muted border border-border px-3 py-2.5 text-sm text-muted-foreground">
                            IT (Italia)
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <p className="text-sm text-muted-foreground -mt-2 mb-4">
                  Raccontaci le tue preferenze e dove lavori con noi.
                </p>

                <div>
                  <p className={sectionTitle}>Alimentazione</p>
                  <div className="space-y-3">
                    <div className="rounded-lg bg-muted/40 border border-border p-3.5">
                      <Controller control={form.control} name="ha_allergie_alimentari" render={({ field }) => (
                        <label className="flex items-start gap-3 cursor-pointer">
                          <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} className="mt-0.5 shrink-0" />
                          <div>
                            <span className="text-sm font-medium text-foreground">Ho allergie o intolleranze alimentari</span>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              Seleziona solo se hai allergie, intolleranze o restrizioni mediche da segnalarci per pasti ed eventi.
                            </p>
                          </div>
                        </label>
                      )} />
                    </div>

                    {haAllergie && (
                      <div className="space-y-3">
                        <FormField control={form.control} name="allergie_note" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Specifica allergie / intolleranze <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="es. lattosio, glutine, arachidi, crostacei…"
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value || null)}
                                maxLength={500}
                                rows={3}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Trattamento dati relativi alla salute (GDPR Art.9)</AlertTitle>
                          <AlertDescription>
                            I dati relativi alla salute (allergie/intolleranze) sono trattati ai sensi dell&apos;Art.9 GDPR su base di consenso esplicito.
                            Li utilizzeremo esclusivamente per la gestione di pasti ed eventi, non saranno condivisi con terze parti
                            e saranno visibili solo a te e all&apos;amministrazione.
                          </AlertDescription>
                        </Alert>

                        <div className="rounded-lg bg-muted/40 border border-border p-3.5">
                          <Controller control={form.control} name="consenso_dati_salute" render={({ field }) => (
                            <label className="flex items-start gap-3 cursor-pointer">
                              <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} className="mt-0.5 shrink-0" />
                              <div>
                                <span className="text-sm font-medium text-foreground">
                                  Acconsento al trattamento dei dati relativi alla salute (Art.9 GDPR) <span className="text-destructive">*</span>
                                </span>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                  Il consenso è obbligatorio per inviare le allergie. Puoi revocarlo in qualsiasi momento dal tuo profilo.
                                </p>
                              </div>
                            </label>
                          )} />
                        </div>
                      </div>
                    )}

                    <Controller control={form.control} name="regime_alimentare" render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Regime alimentare <span className="text-destructive">*</span></FormLabel>
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="— Seleziona —" /></SelectTrigger>
                          <SelectContent>
                            {REGIME_ALIMENTARE.map((r) => (
                              <SelectItem key={r} value={r}>{REGIME_ALIMENTARE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldState.error && <p className="text-destructive text-xs font-medium">{fieldState.error.message}</p>}
                      </FormItem>
                    )} />
                  </div>
                </div>

                <div>
                  <p className={sectionTitle}>Preferenze</p>
                  <div className="space-y-3">
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
                    <div className="rounded-lg bg-muted/40 border border-border p-3.5">
                      <Controller control={form.control} name="sono_un_figlio_a_carico" render={({ field }) => (
                        <label className="flex items-start gap-3 cursor-pointer">
                          <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} className="mt-0.5 shrink-0" />
                          <div>
                            <span className="text-sm font-medium text-foreground">Sono fiscalmente a carico</span>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              Seleziona questa opzione se sei fiscalmente a carico di un genitore — reddito annuo complessivo sotto:{' '}
                              <strong className="text-foreground">€4.000</strong> (under 24) oppure{' '}
                              <strong className="text-foreground">€2.840,51</strong> (24+).
                            </p>
                          </div>
                        </label>
                      )} />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3 mt-1">
                    <p className={sectionTitle} style={{ margin: 0 }}>Attività</p>
                    <a
                      href="https://www.agenziaentrate.gov.it/portale/schede/pagamenti/versamento-modello-f24-ritenute-su-reddito-di-lavoro-autonomo-f24_rit_red_lav_aut/aliquote-f24_rit_red_lav_aut"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-link hover:text-link/80"
                    >
                      Guida fiscale
                    </a>
                  </div>
                  <div className="space-y-3">
                    <Controller control={form.control} name="importo_lordo_massimale" render={({ field, fieldState }) => (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs text-muted-foreground" style={{ margin: 0 }}>
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
                          Max <strong className="text-foreground">€5.000 lordi/anno</strong> dallo stesso committente.
                        </p>
                        {fieldState.error && <p className="text-destructive text-xs font-medium">{fieldState.error.message}</p>}
                      </div>
                    )} />
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

                <div>
                  <p className={sectionTitle}>Pagamento</p>
                  <div className="space-y-3">
                    <FormField control={form.control} name="intestatario_pagamento" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Intestatario conto bancario <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="Mario Rossi" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} maxLength={100} /></FormControl>
                        <p className="text-xs text-muted-foreground mt-1">
                          Nome e cognome dell&apos;intestatario del conto. Può essere un familiare.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="telefono" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Telefono di contatto <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input type="tel" placeholder="+39 333 0000000" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} /></FormControl>
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
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground mb-1">Il tuo contratto</h2>
                  <p className="text-sm text-muted-foreground">
                    Tipologia: <span className="text-foreground font-medium">{tipoLabel ?? tipoContratto}</span>
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
                    <Button type="button" onClick={handleFinish} className="w-full bg-brand hover:bg-brand/90 text-white">
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
                        Il contratto è stato generato con i tuoi dati. Puoi scaricarne una copia. La firma avverrà digitalmente nella sezione <strong className="text-foreground">Documenti</strong>.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDownload}
                      className="w-full"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Scarica contratto
                    </Button>

                    <Button type="button" onClick={handleFinish} className="w-full bg-brand hover:bg-brand/90 text-white">
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
                        type="button"
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
                      <Button type="button" onClick={handleFinish} className="w-full bg-brand hover:bg-brand/90 text-white">
                        Accedi alla piattaforma
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {step < 4 && (
              <div className="flex gap-3 pt-2">
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={handleBack} className="flex-1 sm:flex-none">
                    ← Indietro
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={step === 3 && haAllergie === true && (!consensoDatiSalute || !allergieNote || allergieNote.trim().length === 0)}
                  className="flex-1 bg-brand hover:bg-brand/90 text-white"
                >
                  Avanti →
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
