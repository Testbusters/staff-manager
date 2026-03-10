import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: { message?: string; stack?: string; url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const message = String(body.message ?? '').slice(0, 1000);
  const stack   = body.stack   ? String(body.stack).slice(0, 5000)  : null;
  const url     = body.url     ? String(body.url).slice(0, 500)     : null;

  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

  // Best-effort user_id (no hard auth requirement — errors can happen on unauthenticated pages)
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // ignore
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  await svc.from('app_errors').insert({ message, stack, url, user_id: userId });

  return NextResponse.json({ recorded: true });
}
