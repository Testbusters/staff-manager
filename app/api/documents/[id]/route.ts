import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getDocumentUrls } from '@/lib/documents-storage';
import { isValidUUID } from '@/lib/validate-id';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Utente non attivo' }, { status: 403 });

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });

  // RLS ensures only authorized users can read this document
  const { data: doc, error } = await supabase
    .from('documents')
    .select('*, collaborators(nome, cognome, user_id)')
    .eq('id', id)
    .single();

  if (error || !doc) return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 });

  // Generate signed URLs server-side
  const { originalUrl, firmatoUrl } = await getDocumentUrls(
    doc.file_original_url,
    doc.file_firmato_url,
  );

  return NextResponse.json({ document: doc, originalUrl, firmatoUrl });
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
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Utente non attivo' }, { status: 403 });
  if (!['amministrazione'].includes(profile.role)) {
    return NextResponse.json({ error: 'Solo gli amministratori possono eliminare documenti' }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });

  const serviceClient = getServiceClient();

  const { data: doc } = await serviceClient
    .from('documents')
    .select('id, tipo, file_original_url, file_firmato_url')
    .eq('id', id)
    .maybeSingle();

  if (!doc) return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 });
  if (!doc.tipo.startsWith('CONTRATTO_')) {
    return NextResponse.json({ error: 'Solo i documenti di tipo CONTRATTO possono essere eliminati' }, { status: 400 });
  }

  // Hard-delete storage files
  const filesToDelete: string[] = [doc.file_original_url];
  if (doc.file_firmato_url) filesToDelete.push(doc.file_firmato_url);
  await serviceClient.storage.from('documents').remove(filesToDelete);

  // Hard-delete record
  const { error: deleteErr } = await serviceClient
    .from('documents')
    .delete()
    .eq('id', id);

  if (deleteErr) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return NextResponse.json({ deleted: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Utente non attivo' }, { status: 403 });
  if (!['amministrazione'].includes(profile.role)) {
    return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });
  const serviceClient = getServiceClient();

  const { data: existingDoc } = await serviceClient
    .from('documents')
    .select('id, stato_firma, file_original_url, collaborators(user_id)')
    .eq('id', id)
    .maybeSingle();

  if (!existingDoc) return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const markAsSigned = formData.get('mark_as_signed') === 'true';

  if (!file) return NextResponse.json({ error: 'File obbligatorio' }, { status: 400 });

  // Determine collaborator user_id for storage path
  const collabData = Array.isArray(existingDoc.collaborators)
    ? (existingDoc.collaborators[0] as { user_id: string } | undefined) ?? null
    : (existingDoc.collaborators as { user_id: string } | null);
  const pathUserId = collabData?.user_id ?? 'admin';

  // Upload new file
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const newPath = `${pathUserId}/${id}-replace-${Date.now()}/${file.name}`;
  const { error: uploadErr } = await serviceClient.storage
    .from('documents')
    .upload(newPath, fileBuffer, {
      contentType: file.type || 'application/pdf',
      upsert: false,
    });

  if (uploadErr) {
    console.error('[documents] upload error:', uploadErr.message);
    return NextResponse.json({ error: 'Errore upload documento' }, { status: 500 });
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    file_original_url: newPath,
    file_original_name: file.name,
  };

  if (markAsSigned && existingDoc.stato_firma === 'DA_FIRMARE') {
    updatePayload.stato_firma = 'FIRMATO';
    updatePayload.signed_at = new Date().toISOString();
  }

  const { data: updatedDoc, error: updateErr } = await serviceClient
    .from('documents')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  // Best-effort: delete old file from storage
  if (existingDoc.file_original_url) {
    await serviceClient.storage.from('documents').remove([existingDoc.file_original_url]).catch(() => {});
  }

  return NextResponse.json({ document: updatedDoc });
}
