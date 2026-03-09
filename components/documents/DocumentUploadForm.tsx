'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DOCUMENT_TYPE_LABELS } from '@/lib/types';
import type { DocumentType, DocumentSignStatus } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface Collaborator {
  id: string;
  nome: string;
  cognome: string;
  user_id: string;
}

interface Props {
  collaborators: Collaborator[];
  isAdmin: boolean;
  userCollaboratorId?: string;
}

export default function DocumentUploadForm({ collaborators, isAdmin }: Props) {
  const router = useRouter();

  const [collaboratorId, setCollaboratorId] = useState('');
  const [tipo, setTipo] = useState<DocumentType | ''>('');
  const [anno, setAnno] = useState('');
  const [titolo, setTitolo] = useState('');
  const [statoFirma, setStatoFirma] = useState<DocumentSignStatus>('NON_RICHIESTO');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const isContratto = tipo.startsWith('CONTRATTO_');
  const isValid = (isAdmin ? !!collaboratorId : true) && !!tipo && titolo.trim() && !!file;

  const handleSubmit = async () => {
    if (!isValid || !file) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo', tipo);
      formData.append('titolo', titolo.trim());
      if (anno) formData.append('anno', anno);

      if (isAdmin) {
        formData.append('collaborator_id', collaboratorId);
        if (isContratto) formData.append('stato_firma', statoFirma);
      }

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore creazione documento');

      toast.success('Documento caricato con successo.');
      setCollaboratorId('');
      setTipo('');
      setAnno('');
      setTitolo('');
      setFile(null);
      setStatoFirma('NON_RICHIESTO');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore imprevisto', { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
      <h2 className="text-base font-semibold text-foreground">Carica documento</h2>

      {/* Collaboratore — admin only */}
      {isAdmin && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">
            Collaboratore <span className="text-red-500">*</span>
          </label>
          <Select value={collaboratorId || undefined} onValueChange={setCollaboratorId}>
            <SelectTrigger><SelectValue placeholder="— Seleziona collaboratore —" /></SelectTrigger>
            <SelectContent>
              {collaborators.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.cognome} {c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tipo + Anno */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">
            Tipo <span className="text-red-500">*</span>
          </label>
          <Select value={tipo || undefined} onValueChange={(v) => { setTipo(v as DocumentType); setStatoFirma('NON_RICHIESTO'); }}>
            <SelectTrigger><SelectValue placeholder="— Seleziona —" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CONTRATTO_OCCASIONALE">{DOCUMENT_TYPE_LABELS['CONTRATTO_OCCASIONALE']}</SelectItem>
              <SelectItem value="CU">{DOCUMENT_TYPE_LABELS['CU']}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Anno</label>
          <Input
            type="number"
            value={anno}
            onChange={(e) => setAnno(e.target.value)}
            placeholder="es. 2025"
            min={2000}
            max={2100}
          />
        </div>
      </div>

      {/* Titolo */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5">
          Titolo <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          value={titolo}
          onChange={(e) => setTitolo(e.target.value)}
          placeholder="es. Contratto collaborazione febbraio 2026"
        />
      </div>

      {/* Stato firma — admin only, only for CONTRATTO */}
      {isAdmin && isContratto && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Firma richiesta</label>
          <div className="flex gap-4">
            {(['DA_FIRMARE', 'NON_RICHIESTO'] as DocumentSignStatus[]).map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="stato_firma"
                  value={s}
                  checked={statoFirma === s}
                  onChange={() => setStatoFirma(s)}
                  className="accent-blue-600"
                />
                <span className="text-sm text-foreground">
                  {s === 'DA_FIRMARE' ? 'Sì — richiedi firma' : 'No — solo informativo'}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* File */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5">
          File PDF <span className="text-red-500">*</span>
        </label>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-accent file:text-foreground hover:file:bg-muted"
        />
        {file && <p className="mt-1 text-xs text-muted-foreground">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!isValid || loading}
        className="bg-brand hover:bg-brand/90 text-white"
      >
        {loading ? 'Caricamento…' : 'Carica documento'}
      </Button>
      </CardContent>
    </Card>
  );
}
