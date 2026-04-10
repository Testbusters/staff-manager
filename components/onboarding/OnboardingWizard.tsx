'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];


const labelCls = 'block text-xs text-muted-foreground mb-1.5';

const sectionTitle = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 mt-1';

export default function OnboardingWizard({ prefill, tipoContratto, tipoLabel, community }: Props) {
  const router = useRouter();

  // Step 1 — dati anagrafici
  const [nome, setNome]                       = useState(prefill?.nome ?? '');
  const [cognome, setCognome]                 = useState(prefill?.cognome ?? '');
  const [codiceFiscale, setCF]                = useState(prefill?.codice_fiscale ?? '');
  const [dataNascita, setDataNascita]         = useState(prefill?.data_nascita ?? '');
  const [luogoNascita, setLuogo]              = useState(prefill?.luogo_nascita ?? '');
  const [provinciaNascita, setProvinciaNascita] = useState(prefill?.provincia_nascita ?? '');
  const [comune, setComune]                   = useState(prefill?.comune ?? '');
  const [provinciaRes, setPrvinciaRes]        = useState(prefill?.provincia_residenza ?? '');
  const [indirizzo, setIndirizzo]             = useState(prefill?.indirizzo ?? '');
  const [civico, setCivico]                   = useState(prefill?.civico_residenza ?? '');
  const [telefono, setTelefono]               = useState(prefill?.telefono ?? '');
  const [iban, setIban]                       = useState(prefill?.iban ?? '');
  const [intestatarioPagamento, setIntestatarioPagamento] = useState(prefill?.intestatario_pagamento ?? '');
  const [tshirt, setTshirt]                   = useState(prefill?.tshirt_size ?? '');
  const [sonoFiglio, setSonoFiglio]           = useState(prefill?.sono_un_figlio_a_carico ?? false);
  const [massimale, setMassimale]             = useState<number>(prefill?.importo_lordo_massimale ?? 5000);

  // Activity — città e materie
  const [citta, setCitta]                     = useState(prefill?.citta ?? '');
  const [cittaOptions, setCittaOptions]       = useState<LookupOption[]>([]);
  const [materieInsegnate, setMaterieInsegnate] = useState<string[]>([]);
  const [materiaOptions, setMateriaOptions] = useState<LookupOption[]>([]);

  useEffect(() => {
    const comm = community || 'testbusters';
    fetch(`/api/lookup-options?type=citta&community=${comm}`)
      .then((r) => r.json()).then((d) => setCittaOptions(d.options ?? [])).catch(() => {});
    fetch(`/api/lookup-options?type=materia&community=${comm}`)
      .then((r) => r.json()).then((d) => setMateriaOptions(d.options ?? [])).catch(() => {});
  }, [community]);

  // Username preview (readonly — shows pre-set or computed from nome+cognome)
  const previewUsername = prefill?.username ?? generateUsername(nome, cognome);

  // Step tracking
  const [step, setStep]           = useState<1 | 2>(1);
  const [loading, setLoading]     = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [contractGenerated, setContractGenerated] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Validate step 1
  const step1Valid =
    nome.trim() && cognome.trim() && codiceFiscale.trim() &&
    dataNascita && luogoNascita.trim() && provinciaNascita.trim() &&
    comune.trim() && provinciaRes.trim() && indirizzo.trim() && civico.trim() &&
    telefono.trim() && iban.trim() && intestatarioPagamento.trim() && tshirt &&
    citta.trim() &&
    materieInsegnate.length > 0 &&
    massimale > 0 && massimale <= 5000;

  const handleCompleteOnboarding = async () => {
    setLoading(true);

    const res = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome:                nome.trim(),
        cognome:             cognome.trim(),
        codice_fiscale:      codiceFiscale.trim().toUpperCase(),
        data_nascita:        dataNascita,
        luogo_nascita:       luogoNascita.trim(),
        provincia_nascita:   provinciaNascita.trim().toUpperCase(),
        comune:              comune.trim(),
        provincia_residenza: provinciaRes.trim().toUpperCase(),
        indirizzo:           indirizzo.trim(),
        civico_residenza:    civico.trim(),
        telefono:            telefono.trim(),
        iban:                iban.trim().toUpperCase().replace(/\s/g, ''),
        intestatario_pagamento: intestatarioPagamento.trim(),
        tshirt_size:             tshirt,
        sono_un_figlio_a_carico: sonoFiglio,
        importo_lordo_massimale: massimale,
        citta:                   citta.trim(),
        materie_insegnate:       materieInsegnate,
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
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `contratto_${tipoContratto?.toLowerCase() ?? 'contratto'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFinish = () => {
    router.push('/');
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

      <form
        onSubmit={(e) => { e.preventDefault(); setStep(2); }}
        className="space-y-5">

        <p className="text-sm text-muted-foreground -mt-2 mb-4">
          Completa tutti i campi per procedere alla generazione del contratto.
        </p>

        {/* Identità */}
        <div>
          <p className={sectionTitle}>Identità</p>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nome <span className="text-destructive">*</span></label>
                <Input type="text" placeholder="Mario" value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required />
              </div>
              <div>
                <label className={labelCls}>Cognome <span className="text-destructive">*</span></label>
                <Input type="text" placeholder="Rossi" value={cognome}
                  onChange={(e) => setCognome(e.target.value)}
                  required />
              </div>
            </div>
            {previewUsername && (
              <div>
                <label className={labelCls}>Username</label>
                <div className="w-full rounded-lg bg-muted border border-border px-3 py-2.5 text-sm text-muted-foreground font-mono select-all">
                  @{previewUsername}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Il tuo username sarà assegnato automaticamente e non è modificabile.</p>
              </div>
            )}
            <div>
              <label className={labelCls}>Codice fiscale <span className="text-destructive">*</span></label>
              <Input type="text" placeholder="RSSMRA80A01H501U" value={codiceFiscale}
                onChange={(e) => setCF(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                required maxLength={16} className="font-mono" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Data di nascita <span className="text-destructive">*</span></label>
                <DatePicker
                  value={dataNascita}
                  onChange={(v) => setDataNascita(v)}
                  captionLayout="dropdown"
                  fromYear={1940}
                  toYear={new Date().getFullYear() - 16}
                />
              </div>
              <div>
                <label className={labelCls}>Città di nascita <span className="text-destructive">*</span></label>
                <Input type="text" placeholder="Roma" value={luogoNascita}
                  onChange={(e) => setLuogo(e.target.value)}
                  required />
              </div>
            </div>
            <div>
              <label className={labelCls}>Provincia di nascita (sigla) <span className="text-destructive">*</span></label>
              <Input type="text" placeholder="RM" value={provinciaNascita}
                onChange={(e) => setProvinciaNascita(e.target.value.toUpperCase())}
                required maxLength={2} className="font-mono uppercase" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Via/Piazza di residenza <span className="text-destructive">*</span></label>
                <Input type="text" placeholder="Via Roma" value={indirizzo}
                  onChange={(e) => setIndirizzo(e.target.value)}
                  required />
              </div>
              <div>
                <label className={labelCls}>Civico <span className="text-destructive">*</span></label>
                <Input type="text" placeholder="1" value={civico}
                  onChange={(e) => setCivico(e.target.value)}
                  required maxLength={10} />
              </div>
            </div>
          </div>
        </div>

        {/* Residenza */}
        <div>
          <p className={sectionTitle}>Residenza</p>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Comune <span className="text-destructive">*</span></label>
                <Input type="text" placeholder="Milano" value={comune}
                  onChange={(e) => setComune(e.target.value)}
                  required />
              </div>
              <div>
                <label className={labelCls}>Provincia (sigla) <span className="text-destructive">*</span></label>
                <Input type="text" placeholder="MI" value={provinciaRes}
                  onChange={(e) => setPrvinciaRes(e.target.value.toUpperCase())}
                  required maxLength={2} className="font-mono uppercase" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Telefono di contatto <span className="text-destructive">*</span></label>
              <Input type="tel" placeholder="+39 333 0000000" value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                required />
            </div>
          </div>
        </div>

        {/* Pagamento e preferenze */}
        <div>
          <p className={sectionTitle}>Pagamento e preferenze</p>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Intestatario del conto bancario <span className="text-destructive">*</span></label>
              <Input type="text" placeholder="Mario Rossi" value={intestatarioPagamento}
                onChange={(e) => setIntestatarioPagamento(e.target.value)}
                required maxLength={100} />
              <p className="text-xs text-muted-foreground mt-1">
                Nome e cognome dell&apos;intestatario del conto su cui riceverai il pagamento. Può essere diverso dal tuo se non hai un conto a tuo nome.
              </p>
            </div>
            <div>
              <label className={labelCls}>IBAN <span className="text-destructive">*</span></label>
              <Input type="text" placeholder="IT60 X054 2811 1010 0000 0123 456" value={iban}
                onChange={(e) => setIban(e.target.value)}
                required maxLength={34} className="font-mono" />
            </div>
            <div>
              <label className={labelCls}>Taglia t-shirt <span className="text-destructive">*</span></label>
              <Select value={tshirt || undefined} onValueChange={setTshirt}>
                <SelectTrigger><SelectValue placeholder="— Seleziona —" /></SelectTrigger>
                <SelectContent>
                  {TSHIRT_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={sonoFiglio}
                  onCheckedChange={(v) => setSonoFiglio(!!v)}
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
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelCls} style={{ margin: 0 }}>
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
                  value={massimale}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setMassimale(isNaN(v) ? 0 : v);
                  }}
                  className="pl-7 font-mono"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Il massimale contrattuale che intendi raggiungere. La prestazione occasionale non può superare{' '}
                <strong className="text-foreground">€5.000 lordi/anno</strong> dallo stesso committente (max €5.000).
              </p>
            </div>
          </div>
        </div>

        {/* Attività */}
        <div>
          <p className={sectionTitle}>Attività</p>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Città di attività <span className="text-destructive">*</span></label>
              <Select value={citta || undefined} onValueChange={setCitta}>
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
            </div>
            <div>
              <label className={labelCls}>Materie insegnate <span className="text-destructive">*</span></label>
              <div className="flex flex-wrap gap-2 mt-1">
                {materiaOptions.map((opt) => {
                  const active = materieInsegnate.includes(opt.nome);
                  return (
                    <button
                      key={opt.id}
                      type="button"
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
                <p className="text-xs text-muted-foreground mt-1">Seleziona almeno una materia.</p>
              )}
            </div>
          </div>
        </div>

        <Button type="submit" disabled={!step1Valid} className="w-full bg-brand hover:bg-brand/90 text-white">
          Avanti — Genera contratto
        </Button>
      </form>
      </CardContent>
    </Card>
  );
}
