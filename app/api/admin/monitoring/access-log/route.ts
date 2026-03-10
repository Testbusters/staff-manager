import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (profile.role !== 'amministrazione') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const daysRaw = parseInt(searchParams.get('days') ?? '7', 10);
  const days = [1, 7, 30].includes(daysRaw) ? daysRaw : 7;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: events, error } = await svc.rpc('get_recent_auth_events', { days });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!events || events.length === 0) {
    return NextResponse.json({ events: [], total: 0 });
  }

  // Enrich with role: fetch user_profiles for all emails found
  const emails = [...new Set((events as { email: string }[]).map((e) => e.email).filter(Boolean))];

  // Look up auth.users by email to get user_id, then join user_profiles
  const { data: authUsers } = await svc.auth.admin.listUsers({ perPage: 1000 });
  const emailToRole: Record<string, string> = {};
  if (authUsers?.users) {
    const emailToId: Record<string, string> = {};
    for (const u of authUsers.users) {
      if (u.email) emailToId[u.email] = u.id;
    }

    const matchingIds = emails.map((e) => emailToId[e]).filter(Boolean);
    if (matchingIds.length > 0) {
      const { data: profiles } = await svc
        .from('user_profiles')
        .select('user_id, role')
        .in('user_id', matchingIds);
      for (const p of profiles ?? []) {
        const emailForId = Object.entries(emailToId).find(([, id]) => id === p.user_id)?.[0];
        if (emailForId) emailToRole[emailForId] = p.role;
      }
    }
  }

  const enriched = (events as { id: string; created_at: string; email: string; event_type: string; ip_address: string }[]).map((e) => ({
    id: e.id,
    created_at: e.created_at,
    email: e.email ?? '',
    role: emailToRole[e.email] ?? '',
    event_type: e.event_type ?? '',
    ip_address: e.ip_address ?? '',
  }));

  return NextResponse.json({ events: enriched, total: enriched.length });
}
