import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { ROLE_LABELS } from '@/lib/types';
import type { Role } from '@/lib/types';
import { MAX_PENDING_COMPENSATIONS } from '@/lib/rate-limits';
import { createCompensationSchema } from '@/lib/schemas/compensation';

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const statoFilter = searchParams.get('stato'); // comma-separated list

  let query = supabase
    .from('compensations')
    .select('*, communities(name)')
    .order('created_at', { ascending: false });

  if (statoFilter) {
    const stati = statoFilter.split(',').map((s) => s.trim());
    query = query.in('stato', stati);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return NextResponse.json({ compensations: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Utente non attivo' }, { status: 403 });
  if (!['responsabile_compensi', 'amministrazione'].includes(profile.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createCompensationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }

  const { collaborator_id, ...rest } = parsed.data;
  const role = profile.role as Role;

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Responsabile: verify they manage a community that includes this collaborator
  if (role === 'responsabile_compensi') {
    const { data: access } = await serviceClient
      .from('user_community_access')
      .select('community_id')
      .eq('user_id', user.id);

    const managedIds = (access ?? []).map((a: { community_id: string }) => a.community_id);

    if (managedIds.length === 0) {
      return NextResponse.json({ error: 'Nessuna community gestita' }, { status: 403 });
    }

    const { data: colCommunity } = await serviceClient
      .from('collaborator_communities')
      .select('community_id')
      .eq('collaborator_id', collaborator_id)
      .in('community_id', managedIds)
      .limit(1)
      .maybeSingle();

    if (!colCommunity) {
      return NextResponse.json({ error: 'Collaboratore non appartiene alle community gestite' }, { status: 403 });
    }
  }

  // Rate limit: cap pending compensations per collaborator
  const { count: pendingCount } = await serviceClient
    .from('compensations')
    .select('*', { count: 'exact', head: true })
    .eq('collaborator_id', collaborator_id)
    .eq('stato', 'IN_ATTESA');

  if ((pendingCount ?? 0) >= MAX_PENDING_COMPENSATIONS) {
    return NextResponse.json(
      { error: 'Limite compensi in attesa raggiunto per questo collaboratore' },
      { status: 429 },
    );
  }

  const { data: comp, error } = await serviceClient
    .from('compensations')
    .insert({
      collaborator_id,
      stato: 'IN_ATTESA',
      ...rest,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  await serviceClient.from('compensation_history').insert({
    compensation_id: comp.id,
    stato_precedente: null,
    stato_nuovo: 'IN_ATTESA',
    changed_by: user.id,
    role_label: ROLE_LABELS[role],
    note: null,
  });

  return NextResponse.json({ compensation: comp }, { status: 201 });
}
