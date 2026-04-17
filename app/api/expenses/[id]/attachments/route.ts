import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isValidUUID } from '@/lib/validate-id';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });

  // RLS ensures the user can only see their own expenses
  const { data: expense, error: fetchError } = await supabase
    .from('expense_reimbursements')
    .select('id, stato, collaborator_id')
    .eq('id', id)
    .single();

  if (fetchError || !expense) {
    return NextResponse.json({ error: 'Rimborso non trovato' }, { status: 404 });
  }

  if (expense.stato !== 'IN_ATTESA') {
    return NextResponse.json({ error: 'Allegati consentiti solo in IN_ATTESA' }, { status: 403 });
  }

  // Parse FormData
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'FormData non valido' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'File mancante' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File troppo grande (max 10 MB)' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Tipo file non consentito (PDF, JPG, PNG)' }, { status: 400 });
  }

  // Upload via service role
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const storagePath = `${expense.collaborator_id}/${id}/${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await svc.storage
    .from('expenses')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: 'Errore upload file' }, { status: 500 });
  }

  // Insert attachment record (file_url stores the storage path, not a URL)
  const { data: attachment, error: insertError } = await svc
    .from('expense_attachments')
    .insert({
      reimbursement_id: id,
      file_url: storagePath,
      file_name: file.name,
    })
    .select()
    .single();

  if (insertError) {
    // Clean up uploaded file on DB insert failure
    await svc.storage.from('expenses').remove([storagePath]);
    return NextResponse.json({ error: 'Errore salvataggio allegato' }, { status: 500 });
  }

  return NextResponse.json({ attachment }, { status: 201 });
}
