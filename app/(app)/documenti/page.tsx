import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import DocumentList from '@/components/documents/DocumentList';
import DocumentUploadForm from '@/components/documents/DocumentUploadForm';
import CUBatchUpload from '@/components/documents/CUBatchUpload';
import type { Role } from '@/lib/types';

export default async function DocumentiPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
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

  // Collaboratori access documents via Profilo e Documenti
  if (role === 'collaboratore') redirect('/profilo?tab=documenti');
  if (role === 'responsabile_compensi') redirect('/');
  const isAdmin = ['amministrazione'].includes(role);
  const canUpload = isAdmin;

  const { tab: rawTab } = await searchParams;
  const tab = isAdmin
    ? (rawTab === 'carica' ? 'carica' : rawTab === 'cu-batch' ? 'cu-batch' : 'lista')
    : canUpload
    ? (rawTab === 'carica' ? 'carica' : 'lista')
    : 'lista';

  // Fetch documents only for non-admin (collaboratore path); admin fetches lazily per-collaborator
  const currentYear = new Date().getFullYear();
  let documents: unknown[] = [];
  if (!isAdmin) {
    let docQuery = supabase
      .from('documents')
      .select('*, collaborators(nome, cognome)')
      .order('created_at', { ascending: false });
    if (profile.member_status === 'uscente_con_compenso') {
      docQuery = docQuery.lte('created_at', `${currentYear}-12-31T23:59:59.999Z`);
    }
    const { data } = await docQuery;
    documents = data ?? [];
  }

  // Fetch collaborators list for admin upload form
  let collaborators: { id: string; nome: string; cognome: string; username: string | null; user_id: string; email: string }[] = [];
  if (isAdmin) {
    const collaboratorsRaw = await supabase
      .from('collaborators')
      .select('id, nome, cognome, username, user_id')
      .order('cognome', { ascending: true })
      .then((r) => r.data ?? []);

    const userIds = collaboratorsRaw.map((c) => c.user_id).filter(Boolean) as string[];
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, email')
      .in('user_id', userIds);

    const emailMap = new Map(profiles?.map((p) => [p.user_id, p.email]) ?? []);
    collaborators = collaboratorsRaw.map((c) => ({
      ...c,
      email: emailMap.get(c.user_id) ?? '',
    }));
  }

  const tabCls = (t: string) =>
    `whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
      tab === t
        ? 'bg-brand text-white'
        : 'bg-muted text-muted-foreground hover:bg-accent'
    }`;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Documenti</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isAdmin
            ? 'Gestione documenti collaboratori, upload CU batch e contratti.'
            : 'I tuoi documenti per tipologia. Carica, scarica e firma.'}
        </p>
      </div>

      {(isAdmin || canUpload) && (
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <Link href="?tab=lista" className={tabCls('lista')}>Lista documenti</Link>
          <Link href="?tab=carica" className={tabCls('carica')}>Carica documento</Link>
          {isAdmin && (
            <Link href="?tab=cu-batch" className={tabCls('cu-batch')}>Import CU batch</Link>
          )}
        </div>
      )}

      {tab === 'lista' && (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <DocumentList documents={documents as any[]} isAdmin={isAdmin} collaborators={collaborators} />
      )}
      {canUpload && tab === 'carica' && (
        <DocumentUploadForm collaborators={collaborators} isAdmin={isAdmin} />
      )}
      {isAdmin && tab === 'cu-batch' && (
        <CUBatchUpload />
      )}
    </div>
  );
}
