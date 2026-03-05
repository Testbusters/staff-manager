'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

type FormData = {
  data_competenza: string;
  nome_servizio_ruolo: string;
  competenza: string;
  info_specifiche: string;
  importo_lordo: string;
};

type Competenza = { key: string; label: string };

const RITENUTA_RATE = 0.2;

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
                ? 'bg-blue-600 text-white'
                : step < current
                ? 'bg-green-700 text-white'
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

  // Step 2 state
  const [formData, setFormData] = useState<FormData>({
    data_competenza: '',
    nome_servizio_ruolo: '',
    competenza: '',
    info_specifiche: '',
    importo_lordo: '',
  });
  const [step2Error, setStep2Error] = useState('');

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

  function validateStep2(): string {
    if (!formData.nome_servizio_ruolo.trim()) return 'Nome servizio / Ruolo obbligatorio';
    if (!formData.data_competenza) return 'Data di competenza obbligatoria';
    if (!formData.competenza) return 'Competenza obbligatoria';
    if (!formData.importo_lordo || parseFloat(formData.importo_lordo) <= 0) {
      return 'Importo lordo obbligatorio e deve essere positivo';
    }
    return '';
  }

  function handleStep2Next() {
    const err = validateStep2();
    if (err) { setStep2Error(err); return; }
    setStep2Error('');
    setStep('step3');
  }

  async function handleSubmit() {
    if (!selectedCollab) return;
    setSubmitting(true);
    setSubmitError('');

    const lordo = parseFloat(formData.importo_lordo);
    const ritenuta = Math.round(lordo * RITENUTA_RATE * 100) / 100;
    const netto = Math.round((lordo - ritenuta) * 100) / 100;

    const payload: Record<string, unknown> = {
      collaborator_id: selectedCollab.id,
      nome_servizio_ruolo: formData.nome_servizio_ruolo.trim(),
      data_competenza: formData.data_competenza,
      competenza: formData.competenza,
      importo_lordo: lordo,
      ritenuta_acconto: ritenuta,
      importo_netto: netto,
    };
    if (formData.info_specifiche.trim()) payload.info_specifiche = formData.info_specifiche.trim();

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

        <div className="rounded-xl bg-card border border-border overflow-hidden">
          {loadingSearch ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Ricerca in corso...</p>
          ) : collaborators.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">
              {searchQ || communityFilter ? 'Nessun collaboratore trovato.' : 'Inserisci un termine di ricerca o seleziona una community.'}
            </p>
          ) : (
            <Table>
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
                  <TableRow key={c.id} className="hover:bg-muted/50">
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
        </div>

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
    const lordo = parseFloat(formData.importo_lordo) || 0;
    const ritenuta = Math.round(lordo * RITENUTA_RATE * 100) / 100;
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

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Nome servizio / Ruolo
            </label>
            <Input
              type="text"
              value={formData.nome_servizio_ruolo}
              onChange={(e) => setFormData((prev) => ({ ...prev, nome_servizio_ruolo: e.target.value }))}
              placeholder="Es. Compenso lezioni marzo"
            />
          </div>


          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Data di competenza
            </label>
            <Input
              type="date"
              value={formData.data_competenza}
              onChange={(e) => setFormData((prev) => ({ ...prev, data_competenza: e.target.value }))}
            />
          </div>

          {competenze.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Competenza
              </label>
              <Select value={formData.competenza || undefined} onValueChange={(v) => setFormData((prev) => ({ ...prev, competenza: v }))}>
                <SelectTrigger><SelectValue placeholder="— Nessuna —" /></SelectTrigger>
                <SelectContent>
                  {competenze.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Info specifiche <span className="text-muted-foreground">(opzionale)</span>
            </label>
            <Textarea
              value={formData.info_specifiche}
              onChange={(e) => setFormData((prev) => ({ ...prev, info_specifiche: e.target.value }))}
              rows={2}
              className="resize-none"
              placeholder="Note aggiuntive sul compenso"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Importo lordo (€)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.importo_lordo}
              onChange={(e) => setFormData((prev) => ({ ...prev, importo_lordo: e.target.value }))}
              placeholder="0,00"
            />
          </div>

          {lordo > 0 && (
            <div className="rounded-lg bg-muted/60 border border-border p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ritenuta d&apos;acconto (20%)</span>
                <span className="text-red-400 tabular-nums">-{formatCurrency(ritenuta)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-foreground">Importo netto</span>
                <span className="text-green-400 tabular-nums">{formatCurrency(netto)}</span>
              </div>
            </div>
          )}

          {step2Error && (
            <p className="text-xs text-red-400">{step2Error}</p>
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
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              Avanti →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3 — Riepilogo ────────────────────────────────────────────────────
  if (step === 'step3' && selectedCollab) {
    const lordo = parseFloat(formData.importo_lordo) || 0;
    const ritenuta = Math.round(lordo * RITENUTA_RATE * 100) / 100;
    const netto = Math.round((lordo - ritenuta) * 100) / 100;
    const competenzaLabel = competenze.find((c) => c.key === formData.competenza)?.label;

    const rows: { label: string; value: string }[] = [
      { label: 'Collaboratore', value: `${selectedCollab.cognome} ${selectedCollab.nome}` },
      { label: 'Stato', value: 'In attesa' },
    ];
    if (competenzaLabel) rows.push({ label: 'Competenza', value: competenzaLabel });
    if (formData.data_competenza) rows.push({ label: 'Data competenza', value: new Date(formData.data_competenza).toLocaleDateString('it-IT') });
    if (formData.nome_servizio_ruolo.trim()) rows.push({ label: 'Nome servizio / Ruolo', value: formData.nome_servizio_ruolo.trim() });
    if (formData.info_specifiche.trim()) rows.push({ label: 'Info specifiche', value: formData.info_specifiche.trim() });
    rows.push(
      { label: 'Importo lordo', value: formatCurrency(lordo) },
      { label: 'Ritenuta (20%)', value: `-${formatCurrency(ritenuta)}` },
      { label: 'Importo netto', value: formatCurrency(netto) },
    );

    return (
      <div className="p-6 max-w-xl">
        <div className="mb-2">
          <h1 className="text-xl font-semibold text-foreground">Carica compensi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Riepilogo</p>
        </div>
        <StepIndicator current={3} />

        <div className="rounded-xl bg-card border border-border divide-y divide-border">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <span className="text-sm text-foreground">{row.value}</span>
            </div>
          ))}
        </div>

        {submitError && (
          <p className="mt-3 text-xs text-red-400">{submitError}</p>
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
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            {submitting ? 'Creazione...' : 'Crea compenso'}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
