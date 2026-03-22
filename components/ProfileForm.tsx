'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, AlertTriangle, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ROLE_LABELS } from '@/lib/types';
import type { Role } from '@/lib/types';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

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
};

type GuideContent = { titolo: string; descrizione: string | null } | null;

type LookupOption = { id: string; nome: string };

type Props = {
  collaborator: Collaborator | null;
  role: string;
  email: string;
  community: string;
  communities: { id: string; name: string }[];
  allCommunities: { id: string; name: string }[];
  guidaFigli: GuideContent;
};

const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

const readonlyCls =
  'w-full rounded-lg bg-card border border-border px-3 py-2.5 text-sm text-muted-foreground select-all';
const labelCls = 'block text-xs text-muted-foreground mb-1.5';
const sectionCls = 'rounded-2xl bg-card border border-border';
const sectionHeader = 'px-5 py-4 border-b border-border';

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className={labelCls}>{label}</p>
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

export default function ProfileForm({ collaborator, role, email, community, communities, allCommunities, guidaFigli }: Props) {
  // Editable personal data
  const [emailVal, setEmailVal]       = useState(email);
  const [nome, setNome]               = useState(collaborator?.nome ?? '');
  const [cognome, setCognome]         = useState(collaborator?.cognome ?? '');
  const [codiceFiscale, setCodiceFiscale] = useState(collaborator?.codice_fiscale ?? '');
  const [dataNascita, setDataNascita] = useState(collaborator?.data_nascita ?? '');
  const [luogoNascita, setLuogoNascita] = useState(collaborator?.luogo_nascita ?? '');
  const [provinciaNascita, setProvinciaNascita] = useState(collaborator?.provincia_nascita ?? '');
  const [comuneRes, setComuneRes]     = useState(collaborator?.comune ?? '');
  const [provinciaRes, setPrvinciaRes] = useState(collaborator?.provincia_residenza ?? '');
  // Contacts
  const [telefono, setTelefono]   = useState(collaborator?.telefono ?? '');
  const [indirizzo, setIndirizzo] = useState(collaborator?.indirizzo ?? '');
  const [civico, setCivico]       = useState(collaborator?.civico_residenza ?? '');
  // Payment
  const [iban, setIban] = useState(collaborator?.iban ?? '');
  const [intestatarioPagamento, setIntestatarioPagamento] = useState(collaborator?.intestatario_pagamento ?? '');
  // Fiscal
  const [sonoFiglio, setSonoFiglio]   = useState(collaborator?.sono_un_figlio_a_carico ?? false);
  const [massimale, setMassimale]     = useState<string>(
    collaborator?.importo_lordo_massimale != null ? String(collaborator.importo_lordo_massimale) : '',
  );
  const [showGuida, setShowGuida]     = useState(false);
  // Preferences
  const [tshirt, setTshirt]     = useState(collaborator?.tshirt_size ?? '');
  // Avatar
  const [avatarUrl, setAvatarUrl] = useState(collaborator?.foto_profilo_url ?? '');

  // Communities (collaboratore self-edit — single community)
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>(
    communities[0]?.id ?? '',
  );

  // Activity — città + materie
  const [citta, setCitta]                   = useState(collaborator?.citta ?? '');
  const [materieInsegnate, setMaterieInsegnate] = useState<string[]>(collaborator?.materie_insegnate ?? []);
  const [cittaOptions, setCittaOptions]     = useState<LookupOption[]>([]);
  const [materiaOptions, setMateriaOptions] = useState<LookupOption[]>([]);

  const [loading, setLoading]           = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const comm = community || 'testbusters';
    fetch(`/api/lookup-options?type=citta&community=${comm}`)
      .then((r) => r.json()).then((d) => setCittaOptions(d.options ?? [])).catch(() => {});
    fetch(`/api/lookup-options?type=materia&community=${comm}`)
      .then((r) => r.json()).then((d) => setMateriaOptions(d.options ?? [])).catch(() => {});
  }, [community]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!citta) { toast.error('Seleziona la tua città.'); return; }
    if (materieInsegnate.length === 0) { toast.error('Seleziona almeno una materia insegnata.'); return; }

    setLoading(true);

    const emailTrimmed = emailVal.trim().toLowerCase();
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:               emailTrimmed !== email.toLowerCase() ? emailTrimmed : undefined,
        nome:                nome.trim() || undefined,
        cognome:             cognome.trim() || undefined,
        codice_fiscale:      codiceFiscale.trim().toUpperCase() || null,
        data_nascita:        dataNascita || null,
        luogo_nascita:       luogoNascita.trim() || null,
        provincia_nascita:   provinciaNascita.trim().toUpperCase() || null,
        comune:              comuneRes.trim() || null,
        provincia_residenza: provinciaRes.trim().toUpperCase() || null,
        telefono:            telefono || null,
        indirizzo:           indirizzo || null,
        civico_residenza:    civico.trim() || null,
        iban:                iban.toUpperCase().replace(/\s/g, '') || null,
        intestatario_pagamento: intestatarioPagamento.trim() || null,
        tshirt_size:               tshirt || null,
        sono_un_figlio_a_carico:   sonoFiglio,
        importo_lordo_massimale:   massimale !== '' ? parseFloat(massimale) : null,
        citta,
        materie_insegnate:         materieInsegnate,
      }),
    });

    const data = await res.json();
    if (!res.ok) { setLoading(false); toast.error(data.error ?? 'Errore durante il salvataggio.', { duration: 5000 }); return; }
    if (data.emailChanged) {
      const supabase = createClient();
      await supabase.auth.refreshSession();
    }

    // Save community in the same transaction if applicable
    if (role === 'collaboratore' && selectedCommunityId) {
      const commRes = await fetch('/api/profile/communities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ community_ids: [selectedCommunityId] }),
      });
      const commData = await commRes.json();
      setLoading(false);
      if (!commRes.ok) { toast.error(commData.error ?? 'Errore salvataggio community.', { duration: 5000 }); return; }
    } else {
      setLoading(false);
    }

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
    <form onSubmit={handleSave} className="space-y-4">
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

      {/* Informazioni personali — editable */}
      <div className={sectionCls}>
        <div className={sectionHeader}>
          <h2 className="text-sm font-medium text-foreground">Informazioni personali</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nome</label>
              <Input type="text" placeholder="Mario" value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={loading} />
            </div>
            <div>
              <label className={labelCls}>Cognome</label>
              <Input type="text" placeholder="Rossi" value={cognome}
                onChange={(e) => setCognome(e.target.value)}
                disabled={loading} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Codice fiscale</label>
            <Input type="text" placeholder="RSSMRA80A01H501U" value={codiceFiscale}
              onChange={(e) => setCodiceFiscale(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              disabled={loading} maxLength={16} className="font-mono" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Data di nascita</label>
              <DatePicker
                value={dataNascita}
                onChange={(v) => setDataNascita(v)}
                disabled={loading}
                captionLayout="dropdown"
                fromYear={1940}
                toYear={new Date().getFullYear() - 16}
              />
            </div>
            <div>
              <label className={labelCls}>Città di nascita</label>
              <Input type="text" placeholder="Roma" value={luogoNascita}
                onChange={(e) => setLuogoNascita(e.target.value)}
                disabled={loading} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Provincia di nascita (sigla)</label>
            <Input type="text" placeholder="RM" value={provinciaNascita}
              onChange={(e) => setProvinciaNascita(e.target.value.toUpperCase())}
              disabled={loading} maxLength={2} className="font-mono uppercase" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Via/Piazza di residenza</label>
              <Input
                type="text"
                placeholder="Via Roma"
                value={indirizzo}
                onChange={(e) => setIndirizzo(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className={labelCls}>Civico</label>
              <Input
                type="text"
                placeholder="1"
                value={civico}
                onChange={(e) => setCivico(e.target.value)}
                disabled={loading}
                maxLength={10}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Comune di residenza</label>
              <Input type="text" placeholder="Milano" value={comuneRes}
                onChange={(e) => setComuneRes(e.target.value)}
                disabled={loading} />
            </div>
            <div>
              <label className={labelCls}>Provincia di residenza (sigla)</label>
              <Input type="text" placeholder="MI" value={provinciaRes}
                onChange={(e) => setPrvinciaRes(e.target.value.toUpperCase())}
                disabled={loading} maxLength={2} className="font-mono uppercase" />
            </div>
          </div>
        </div>
      </div>

      {/* Contacts — editable */}
      <div className={sectionCls}>
        <div className={sectionHeader}>
          <h2 className="text-sm font-medium text-foreground">Contatti</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Email</label>
            <Input
              type="email"
              value={emailVal}
              onChange={(e) => setEmailVal(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label className={labelCls}>Telefono di contatto</label>
            <Input
              type="tel"
              placeholder="+39 333 0000000"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Payment — editable */}
      <div className={sectionCls}>
        <div className={sectionHeader}>
          <h2 className="text-sm font-medium text-foreground">Dati pagamento</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Visibile solo a te e all&apos;amministrazione.</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Intestatario del conto bancario</label>
            <Input
              type="text"
              placeholder="Mario Rossi"
              value={intestatarioPagamento}
              onChange={(e) => setIntestatarioPagamento(e.target.value)}
              disabled={loading}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Indica il nome e cognome dell&apos;intestatario del conto bancario su cui sarà accreditato il pagamento. Può essere diverso dal tuo se non hai un conto a tuo nome.
            </p>
          </div>
          <div>
            <label className={labelCls}>IBAN</label>
            <Input
              type="text"
              placeholder="IT60 X054 2811 1010 0000 0123 456"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              disabled={loading}
              className="font-mono"
              maxLength={34}
            />
            <p className="text-xs text-muted-foreground mt-1.5">Inserisci senza spazi. Verrà normalizzato automaticamente.</p>
          </div>
        </div>
      </div>

      {/* Dati fiscali */}
      <div className={sectionCls}>
        <div className={sectionHeader}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Dati fiscali</h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowGuida(true)}
              className="text-xs text-link hover:text-link/80 h-auto p-0 underline underline-offset-2"
            >
              Come funziona la prestazione occasionale?
            </Button>
          </div>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={sonoFiglio}
                onCheckedChange={(v) => setSonoFiglio(!!v)}
                disabled={loading}
                className="mt-0.5 flex-shrink-0"
              />
              <div>
                <span className="text-sm text-foreground">Sono fiscalmente a carico</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Seleziona se sei fiscalmente a carico di un familiare (es. genitore).
                </p>
                <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground list-none">
                  <li>· Figli under 24: soglia <span className="font-medium text-foreground">4.000 € lordi/anno</span></li>
                  <li>· Figli 24+ anni (dall'1/01 dell'anno del 24° compleanno): soglia <span className="font-medium text-foreground">2.840,51 € lordi/anno</span></li>
                </ul>
              </div>
            </label>
            {sonoFiglio && <GuideBox guide={guidaFigli} />}
          </div>

          {role === 'collaboratore' && (
            <div>
              <label className={labelCls}>
                Massimale lordo annuo <span className="text-muted-foreground">(max €5.000)</span>
                <span className="text-destructive ml-1">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                <Input
                  type="number"
                  min={1}
                  max={5000}
                  step={1}
                  placeholder="es. 2840 o 4000 o 5000"
                  value={massimale}
                  onChange={(e) => setMassimale(e.target.value)}
                  disabled={loading}
                  required
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Importo lordo massimo che vuoi ricevere da noi nell&apos;anno solare.
                Se hai altre collaborazioni, abbassa questo valore per rispettare i tuoi limiti personali.
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowGuida(true)}
                  className="ml-1 text-link hover:text-link/80 underline underline-offset-2 h-auto p-0 text-xs">
                  Come scegliere il valore?
                </Button>
              </p>
            </div>
          )}
        </div>
      </div>

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

      {/* Community — collaboratore self-edit */}
      {role === 'collaboratore' && allCommunities.length > 0 && (
        <div className={sectionCls}>
          <div className={sectionHeader}>
            <h2 className="text-sm font-medium text-foreground">Community</h2>
          </div>
          <div className="p-5 space-y-4">
            <Select
              value={selectedCommunityId}
              onValueChange={setSelectedCommunityId}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="— Seleziona community —" />
              </SelectTrigger>
              <SelectContent>
                {allCommunities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Preferences — editable */}
      <div className={sectionCls}>
        <div className={sectionHeader}>
          <h2 className="text-sm font-medium text-foreground">Preferenze</h2>
        </div>
        <div className="p-5">
          <label className={labelCls}>Taglia t-shirt</label>
          <Select value={tshirt || undefined} onValueChange={setTshirt} disabled={loading}>
            <SelectTrigger><SelectValue placeholder="— Non specificata —" /></SelectTrigger>
            <SelectContent>
              {TSHIRT_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>


      {/* Attività — città + materie */}
      <div className={sectionCls}>
        <div className={sectionHeader}>
          <h2 className="text-sm font-medium text-foreground">Attività</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Città e materie che insegni.</p>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className={labelCls}>
              Città <span className="text-destructive">*</span>
            </label>
            <Select value={citta || undefined} onValueChange={setCitta} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="— Seleziona città —" />
              </SelectTrigger>
              <SelectContent>
                {cittaOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.nome}>{opt.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className={labelCls}>
              Materie insegnate <span className="text-destructive">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {materiaOptions.map((opt) => {
                const active = materieInsegnate.includes(opt.nome);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      setMaterieInsegnate((prev) =>
                        active ? prev.filter((m) => m !== opt.nome) : [...prev, opt.nome],
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
            {materieInsegnate.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">Seleziona almeno una materia.</p>
            )}
          </div>
        </div>
      </div>

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
            Salvataggio…
          </>
        ) : (
          'Salva modifiche'
        )}
      </Button>
    </form>
  );
}
