'use client';

import { useState, useEffect, useMemo } from 'react';
import { CONTRACT_TEMPLATE_LABELS } from '@/lib/types';
import { getContractTemplateTipo } from '@/lib/ritenuta';
import { generateUsername } from '@/lib/username';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
  zodResolver,
} from '@/components/ui/form';
import { Controller, type Resolver } from 'react-hook-form';
import {
  createUserQuickSchema,
  createUserFullSchema,
  type CreateUserFullFormValues,
} from '@/lib/schemas/collaborator';

type Credentials = { email: string; password: string };
type Community = { id: string; name: string; is_active: boolean };
type LookupOption = { id: string; nome: string };

const sectionTitle = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 mt-1';

export default function CreateUserForm() {
  // Separate state (not in useForm)
  const [communities, setCommunities] = useState<Community[]>([]);
  const [cittaOptions, setCittaOptions] = useState<LookupOption[]>([]);
  const [selectedCommunityName, setSelectedCommunityName] = useState('');
  const [mode, setMode] = useState<'quick' | 'full'>('quick');
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copied, setCopied] = useState<'email' | 'password' | null>(null);
  const [usernameManuallySet, setUsernameManuallySet] = useState(false);

  // Derived tipo_contratto from community
  const tipoContratto = selectedCommunityName ? getContractTemplateTipo(selectedCommunityName) : 'OCCASIONALE';

  // Dynamic resolver based on mode — cast needed because the quick schema is a
  // subset of the full schema and TS cannot unify the two Resolver generics.
  const resolver = useMemo(
    () => zodResolver(mode === 'full' ? createUserFullSchema : createUserQuickSchema) as unknown as Resolver<CreateUserFullFormValues>,
    [mode],
  );

  const form = useForm<CreateUserFullFormValues>({
    resolver,
    defaultValues: {
      email: '',
      nome: '',
      cognome: '',
      username: '',
      community_id: '',
      tipo_contratto: '',
      data_ingresso: '',
      citta: '',
      skip_contract_on_onboarding: false,
      data_fine_contratto: '',
      codice_fiscale: '',
      data_nascita: '',
      luogo_nascita: '',
      provincia_nascita: '',
      indirizzo: '',
      civico_residenza: '',
      comune: '',
      provincia_residenza: '',
      telefono: '',
      intestatario_pagamento: '',
      sono_un_figlio_a_carico: false,
      importo_lordo_massimale: undefined,
    },
  });

  const selectedCommunity = form.watch('community_id');
  const nome = form.watch('nome');
  const cognome = form.watch('cognome');

  useEffect(() => {
    fetch('/api/admin/communities')
      .then((r) => r.json())
      .then((data) => setCommunities(data.communities ?? []))
      .catch(() => {});
  }, []);

  // Fetch citta when community changes
  useEffect(() => {
    if (!selectedCommunity) { setCittaOptions([]); form.setValue('citta', ''); return; }
    const comm = communities.find((c) => c.id === selectedCommunity);
    const slug = comm?.name?.toLowerCase().replace(/\s+/g, '') ?? '';
    fetch(`/api/lookup-options?type=citta&community=${slug}`)
      .then((r) => r.json())
      .then((d) => setCittaOptions(d.options ?? []))
      .catch(() => {});
    form.setValue('citta', '');
  }, [selectedCommunity, communities, form]);

  // Auto-compute username from nome+cognome
  useEffect(() => {
    if (!usernameManuallySet) {
      form.setValue('username', generateUsername(nome, cognome));
    }
  }, [nome, cognome, usernameManuallySet, form]);

  // Keep tipo_contratto in sync with community
  useEffect(() => {
    form.setValue('tipo_contratto', tipoContratto);
  }, [tipoContratto, form]);

  const copyToClipboard = async (text: string, field: 'email' | 'password') => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCommunityChange = (id: string) => {
    const comm = communities.find((c) => c.id === id);
    setSelectedCommunityName(comm?.name ?? '');
  };

  const onSubmit = async (values: CreateUserFullFormValues) => {
    setLoading(true);
    setCredentials(null);

    const body: Record<string, unknown> = {
      email: values.email,
      community_id: values.community_id,
      tipo_contratto: values.tipo_contratto,
      citta: values.citta,
      salta_firma: values.skip_contract_on_onboarding ?? false,
      nome: values.nome?.trim() || undefined,
      cognome: values.cognome?.trim() || undefined,
      username: values.username?.trim() || undefined,
      codice_fiscale: values.codice_fiscale?.trim().toUpperCase() || null,
      data_nascita: values.data_nascita || null,
      luogo_nascita: values.luogo_nascita?.trim() || null,
      provincia_nascita: values.provincia_nascita?.trim().toUpperCase() || null,
      comune: values.comune?.trim() || null,
      provincia_residenza: values.provincia_residenza?.trim().toUpperCase() || null,
      indirizzo: values.indirizzo?.trim() || null,
      civico_residenza: values.civico_residenza?.trim() || null,
      telefono: values.telefono?.trim() || null,
      intestatario_pagamento: values.intestatario_pagamento?.trim() || null,
      data_ingresso: values.data_ingresso || null,
      data_fine_contratto: values.data_fine_contratto || null,
      sono_un_figlio_a_carico: values.sono_un_figlio_a_carico ?? false,
      importo_lordo_massimale: values.importo_lordo_massimale ?? null,
    };

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);
    if (!res.ok) { toast.error(data.error ?? 'Errore durante la creazione.', { duration: 5000 }); return; }
    toast.success('Utente creato.');
    setCredentials({ email: data.email, password: data.password });

    // Reset
    form.reset();
    setSelectedCommunityName('');
    setUsernameManuallySet(false);
  };

  if (credentials) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 px-4 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-xs text-foreground">
            Invito inviato a <span className="font-medium text-foreground">{credentials.email}</span>.
          </p>
        </div>

        <div className="rounded-xl bg-muted/60 border border-border p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Credenziali di accesso - da condividere manualmente in caso di mancato recapito dell&apos;email.
          </p>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Email</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-card px-3 py-2 text-sm text-foreground font-mono">{credentials.email}</code>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(credentials.email, 'email')} className="whitespace-nowrap">
                {copied === 'email' ? 'Copiato!' : 'Copia'}
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Password temporanea</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-card px-3 py-2 text-sm text-foreground font-mono tracking-wider">{credentials.password}</code>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(credentials.password, 'password')} className="whitespace-nowrap">
                {copied === 'password' ? 'Copiata!' : 'Copia'}
              </Button>
            </div>
          </div>
        </div>

        <Button variant="outline" onClick={() => setCredentials(null)}>
          Crea un altro utente
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">

        {/* Mode toggle */}
        <ButtonGroup className="w-full">
          <Button
            type="button"
            variant={mode === 'quick' ? 'default' : 'outline'}
            onClick={() => { setMode('quick'); form.clearErrors(); }}
            className={`flex-1${mode === 'quick' ? ' bg-brand hover:bg-brand/90 text-white' : ''}`}
          >
            Invito rapido
          </Button>
          <Button
            type="button"
            variant={mode === 'full' ? 'default' : 'outline'}
            onClick={() => { setMode('full'); form.clearErrors(); }}
            className={`flex-1${mode === 'full' ? ' bg-brand hover:bg-brand/90 text-white' : ''}`}
          >
            Invito completo
          </Button>
        </ButtonGroup>

        {/* Auth + Community */}
        <div className="rounded-xl border border-border p-4">
          <p className={sectionTitle}>Accesso</p>
          <div className="space-y-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">Email <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="nome@email.com" {...field} disabled={loading} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="community_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">Community <span className="text-destructive">*</span></FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(id) => { field.onChange(id); handleCommunityChange(id); }}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="- Seleziona community -" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {communities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Tipo rapporto - derived from community */}
        {selectedCommunity && (
          <div className="rounded-xl border border-border p-4">
            <p className={sectionTitle}>Tipo rapporto</p>
            <div className="flex items-center justify-between rounded-xl bg-muted border border-border px-4 py-3">
              <p className="text-sm font-medium text-foreground">{CONTRACT_TEMPLATE_LABELS[tipoContratto]}</p>
              <span className="text-xs text-muted-foreground ml-4">Determinato dalla community</span>
            </div>
          </div>
        )}

        {/* Salta firma contratto */}
        {selectedCommunity && (
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Salta firma contratto</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Il collaboratore completer&agrave; l&apos;onboarding senza firmare il contratto. Potrai caricare il documento in seguito dalla sezione Documenti.
                </p>
              </div>
              <Controller
                control={form.control}
                name="skip_contract_on_onboarding"
                render={({ field: { value, onChange } }) => (
                  <Switch checked={!!value} onCheckedChange={onChange} disabled={loading} />
                )}
              />
            </div>
          </div>
        )}

        {/* Citta */}
        {selectedCommunity && (
          <div className="rounded-xl border border-border p-4">
            <p className={sectionTitle}>Assegnazione</p>
            <FormField
              control={form.control}
              name="citta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">Citta <span className="text-destructive">*</span></FormLabel>
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    disabled={loading || cittaOptions.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={cittaOptions.length === 0 ? 'Seleziona prima la community' : '- Seleziona citta -'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cittaOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.nome}>{opt.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Data fine contratto */}
        {selectedCommunity && (
          <div className="rounded-xl border border-border p-4">
            <p className={sectionTitle}>Durata contratto</p>
            <div>
              <Controller
                control={form.control}
                name="data_fine_contratto"
                render={({ field: { value, onChange } }) => (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Data fine contratto <span className="text-destructive">*</span></label>
                    <DatePicker
                      value={value ?? ''}
                      onChange={onChange}
                      disabled={loading}
                    />
                  </div>
                )}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Usata per compilare automaticamente il template PDF del contratto.
              </p>
            </div>
          </div>
        )}

        {/* Invito rapido: nome + cognome + data_ingresso required */}
        {selectedCommunity && mode === 'quick' && (
          <div className="rounded-xl border border-border p-4">
            <p className={sectionTitle}>Dati personali</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Nome <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="Mario" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cognome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Cognome <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="Rossi" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Username <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="mario_rossi"
                        value={field.value}
                        onChange={(e) => {
                          field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                          setUsernameManuallySet(true);
                        }}
                        disabled={loading}
                        maxLength={50}
                        className="font-mono"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">Generato automaticamente da nome e cognome. Puoi modificarlo.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Controller
                control={form.control}
                name="data_ingresso"
                render={({ field: { value, onChange } }) => (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Data di ingresso <span className="text-destructive">*</span></label>
                    <DatePicker
                      value={value ?? ''}
                      onChange={onChange}
                      disabled={loading}
                    />
                  </div>
                )}
              />
            </div>
          </div>
        )}

        {/* Invito completo: anagrafica richiesta */}
        {selectedCommunity && mode === 'full' && (
          <div className="rounded-xl border border-border p-4">
            <p className={sectionTitle}>Dati personali</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Nome <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="Mario" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cognome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Cognome <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="Rossi" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Username <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="mario_rossi"
                        value={field.value}
                        onChange={(e) => {
                          field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                          setUsernameManuallySet(true);
                        }}
                        disabled={loading}
                        maxLength={50}
                        className="font-mono"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">Generato automaticamente da nome e cognome. Puoi modificarlo.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="codice_fiscale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Codice fiscale <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="RSSMRA80A01H501U"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        disabled={loading}
                        maxLength={16}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <Controller
                  control={form.control}
                  name="data_nascita"
                  render={({ field: { value, onChange } }) => (
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Data di nascita <span className="text-destructive">*</span></label>
                      <DatePicker
                        value={value ?? ''}
                        onChange={onChange}
                        disabled={loading}
                        captionLayout="dropdown"
                        fromYear={1940}
                        toYear={new Date().getFullYear() - 16}
                      />
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="luogo_nascita"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Citta di nascita <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="Roma" {...field} value={field.value ?? ''} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="provincia_nascita"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Provincia di nascita (sigla) <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="RM"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        disabled={loading}
                        maxLength={2}
                        className="font-mono uppercase"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="indirizzo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Via/Piazza <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="Via Roma" {...field} value={field.value ?? ''} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="civico_residenza"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Civico <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="1" {...field} value={field.value ?? ''} disabled={loading} maxLength={10} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="comune"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Comune di residenza <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="Milano" {...field} value={field.value ?? ''} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="provincia_residenza"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Provincia di residenza (sigla) <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="MI"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          disabled={loading}
                          maxLength={2}
                          className="font-mono uppercase"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Telefono <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+39 333 0000000" {...field} value={field.value ?? ''} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="intestatario_pagamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Intestatario del conto bancario <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="Mario Rossi" {...field} value={field.value ?? ''} disabled={loading} maxLength={100} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">Nome e cognome dell&apos;intestatario del conto. Pre-compilato per l&apos;onboarding.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Controller
                control={form.control}
                name="data_ingresso"
                render={({ field: { value, onChange } }) => (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Data di ingresso <span className="text-destructive">*</span></label>
                    <DatePicker
                      value={value ?? ''}
                      onChange={onChange}
                      disabled={loading}
                    />
                  </div>
                )}
              />
            </div>

            {/* Dati fiscali */}
            <div className="mt-4 rounded-xl border border-border p-4">
              <p className={sectionTitle}>Dati fiscali</p>
              <div className="space-y-3">
                <Controller
                  control={form.control}
                  name="sono_un_figlio_a_carico"
                  render={({ field: { value, onChange } }) => (
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        checked={!!value}
                        onCheckedChange={(v) => onChange(!!v)}
                        disabled={loading}
                        className="mt-0.5 flex-shrink-0"
                      />
                      <div>
                        <span className="text-sm text-foreground">Sono fiscalmente a carico</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Seleziona se il collaboratore è fiscalmente a carico di un familiare (es. genitore).
                        </p>
                        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground list-none">
                          <li>- Under 24: soglia <span className="font-medium text-foreground">4.000 EUR lordi/anno</span></li>
                          <li>- 24+ anni: soglia <span className="font-medium text-foreground">2.840,51 EUR lordi/anno</span></li>
                        </ul>
                      </div>
                    </label>
                  )}
                />
                <Controller
                  control={form.control}
                  name="importo_lordo_massimale"
                  render={({ field: { value, onChange } }) => (
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Massimale lordo annuo (max EUR 5.000)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">EUR</span>
                        <Input
                          type="number"
                          min={0}
                          max={5000}
                          step={100}
                          placeholder="5000"
                          value={value ?? ''}
                          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          disabled={loading}
                          className="pl-10"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Importo lordo massimo che il collaboratore vuole ricevere nell&apos;anno solare.
                      </p>
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="bg-brand hover:bg-brand/90 text-white"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creazione in corso...
            </>
          ) : 'Conferma'}
        </Button>
      </form>
    </Form>
  );
}
