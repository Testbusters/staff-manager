// Authenticated route — collaboratore only.
// Clears telegram_chat_id and deletes any pending token.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function DELETE(_req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (profile.role !== 'collaboratore') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: collab } = await svc
    .from('collaborators')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!collab) return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });

  const [updateResult] = await Promise.all([
    svc.from('collaborators').update({ telegram_chat_id: null }).eq('id', collab.id),
    svc.from('telegram_tokens').delete().eq('collaborator_id', collab.id),
  ]);

  if (updateResult.error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
