'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DOCUMENT_TYPE_LABELS } from '@/lib/types';
import type { DocumentType, DocumentSignStatus } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Circle, Plus, X } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, useForm, zodResolver } from '@/components/ui/form';
import { documentUploadSchema, type DocumentUploadFormValues } from '@/lib/schemas/document';

interface CollaboratorOption {
  id: string;
  nome: string;
  cognome: string;
  username: string | null;
  email: string;
}

interface Props {
  collaborators: CollaboratorOption[];
  isAdmin: boolean;
}

const UPLOAD_TIPI: DocumentType[] = ['CONTRATTO_OCCASIONALE', 'CU', 'RICEVUTA_PAGAMENTO'];

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="flex items-center gap-1">
            {i > 0 && <div className="h-px w-6 bg-border" />}
            <div className={`flex items-center gap-1.5 ${active ? 'text-foreground' : done ? 'text-brand' : 'text-muted-foreground'}`}>
              {done ? (
                <CheckCircle2 className="w-4 h-4 text-brand" />
              ) : (
                <Circle className={`w-4 h-4 ${active ? 'text-brand' : 'text-muted-foreground/40'}`} />
              )}
              <span className={`text-xs font-medium ${active ? '' : 'hidden sm:inline'}`}>{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DocumentUploadForm({ collaborators, isAdmin }: Props) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const [isOpen, setIsOpen] = useState(false);

  // Steps: admin = [1=collab, 2=metadata, 3=file]; collab = [2=metadata, 3=file] (starts at step 2)
  const startStep = isAdmin ? 1 : 2;
  const [step, setStep] = useState(startStep);

  const [selectedCollab, setSelectedCollab] = useState<CollaboratorOption | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<DocumentUploadFormValues>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      tipo: '',
      anno: currentYear,
      titolo: '',
      stato_firma: 'NON_RICHIESTO',
    },
  });

  const tipo = form.watch('tipo');
  const isContratto = tipo.startsWith('CONTRATTO_');

  const prevPreviewUrl = useRef<string | null>(null);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (f: File | null) => {
    if (prevPreviewUrl.current) {
      URL.revokeObjectURL(prevPreviewUrl.current);
      prevPreviewUrl.current = null;
    }
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
      prevPreviewUrl.current = url;
    } else {
      setPreviewUrl(null);
    }
  };

  const reset = (andClose = false) => {
    setStep(startStep);
    setSelectedCollab(null);
    setSearchQuery('');
    form.reset({ tipo: '', anno: currentYear, titolo: '', stato_firma: 'NON_RICHIESTO' });
    handleFileChange(null);
    if (andClose) setIsOpen(false);
  };

  const handleSubmit = async () => {
    if (!file) return;
    // Validate metadata fields before submitting
    const valid = await form.trigger();
    if (!valid) return;

    const values = form.getValues();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo', values.tipo);
      formData.append('titolo', values.titolo.trim());
      formData.append('anno', String(values.anno));
      if (isAdmin && selectedCollab) {
        formData.append('collaborator_id', selectedCollab.id);
        if (values.tipo.startsWith('CONTRATTO_') && values.stato_firma) {
          formData.append('stato_firma', values.stato_firma);
        }
      }
      const res = await fetch('/api/documents', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore creazione documento');
      toast.success('Documento caricato.');
      reset(true);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore imprevisto', { duration: 5000 });
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = isAdmin
    ? ['Collaboratore', 'Dettagli', 'File']
    : ['Dettagli', 'File'];

  const filtered = searchQuery.trim()
    ? collaborators.filter((c) => {
        const q = searchQuery.toLowerCase();
        return [c.nome, c.cognome, c.username ?? '', c.email].some((f) => f.toLowerCase().includes(q));
      })
    : [];

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-brand hover:bg-brand/90 text-white"
      >
        <Plus className="w-4 h-4 mr-1.5" />
        Carica documento
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-foreground">Carica documento</h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Chiudi form"
            onClick={() => reset(true)}
            className="w-7 h-7 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <StepIndicator steps={stepLabels} current={isAdmin ? step : step - 1} />

        {/* ── Step 1: Collaborator search (admin only) ── */}
        {step === 1 && isAdmin && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">
                Cerca collaboratore <span className="text-destructive">*</span>
              </label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nome, cognome, username o email"
                autoFocus
              />
            </div>
            {filtered.length > 0 && (
              <div className="max-h-60 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setSelectedCollab(c); setStep(2); }}
                    className="w-full text-left px-3 py-3 transition hover:bg-muted/60 space-y-0.5"
                  >
                    <p className="text-sm text-foreground font-medium">{c.cognome} {c.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.email}{c.username ? ` · ${c.username}` : ''}
                    </p>
                  </button>
                ))}
              </div>
            )}
            {searchQuery.trim() && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">Nessun risultato</p>
            )}
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={() => reset(true)}>Annulla</Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Metadata ── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Tipo + Anno */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="tipo" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">Tipo <span className="text-destructive">*</span></FormLabel>
                  <Select
                    value={field.value || undefined}
                    onValueChange={(v) => { field.onChange(v); form.setValue('stato_firma', 'NON_RICHIESTO'); }}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="- Seleziona -" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {UPLOAD_TIPI.map((t) => (
                        <SelectItem key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="anno" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">Anno</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || currentYear)}
                      min={2000}
                      max={2100}
                    />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            {/* Titolo */}
            <FormField control={form.control} name="titolo" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Titolo <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="es. Contratto collaborazione febbraio 2026"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Stato firma - admin only, CONTRATTO only */}
            {isAdmin && isContratto && (
              <FormField control={form.control} name="stato_firma" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">Firma richiesta</FormLabel>
                  <div className="flex gap-4">
                    {(['DA_FIRMARE', 'NON_RICHIESTO'] as DocumentSignStatus[]).map((s) => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="stato_firma"
                          value={s}
                          checked={field.value === s}
                          onChange={() => field.onChange(s)}
                          className="accent-[var(--color-brand)]"
                        />
                        <span className="text-sm text-foreground">
                          {s === 'DA_FIRMARE' ? 'Si - richiedi firma' : 'No - solo informativo'}
                        </span>
                      </label>
                    ))}
                  </div>
                </FormItem>
              )} />
            )}

            <div className="flex items-center justify-between pt-2">
              {isAdmin ? (
                <Button variant="ghost" onClick={() => setStep(1)}>&#8592; Indietro</Button>
              ) : (
                <Button variant="ghost" onClick={() => reset(true)}>Annulla</Button>
              )}
              <Button
                onClick={async () => {
                  const valid = await form.trigger(['tipo', 'titolo']);
                  if (valid) setStep(3);
                }}
                disabled={!tipo || !form.watch('titolo').trim()}
                className="bg-brand hover:bg-brand/90 text-white"
              >
                Avanti &#8594;
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: File + preview ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">
                File PDF <span className="text-destructive">*</span>
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-accent file:text-foreground hover:file:bg-muted"
              />
              {file && (
                <p className="mt-1 text-xs text-muted-foreground">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
              )}
            </div>

            {previewUrl && (
              <object
                data={previewUrl}
                type="application/pdf"
                className="w-full h-64 rounded border border-border"
              >
                <p className="text-xs text-muted-foreground p-2">Anteprima non disponibile nel browser.</p>
              </object>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(2)}>&#8592; Indietro</Button>
              <Button
                onClick={handleSubmit}
                disabled={!file || submitting}
                className="bg-brand hover:bg-brand/90 text-white"
              >
                {submitting ? 'Caricamento...' : 'Carica documento'}
              </Button>
            </div>
          </div>
        )}
        </Form>
      </CardContent>
    </Card>
  );
}
