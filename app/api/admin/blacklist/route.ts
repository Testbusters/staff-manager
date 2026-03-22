import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const CreateBlacklistSchema = z.object({
  collaborator_id: z.string().uuid(),
  note: z.string().nullable().optional(),
});

async function requireAdmin(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null };
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();
  if (!profile?.is_active || profile.role !== 'amministrazione') return { user: null };
  return { user };
}

export async function GET(req: NextRequest) {
  const { user } = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await svc
    .from('blacklist')
    .select('id, collaborator_id, note, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const collabIds = (data ?? []).map((r: { collaborator_id: string }) => r.collaborator_id);
  const { data: collabs } = collabIds.length
    ? await svc.from('collaborators').select('id, username, nome, cognome').in('id', collabIds)
    : { data: [] };

  const collabMap = new Map(
    (collabs ?? []).map((c: { id: string; username: string | null; nome: string | null; cognome: string | null }) => [c.id, c]),
  );
  const entries = (data ?? []).map((r: { collaborator_id: string }) => ({
    ...r,
    collaborator: collabMap.get(r.collaborator_id) ?? null,
  }));

  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const { user } = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = CreateBlacklistSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data, error } = await svc
    .from('blacklist')
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Collaboratore già in blacklist' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data }, { status: 201 });
}
