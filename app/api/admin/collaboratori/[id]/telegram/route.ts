// Admin route — amministrazione only.
// Resets telegram connection for a collaborator (clears chat_id + pending tokens).
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (profile.role !== 'amministrazione') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Verify collaborator exists
  const { data: collab } = await svc
    .from('collaborators')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (!collab) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await Promise.all([
    svc.from('collaborators').update({ telegram_chat_id: null }).eq('id', id),
    svc.from('telegram_tokens').delete().eq('collaborator_id', id),
  ]);

  return NextResponse.json({ ok: true });
}
