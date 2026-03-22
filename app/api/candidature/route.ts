import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const CreateCandidaturaSchema = z.object({
  tipo: z.enum(['docente_lezione', 'qa_lezione']),
  lezione_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'collaboratore') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreateCandidaturaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }
  const { tipo, lezione_id } = parsed.data;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Get collaborator_id for this user
  const { data: collab } = await svc
    .from('collaborators')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!collab) {
    return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
  }

  // Check blacklist
  const { data: blacklisted } = await svc
    .from('blacklist')
    .select('id')
    .eq('collaborator_id', collab.id)
    .maybeSingle();

  if (blacklisted) {
    return NextResponse.json({ error: 'Blacklisted' }, { status: 403 });
  }

  // Check for duplicate active candidatura (same lezione + tipo, not ritirata)
  const { data: existing } = await svc
    .from('candidature')
    .select('id')
    .eq('lezione_id', lezione_id)
    .eq('collaborator_id', collab.id)
    .eq('tipo', tipo)
    .neq('stato', 'ritirata')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Candidatura already exists' }, { status: 409 });
  }

  const { data, error } = await svc
    .from('candidature')
    .insert({ tipo, lezione_id, collaborator_id: collab.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ candidatura: data }, { status: 201 });
}
