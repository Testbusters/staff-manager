'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_SIGN_STATUS_LABELS } from '@/lib/types';
import type { Document } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

interface DocData {
  document: Document & { collaborators?: { nome: string; cognome: string } | null };
  originalUrl: string | null;
  firmatoUrl: string | null;
}

interface Props {
  docId: string | null;
  onClose: () => void;
}

function SignBadge({ stato }: { stato: string }) {
  const cls =
    stato === 'DA_FIRMARE'
      ? 'border-amber-500 text-amber-700 dark:border-amber-600 dark:text-amber-400'
      : stato === 'FIRMATO'
      ? 'border-green-500 text-green-700 dark:border-green-600 dark:text-green-400'
      : '';
  return (
    <Badge variant="outline" className={cls}>
      {DOCUMENT_SIGN_STATUS_LABELS[stato as keyof typeof DOCUMENT_SIGN_STATUS_LABELS] ?? stato}
    </Badge>
  );
}

export default function DocumentAdminModal({ docId, onClose }: Props) {
  const router = useRouter();
  const [docData, setDocData] = useState<DocData | null>(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [markSigned, setMarkSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!docId) {
      setDocData(null);
      setFile(null);
      setMarkSigned(false);
      return;
    }
    setLoading(true);
    fetch(`/api/documents/${docId}`)
      .then((r) => r.json())
      .then((data) => setDocData({ document: data.document, originalUrl: data.originalUrl, firmatoUrl: data.firmatoUrl ?? null }))
      .catch(() => toast.error('Errore caricamento documento'))
      .finally(() => setLoading(false));
  }, [docId]);

  const handleReplace = async () => {
    if (!file || !docId) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mark_as_signed', markSigned ? 'true' : 'false');
      const res = await fetch(`/api/documents/${docId}`, { method: 'PATCH', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore sostituzione');
      toast.success('Documento sostituito.');
      router.refresh();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setSubmitting(false);
    }
  };

  const doc = docData?.document;
  const collab = doc?.collaborators as { nome: string; cognome: string } | null | undefined;
  const isDaFirmare = doc?.stato_firma === 'DA_FIRMARE';
  const isFirmato = doc?.stato_firma === 'FIRMATO';
  const hasExistingFile = !!docData?.originalUrl;
  const replaceEnabled = !!file && (!isDaFirmare || markSigned);

  return (
    <Dialog open={!!docId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg" data-slot="dialog-content">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-8">
            <DialogTitle className="text-base font-semibold leading-snug">
              {loading ? <Skeleton className="h-5 w-48" /> : (doc?.titolo ?? 'Dettaglio documento')}
            </DialogTitle>
            {doc && <SignBadge stato={doc.stato_firma} />}
          </div>
          {collab && (
            <p className="text-sm text-muted-foreground mt-1">{collab.nome} {collab.cognome}</p>
          )}
        </DialogHeader>

        {loading && (
          <div className="space-y-3 py-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {!loading && doc && (
          <div className="space-y-5">
            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Tipo</span>
                <span className="text-foreground">
                  {DOCUMENT_TYPE_LABELS[doc.tipo as keyof typeof DOCUMENT_TYPE_LABELS] ?? doc.tipo}
                </span>
              </div>
              {doc.anno && (
                <div>
                  <span className="text-xs text-muted-foreground block">Anno</span>
                  <span className="text-foreground">{doc.anno}</span>
                </div>
              )}
              <div>
                <span className="text-xs text-muted-foreground block">Richiesto il</span>
                <span className="text-foreground">
                  {new Date(doc.requested_at).toLocaleDateString('it-IT')}
                </span>
              </div>
              {doc.signed_at && (
                <div>
                  <span className="text-xs text-muted-foreground block">Firmato il</span>
                  <span className="text-foreground">
                    {new Date(doc.signed_at).toLocaleDateString('it-IT')}
                  </span>
                </div>
              )}
            </div>

            {/* Current file */}
            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Documento</p>
              {isFirmato && docData?.firmatoUrl ? (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 px-3 py-2">
                  <div className="min-w-0">
                    <span className="text-sm text-foreground truncate block">{doc.file_firmato_name ?? 'documento_firmato.pdf'}</span>
                    <span className="text-xs text-muted-foreground">
                      Firmato il {doc.signed_at ? new Date(doc.signed_at).toLocaleDateString('it-IT') : '—'}
                    </span>
                  </div>
                  <a
                    href={docData.firmatoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs text-link hover:text-link/80"
                  >
                    Scarica firmato
                  </a>
                </div>
              ) : docData?.originalUrl ? (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2">
                  <span className="text-sm text-foreground truncate">{doc.file_original_name ?? 'documento.pdf'}</span>
                  <a
                    href={docData.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs text-link hover:text-link/80"
                  >
                    Scarica
                  </a>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nessun file caricato.</p>
              )}
            </div>

            {/* Upload / replace section */}
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                {hasExistingFile ? 'Sostituisci documento' : 'Carica documento'}
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-accent file:text-foreground hover:file:bg-muted"
              />
              {file && (
                <p className="text-xs text-muted-foreground">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
              )}
              {isDaFirmare && (
                <label className="flex items-center gap-2 cursor-pointer rounded px-1 py-0.5 hover:bg-muted/60 transition">
                  <Checkbox
                    checked={markSigned}
                    onCheckedChange={(v) => setMarkSigned(v === true)}
                  />
                  <span className="text-sm text-foreground">
                    Marca come firmato — il documento caricato è già firmato
                  </span>
                </label>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={onClose} disabled={submitting}>
                Annulla
              </Button>
              <Button
                onClick={handleReplace}
                disabled={!replaceEnabled || submitting}
                className="bg-brand hover:bg-brand/90 text-white"
              >
                {submitting
                  ? (hasExistingFile ? 'Sostituzione…' : 'Caricamento…')
                  : (hasExistingFile ? 'Sostituisci documento' : 'Carica documento')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
