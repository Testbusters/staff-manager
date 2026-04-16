'use client';

import { useState, useEffect } from 'react';
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

type Credentials = { email: string; password: string };
type Community = { id: string; name: string; is_active: boolean };
type LookupOption = { id: string; nome: string };

const labelCls = 'block text-xs text-muted-foreground mb-1.5';

const sectionTitle = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 mt-1';

export default function CreateUserForm() {
  // Auth fields
  const [email, setEmail] = useState('');

  // Community selection
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [selectedCommunityName, setSelectedCommunityName] = useState('');

  // Derived tipo_contratto from community
  const tipoContratto = selectedCommunityName ? getContractTemplateTipo(selectedCommunityName) : 'OCCASIONALE';

  // Città
  const [citta, setCitta] = useState('');
  const [cittaOptions, setCittaOptions] = useState<LookupOption[]>([]);

  // Salta firma
  const [saltaFirma, setSaltaFirma] = useState(false);

  // Anagrafica
  const [nome, setNome]               = useState('');
  const [cognome, setCognome]         = useState('');
  const [username, setUsername]             = useState('');
  const [usernameManuallySet, setUsernameManuallySet] = useState(false);
  const [codiceFiscale, setCodiceFiscale] = useState('');
  const [dataNascita, setDataNascita] = useState('');
  const [luogoNascita, setLuogoNascita] = useState('');
  const [provinciaNascita, setProvinciaNascita] = useState('');
  const [comuneRes, setComuneRes]     = useState('');
  const [provinciaRes, setPrvinciaRes] = useState('');
  const [indirizzo, setIndirizzo]     = useState('');
  const [civico, setCivico]           = useState('');
  const [telefono, setTelefono]       = useState('');
  const [intestatarioPagamento, setIntestatarioPagamento] = useState('');
  const [dataIngresso, setDataIngresso] = useState('');
  const [dataFineContratto, setDataFineContratto] = useState('');
  const [sonoFiglio, setSonoFiglio] = useState(false);
  const [massimale, setMassimale] = useState('');

  // Invite mode
  const [mode, setMode] = useState<'quick' | 'full'>('quick');

  // UI state
  const [loading, setLoading]         = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copied, setCopied]           = useState<'email' | 'password' | null>(null);

  useEffect(() => {
    fetch('/api/admin/communities')
      .then((r) => r.json())
      .then((data) => setCommunities(data.communities ?? []))
      .catch(() => {});
  }, []);

  // Fetch città when community changes
  useEffect(() => {
    if (!selectedCommunity) { setCittaOptions([]); setCitta(''); return; }
    const comm = communities.find((c) => c.id === selectedCommunity);
    const slug = comm?.name?.toLowerCase().replace(/\s+/g, '') ?? '';
    fetch(`/api/lookup-options?type=citta&community=${slug}`)
      .then((r) => r.json())
      .then((d) => setCittaOptions(d.options ?? []))
      .catch(() => {});
    setCitta('');
  }, [selectedCommunity, communities]);

  // Auto-compute username from nome+cognome
  useEffect(() => {
    if (!usernameManuallySet) {
      setUsername(generateUsername(nome, cognome));
    }
  }, [nome, cognome, usernameManuallySet]);

  const copyToClipboard = async (text: string, field: 'email' | 'password') => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCommunityChange = (id: string) => {
    setSelectedCommunity(id);
    const comm = communities.find((c) => c.id === id);
    setSelectedCommunityName(comm?.name ?? '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setCredentials(null);

    const body: Record<string, unknown> = {
      email,
      community_id: selectedCommunity,
      tipo_contratto: tipoContratto,
      citta,
      salta_firma: saltaFirma,
      nome:                nome.trim() || undefined,
      cognome:             cognome.trim() || undefined,
      username:            username.trim() || undefined,
      codice_fiscale:      codiceFiscale.trim().toUpperCase() || null,
      data_nascita:        dataNascita || null,
      luogo_nascita:       luogoNascita.trim() || null,
      provincia_nascita:   provinciaNascita.trim().toUpperCase() || null,
      comune:              comuneRes.trim() || null,
      provincia_residenza: provinciaRes.trim().toUpperCase() || null,
      indirizzo:           indirizzo.trim() || null,
      civico_residenza:    civico.trim() || null,
      telefono:            telefono.trim() || null,
      intestatario_pagamento: intestatarioPagamento.trim() || null,
      data_ingresso:       dataIngresso || null,
      data_fine_contratto: dataFineContratto || null,
      sono_un_figlio_a_carico: sonoFiglio,
      importo_lordo_massimale: massimale !== '' ? parseFloat(massimale) : null,
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
    setEmail('');
    setSelectedCommunity(''); setSelectedCommunityName('');
    setCitta(''); setSaltaFirma(false);
    setNome(''); setCognome(''); setUsername(''); setUsernameManuallySet(false);
    setCodiceFiscale(''); setDataNascita('');
    setLuogoNascita(''); setProvinciaNascita(''); setComuneRes(''); setPrvinciaRes('');
    setIndirizzo(''); setCivico(''); setTelefono(''); setIntestatarioPagamento(''); setDataIngresso(''); setDataFineContratto('');
    setSonoFiglio(false); setMassimale('');
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
            Credenziali di accesso — da condividere manualmente in caso di mancato recapito dell&apos;email.
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
    <form onSubmit={handleSubmit} noValidate className="space-y-5">

      {/* Mode toggle */}
      <ButtonGroup className="w-full">
        <Button
          type="button"
          variant={mode === 'quick' ? 'default' : 'outline'}
          onClick={() => setMode('quick')}
          className={`flex-1${mode === 'quick' ? ' bg-brand hover:bg-brand/90 text-white' : ''}`}
        >
          Invito rapido
        </Button>
        <Button
          type="button"
          variant={mode === 'full' ? 'default' : 'outline'}
          onClick={() => setMode('full')}
          className={`flex-1${mode === 'full' ? ' bg-brand hover:bg-brand/90 text-white' : ''}`}
        >
          Invito completo
        </Button>
      </ButtonGroup>

      {/* Auth + Community */}
      <div className="rounded-xl border border-border p-4">
        <p className={sectionTitle}>Accesso</p>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Email <span className="text-destructive">*</span></label>
            <Input type="email" placeholder="nome@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)}
              required disabled={loading} autoComplete="off" />
          </div>
          <div>
            <label className={labelCls}>Community <span className="text-destructive">*</span></label>
            <Select value={selectedCommunity} onValueChange={handleCommunityChange} disabled={loading}>
              <SelectTrigger><SelectValue placeholder="— Seleziona community —" /></SelectTrigger>
              <SelectContent>
                {communities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tipo rapporto — derived from community */}
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
                Il collaboratore completerà l&apos;onboarding senza firmare il contratto. Potrai caricare il documento in seguito dalla sezione Documenti.
              </p>
            </div>
            <Switch checked={saltaFirma} onCheckedChange={setSaltaFirma} disabled={loading} />
          </div>
        </div>
      )}

      {/* Città */}
      {selectedCommunity && (
        <div className="rounded-xl border border-border p-4">
          <p className={sectionTitle}>Assegnazione</p>
          <div>
            <label className={labelCls}>Città <span className="text-destructive">*</span></label>
            <Select value={citta || undefined} onValueChange={setCitta} disabled={loading || cittaOptions.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={cittaOptions.length === 0 ? 'Seleziona prima la community' : '— Seleziona città —'} />
              </SelectTrigger>
              <SelectContent>
                {cittaOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.nome}>{opt.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Data fine contratto */}
      {selectedCommunity && (
        <div className="rounded-xl border border-border p-4">
          <p className={sectionTitle}>Durata contratto</p>
          <div>
            <label className={labelCls}>Data fine contratto <span className="text-destructive">*</span></label>
            <DatePicker
              value={dataFineContratto}
              onChange={(v) => setDataFineContratto(v)}
              disabled={loading}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
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
              <div>
                <label className={labelCls}>Nome <span className="text-destructive">*</span></label>
                <Input type="text" placeholder="Mario" value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required disabled={loading} />
              </div>
              <div>
                <label className={labelCls}>Cognome <span className="text-destructive">*</span></label>
                <Input type="text" placeholder="Rossi" value={cognome}
                  onChange={(e) => setCognome(e.target.value)}
                  required disabled={loading} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Username <span className="text-destructive">*</span></label>
              <Input
                type="text"
                placeholder="mario_rossi"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                  setUsernameManuallySet(true);
                }}
                disabled={loading}
                maxLength={50}
                className="font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Generato automaticamente da nome e cognome. Puoi modificarlo.</p>
            </div>
            <div>
              <label className={labelCls}>Data di ingresso <span className="text-destructive">*</span></label>
              <DatePicker
                value={dataIngresso}
                onChange={(v) => setDataIngresso(v)}
                disabled={loading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Invito completo: anagrafica richiesta */}
      {selectedCommunity && mode === 'full' && (
        <div className="rounded-xl border border-border p-4">
          <p className={sectionTitle}>Dati personali</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nome <span className="text-destructive">*</span></label>
                <Input type="text" placeholder="Mario" value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required disabled={loading} />
              </div>
              <div>
                <label className={labelCls}>Cognome <span className="text-destructive">*</span></label>
                <Input type="text" placeholder="Rossi" value={cognome}
                  onChange={(e) => setCognome(e.target.value)}
                  required disabled={loading} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Username <span className="text-destructive">*</span></label>
              <Input
                type="text"
                placeholder="mario_rossi"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                  setUsernameManuallySet(true);
                }}
                disabled={loading}
                maxLength={50}
                className="font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Generato automaticamente da nome e cognome. Puoi modificarlo.</p>
            </div>
            <div>
              <label className={labelCls}>Codice fiscale <span className="text-destructive">*</span></label>
              <Input type="text" placeholder="RSSMRA80A01H501U" value={codiceFiscale}
                onChange={(e) => setCodiceFiscale(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                required disabled={loading} maxLength={16} className="font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Data di nascita <span className="text-destructive">*</span></label>
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
                <label className={labelCls}>Città di nascita <span className="text-destructive">*</span></label>
                <Input type="text" placeholder="Roma" value={luogoNascita}
                  onChange={(e) => setLuogoNascita(e.target.value)}
                  required disabled={loading} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Provincia di nascita (sigla) <span className="text-destructive">*</span></label>
              <Input type="text" placeholder="RM" value={provinciaNascita}
                onChange={(e) => setProvinciaNascita(e.target.value.toUpperCase())}
                required disabled={loading} maxLength={2} className="font-mono uppercase" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Via/Piazza <span className="text-destructive">*</span></label>
                <Input type="text" placeholder="Via Roma" value={indirizzo}
                  onChange={(e) => setIndirizzo(e.target.value)}
                  required disabled={loading} />
              </div>
              <div>
                <label className={labelCls}>Civico <span className="text-destructive">*</span></label>
                <Input type="text" placeholder="1" value={civico}
                  onChange={(e) => setCivico(e.target.value)}
                  required disabled={loading} maxLength={10} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Comune di residenza <span className="text-destructive">*</span></label>
                <Input type="text" placeholder="Milano" value={comuneRes}
                  onChange={(e) => setComuneRes(e.target.value)}
                  required disabled={loading} />
              </div>
              <div>
                <label className={labelCls}>Provincia di residenza (sigla) <span className="text-destructive">*</span></label>
                <Input type="text" placeholder="MI" value={provinciaRes}
                  onChange={(e) => setPrvinciaRes(e.target.value.toUpperCase())}
                  required disabled={loading} maxLength={2} className="font-mono uppercase" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Telefono <span className="text-destructive">*</span></label>
              <Input type="tel" placeholder="+39 333 0000000" value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                required disabled={loading} />
            </div>
            <div>
              <label className={labelCls}>Intestatario del conto bancario <span className="text-destructive">*</span></label>
              <Input type="text" placeholder="Mario Rossi" value={intestatarioPagamento}
                onChange={(e) => setIntestatarioPagamento(e.target.value)}
                required disabled={loading} maxLength={100} />
              <p className="text-[10px] text-muted-foreground mt-1">Nome e cognome dell&apos;intestatario del conto. Pre-compilato per l&apos;onboarding.</p>
            </div>
            <div>
              <label className={labelCls}>Data di ingresso <span className="text-destructive">*</span></label>
              <DatePicker
                value={dataIngresso}
                onChange={(v) => setDataIngresso(v)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Dati fiscali */}
          <div className="mt-4 rounded-xl border border-border p-4">
            <p className={sectionTitle}>Dati fiscali</p>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={sonoFiglio}
                  onCheckedChange={(v) => setSonoFiglio(!!v)}
                  disabled={loading}
                  className="mt-0.5 flex-shrink-0"
                />
                <div>
                  <span className="text-sm text-foreground">Sono fiscalmente a carico</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Seleziona se il collaboratore è fiscalmente a carico di un familiare (es. genitore).
                  </p>
                  <ul className="mt-1 space-y-0.5 text-[10px] text-muted-foreground list-none">
                    <li>· Under 24: soglia <span className="font-medium text-foreground">4.000 € lordi/anno</span></li>
                    <li>· 24+ anni: soglia <span className="font-medium text-foreground">2.840,51 € lordi/anno</span></li>
                  </ul>
                </div>
              </label>
              <div>
                <label className={labelCls}>Massimale lordo annuo (max €5.000)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                  <Input
                    type="number"
                    min={0}
                    max={5000}
                    step={100}
                    placeholder="5000"
                    value={massimale}
                    onChange={(e) => setMassimale(e.target.value)}
                    disabled={loading}
                    className="pl-7"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Importo lordo massimo che il collaboratore vuole ricevere nell&apos;anno solare.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={
          loading || !email || !selectedCommunity || !citta || !dataFineContratto ||
          (mode === 'quick' && (!nome.trim() || !cognome.trim() || !username.trim() || !dataIngresso)) ||
          (mode === 'full' && (
            !nome.trim() || !cognome.trim() || !username.trim() || !codiceFiscale.trim() || !dataNascita ||
            !luogoNascita.trim() || !provinciaNascita.trim() || !indirizzo.trim() ||
            !civico.trim() || !comuneRes.trim() || !provinciaRes.trim() ||
            !telefono.trim() || !intestatarioPagamento.trim() || !dataIngresso
          ))
        }
        className="bg-brand hover:bg-brand/90 text-white"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Creazione in corso…
          </>
        ) : 'Conferma'}
      </Button>
    </form>
  );
}
