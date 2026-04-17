import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValidUUID } from '@/lib/validate-id';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });

  const { data: compensation, error } = await supabase
    .from('compensations')
    .select('*, communities(name)')
    .eq('id', id)
    .single();

  if (error || !compensation) {
    return NextResponse.json({ error: 'Compenso non trovato' }, { status: 404 });
  }

  const { data: history } = await supabase
    .from('compensation_history')
    .select('id, compensation_id, stato_precedente, stato_nuovo, changed_by, role_label, note, created_at')
    .eq('compensation_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    compensation,
    history: history ?? [],
  });
}

export async function DELETE(
  _request: Request,
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

  if (!profile || !['responsabile_compensi', 'amministrazione'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });

  // RLS ensures the responsabile can only see compensations of their community collaborators
  const { data: compensation, error: fetchError } = await supabase
    .from('compensations')
    .select('id, stato')
    .eq('id', id)
    .single();

  if (fetchError || !compensation) {
    return NextResponse.json({ error: 'Compenso non trovato' }, { status: 404 });
  }

  if (compensation.stato !== 'IN_ATTESA') {
    return NextResponse.json({ error: 'Solo i compensi in attesa possono essere eliminati' }, { status: 422 });
  }

  const { error: deleteError } = await supabase
    .from('compensations')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: 'Errore durante l\'eliminazione' }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
