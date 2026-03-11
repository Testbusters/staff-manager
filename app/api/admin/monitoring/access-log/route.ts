import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const PROJECT_REF = 'nyajqcjqmgxctlqighql';
const MGMT_BASE   = 'https://api.supabase.com/v1';

type RawAuthLog = {
  timestamp?: string | number;
  id?: string;
  event_message?: string;
  metadata?: Record<string, unknown> | Record<string, unknown>[];
};

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

  const url = `${MGMT_BASE}/projects/${PROJECT_REF}/logs?service=auth&limit=500`;
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

  const body = await res.json() as { result?: RawAuthLog[] };
  const rawLogs = body.result ?? [];

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const parsed = rawLogs
    .map((entry) => {
      const ts = typeof entry.timestamp === 'number'
        ? new Date(entry.timestamp).toISOString()
        : (entry.timestamp ?? '');
      if (ts < cutoff) return null;

      // metadata may be array or object depending on Supabase version
      const meta: Record<string, unknown> = Array.isArray(entry.metadata)
        ? ((entry.metadata as Record<string, unknown>[])[0] ?? {})
        : (entry.metadata ?? {});

      const email     = (meta.actor_username as string) ?? (meta.actor_email as string) ?? '';
      const eventType = (meta.action as string) ?? (meta.msg as string) ?? (entry.event_message ?? '');
      const ip        = (meta.ip_address as string) ?? (meta.remote_addr as string) ?? '';

      return { id: entry.id ?? ts, created_at: ts, email, event_type: eventType, ip_address: ip, role: '' };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  if (parsed.length === 0) {
    return NextResponse.json({ events: [], total: 0 });
  }

  // Enrich with role label
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const emails = [...new Set(parsed.map((e) => e.email).filter(Boolean))];
  if (emails.length > 0) {
    const { data: authUsers } = await svc.auth.admin.listUsers({ perPage: 1000 });
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
        const emailToRole: Record<string, string> = {};
        for (const p of profiles ?? []) {
          const emailForId = Object.entries(emailToId).find(([, id]) => id === p.user_id)?.[0];
          if (emailForId) emailToRole[emailForId] = p.role;
        }
        for (const e of parsed) {
          e.role = emailToRole[e.email] ?? '';
        }
      }
    }
  }

  return NextResponse.json({ events: parsed, total: parsed.length });
}
