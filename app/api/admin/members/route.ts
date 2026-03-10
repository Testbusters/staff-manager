import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const ADMIN_ROLES = ['amministrazione'];

// GET — list collaborators with member_status, search + pagination (admin only)
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Utente non attivo' }, { status: 403 });
  if (!ADMIN_ROLES.includes(profile.role)) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const offset = (page - 1) * limit;

  // Step 1: get all user_ids with role='collaboratore' to exclude admins/responsabili
  const { data: collabProfiles, error: profilesError } = await svc
    .from('user_profiles')
    .select('user_id, member_status, is_active')
    .eq('role', 'collaboratore');

  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 });

  const collabUserIds = (collabProfiles ?? []).map((p) => p.user_id);
  if (collabUserIds.length === 0) {
    return NextResponse.json({ members: [], total: 0, page, limit });
  }

  // Step 2: query collaborators scoped to collaboratore role, with optional search + pagination
  let query = svc
    .from('collaborators')
    .select('id, user_id, nome, cognome, email, username, data_ingresso', { count: 'exact' })
    .in('user_id', collabUserIds)
    .order('cognome', { ascending: true })
    .order('nome', { ascending: true })
    .range(offset, offset + limit - 1);

  if (q) {
    query = query.or(`nome.ilike.%${q}%,cognome.ilike.%${q}%,email.ilike.%${q}%,username.ilike.%${q}%`);
  }

  const { data: collabs, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!collabs || collabs.length === 0) {
    return NextResponse.json({ members: [], total: count ?? 0, page, limit });
  }

  // Build profile lookup from step 1 data (already fetched, no extra query needed)
  const userIds = collabs.map((c) => c.user_id);
  const profileMap = Object.fromEntries(
    (collabProfiles ?? [])
      .filter((p) => userIds.includes(p.user_id))
      .map((p) => [p.user_id, p])
  );

  const members = collabs.map((c) => {
    const p = profileMap[c.user_id];
    return {
      id: c.id,
      user_id: c.user_id,
      nome: c.nome,
      cognome: c.cognome,
      email: c.email ?? '',
      username: c.username ?? null,
      member_status: (p?.member_status ?? 'attivo') as string,
      is_active: p?.is_active ?? true,
      data_ingresso: c.data_ingresso ?? null,
    };
  });

  return NextResponse.json({ members, total: count ?? 0, page, limit });
}
