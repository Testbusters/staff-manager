import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

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

  const body = await request.json().catch(() => null);
  const { community_ids } = body as { community_ids: string[] };

  if (!Array.isArray(community_ids) || community_ids.length === 0) {
    return NextResponse.json({ error: 'Seleziona almeno una community' }, { status: 400 });
  }
  if (community_ids.length > 1) {
    return NextResponse.json({ error: 'Un collaboratore può appartenere a una sola community' }, { status: 400 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Get own collaborator id
  const { data: collab } = await svc
    .from('collaborators')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!collab) {
    return NextResponse.json({ error: 'Collaborator record not found' }, { status: 404 });
  }

  const collaboratorId = collab.id;

  // Delete existing memberships
  const { error: deleteError } = await svc
    .from('collaborator_communities')
    .delete()
    .eq('collaborator_id', collaboratorId);

  if (deleteError) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }

  // Insert new memberships
  const rows = community_ids.map((community_id) => ({ collaborator_id: collaboratorId, community_id }));
  const { error: insertError } = await svc
    .from('collaborator_communities')
    .insert(rows);

  if (insertError) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
