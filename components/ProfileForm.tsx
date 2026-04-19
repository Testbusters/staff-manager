'use client';

import { useState, useRef, useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { Check, AlertTriangle, ChevronDown, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ROLE_LABELS, TSHIRT_SIZES } from '@/lib/types';
import type { Role } from '@/lib/types';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, useForm, zodResolver } from '@/components/ui/form';
import {
  profileFormSchema,
  type ProfileFormValues,
  TIPO_DOCUMENTO_IDENTITA,
  REGIME_ALIMENTARE,
  TIPO_DOCUMENTO_LABELS,
  REGIME_ALIMENTARE_LABELS,
  REGIME_ALIMENTARE_DEFAULT,
} from '@/lib/schemas/collaborator';

type Collaborator = {
  nome: string;
  cognome: string;
  email: string;
  username: string | null;
  codice_fiscale: string | null;
  data_nascita: string | null;
  luogo_nascita: string | null;
  provincia_nascita: string | null;
  comune: string | null;
  provincia_residenza: string | null;
  data_ingresso: string | null;
  telefono: string | null;
  indirizzo: string | null;
  civico_residenza: string | null;
  iban: string | null;
  intestatario_pagamento: string | null;
  tshirt_size: string | null;
  foto_profilo_url: string | null;
  sono_un_figlio_a_carico: boolean;
  importo_lordo_massimale: number | null;
  citta: string | null;
  materie_insegnate: string[] | null;
  numero_documento_identita: string | null;
  tipo_documento_identita: (typeof TIPO_DOCUMENTO_IDENTITA)[number] | null;
  scadenza_documento_identita: string | null;
  ha_allergie_alimentari: boolean;
  allergie_note: string | null;
  regime_alimentare: (typeof REGIME_ALIMENTARE)[number];
  spedizione_usa_residenza: boolean;
  spedizione_indirizzo: string | null;
  spedizione_civico: string | null;
  spedizione_cap: string | null;
  spedizione_citta: string | null;
  spedizione_provincia: string | null;
  spedizione_nazione: string;
};

type GuideContent = { titolo: string; descrizione: string | null } | null;

type LookupOption = { id: string; nome: string };

type Props = {
  collaborator: Collaborator | null;
  role: string;
  email: string;
  community: string;
  communities: { id: string; name: string }[];
  guidaFigli: GuideContent;
};

const readonlyCls =
  'w-full rounded-lg bg-card border border-border px-3 py-2.5 text-sm text-muted-foreground select-all';
const labelCls = 'text-xs text-muted-foreground';
const sectionCls = 'rounded-2xl bg-card border border-border';
const sectionHeader = 'px-5 py-4 border-b border-border';

function Section({
  title,
  subtitle,
  headerRight,
  children,
  defaultOpen = true,
}: {
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className={sectionCls}>
      <CollapsibleTrigger asChild>
        <button type="button" className="w-full px-5 py-4 border-b border-border flex items-center justify-between gap-2 text-left cursor-pointer">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-foreground">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerRight}
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-5 space-y-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className={`${labelCls} mb-1.5`}>{label}</p>
      <div className={readonlyCls}>{value || <span className="text-muted-foreground italic">—</span>}</div>
    </div>
  );
}

function GuideBox({ guide }: { guide: GuideContent }) {
  if (!guide) return null;
  return (
    <Collapsible>
      <Alert variant="info" className="mt-3">
        <AlertDescription>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              aria-label="Mostra guida"
              className="group w-full flex items-center justify-between px-0 py-0 text-xs h-auto rounded-none bg-transparent hover:bg-transparent"
            >
              <span className="font-medium">{guide.titolo}</span>
              <ChevronDown className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {guide.descrizione && (
              <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                {guide.descrizione}
              </div>
            )}
          </CollapsibleContent>
        </AlertDescription>
      </Alert>
    </Collapsible>
  );
}

