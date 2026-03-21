import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// Extract project ref from the Supabase URL so each environment queries its own project.
// NEXT_PUBLIC_SUPABASE_URL = https://<ref>.supabase.co
const PROJECT_REF = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  .match(/\/\/([^.]+)\.supabase\.co/)?.[1] ?? 'nyajqcjqmgxctlqighql';
const MGMT_BASE = 'https://api.supabase.com/v1';

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

  const { searchParams } = new URL(request.url);
  const daysRaw = parseInt(searchParams.get('days') ?? '7', 10);
  const days = [1, 7, 30].includes(daysRaw) ? daysRaw : 7;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Primary source: get_recent_auth_events() reads auth.audit_log_entries (SECURITY DEFINER).
  // Requires "Enable Auth Logging" in Supabase Dashboard > Authentication > Logs.
  // Falls back to Management API edge logs (real-time only, no history) when table is empty.
  const { data: rpcRows } = await svc.rpc('get_recent_auth_events', { days });

  type ParsedEvent = { id: string; created_at: string; userId: string; email: string; event_type: string; ip_address: string; role: string };

  let parsed: ParsedEvent[];

  if (rpcRows && rpcRows.length > 0) {
    parsed = (rpcRows as Array<{ id: string; created_at: string; email: string; event_type: string; ip_address: string }>)
      .map((r) => ({
        id: r.id,
        created_at: r.created_at,
        userId: '',
        email: r.email ?? '',
        event_type: r.event_type ?? '',
        ip_address: r.ip_address ?? '',
        role: '',
      }));
  } else {
    // Fallback: Management API edge logs (covers only the last few minutes)
    const pat = process.env.SUPABASE_ACCESS_TOKEN;
    if (!pat) return NextResponse.json({ events: [], total: 0 });

    const url = `${MGMT_BASE}/projects/${PROJECT_REF}/analytics/endpoints/logs.all`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${pat}`, 'Content-Type': 'application/json' },
    });

    const rawLogs: RawLogEntry[] = res.ok ? ((await res.json() as { result?: RawLogEntry[] }).result ?? []) : [];
    const cutoffUs = (Date.now() - days * 24 * 60 * 60 * 1000) * 1000;

    parsed = rawLogs
      .filter((e) => (e.timestamp ?? 0) >= cutoffUs)
      .map((e) => {
        const req = e.metadata?.[0]?.request?.[0];
        const path = req?.path ?? '';
        if (!path.startsWith('/auth/v1/') || path.startsWith('/auth/v1/admin/')) return null;
        const userId = req?.sb?.[0]?.auth_user ?? '';
        const ip = req?.headers?.[0]?.cf_connecting_ip ?? '';
        const ts = new Date(Math.floor((e.timestamp ?? 0) / 1000)).toISOString();
        return { id: e.id ?? ts, created_at: ts, userId, email: '', event_type: pathToEventType(path), ip_address: ip, role: '' };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    // Enrich fallback events with email + role from user IDs
    const userIds = [...new Set(parsed.map((e) => e.userId).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: authUsers } = await svc.auth.admin.listUsers({ perPage: 1000 });
      const idToEmail: Record<string, string> = {};
      for (const u of authUsers?.users ?? []) { if (u.email) idToEmail[u.id] = u.email; }

      const { data: profiles } = await svc.from('user_profiles').select('user_id, role').in('user_id', userIds);
      const idToRole: Record<string, string> = {};
      for (const p of profiles ?? []) idToRole[p.user_id] = p.role;

      for (const e of parsed) {
        e.email = idToEmail[e.userId] ?? '';
        e.role  = idToRole[e.userId] ?? '';
      }
    }
  }

  return NextResponse.json({ events: parsed, total: parsed.length });
}
