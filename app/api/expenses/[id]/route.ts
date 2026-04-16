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

  const { data: reimbursement, error } = await supabase
    .from('expense_reimbursements')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !reimbursement) {
    return NextResponse.json({ error: 'Rimborso non trovato' }, { status: 404 });
  }

  const { data: attachments } = await supabase
    .from('expense_attachments')
    .select('*')
    .eq('reimbursement_id', id)
    .order('created_at', { ascending: true });

  const { data: history } = await supabase
    .from('expense_history')
    .select('*')
    .eq('reimbursement_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    reimbursement,
    attachments: attachments ?? [],
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

  // RLS ensures the responsabile can only see reimbursements of their community collaborators
  const { data: reimbursement, error: fetchError } = await supabase
    .from('expense_reimbursements')
    .select('id, stato')
    .eq('id', id)
    .single();

  if (fetchError || !reimbursement) {
    return NextResponse.json({ error: 'Rimborso non trovato' }, { status: 404 });
  }

  if (reimbursement.stato !== 'IN_ATTESA') {
    return NextResponse.json({ error: 'Solo i rimborsi in attesa possono essere eliminati' }, { status: 422 });
  }

  const { error: deleteError } = await supabase
    .from('expense_reimbursements')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: "Errore durante l'eliminazione" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
