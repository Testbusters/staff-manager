import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import DocumentSignFlow from '@/components/documents/DocumentSignFlow';
import DocumentDeleteButton from '@/components/documents/DocumentDeleteButton';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_SIGN_STATUS_LABELS } from '@/lib/types';
import type { Role, Document } from '@/lib/types';
import { getDocumentUrls } from '@/lib/documents-storage';
import { Card, CardContent } from '@/components/ui/card';

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active, member_status')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) redirect('/pending');

  const role = profile.role as Role;
  if (role === 'responsabile_compensi') redirect('/');
  const isAdmin = ['amministrazione'].includes(role);
  const canSign = profile.member_status !== 'uscente_senza_compenso';
  const { id } = await params;

  // RLS ensures only authorized users can read this document
  const { data: doc, error } = await supabase
    .from('documents')
    .select('*, collaborators(nome, cognome)')
    .eq('id', id)
    .single();

  if (error || !doc) notFound();

  // Generate signed URLs
  const { originalUrl, firmatoUrl } = await getDocumentUrls(
    doc.file_original_url,
    doc.file_firmato_url,
  );

  const collab = doc.collaborators as { nome: string; cognome: string } | null;
  const isContratto = (doc.tipo as string).startsWith('CONTRATTO_');

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/documenti" className="text-sm text-muted-foreground hover:text-foreground transition">
          ← Documenti
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-semibold text-foreground">Dettaglio documento</h1>
      </div>

      <div className="space-y-6">
        {/* Info card */}
        <Card>
          <CardContent className="px-4 py-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-medium text-foreground">{doc.titolo}</p>
              {isAdmin && collab && (
                <p className="text-sm text-muted-foreground mt-0.5">{collab.nome} {collab.cognome}</p>
              )}
            </div>
            <span className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              doc.stato_firma === 'DA_FIRMARE'
                ? 'bg-yellow-50 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700/40'
                : doc.stato_firma === 'FIRMATO'
                ? 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700/40'
                : 'bg-muted text-muted-foreground border-border'
            }`}>
              {DOCUMENT_SIGN_STATUS_LABELS[doc.stato_firma as keyof typeof DOCUMENT_SIGN_STATUS_LABELS]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm border-t border-border pt-3">
            <div>
              <span className="text-xs text-muted-foreground">Tipo</span>
              <p className="text-foreground mt-0.5">
                {DOCUMENT_TYPE_LABELS[doc.tipo as keyof typeof DOCUMENT_TYPE_LABELS] ?? doc.tipo}
              </p>
            </div>
            {doc.anno && (
              <div>
                <span className="text-xs text-muted-foreground">Anno</span>
                <p className="text-foreground mt-0.5">{doc.anno}</p>
              </div>
            )}
            <div>
              <span className="text-xs text-muted-foreground">Richiesto il</span>
              <p className="text-foreground mt-0.5">
                {new Date(doc.requested_at).toLocaleDateString('it-IT')}
              </p>
            </div>
            {doc.signed_at && (
              <div>
                <span className="text-xs text-muted-foreground">Firmato il</span>
                <p className="text-foreground mt-0.5">
                  {new Date(doc.signed_at).toLocaleDateString('it-IT')}
                </p>
              </div>
            )}
          </div>
          </CardContent>
        </Card>

        {/* Sign flow — for collaboratore with DA_FIRMARE, or read-only for others */}
        <DocumentSignFlow
          document={doc as Document}
          originalUrl={originalUrl}
          precompiledUrl={originalUrl}
          firmatoUrl={firmatoUrl}
          canSign={canSign}
        />

        {/* Delete — admin only, CONTRATTO only */}
        {isAdmin && isContratto && (
          <Card>
            <CardContent className="px-4 py-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Elimina contratto</p>
              <p className="text-xs text-muted-foreground">
                L&apos;eliminazione è definitiva. Permette di caricare un nuovo contratto per questo collaboratore.
              </p>
              <DocumentDeleteButton documentId={doc.id} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
