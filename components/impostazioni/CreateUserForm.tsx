'use client';

import { useState, useEffect } from 'react';
import { CONTRACT_TEMPLATE_LABELS, type ContractTemplateType } from '@/lib/types';
import { generateUsername } from '@/lib/username';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

type Role = 'collaboratore' | 'responsabile_cittadino' | 'responsabile_compensi' | 'responsabile_servizi_individuali' | 'amministrazione';
type Credentials = { email: string; password: string };
type Community = { id: string; name: string; is_active: boolean };
type TemplateStatus = { tipo: ContractTemplateType; file_name: string } | null;

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'collaboratore',                    label: 'Collaboratore' },
  { value: 'responsabile_cittadino',           label: 'Responsabile Cittadino' },
  { value: 'responsabile_compensi',            label: 'Responsabile Compensi' },
  { value: 'responsabile_servizi_individuali', label: 'Responsabile Servizi Individuali' },
  { value: 'amministrazione',                  label: 'Amministrazione' },
];


// Roles that require tipo_contratto and have anagrafica pre-fill
const ROLES_WITH_CONTRACT: Role[] = ['collaboratore', 'responsabile_compensi'];


const labelCls = 'block text-xs text-muted-foreground mb-1.5';

const sectionTitle = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 mt-1';

export default function CreateUserForm() {
  // Auth fields
  const [email, setEmail]     = useState('');
  const [role, setRole]       = useState<Role>('collaboratore');

  // Communities (responsabile assignment + contract community)
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);

  // Anagrafica (optional pre-fill for collaboratore and responsabile)
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

  // Tipo rapporto: always OCCASIONALE

  // Template status (which tipos have templates uploaded)
  const [templateStatus, setTemplateStatus]   = useState<TemplateStatus[]>([]);

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
    fetch('/api/admin/contract-templates')
      .then((r) => r.json())
      .then((data) => setTemplateStatus(data.templates ?? []))
      .catch(() => {});
  }, []);

  const toggleCommunity = (id: string) =>
    setSelectedCommunities((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );

  const copyToClipboard = async (text: string, field: 'email' | 'password') => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const hasTemplate = (tipo: ContractTemplateType) =>
    templateStatus.some((t) => t?.tipo === tipo);

  const needsContract = ROLES_WITH_CONTRACT.includes(role);

  // Auto-compute username from nome+cognome (unless manually edited)
  useEffect(() => {
    if (!usernameManuallySet && needsContract) {
      setUsername(generateUsername(nome, cognome));
    }
  }, [nome, cognome, usernameManuallySet, needsContract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setCredentials(null);

    const body: Record<string, unknown> = {
      email,
      role,
      community_ids: role === 'responsabile_compensi' ? selectedCommunities : [],
    };

    if (needsContract) {
      Object.assign(body, {
        tipo_contratto:      'OCCASIONALE',
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
      });
    }

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
    setRole('collaboratore');
    setSelectedCommunities([]);
    setNome(''); setCognome(''); setUsername(''); setUsernameManuallySet(false);
    setCodiceFiscale(''); setDataNascita('');
    setLuogoNascita(''); setProvinciaNascita(''); setComuneRes(''); setPrvinciaRes('');
    setIndirizzo(''); setCivico(''); setTelefono(''); setIntestatarioPagamento(''); setDataIngresso(''); setDataFineContratto('');
    setSonoFiglio(false); setMassimale('');
  };

  if (credentials) {
    return (
      <div className="space-y-4">
        {/* Invite sent confirmation */}
        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 px-4 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-xs text-foreground">
            Invito inviato a <span className="font-medium text-foreground">{credentials.email}</span>.
          </p>
        </div>

        {/* Credentials backup */}
        <div className="rounded-xl bg-muted/60 border border-border p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Credenziali di accesso — da condividere manualmente in caso di mancato recapito dell&apos;email.
          </p>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Email</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-card px-3 py-2 text-sm text-foreground font-mono">{credentials.email}</code>
              <button onClick={() => copyToClipboard(credentials.email, 'email')}
                className="rounded-lg bg-accent hover:bg-muted px-3 py-2 text-xs text-foreground transition whitespace-nowrap">
                {copied === 'email' ? 'Copiato!' : 'Copia'}
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Password temporanea</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-card px-3 py-2 text-sm text-foreground font-mono tracking-wider">{credentials.password}</code>
              <button onClick={() => copyToClipboard(credentials.password, 'password')}
                className="rounded-lg bg-accent hover:bg-muted px-3 py-2 text-xs text-foreground transition whitespace-nowrap">
                {copied === 'password' ? 'Copiata!' : 'Copia'}
              </button>
            </div>
          </div>
        </div>

        <Button variant="outline" onClick={() => setCredentials(null)} className="w-full">
          Crea un altro utente
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button type="button"
          onClick={() => setMode('quick')}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
            mode === 'quick'
              ? 'bg-brand border-blue-600 text-white'
              : 'bg-muted border-border text-muted-foreground hover:border-border'
          }`}>
          Invito rapido
        </button>
        <button type="button"
          onClick={() => setMode('full')}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
            mode === 'full'
              ? 'bg-brand border-blue-600 text-white'
              : 'bg-muted border-border text-muted-foreground hover:border-border'
          }`}>
          Invito completo
        </button>
      </div>

      {/* Auth */}
      <div>
        <p className={sectionTitle}>Accesso</p>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Email <span className="text-red-500">*</span></label>
            <Input type="email" placeholder="nome@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)}
              required disabled={loading} autoComplete="off" />
          </div>
          <div>
            <label className={labelCls}>Ruolo</label>
            <Select value={role} onValueChange={(v) => { setRole(v as Role); setSelectedCommunities([]); }} disabled={loading}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Responsabile → community assignment */}
      {role === 'responsabile_compensi' && communities.length > 0 && (
        <div>
          <p className={sectionTitle}>Comunità gestite</p>
          <div className="space-y-2">
            {communities.map((c) => (
              <label key={c.id}
                className="flex items-center gap-3 rounded-lg bg-muted border border-border px-3 py-2.5 cursor-pointer hover:border-border transition">
                <Checkbox
                  checked={selectedCommunities.includes(c.id)}
                  onCheckedChange={() => toggleCommunity(c.id)}
                  disabled={loading}
                />
                <span className="text-sm text-foreground">{c.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Tipo rapporto — sempre OCCASIONALE */}
      {needsContract && (
        <div>
          <p className={sectionTitle}>Tipo rapporto</p>
          <div className="flex items-center justify-between rounded-xl bg-muted border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">{CONTRACT_TEMPLATE_LABELS['OCCASIONALE']}</p>
              {!hasTemplate('OCCASIONALE') && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">Nessun template caricato — il contratto non sarà generato automaticamente.</p>
              )}
            </div>
            <span className="text-xs text-muted-foreground ml-4">Tipo fisso</span>
          </div>
        </div>
      )}

      {/* Data fine contratto — in both modes */}
      {needsContract && (
        <div>
          <p className={sectionTitle}>Durata contratto</p>
          <div>
            <label className={labelCls}>Data fine contratto <span className="text-red-500">*</span></label>
            <Input type="date" value={dataFineContratto}
              onChange={(e) => setDataFineContratto(e.target.value)}
              required disabled={loading} />
            <p className="text-[10px] text-muted-foreground mt-1">
              Usata per compilare automaticamente il template PDF del contratto.
            </p>
          </div>
        </div>
      )}

      {/* Invito rapido: nome + cognome + data_ingresso required */}
      {needsContract && mode === 'quick' && (
        <div>
          <p className={sectionTitle}>Dati personali</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nome <span className="text-red-500">*</span></label>
                <Input type="text" placeholder="Mario" value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required disabled={loading} />
              </div>
              <div>
                <label className={labelCls}>Cognome <span className="text-red-500">*</span></label>
                <Input type="text" placeholder="Rossi" value={cognome}
                  onChange={(e) => setCognome(e.target.value)}
                  required disabled={loading} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Username <span className="text-red-500">*</span></label>
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
              <label className={labelCls}>Data di ingresso <span className="text-red-500">*</span></label>
              <Input type="date" value={dataIngresso}
                onChange={(e) => setDataIngresso(e.target.value)}
                required disabled={loading} />
            </div>
          </div>
        </div>
      )}

      {/* Invito completo: anagrafica richiesta (pre-fill per l'onboarding) */}
      {needsContract && mode === 'full' && (
        <div>
          <p className={sectionTitle}>Dati personali</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nome <span className="text-red-500">*</span></label>
                <Input type="text" placeholder="Mario" value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required disabled={loading} />
              </div>
              <div>
                <label className={labelCls}>Cognome <span className="text-red-500">*</span></label>
                <Input type="text" placeholder="Rossi" value={cognome}
                  onChange={(e) => setCognome(e.target.value)}
                  required disabled={loading} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Username <span className="text-red-500">*</span></label>
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
              <label className={labelCls}>Codice fiscale <span className="text-red-500">*</span></label>
              <Input type="text" placeholder="RSSMRA80A01H501U" value={codiceFiscale}
                onChange={(e) => setCodiceFiscale(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                required disabled={loading} maxLength={16} className="font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Data di nascita <span className="text-red-500">*</span></label>
                <Input type="date" value={dataNascita}
                  onChange={(e) => setDataNascita(e.target.value)}
                  required disabled={loading} />
              </div>
              <div>
                <label className={labelCls}>Città di nascita <span className="text-red-500">*</span></label>
                <Input type="text" placeholder="Roma" value={luogoNascita}
                  onChange={(e) => setLuogoNascita(e.target.value)}
                  required disabled={loading} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Provincia di nascita (sigla) <span className="text-red-500">*</span></label>
              <Input type="text" placeholder="RM" value={provinciaNascita}
                onChange={(e) => setProvinciaNascita(e.target.value.toUpperCase())}
                required disabled={loading} maxLength={2} className="font-mono uppercase" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Via/Piazza <span className="text-red-500">*</span></label>
                <Input type="text" placeholder="Via Roma" value={indirizzo}
                  onChange={(e) => setIndirizzo(e.target.value)}
                  required disabled={loading} />
              </div>
              <div>
                <label className={labelCls}>Civico <span className="text-red-500">*</span></label>
                <Input type="text" placeholder="1" value={civico}
                  onChange={(e) => setCivico(e.target.value)}
                  required disabled={loading} maxLength={10} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Comune di residenza <span className="text-red-500">*</span></label>
                <Input type="text" placeholder="Milano" value={comuneRes}
                  onChange={(e) => setComuneRes(e.target.value)}
                  required disabled={loading} />
              </div>
              <div>
                <label className={labelCls}>Provincia di residenza (sigla) <span className="text-red-500">*</span></label>
                <Input type="text" placeholder="MI" value={provinciaRes}
                  onChange={(e) => setPrvinciaRes(e.target.value.toUpperCase())}
                  required disabled={loading} maxLength={2} className="font-mono uppercase" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Telefono <span className="text-red-500">*</span></label>
              <Input type="tel" placeholder="+39 333 0000000" value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                required disabled={loading} />
            </div>
            <div>
              <label className={labelCls}>Intestatario del conto bancario <span className="text-red-500">*</span></label>
              <Input type="text" placeholder="Mario Rossi" value={intestatarioPagamento}
                onChange={(e) => setIntestatarioPagamento(e.target.value)}
                required disabled={loading} maxLength={100} />
              <p className="text-[10px] text-muted-foreground mt-1">Nome e cognome dell&apos;intestatario del conto. Pre-compilato per l&apos;onboarding.</p>
            </div>
            <div>
              <label className={labelCls}>Data di ingresso <span className="text-red-500">*</span></label>
              <Input type="date" value={dataIngresso}
                onChange={(e) => setDataIngresso(e.target.value)}
                required disabled={loading} />
            </div>
          </div>

          {/* Dati fiscali */}
          <div className="mt-4">
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
          loading || !email ||
          (needsContract && mode === 'quick' && (!nome.trim() || !cognome.trim() || !username.trim() || !dataIngresso || !dataFineContratto)) ||
          (needsContract && mode === 'full' && (
            !nome.trim() || !cognome.trim() || !username.trim() || !codiceFiscale.trim() || !dataNascita ||
            !luogoNascita.trim() || !provinciaNascita.trim() || !indirizzo.trim() ||
            !civico.trim() || !comuneRes.trim() || !provinciaRes.trim() ||
            !telefono.trim() || !intestatarioPagamento.trim() || !dataIngresso || !dataFineContratto
          ))
        }
        className="w-full bg-brand hover:bg-brand/90 text-white"
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