export default function ProfileForm({ collaborator, role, email, community, communities, guidaFigli }: Props) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      email,
      nome: collaborator?.nome ?? '',
      cognome: collaborator?.cognome ?? '',
      codice_fiscale: collaborator?.codice_fiscale ?? '',
      data_nascita: collaborator?.data_nascita ?? '',
      luogo_nascita: collaborator?.luogo_nascita ?? '',
      provincia_nascita: collaborator?.provincia_nascita ?? '',
      comune: collaborator?.comune ?? '',
      provincia_residenza: collaborator?.provincia_residenza ?? '',
      telefono: collaborator?.telefono ?? '',
      indirizzo: collaborator?.indirizzo ?? '',
      civico_residenza: collaborator?.civico_residenza ?? '',
      iban: collaborator?.iban ?? '',
      intestatario_pagamento: collaborator?.intestatario_pagamento ?? '',
      tshirt_size: collaborator?.tshirt_size ?? '',
      sono_un_figlio_a_carico: collaborator?.sono_un_figlio_a_carico ?? false,
      importo_lordo_massimale: collaborator?.importo_lordo_massimale != null ? String(collaborator.importo_lordo_massimale) : '',
      citta: collaborator?.citta ?? '',
      materie_insegnate: collaborator?.materie_insegnate ?? [],
      numero_documento_identita:   collaborator?.numero_documento_identita ?? '',
      tipo_documento_identita:     collaborator?.tipo_documento_identita ?? '',
      scadenza_documento_identita: collaborator?.scadenza_documento_identita ?? '',
      ha_allergie_alimentari:      collaborator?.ha_allergie_alimentari ?? false,
      allergie_note:               collaborator?.allergie_note ?? '',
      regime_alimentare:           collaborator?.regime_alimentare ?? REGIME_ALIMENTARE_DEFAULT,
      spedizione_usa_residenza:    collaborator?.spedizione_usa_residenza ?? true,
      spedizione_indirizzo:        collaborator?.spedizione_indirizzo ?? '',
      spedizione_civico:           collaborator?.spedizione_civico ?? '',
      spedizione_cap:              collaborator?.spedizione_cap ?? '',
      spedizione_citta:            collaborator?.spedizione_citta ?? '',
      spedizione_provincia:        collaborator?.spedizione_provincia ?? '',
      spedizione_nazione:          collaborator?.spedizione_nazione ?? 'IT',
      consenso_dati_salute:        false,
    },
  });

  const { isDirty, isSubmitting } = form.formState;
  const sonoFiglio = form.watch('sono_un_figlio_a_carico');
  const haAllergie = form.watch('ha_allergie_alimentari');
  const usaResidenza = form.watch('spedizione_usa_residenza');

  const [showGuida, setShowGuida] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(collaborator?.foto_profilo_url ?? '');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cittaOptions, setCittaOptions] = useState<LookupOption[]>([]);
  const [materiaOptions, setMateriaOptions] = useState<LookupOption[]>([]);

  useEffect(() => {
    const comm = community || 'testbusters';
    fetch(`/api/lookup-options?type=citta&community=${comm}`)
      .then((r) => r.json()).then((d) => setCittaOptions(d.options ?? [])).catch(() => {});
    fetch(`/api/lookup-options?type=materia&community=${comm}`)
      .then((r) => r.json()).then((d) => setMateriaOptions(d.options ?? [])).catch(() => {});
  }, [community]);

  const onSubmit = async (values: ProfileFormValues) => {
    const emailTrimmed = values.email.trim().toLowerCase();
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:               emailTrimmed !== email.toLowerCase() ? emailTrimmed : undefined,
        nome:                values.nome.trim() || undefined,
        cognome:             values.cognome.trim() || undefined,
        codice_fiscale:      values.codice_fiscale.trim().toUpperCase() || null,
        data_nascita:        values.data_nascita || null,
        luogo_nascita:       values.luogo_nascita.trim() || null,
        provincia_nascita:   values.provincia_nascita.trim().toUpperCase() || null,
        comune:              values.comune.trim() || null,
        provincia_residenza: values.provincia_residenza.trim().toUpperCase() || null,
        telefono:            values.telefono || null,
        indirizzo:           values.indirizzo || null,
        civico_residenza:    values.civico_residenza.trim() || null,
        iban:                values.iban.toUpperCase().replace(/\s/g, '') || null,
        intestatario_pagamento: values.intestatario_pagamento.trim() || null,
        tshirt_size:               values.tshirt_size || null,
        sono_un_figlio_a_carico:   values.sono_un_figlio_a_carico,
        importo_lordo_massimale:   values.importo_lordo_massimale !== '' ? parseFloat(values.importo_lordo_massimale) : null,
        citta:                     values.citta,
        materie_insegnate:         values.materie_insegnate,
        numero_documento_identita:   values.numero_documento_identita.trim() || null,
        tipo_documento_identita:     values.tipo_documento_identita || null,
        scadenza_documento_identita: values.scadenza_documento_identita || null,
        ha_allergie_alimentari:      values.ha_allergie_alimentari,
        allergie_note:               values.ha_allergie_alimentari ? (values.allergie_note.trim() || null) : null,
        regime_alimentare:           values.regime_alimentare,
        spedizione_usa_residenza:    values.spedizione_usa_residenza,
        spedizione_indirizzo:        values.spedizione_usa_residenza ? null : (values.spedizione_indirizzo.trim() || null),
        spedizione_civico:           values.spedizione_usa_residenza ? null : (values.spedizione_civico.trim() || null),
        spedizione_cap:              values.spedizione_usa_residenza ? null : (values.spedizione_cap.trim() || null),
        spedizione_citta:            values.spedizione_usa_residenza ? null : (values.spedizione_citta.trim() || null),
        spedizione_provincia:        values.spedizione_usa_residenza ? null : (values.spedizione_provincia.trim().toUpperCase() || null),
        spedizione_nazione:          values.spedizione_nazione || 'IT',
        consenso_dati_salute:        values.ha_allergie_alimentari ? values.consenso_dati_salute : false,
      }),
    });

    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? 'Errore durante il salvataggio.', { duration: 5000 }); return; }
    if (data.emailChanged) {
      const supabase = createClient();
      await supabase.auth.refreshSession();
    }

    form.reset(values);
    toast.success('Profilo salvato.');
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData });
    const data = await res.json();
    setAvatarLoading(false);
    if (!res.ok) { toast.error(data.error ?? 'Errore caricamento foto.', { duration: 5000 }); return; }
    setAvatarUrl(data.url);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const initials = collaborator
    ? `${collaborator.nome.charAt(0)}${collaborator.cognome.charAt(0)}`.toUpperCase()
    : '?';

  if (!collaborator) {
    return (
      <div className="rounded-2xl bg-card border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Il tuo profilo collaboratore non è ancora stato configurato.<br />
          Contatta l&apos;amministrazione per completare la configurazione.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Foto profilo */}
      <div className={sectionCls}>
        <div className={sectionHeader}>
          <h2 className="text-sm font-medium text-foreground">Foto profilo</h2>
        </div>
        <div className="p-5 flex items-center gap-4">
          <div className="flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Foto profilo"
                className="w-16 h-16 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center border border-border">
                <span className="text-lg font-medium text-foreground">{initials}</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="mb-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Ruolo:</span>
                <span className="rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs text-foreground">
                  {ROLE_LABELS[role as Role] ?? role}
                </span>
              </div>
              {collaborator.username && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Username:</span>
                  <span className="rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs text-foreground font-mono">
                    {collaborator.username}
                  </span>
                </div>
              )}
              {collaborator.data_ingresso && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Data di ingresso:</span>
                  <span className="rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs text-foreground">
                    {new Date(collaborator.data_ingresso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              type="button"
              variant="outline"
              disabled={avatarLoading}
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
            >
              {avatarLoading ? 'Caricamento…' : avatarUrl ? 'Cambia foto' : 'Carica foto'}
            </Button>
            <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG o WebP · max 2 MB</p>
          </div>
        </div>
      </div>

      <Section title="Informazioni personali">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem>
                <FormLabel className={labelCls}>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Mario" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="cognome" render={({ field }) => (
              <FormItem>
                <FormLabel className={labelCls}>Cognome</FormLabel>
                <FormControl>
                  <Input placeholder="Rossi" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="codice_fiscale" render={({ field }) => (
            <FormItem>
              <FormLabel className={labelCls}>Codice fiscale</FormLabel>
              <FormControl>
                <Input
                  placeholder="RSSMRA80A01H501U"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  disabled={isSubmitting}
                  maxLength={16}
                  className="font-mono"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="data_nascita" render={() => (
              <FormItem>
                <FormLabel className={labelCls}>Data di nascita</FormLabel>
                <Controller
                  control={form.control}
                  name="data_nascita"
                  render={({ field: { value, onChange } }) => (
                    <DatePicker
                      value={value}
                      onChange={onChange}
                      disabled={isSubmitting}
                      captionLayout="dropdown"
                      fromYear={1940}
                      toYear={new Date().getFullYear() - 16}
                    />
                  )}
                />
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="luogo_nascita" render={({ field }) => (
              <FormItem>
                <FormLabel className={labelCls}>Città di nascita</FormLabel>
                <FormControl>
                  <Input placeholder="Roma" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="provincia_nascita" render={({ field }) => (
            <FormItem>
              <FormLabel className={labelCls}>Provincia di nascita (sigla)</FormLabel>
              <FormControl>
                <Input
                  placeholder="RM"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  disabled={isSubmitting}
                  maxLength={2}
                  className="font-mono uppercase"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField control={form.control} name="indirizzo" render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel className={labelCls}>Via/Piazza di residenza</FormLabel>
                <FormControl>
                  <Input placeholder="Via Roma" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="civico_residenza" render={({ field }) => (
              <FormItem>
                <FormLabel className={labelCls}>Civico</FormLabel>
                <FormControl>
                  <Input placeholder="1" {...field} disabled={isSubmitting} maxLength={10} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="comune" render={({ field }) => (
              <FormItem>
                <FormLabel className={labelCls}>Comune di residenza</FormLabel>
                <FormControl>
                  <Input placeholder="Milano" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="provincia_residenza" render={({ field }) => (
              <FormItem>
                <FormLabel className={labelCls}>Provincia di residenza (sigla)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="MI"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    disabled={isSubmitting}
                    maxLength={2}
                    className="font-mono uppercase"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
      </Section>

      <Section title="Documento identità" subtitle="Servirà per firmare i contratti e per le trasferte." defaultOpen={false}>
        <FormField control={form.control} name="tipo_documento_identita" render={({ field }) => (
          <FormItem>
            <FormLabel className={labelCls}>Tipo documento</FormLabel>
            <Select value={field.value || undefined} onValueChange={field.onChange} disabled={isSubmitting}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="— Seleziona —" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {TIPO_DOCUMENTO_IDENTITA.map((t) => (
                  <SelectItem key={t} value={t}>{TIPO_DOCUMENTO_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="numero_documento_identita" render={({ field }) => (
            <FormItem>
              <FormLabel className={labelCls}>Numero documento</FormLabel>
              <FormControl>
                <Input placeholder="AX1234567" {...field} disabled={isSubmitting} maxLength={50} className="font-mono" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="scadenza_documento_identita" render={() => (
            <FormItem>
              <FormLabel className={labelCls}>Scadenza</FormLabel>
              <Controller
                control={form.control}
                name="scadenza_documento_identita"
                render={({ field: { value, onChange } }) => (
                  <DatePicker
                    value={value}
                    onChange={onChange}
                    disabled={isSubmitting}
                    captionLayout="dropdown"
                    fromYear={new Date().getFullYear()}
                    toYear={new Date().getFullYear() + 20}
                  />
                )}
              />
              <FormMessage />
            </FormItem>
          )} />
        </div>
      </Section>

      <Section title="Alimentazione" subtitle="Per l'organizzazione di pranzi e cene durante le trasferte." defaultOpen={false}>
        <FormField control={form.control} name="regime_alimentare" render={({ field }) => (
          <FormItem>
            <FormLabel className={labelCls}>Regime alimentare</FormLabel>
            <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {REGIME_ALIMENTARE.map((r) => (
                  <SelectItem key={r} value={r}>{REGIME_ALIMENTARE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="ha_allergie_alimentari" render={({ field }) => (
          <FormItem>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={field.value}
                onCheckedChange={(v) => field.onChange(!!v)}
                disabled={isSubmitting}
                className="mt-0.5 flex-shrink-0"
              />
              <div>
                <span className="text-sm text-foreground">Ho allergie o intolleranze alimentari</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Selezionando questa voce ci autorizzi a trattare dati sulla tua salute (Art. 9 GDPR).
                </p>
              </div>
            </label>
          </FormItem>
        )} />

        {haAllergie && (
          <>
            <Alert variant="info">
              <Info className="h-4 w-4" />
              <AlertTitle>Trattamento dati sanitari</AlertTitle>
              <AlertDescription>
                Le allergie sono classificate come &quot;dati particolari&quot; (Art. 9 GDPR). Conserveremo queste informazioni
                solo per organizzare i pasti durante le trasferte. Puoi revocare il consenso in qualsiasi momento
                deselezionando la casella sopra.
              </AlertDescription>
            </Alert>

            <FormField control={form.control} name="allergie_note" render={({ field }) => (
              <FormItem>
                <FormLabel className={labelCls}>
                  Descrizione allergie/intolleranze <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="es. Lattosio, frutta a guscio, glutine…"
                    {...field}
                    disabled={isSubmitting}
                    maxLength={500}
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="consenso_dati_salute" render={({ field }) => (
              <FormItem>
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={(v) => field.onChange(!!v)}
                    disabled={isSubmitting}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <span className="text-sm text-foreground">
                    Acconsento al trattamento dei dati sulla salute ai sensi dell&apos;Art. 9 GDPR
                    <span className="text-destructive ml-1">*</span>
                  </span>
                </label>
                <FormMessage />
              </FormItem>
            )} />
          </>
        )}
      </Section>

      <Section title="Indirizzo di spedizione" subtitle="Dove spedire t-shirt, gadget e materiale." defaultOpen={false}>
        <FormField control={form.control} name="spedizione_usa_residenza" render={({ field }) => (
          <FormItem>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div className="min-w-0">
                <span className="text-sm text-foreground">Usa lo stesso indirizzo della residenza</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Disattiva per specificare un indirizzo diverso.
                </p>
              </div>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={isSubmitting}
              />
            </label>
          </FormItem>
        )} />

        {!usaResidenza && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField control={form.control} name="spedizione_indirizzo" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel className={labelCls}>Via/Piazza <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Via Roma" {...field} disabled={isSubmitting} maxLength={200} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="spedizione_civico" render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelCls}>Civico <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="1" {...field} disabled={isSubmitting} maxLength={20} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField control={form.control} name="spedizione_cap" render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelCls}>CAP <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="20100" {...field} disabled={isSubmitting} maxLength={10} className="font-mono" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="spedizione_citta" render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelCls}>Città <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Milano" {...field} disabled={isSubmitting} maxLength={100} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="spedizione_provincia" render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelCls}>Provincia <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="MI"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      disabled={isSubmitting}
                      maxLength={2}
                      className="font-mono uppercase"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="spedizione_nazione" render={({ field }) => (
              <FormItem>
                <FormLabel className={labelCls}>Nazione</FormLabel>
                <FormControl>
                  <Input {...field} disabled readOnly maxLength={2} className="font-mono uppercase" />
                </FormControl>
                <p className="text-xs text-muted-foreground mt-1">Attualmente gestiamo spedizioni solo in Italia.</p>
                <FormMessage />
              </FormItem>
            )} />
          </>
        )}
      </Section>

      <Section title="Contatti">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel className={labelCls}>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="telefono" render={({ field }) => (
            <FormItem>
              <FormLabel className={labelCls}>Telefono di contatto</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="+39 333 0000000" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
      </Section>

      <Section title="Dati pagamento" subtitle="Visibile solo a te e all'amministrazione.">
          <FormField control={form.control} name="intestatario_pagamento" render={({ field }) => (
            <FormItem>
              <FormLabel className={labelCls}>Intestatario del conto bancario</FormLabel>
              <FormControl>
                <Input
                  placeholder="Mario Rossi"
                  {...field}
                  disabled={isSubmitting}
                  maxLength={100}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                Indica il nome e cognome dell&apos;intestatario del conto bancario su cui sarà accreditato il pagamento. Può essere diverso dal tuo se non hai un conto a tuo nome.
              </p>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="iban" render={({ field }) => (
            <FormItem>
              <FormLabel className={labelCls}>IBAN</FormLabel>
              <FormControl>
                <Input
                  placeholder="IT60 X054 2811 1010 0000 0123 456"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  disabled={isSubmitting}
                  className="font-mono"
                  maxLength={34}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1.5">Inserisci senza spazi. Verrà normalizzato automaticamente.</p>
              <FormMessage />
            </FormItem>
          )} />
      </Section>

      <Section
        title="Dati fiscali"
        headerRight={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setShowGuida(true); }}
            className="text-xs text-link hover:text-link/80 h-auto p-0 underline underline-offset-2"
          >
            Guida fiscale
          </Button>
        }
      >
          <FormField control={form.control} name="sono_un_figlio_a_carico" render={({ field }) => (
            <FormItem>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(!!v)}
                  disabled={isSubmitting}
                  className="mt-0.5 flex-shrink-0"
                />
                <div>
                  <span className="text-sm text-foreground">Sono fiscalmente a carico</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Seleziona se sei fiscalmente a carico di un familiare (es. genitore).
                  </p>
                  <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground list-none">
                    <li>· Figli under 24: soglia <span className="font-medium text-foreground">4.000 € lordi/anno</span></li>
                    <li>· Figli 24+ anni (dall&apos;1/01 dell&apos;anno del 24° compleanno): soglia <span className="font-medium text-foreground">2.840,51 € lordi/anno</span></li>
                  </ul>
                </div>
              </label>
              {sonoFiglio && <GuideBox guide={guidaFigli} />}
            </FormItem>
          )} />

          {role === 'collaboratore' && (
            <FormField control={form.control} name="importo_lordo_massimale" render={({ field }) => (
              <FormItem>
                <FormLabel className={labelCls}>
                  Massimale lordo annuo <span className="text-muted-foreground">(max €5.000)</span>
                  <span className="text-destructive ml-1">*</span>
                </FormLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={5000}
                      step={1}
                      placeholder="es. 2840 o 4000 o 5000"
                      {...field}
                      disabled={isSubmitting}
                      className="pl-7"
                    />
                  </FormControl>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Importo lordo massimo che vuoi ricevere da noi nell&apos;anno solare.
                  Se hai altre collaborazioni, abbassa questo valore per rispettare i tuoi limiti personali.
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowGuida(true)}
                    className="ml-1 text-link hover:text-link/80 underline underline-offset-2 h-auto p-0 text-xs">
                    Come scegliere il valore?
                  </Button>
                </p>
                <FormMessage />
              </FormItem>
            )} />
          )}
      </Section>

      {/* Guida fiscale — modal */}
      <Dialog open={showGuida} onOpenChange={(v) => { if (!v) setShowGuida(false); }}>
        <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
            <DialogTitle className="text-base font-semibold text-foreground">Guida fiscale — prestazione occasionale</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto p-6 space-y-5 text-sm text-foreground">

              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Cos&apos;è la prestazione occasionale?</h3>
                <p>Quando lavori con noi vieni pagato come <strong className="text-foreground">prestatore occasionale</strong>: puoi guadagnare senza aprire la partita IVA, in modo semplice e legale. È lo strumento pensato per chi fa lavori saltuari, come studenti o chi ha pochi committenti.</p>
              </section>

              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">La ritenuta d&apos;acconto (−20%)</h3>
                <p>Sul tuo compenso lordo viene automaticamente trattenuto il <strong className="text-foreground">20%</strong> come &quot;ritenuta d&apos;acconto&quot;. Lo paga l&apos;azienda al tuo posto all&apos;Agenzia delle Entrate. Nella dichiarazione dei redditi la recuperi o la conguagli.</p>
                <div className="mt-2 rounded-lg bg-muted px-4 py-3 text-xs font-mono text-foreground">
                  Compenso lordo: 100€ → tu ricevi: 80€ → versati al fisco: 20€
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">La soglia dei 5.000€/anno</h3>
                <p>Puoi guadagnare fino a <strong className="text-foreground">5.000€ lordi all&apos;anno</strong> da prestazioni occasionali senza dover versare contributi INPS:</p>
                <ul className="mt-2 space-y-1.5 list-none">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-green-700 dark:text-green-400 shrink-0 mt-0.5" /> Sotto 5.000€: nessun contributo INPS da versare</li>
                  <li className="flex gap-2"><AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" /> Sopra 5.000€: sulla parte eccedente devi versare ~33% alla Gestione Separata INPS</li>
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">Questa soglia vale sulla <strong className="text-muted-foreground">somma di tutti i compensi occasionali dell&apos;anno</strong>, non solo quelli con noi.</p>
              </section>

              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Se sei figlio fiscalmente a carico</h3>
                <p>I tuoi genitori hanno diritto a detrazioni fiscali finché sei loro &quot;figlio a carico&quot;. Perdi questo status se il tuo reddito annuo supera:</p>
                <div className="mt-2 space-y-2">
                  <Alert variant="info">
                    <AlertDescription>
                      <p className="text-xs font-semibold mb-1">Hai fino a 24 anni</p>
                      <p>Limite reddito: <strong className="text-foreground">4.000€/anno</strong></p>
                      <p className="text-xs text-muted-foreground mt-0.5">Consiglio: imposta il massimale a 4.000€ o meno</p>
                    </AlertDescription>
                  </Alert>
                  <div className="rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/30 px-4 py-3">
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">Hai più di 24 anni</p>
                    <p>Limite reddito: <strong className="text-foreground">2.840,51€/anno</strong></p>
                    <p className="text-xs text-muted-foreground mt-0.5">Consiglio: imposta il massimale a 2.840€ o meno</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Attenzione: il reddito considerato è quello <strong className="text-muted-foreground">complessivo</strong> — includi anche altri eventuali guadagni.</p>
              </section>

              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Come scegliere il massimale?</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2"><span className="text-brand dark:text-brand font-semibold">2.840€</span><span className="text-muted-foreground">— sei figlio a carico con più di 24 anni</span></div>
                  <div className="flex items-start gap-2"><span className="text-brand dark:text-brand font-semibold">4.000€</span><span className="text-muted-foreground">— sei figlio a carico con fino a 24 anni</span></div>
                  <div className="flex items-start gap-2"><span className="text-brand dark:text-brand font-semibold">5.000€</span><span className="text-muted-foreground">— nessun vincolo, vuoi massimizzare i guadagni</span></div>
                  <div className="flex items-start gap-2"><span className="text-yellow-600 dark:text-yellow-400 font-semibold">Meno</span><span className="text-muted-foreground">— hai già altre collaborazioni o guadagni nell&apos;anno</span></div>
                </div>
              </section>

          </div>
          <div className="px-6 py-4 border-t border-border flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => setShowGuida(false)}>
              Ho capito
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Section title="Preferenze">
          <FormField control={form.control} name="tshirt_size" render={({ field }) => (
            <FormItem>
              <FormLabel className={labelCls}>Taglia t-shirt</FormLabel>
              <Select value={field.value || undefined} onValueChange={field.onChange} disabled={isSubmitting}>
                <FormControl><SelectTrigger><SelectValue placeholder="— Non specificata —" /></SelectTrigger></FormControl>
                <SelectContent>
                  {TSHIRT_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
      </Section>

      <Section title="Attività" subtitle="Città e materie che insegni.">
          <FormField control={form.control} name="citta" render={({ field }) => (
            <FormItem>
              <FormLabel className={labelCls}>
                Città <span className="text-destructive">*</span>
              </FormLabel>
              <Select value={field.value || undefined} onValueChange={field.onChange} disabled={isSubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="— Seleziona città —" />
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
          )} />

          <FormField control={form.control} name="materie_insegnate" render={({ field }) => (
            <FormItem>
              <FormLabel className={labelCls}>
                Materie insegnate <span className="text-destructive">*</span>
              </FormLabel>
              <div className="flex flex-wrap gap-2 mt-1">
                {materiaOptions.map((opt) => {
                  const active = (field.value ?? []).includes(opt.nome);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() =>
                        field.onChange(
                          active ? field.value.filter((m: string) => m !== opt.nome) : [...field.value, opt.nome],
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
              <FormMessage />
            </FormItem>
          )} />
      </Section>

      {/* Sticky save bar — visible only when form is dirty */}
      {isDirty && (
        <div className="sticky bottom-0 z-10 -mx-6 px-6 py-3 bg-background/80 backdrop-blur-sm border-t border-border">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-brand hover:bg-brand/90 text-white"
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Salvataggio…
              </>
            ) : (
              'Salva modifiche'
            )}
          </Button>
        </div>
      )}
    </form>
    </Form>
  );
}
