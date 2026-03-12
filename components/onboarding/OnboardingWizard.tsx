'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ContractTemplateType } from '@/lib/types';
import { generateUsername } from '@/lib/username';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
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
} | null;

interface Props {
  prefill: PrefillData;
  tipoContratto: ContractTemplateType | null;
  tipoLabel: string | null;
}

const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];


const labelCls = 'block text-xs text-muted-foreground mb-1.5';

const sectionTitle = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 mt-1';

export default function OnboardingWizard({ prefill, tipoContratto, tipoLabel }: Props) {
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
  const [massimale, setMassimale]             = useState<string>(
    (prefill as { importo_lordo_massimale?: number | null } | null)?.importo_lordo_massimale != null
      ? String((prefill as { importo_lordo_massimale?: number | null }).importo_lordo_massimale)
      : '',
  );

  // Username preview (readonly — shows pre-set or computed from nome+cognome)
  const previewUsername = prefill?.username ?? generateUsername(nome, cognome);

  // Step tracking
  const [step, setStep]           = useState<1 | 2>(1);
  const [loading, setLoading]     = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [contractGenerated, setContractGenerated] = useState(false);
  const [onboardingDoneNoContract, setOnboardingDoneNoContract] = useState(false);

  // Validate step 1
  const step1Valid =
    nome.trim() && cognome.trim() && codiceFiscale.trim() &&
    dataNascita && luogoNascita.trim() && provinciaNascita.trim() &&
    comune.trim() && provinciaRes.trim() && indirizzo.trim() && civico.trim() &&
    telefono.trim() && iban.trim() && intestatarioPagamento.trim() && tshirt;

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
        tshirt_size:         tshirt,
        sono_un_figlio_a_carico: sonoFiglio,
        importo_lordo_massimale: massimale !== '' ? parseFloat(massimale) : null,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error ?? 'Errore durante il salvataggio.', { duration: 5000 });
      return;
    }

    if (data.document_id) {
      // Contract generated (document_id present) — download URL is optional
      if (data.download_url) setDownloadUrl(data.download_url);
      setContractGenerated(true);
    } else {
      // No contract generated (skipped, no template, or failure) — onboarding still completed
      setOnboardingDoneNoContract(true);
    }
  };

  const handleFinish = () => {
    router.push('/documenti');
    router.refresh();
  };

  // ── Step 2 — contratto ───────────────────────────────────────
  if (step === 2) {
    return (
      <Card>
        <CardContent className="p-6 space-y-6">
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

        {onboardingDoneNoContract ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Account configurato</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Il tuo account è attivo. Troverai il contratto nella sezione <strong className="text-foreground">Documenti</strong> quando sarà pronto per la firma.
              </p>
            </div>
            <Button onClick={handleFinish} className="w-full bg-brand hover:bg-brand/90 text-white">
              Accedi alla piattaforma
            </Button>
          </div>
        ) : contractGenerated ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Contratto generato</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Il contratto è disponibile nella sezione <strong className="text-foreground">Documenti</strong>. Puoi firmarlo digitalmente in qualsiasi momento.
              </p>
            </div>

            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-lg bg-accent hover:bg-muted py-2.5 text-sm font-medium text-foreground transition flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Visualizza documento
              </a>
            )}

            <Button onClick={handleFinish} className="w-full bg-brand hover:bg-brand/90 text-white">
              Accedi alla piattaforma
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {tipoContratto ? (
              <p className="text-sm text-muted-foreground">
                Il contratto verrà generato e precompilato con i dati inseriti. Lo troverai nella sezione <strong className="text-foreground">Documenti</strong> per la firma digitale.
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
                ) : 'Genera contratto'}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nome <span className="text-red-500">*</span></label>
                <Input type="text" placeholder="Mario" value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required />
              </div>
              <div>
                <label className={labelCls}>Cognome <span className="text-red-500">*</span></label>
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
              <label className={labelCls}>Codice fiscale <span className="text-red-500">*</span></label>
              <Input type="text" placeholder="RSSMRA80A01H501U" value={codiceFiscale}
                onChange={(e) => setCF(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                required maxLength={16} className="font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Data di nascita <span className="text-red-500">*</span></label>
                <Input type="date" value={dataNascita}
                  onChange={(e) => setDataNascita(e.target.value)}
                  required />
              </div>
              <div>
                <label className={labelCls}>Città di nascita <span className="text-red-500">*</span></label>
                <Input type="text" placeholder="Roma" value={luogoNascita}
                  onChange={(e) => setLuogo(e.target.value)}
                  required />
              </div>
            </div>
            <div>
              <label className={labelCls}>Provincia di nascita (sigla) <span className="text-red-500">*</span></label>
              <Input type="text" placeholder="RM" value={provinciaNascita}
                onChange={(e) => setProvinciaNascita(e.target.value.toUpperCase())}
                required maxLength={2} className="font-mono uppercase" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Via/Piazza di residenza <span className="text-red-500">*</span></label>
                <Input type="text" placeholder="Via Roma" value={indirizzo}
                  onChange={(e) => setIndirizzo(e.target.value)}
                  required />
              </div>
              <div>
                <label className={labelCls}>Civico <span className="text-red-500">*</span></label>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Comune <span className="text-red-500">*</span></label>
                <Input type="text" placeholder="Milano" value={comune}
                  onChange={(e) => setComune(e.target.value)}
                  required />
              </div>
              <div>
                <label className={labelCls}>Provincia (sigla) <span className="text-red-500">*</span></label>
                <Input type="text" placeholder="MI" value={provinciaRes}
                  onChange={(e) => setPrvinciaRes(e.target.value.toUpperCase())}
                  required maxLength={2} className="font-mono uppercase" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Telefono di contatto <span className="text-red-500">*</span></label>
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
              <label className={labelCls}>Intestatario del conto bancario <span className="text-red-500">*</span></label>
              <Input type="text" placeholder="Mario Rossi" value={intestatarioPagamento}
                onChange={(e) => setIntestatarioPagamento(e.target.value)}
                required maxLength={100} />
              <p className="text-xs text-muted-foreground mt-1">
                Nome e cognome dell&apos;intestatario del conto su cui riceverai il pagamento. Può essere diverso dal tuo se non hai un conto a tuo nome.
              </p>
            </div>
            <div>
              <label className={labelCls}>IBAN <span className="text-red-500">*</span></label>
              <Input type="text" placeholder="IT60 X054 2811 1010 0000 0123 456" value={iban}
                onChange={(e) => setIban(e.target.value)}
                required maxLength={34} className="font-mono" />
            </div>
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={sonoFiglio}
                  onCheckedChange={(v) => setSonoFiglio(!!v)}
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
            </div>
            <div>
              <label className={labelCls}>
                Massimale lordo annuo (max €5.000)
              </label>
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
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Importo lordo massimo che vuoi ricevere da noi nell&apos;anno solare. Se hai altre collaborazioni, abbassa questo valore per rispettare i tuoi limiti personali.
              </p>
            </div>
            <div>
              <label className={labelCls}>Taglia t-shirt <span className="text-red-500">*</span></label>
              <Select value={tshirt || undefined} onValueChange={setTshirt}>
                <SelectTrigger><SelectValue placeholder="— Seleziona —" /></SelectTrigger>
                <SelectContent>
                  {TSHIRT_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Button type="submit" disabled={!step1Valid} className="w-full bg-brand hover:bg-brand/90 text-white">
          Avanti
        </Button>
      </form>
      </CardContent>
    </Card>
  );
}
