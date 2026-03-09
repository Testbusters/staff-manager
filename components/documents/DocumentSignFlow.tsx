'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Document } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import DocumentViewer from './DocumentViewer';
import SignaturePad from './SignaturePad';

interface Props {
  document: Document;
  originalUrl: string | null;
  precompiledUrl?: string | null;
  firmatoUrl: string | null;
  canSign?: boolean;
}

type Mode = 'idle' | 'guided' | 'download';

export default function DocumentSignFlow({ document: doc, originalUrl, precompiledUrl, firmatoUrl, canSign = true }: Props) {
  const router = useRouter();
  const isDaFirmare = doc.stato_firma === 'DA_FIRMARE';

  // Viewer modal
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(originalUrl);

  // Recompile
  const [recompiling, setRecompiling] = useState(false);
  const [recompileError, setRecompileError] = useState<string | null>(null);

  // Mode selection
  const [mode, setMode] = useState<Mode>('idle');

  // Guided signing
  const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null);
  const [signingGuided, setSigningGuided] = useState(false);
  const [guidedError, setGuidedError] = useState<string | null>(null);

  // Download+upload signing
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [done, setDone] = useState(false);

  async function handleRecompile() {
    setRecompiling(true);
    setRecompileError(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}/recompile`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore nella ricompilazione');
      setViewerUrl(data.signedUrl);
    } catch (err) {
      setRecompileError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setRecompiling(false);
    }
  }

  async function handleGuidedSign() {
    if (!signatureBlob) return;
    setSigningGuided(true);
    setGuidedError(null);
    try {
      const formData = new FormData();
      formData.append('signatureImage', signatureBlob, 'signature.png');
      const res = await fetch(`/api/documents/${doc.id}/sign-guided`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore durante la firma');
      setDone(true);
      router.refresh();
    } catch (err) {
      setGuidedError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setSigningGuided(false);
    }
  }

  async function handleUploadSign() {
    if (!uploadFile || !confirmed) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('confirmed', 'true');
      const res = await fetch(`/api/documents/${doc.id}/sign`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore durante il salvataggio');
      setDone(true);
      router.refresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <h2 className="text-base font-semibold text-foreground">Documento</h2>

        {/* Signed document — show if FIRMATO */}
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

        {/* Unsigned original */}
        {originalUrl && (
          <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/60 border border-border px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm text-foreground font-medium truncate">{doc.file_original_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Documento originale</p>
            </div>
            <a
              href={originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg bg-accent hover:bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition"
            >
              Scarica
            </a>
          </div>
        )}

        {/* Signing section — only for DA_FIRMARE + canSign */}
        {isDaFirmare && !done && canSign && (
          <div className="space-y-4 border-t border-border pt-5">

            {/* Info + disclaimer + viewer/recompile */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 px-4 py-3 space-y-3">
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                Verifica i tuoi dati nel documento prima di procedere
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setViewerOpen(true)}
                  disabled={!viewerUrl}
                >
                  Visualizza documento
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRecompile}
                  disabled={recompiling}
                >
                  {recompiling ? 'Ricompilazione…' : 'Ricompila con dati aggiornati'}
                </Button>
              </div>
              {recompileError && (
                <p className="text-xs text-red-600 dark:text-red-400">{recompileError}</p>
              )}
            </div>

            {/* Mode selection */}
            {mode === 'idle' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('guided')}
                  className="rounded-xl border-2 border-brand/50 hover:border-brand bg-card px-4 py-5 text-left transition group"
                >
                  <p className="text-sm font-semibold text-foreground group-hover:text-brand transition">
                    Firma guidata
                    <span className="ml-2 text-xs font-normal text-brand bg-brand/10 rounded-full px-2 py-0.5">
                      consigliata
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Disegna o carica la tua firma — viene applicata automaticamente al documento.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('download')}
                  className="rounded-xl border-2 border-border hover:border-muted-foreground bg-card px-4 py-5 text-left transition"
                >
                  <p className="text-sm font-semibold text-foreground">Scarica e firma</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Scarica il PDF, stampa, firma manualmente e ricarica la versione firmata.
                  </p>
                </button>
              </div>
            )}

            {/* Guided mode panel */}
            {mode === 'guided' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('idle')}
                    className="text-xs text-muted-foreground hover:text-foreground transition"
                  >
                    ← Indietro
                  </button>
                  <span className="text-sm font-medium text-foreground">Firma guidata</span>
                </div>

                <SignaturePad
                  onSignatureReady={(blob) => setSignatureBlob(blob)}
                  onClear={() => setSignatureBlob(null)}
                />

                {guidedError && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/40 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                    {guidedError}
                  </div>
                )}

                <Button
                  onClick={handleGuidedSign}
                  disabled={!signatureBlob || signingGuided}
                  className="bg-brand hover:bg-brand/90 text-white"
                >
                  {signingGuided ? 'Firma in corso…' : 'Invia firma'}
                </Button>
              </div>
            )}

            {/* Download + upload panel */}
            {mode === 'download' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('idle')}
                    className="text-xs text-muted-foreground hover:text-foreground transition"
                  >
                    ← Indietro
                  </button>
                  <span className="text-sm font-medium text-foreground">Scarica e firma</span>
                </div>

                <p className="text-sm text-foreground">
                  Scarica il documento, firmalo fisicamente e ricarica il PDF firmato.
                </p>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    Carica PDF firmato <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => { setUploadFile(e.target.files?.[0] ?? null); setConfirmed(false); }}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-accent file:text-foreground hover:file:bg-muted"
                  />
                  {uploadFile && <p className="mt-1 text-xs text-muted-foreground">{uploadFile.name}</p>}
                </div>

                {uploadFile && (
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

                {uploadError && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/40 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                    {uploadError}
                  </div>
                )}

                <Button
                  onClick={handleUploadSign}
                  disabled={!uploadFile || !confirmed || uploading}
                  className="bg-brand hover:bg-brand/90 text-white"
                >
                  {uploading ? 'Caricamento…' : 'Invia documento firmato'}
                </Button>
              </div>
            )}
          </div>
        )}

        {done && (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800/40 px-3 py-2 text-sm text-green-700 dark:text-green-400">
            Documento firmato inviato correttamente.
          </div>
        )}

        {/* Document viewer modal */}
        <DocumentViewer
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          url={viewerUrl}
          title={doc.titolo}
        />
      </CardContent>
    </Card>
  );
}
