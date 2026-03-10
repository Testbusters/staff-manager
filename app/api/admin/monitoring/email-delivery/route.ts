import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const PAGE_SIZE = 20;

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
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Summary: last 30 days grouped by event_type
  const { data: summaryRows } = await svc
    .from('email_events')
    .select('event_type')
    .gte('created_at', thirtyDaysAgo);

  const summary: Record<string, number> = {};
  for (const row of summaryRows ?? []) {
    summary[row.event_type] = (summary[row.event_type] ?? 0) + 1;
  }

  // Recent events: last 100, paginated
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: events, count } = await svc
    .from('email_events')
    .select('id, created_at, recipient, subject, event_type', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(100)
    .range(from, to);

  return NextResponse.json({
    summary,
    events: events ?? [],
    total: Math.min(count ?? 0, 100),
    page,
    page_size: PAGE_SIZE,
  });
}
