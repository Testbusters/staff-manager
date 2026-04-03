import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (profile.role !== 'responsabile_cittadino' && profile.role !== 'amministrazione') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: entries, error } = await svc
    .from('blacklist')
    .select('id, collaborator_id, note, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  if (!entries || entries.length === 0) {
    return NextResponse.json({ blacklist: [] });
  }

  const collabIds = entries.map((e: { collaborator_id: string }) => e.collaborator_id);
  const { data: collabs } = await svc
    .from('collaborators')
    .select('id, nome, cognome, username')
    .in('id', collabIds);

  const collabMap: Record<string, { nome: string; cognome: string; username: string | null }> = {};
  for (const c of collabs ?? []) {
    collabMap[c.id] = { nome: c.nome ?? '—', cognome: c.cognome ?? '', username: c.username };
  }

  const blacklist = entries.map((e: { id: string; collaborator_id: string; note: string | null; created_at: string }) => ({
    id: e.id,
    collaborator_id: e.collaborator_id,
    nome: collabMap[e.collaborator_id]?.nome ?? '—',
    cognome: collabMap[e.collaborator_id]?.cognome ?? '',
    username: collabMap[e.collaborator_id]?.username ?? null,
    note: e.note,
    created_at: e.created_at,
  }));

  return NextResponse.json({ blacklist });
}
