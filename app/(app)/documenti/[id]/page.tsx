import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import DocumentSignFlow from '@/components/documents/DocumentSignFlow';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_SIGN_STATUS_LABELS } from '@/lib/types';

const SIGN_STATUS_COLORS: Record<string, string> = {
  DA_FIRMARE: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50',
  FIRMATO:    'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50',
};
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
  if (isAdmin) redirect('/documenti');
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
            <span className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${SIGN_STATUS_COLORS[doc.stato_firma] ?? 'bg-muted text-muted-foreground border-border'}`}>
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

      </div>
    </div>
  );
}
