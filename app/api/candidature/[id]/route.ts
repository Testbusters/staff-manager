import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'collaboratore') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Get collaborator_id for this user
  const { data: collab } = await svc
    .from('collaborators')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!collab) {
    return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
  }

  // Fetch the candidatura and verify ownership + state
  const { data: candidatura } = await svc
    .from('candidature')
    .select('id, collaborator_id, stato')
    .eq('id', id)
    .maybeSingle();

  if (!candidatura) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (candidatura.collaborator_id !== collab.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (candidatura.stato !== 'in_attesa') {
    return NextResponse.json({ error: 'Cannot withdraw — candidatura is not in_attesa' }, { status: 409 });
  }

  const { data, error } = await svc
    .from('candidature')
    .update({ stato: 'ritirata' })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ candidatura: data });
}
