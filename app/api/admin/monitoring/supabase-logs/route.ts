import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Extract project ref from env so each environment queries its own Supabase project.
const PROJECT_REF = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  .match(/\/\/([^.]+)\.supabase\.co/)?.[1] ?? 'nyajqcjqmgxctlqighql';
const MGMT_BASE = 'https://api.supabase.com/v1';

type SupabaseLogService = 'api' | 'auth' | 'database';

type RawLogEntry = {
  id?: string;
  timestamp?: number;
  event_message?: string;
  metadata?: Array<{
    request?: Array<{ path?: string }>;
  }>;
};

// All three service tabs read from the same edge log stream,
// filtered by request path prefix.
const PATH_PREFIX: Record<SupabaseLogService, string | null> = {
  api:      '/rest/v1/',
  auth:     '/auth/v1/',
  database: null, // show all
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

  if (!profile?.is_active || profile.role !== 'amministrazione') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const pat = process.env.SUPABASE_ACCESS_TOKEN;
  if (!pat) return NextResponse.json({ error: 'SUPABASE_ACCESS_TOKEN not configured' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const serviceRaw = searchParams.get('service') ?? 'api';
  const service: SupabaseLogService = ['api', 'auth', 'database'].includes(serviceRaw)
    ? (serviceRaw as SupabaseLogService)
    : 'api';

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

  const prefix = PATH_PREFIX[service];

  const logs = rawLogs
    .filter((entry) => {
      if (!prefix) return true;
      const path = entry.metadata?.[0]?.request?.[0]?.path ?? '';
      return path.startsWith(prefix);
    })
    .slice(0, 100)
    .map((entry) => ({
      id: entry.id,
      // timestamp comes as microseconds; convert to ISO string for the component
      timestamp: entry.timestamp
        ? new Date(Math.floor(entry.timestamp / 1000)).toISOString()
        : undefined,
      event_message: entry.event_message,
    }));

  return NextResponse.json({ logs, service });
}
