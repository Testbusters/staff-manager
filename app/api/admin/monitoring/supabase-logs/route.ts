import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PROJECT_REF = 'nyajqcjqmgxctlqighql';
const MGMT_BASE   = 'https://api.supabase.com/v1';

type SupabaseLogService = 'api' | 'auth' | 'database';

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

  const url = `${MGMT_BASE}/projects/${PROJECT_REF}/logs?service=${service}&limit=100`;

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

  const data = await res.json() as { result?: unknown[] };
  return NextResponse.json({ logs: data.result ?? [], service });
}
