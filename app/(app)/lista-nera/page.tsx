import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import ListaNeraPage from '@/components/lista-nera/ListaNeraPage';

export default async function ListaNera() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) redirect('/');
  if (profile.role !== 'responsabile_cittadino' && profile.role !== 'amministrazione') {
    redirect('/');
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: entries } = await svc
    .from('blacklist')
    .select('id, collaborator_id, note, created_at')
    .order('created_at', { ascending: false });

  const collabIds = (entries ?? []).map((e: { collaborator_id: string }) => e.collaborator_id);
  const { data: collabs } = collabIds.length > 0
    ? await svc.from('collaborators').select('id, nome, cognome, username').in('id', collabIds)
    : { data: [] };

  const collabMap: Record<string, { nome: string; cognome: string; username: string | null }> = {};
  for (const c of collabs ?? []) {
    collabMap[c.id] = { nome: c.nome ?? '—', cognome: c.cognome ?? '', username: c.username };
  }

  const blacklist = (entries ?? []).map((e: { id: string; collaborator_id: string; note: string | null; created_at: string }) => ({
    id: e.id,
    nome: collabMap[e.collaborator_id]?.nome ?? '—',
    cognome: collabMap[e.collaborator_id]?.cognome ?? '',
    username: collabMap[e.collaborator_id]?.username ?? null,
    note: e.note,
    created_at: e.created_at,
  }));

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-foreground mb-1">Lista nera</h1>
      <p className="text-sm text-muted-foreground mb-6">Collaboratori esclusi dall&apos;assegnazione corsi.</p>
      <ListaNeraPage entries={blacklist} />
    </div>
  );
}
