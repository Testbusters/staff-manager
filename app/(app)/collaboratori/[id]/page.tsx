import { redirect, notFound } from 'next/navigation';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import CollaboratoreDetail from '@/components/responsabile/CollaboratoreDetail';
import type { Role, DocumentType, DocumentSignStatus } from '@/lib/types';

export default async function CollaboratoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: profile } = await svc
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) redirect('/pending');
  const role = profile?.role as Role;
  if (role !== 'amministrazione') redirect('/');

  // ── Fetch collaborator ───────────────────────────────────────────────────
  const { data: collab, error: collabErr } = await svc
    .from('collaborators')
    .select('id, user_id, nome, cognome, codice_fiscale, telefono, email, tipo_contratto, data_ingresso, luogo_nascita, provincia_nascita, comune, provincia_residenza, indirizzo, civico_residenza, data_nascita, tshirt_size, sono_un_figlio_a_carico, importo_lordo_massimale, intestatario_pagamento, username, citta, materie_insegnate')
    .eq('id', id)
    .maybeSingle();

  if (collabErr || !collab) notFound();

  // ── Fetch community names ────────────────────────────────────────────────
  const { data: ccData } = await svc
    .from('collaborator_communities')
    .select('community_id')
    .eq('collaborator_id', id);
  const communityIds = (ccData ?? []).map((c: { community_id: string }) => c.community_id);
  let communityNames: string[] = [];
  if (communityIds.length > 0) {
    const { data: commData } = await svc
      .from('communities')
      .select('id, name')
      .in('id', communityIds);
    communityNames = (commData ?? []).map((c: { name: string }) => c.name);
  }
  // ── Fetch member_status + role from user_profiles ───────────────────────
  const { data: upData } = await svc
    .from('user_profiles')
    .select('member_status, role')
    .eq('user_id', collab.user_id)
    .maybeSingle();
  const memberStatus = upData?.member_status ?? null;
  const collabRole = (upData?.role ?? null) as Role | null;

  // ── Fetch lookup options (for admin edit modal) ─────────────────────────
  const community = communityNames[0]?.toLowerCase().replace(/\s+/g, '') || 'testbusters';
  const [{ data: rawCitta }, { data: rawMaterie }] = await Promise.all([
    svc.from('lookup_options').select('id, nome').eq('type', 'citta').eq('community', community).order('nome'),
    svc.from('lookup_options').select('id, nome').eq('type', 'materia').eq('community', community).order('nome'),
  ]);
  const cittaOptions   = (rawCitta ?? []) as { id: string; nome: string }[];
  const materiaOptions = (rawMaterie ?? []) as { id: string; nome: string }[];

  // ── Fetch documents ──────────────────────────────────────────────────────
  const { data: rawDocs } = await svc
    .from('documents')
    .select('id, titolo, tipo, stato_firma, created_at')
    .eq('collaborator_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  const documents = (rawDocs ?? []) as {
    id: string;
    titolo: string;
    tipo: DocumentType;
    stato_firma: DocumentSignStatus;
    created_at: string;
  }[];

  return (
    <CollaboratoreDetail
      userId={collab.user_id ?? null}
      collab={{
        id: collab.id,
        nome: collab.nome,
        cognome: collab.cognome,
        codice_fiscale: collab.codice_fiscale,
        telefono: collab.telefono,
        email: collab.email ?? null,
        tipo_contratto: collab.tipo_contratto,
        data_ingresso: collab.data_ingresso,
        luogo_nascita: collab.luogo_nascita,
        provincia_nascita: collab.provincia_nascita ?? null,
        comune: collab.comune,
        provincia_residenza: collab.provincia_residenza ?? null,
        indirizzo: collab.indirizzo,
        civico_residenza: collab.civico_residenza ?? null,
        data_nascita: collab.data_nascita ?? null,
        tshirt_size: collab.tshirt_size ?? null,
        sono_un_figlio_a_carico: collab.sono_un_figlio_a_carico ?? false,
        importo_lordo_massimale: collab.importo_lordo_massimale ?? null,
        intestatario_pagamento: collab.intestatario_pagamento ?? null,
        username: collab.username ?? null,
        citta: (collab as { citta?: string | null }).citta ?? null,
        materie_insegnate: (collab as { materie_insegnate?: string[] | null }).materie_insegnate ?? null,
      }}
      memberStatus={memberStatus}
      communityNames={communityNames}
      compensations={[]}
      expenses={[]}
      documents={documents}
      role={role}
      collabRole={collabRole}
      cittaOptions={cittaOptions}
      materiaOptions={materiaOptions}
    />
  );
}
