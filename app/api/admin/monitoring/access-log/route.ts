import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const PROJECT_REF = 'nyajqcjqmgxctlqighql';
const MGMT_BASE   = 'https://api.supabase.com/v1';

type RawLogEntry = {
  id?: string;
  timestamp?: number;
  event_message?: string;
  metadata?: Array<{
    request?: Array<{
      path?: string;
      headers?: Array<{ cf_connecting_ip?: string }>;
      sb?: Array<{ auth_user?: string }>;
    }>;
  }>;
};

function pathToEventType(path: string): string {
  if (path.startsWith('/auth/v1/token'))   return 'login';
  if (path.startsWith('/auth/v1/logout'))  return 'logout';
  if (path.startsWith('/auth/v1/verify'))  return 'verify';
  if (path.startsWith('/auth/v1/recover')) return 'recovery';
  if (path.startsWith('/auth/v1/user'))    return 'session_check';
  return path.replace('/auth/v1/', '');
}

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

  const pat = process.env.SUPABASE_ACCESS_TOKEN;
  if (!pat) return NextResponse.json({ error: 'SUPABASE_ACCESS_TOKEN not configured' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const daysRaw = parseInt(searchParams.get('days') ?? '7', 10);
  const days = [1, 7, 30].includes(daysRaw) ? daysRaw : 7;

  const url = `${MGMT_BASE}/projects/${PROJECT_REF}/analytics/endpoints/logs.all`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Supabase Logs API error: ${res.status} ${text}` }, { status: 502 });
  }

  const body = await res.json() as { result?: RawLogEntry[] };
  const rawLogs = body.result ?? [];

  // Cutoff in microseconds (API timestamp is in µs)
  const cutoffUs = (Date.now() - days * 24 * 60 * 60 * 1000) * 1000;

  const parsed = rawLogs
    .filter((e) => (e.timestamp ?? 0) >= cutoffUs)
    .map((e) => {
      const req = e.metadata?.[0]?.request?.[0];
      const path = req?.path ?? '';
      // Exclude admin API calls (used internally by this route itself)
      if (!path.startsWith('/auth/v1/') || path.startsWith('/auth/v1/admin/')) return null;

      const userId  = req?.sb?.[0]?.auth_user ?? '';
      const ip      = req?.headers?.[0]?.cf_connecting_ip ?? '';
      const ts      = new Date(Math.floor((e.timestamp ?? 0) / 1000)).toISOString();

      return { id: e.id ?? ts, created_at: ts, userId, email: '', event_type: pathToEventType(path), ip_address: ip, role: '' };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  if (parsed.length === 0) {
    return NextResponse.json({ events: [], total: 0 });
  }

  // Enrich with email + role
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const userIds = [...new Set(parsed.map((e) => e.userId).filter(Boolean))];
  if (userIds.length > 0) {
    const { data: authUsers } = await svc.auth.admin.listUsers({ perPage: 1000 });
    const idToEmail: Record<string, string> = {};
    for (const u of authUsers?.users ?? []) {
      if (u.email) idToEmail[u.id] = u.email;
    }

    const { data: profiles } = await svc
      .from('user_profiles')
      .select('user_id, role')
      .in('user_id', userIds);
    const idToRole: Record<string, string> = {};
    for (const p of profiles ?? []) idToRole[p.user_id] = p.role;

    for (const e of parsed) {
      e.email = idToEmail[e.userId] ?? '';
      e.role  = idToRole[e.userId] ?? '';
    }
  }

  return NextResponse.json({ events: parsed, total: parsed.length });
}
