import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const schema = z.object({
  lezione_id: z.string().uuid(),
  collaborator_id: z.string().uuid(),
  ruolo: z.enum(['cocoda']),
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

  if (profile?.role !== 'responsabile_cittadino') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const { lezione_id, collaborator_id, ruolo } = parsed.data;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Duplicate check
  const { data: existing } = await svc
    .from('assegnazioni')
    .select('id')
    .eq('lezione_id', lezione_id)
    .eq('collaborator_id', collaborator_id)
    .eq('ruolo', ruolo)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Assegnazione già esistente' }, { status: 409 });
  }

  const { data, error } = await svc
    .from('assegnazioni')
    .insert({ lezione_id, collaborator_id, ruolo, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assegnazione: data }, { status: 201 });
}
