'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Document } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  document: Document;
  originalUrl: string | null;
  firmatoUrl: string | null;
  canSign?: boolean;
}

export default function DocumentSignFlow({ document: doc, originalUrl, firmatoUrl, canSign = true }: Props) {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleUploadSigned = async () => {
    if (!file || !confirmed) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('confirmed', 'true');

      const res = await fetch(`/api/documents/${doc.id}/sign`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore durante il salvataggio');

      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
      <h2 className="text-base font-semibold text-foreground">Documento</h2>

      {/* Original download */}
      <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/60 border border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm text-foreground font-medium truncate">{doc.file_original_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Documento originale</p>
        </div>
        {originalUrl ? (
          <a
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg bg-accent hover:bg-gray-600 px-3 py-1.5 text-xs font-medium text-foreground transition"
          >
            Scarica
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">URL non disponibile</span>
        )}
      </div>

      {/* Signed file (if present) */}
      {doc.stato_firma === 'FIRMATO' && firmatoUrl && (
        <div className="flex items-center justify-between gap-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm text-green-700 dark:text-green-300 font-medium truncate">
              {doc.file_firmato_name ?? 'Documento firmato'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Firmato il {doc.signed_at ? new Date(doc.signed_at).toLocaleDateString('it-IT') : '—'}
            </p>
          </div>
          <a
            href={firmatoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg bg-green-700 dark:bg-green-800 hover:bg-green-600 dark:hover:bg-green-700 px-3 py-1.5 text-xs font-medium text-white dark:text-green-200 transition"
          >
            Scarica firmato
          </a>
        </div>
      )}

      {/* Upload signed — only if DA_FIRMARE and user can sign */}
      {doc.stato_firma === 'DA_FIRMARE' && !done && canSign && (
        <div className="space-y-3 border-t border-border pt-5">
          <p className="text-sm text-foreground">
            Scarica il documento, firmalo e ricarica il PDF firmato.
          </p>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">
              Carica PDF firmato <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setConfirmed(false); }}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-accent file:text-foreground hover:file:bg-gray-600"
            />
            {file && <p className="mt-1 text-xs text-muted-foreground">{file.name}</p>}
          </div>

          {file && (
            <label className="flex items-start gap-3 cursor-pointer rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40 px-4 py-3">
              <Checkbox
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(!!v)}
                className="mt-0.5 shrink-0"
              />
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                Confermo di aver firmato il documento e che il file caricato corrisponde alla versione firmata.
              </span>
            </label>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/40 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <Button
            onClick={handleUploadSigned}
            disabled={!file || !confirmed || loading}
            className="bg-brand hover:bg-brand/90 text-white"
          >
            {loading ? 'Caricamento…' : 'Invia documento firmato'}
          </Button>
        </div>
      )}

      {done && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800/40 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          Documento firmato inviato correttamente.
        </div>
      )}
      </CardContent>
    </Card>
  );
}
