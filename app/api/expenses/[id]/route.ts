import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
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
    .select('id, collaborator_id, community_id, categoria, data_spesa, importo, descrizione, stato, approved_by, approved_at, rejection_note, liquidated_at, liquidated_by, payment_reference, receipt_document_id, created_at, updated_at')
    .eq('id', id)
    .single();

  if (error || !reimbursement) {
    return NextResponse.json({ error: 'Rimborso non trovato' }, { status: 404 });
  }

  const { data: attachments } = await supabase
    .from('expense_attachments')
    .select('id, reimbursement_id, file_url, file_name, created_at')
    .eq('reimbursement_id', id)
    .order('created_at', { ascending: true });

  // Generate signed URLs for attachments (private bucket, 1h TTL)
  const rawAttachments = attachments ?? [];
  let enrichedAttachments = rawAttachments;
  if (rawAttachments.length > 0) {
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const paths = rawAttachments.map((a) => a.file_url);
    const { data: signed } = await svc.storage
      .from('expenses')
      .createSignedUrls(paths, 3600);
    const urlMap = new Map<string, string>();
    for (const entry of signed ?? []) {
      if (entry.signedUrl && entry.path) urlMap.set(entry.path, entry.signedUrl);
    }
    enrichedAttachments = rawAttachments.map((att) => ({
      ...att,
      file_url: urlMap.get(att.file_url) ?? att.file_url,
    }));
  }

  const { data: history } = await supabase
    .from('expense_history')
    .select('id, reimbursement_id, stato_precedente, stato_nuovo, changed_by, role_label, note, created_at')
    .eq('reimbursement_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    reimbursement,
    attachments: enrichedAttachments,
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
