import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ProfileForm from '@/components/ProfileForm';
import DocumentList from '@/components/documents/DocumentList';
import DocumentUploadForm from '@/components/documents/DocumentUploadForm';
import PasswordChangeForm from '@/components/profilo/PasswordChangeForm';
import { Button } from '@/components/ui/button';

export default async function ProfiloPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [
    { data: profile },
    { data: collaborator },
    { data: guidaFigliRow },
    { data: allCommunitiesData },
  ] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('role, member_status')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('collaborators')
      .select(`
        nome, cognome, email, username, codice_fiscale,
        data_nascita, luogo_nascita, provincia_nascita,
        comune, provincia_residenza, data_ingresso,
        telefono, indirizzo, civico_residenza, iban, intestatario_pagamento, tshirt_size,
        foto_profilo_url, sono_un_figlio_a_carico, importo_lordo_massimale,
        collaborator_communities ( communities ( id, name ) )
      `)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('resources')
      .select('titolo, descrizione')
      .contains('tag', ['detrazioni-figli'])
      .limit(1)
      .maybeSingle(),
    supabase
      .from('communities')
      .select('id, name')
      .order('name'),
  ]);

  // PostgREST returns a single object (not array) when UNIQUE constraint exists on the FK column.
  // Migration 044 added UNIQUE(collaborator_id) → normalize to array before flatMap.
  const ccRaw = collaborator?.collaborator_communities;
  const ccArray = Array.isArray(ccRaw) ? ccRaw : ccRaw ? [ccRaw] : [];
  const communities = ccArray.flatMap(
    (cc: { communities: { id: string; name: string } | { id: string; name: string }[] | null }) => {
      const c = cc.communities;
      if (!c) return [];
      return Array.isArray(c) ? c : [c];
    },
  );

  const allCommunities = (allCommunitiesData ?? []) as { id: string; name: string }[];

  const role = profile?.role ?? '';
  if (role === 'responsabile_compensi') redirect('/');
  const isCollaboratore = role === 'collaboratore';

  const { tab } = await searchParams;
  const activeTab = isCollaboratore
    ? (tab === 'documenti' ? 'documenti' : 'profilo')
    : 'profilo';

  const documents = activeTab === 'documenti'
    ? ((await supabase
        .from('documents')
        .select('*, collaborators(nome, cognome)')
        .order('created_at', { ascending: false })
        .then((r) => r.data ?? [])))
    : [];

  const tabCls = (t: string) =>
    `whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
      activeTab === t
        ? 'bg-brand text-white'
        : 'bg-muted text-muted-foreground hover:bg-accent'
    }`;

  if (!isCollaboratore) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-xl font-semibold text-foreground mb-6">Il mio profilo</h1>
        <ProfileForm
          collaborator={collaborator ?? null}
          role={role}
          email={user.email ?? ''}
          communities={communities}
          allCommunities={allCommunities}
          guidaFigli={guidaFigliRow ?? null}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Profilo e Documenti</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestisci i tuoi dati personali e consulta i tuoi documenti.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <Link href="?tab=profilo" className={tabCls('profilo')}>Profilo</Link>
        <Link href="?tab=documenti" className={tabCls('documenti')}>Documenti</Link>
      </div>

      {activeTab === 'profilo' && (
        <div className="max-w-2xl space-y-8">
          <ProfileForm
            collaborator={collaborator ?? null}
            role={role}
            email={user.email ?? ''}
            communities={communities}
            allCommunities={allCommunities}
            guidaFigli={guidaFigliRow ?? null}
          />
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Sicurezza</h2>
            <PasswordChangeForm />
          </div>
        </div>
      )}

      {activeTab === 'documenti' && (
        <div className="w-full space-y-6">
          <DocumentUploadForm collaborators={[]} isAdmin={false} />
          <DocumentList documents={documents} isAdmin={false} />
        </div>
      )}
    </div>
  );
}
