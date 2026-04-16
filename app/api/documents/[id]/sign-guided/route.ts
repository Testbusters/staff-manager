import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getNotificationSettings } from '@/lib/notification-helpers';
import { fillPdfMarkers } from '@/lib/pdf-utils';
import { buildSignedStoragePath } from '@/lib/documents-storage';
import { isValidUUID } from '@/lib/validate-id';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active, member_status')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Utente non attivo' }, { status: 403 });
  if (!['collaboratore', 'responsabile_compensi'].includes(profile.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }
  if (profile.member_status === 'uscente_senza_compenso') {
    return NextResponse.json({ error: 'Non puoi firmare in questo stato' }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });

  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('id, stato_firma, collaborator_id, file_original_url, file_original_name, titolo')
    .eq('id', id)
    .single();

  if (fetchError || !doc) return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 });
  if (doc.stato_firma !== 'DA_FIRMARE') {
    return NextResponse.json({ error: 'Il documento non è in stato DA_FIRMARE' }, { status: 409 });
  }

  const formData = await request.formData();
  const signatureFile = formData.get('signatureImage') as File | null;
  if (!signatureFile) return NextResponse.json({ error: 'Immagine firma mancante' }, { status: 400 });

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Download pre-compiled PDF from storage
  const { data: pdfBlob, error: downloadErr } = await svc.storage
    .from('documents')
    .download(doc.file_original_url);

  if (downloadErr || !pdfBlob) {
    return NextResponse.json({ error: 'Impossibile scaricare il documento' }, { status: 500 });
  }

  const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
  const sigBuffer = Buffer.from(await signatureFile.arrayBuffer());

  // Fill signature markers in the pre-compiled PDF
  let signedPdf: Buffer;
  try {
    signedPdf = await fillPdfMarkers(pdfBuffer, {}, sigBuffer);
  } catch (err) {
    console.error('[sign-guided] fillPdfMarkers error:', err);
    return NextResponse.json({ error: 'Errore durante la firma del documento' }, { status: 500 });
  }

  // Upload signed PDF
  const baseFileName = doc.file_original_name.replace(/\.pdf$/i, '') || 'documento';
  const signedFileName = `${baseFileName}_firmato.pdf`;
  const storagePath = buildSignedStoragePath(user.id, id, baseFileName + '.pdf');

  const { error: uploadErr } = await svc.storage
    .from('documents')
    .upload(storagePath, signedPdf, { contentType: 'application/pdf', upsert: true });

  if (uploadErr) {
    console.error('[documents/sign-guided] upload error:', uploadErr.message);
    return NextResponse.json({ error: 'Errore upload documento' }, { status: 500 });
  }

  const now = new Date().toISOString();

  const { error: updateErr } = await svc
    .from('documents')
    .update({
      stato_firma: 'FIRMATO',
      file_firmato_url: storagePath,
      file_firmato_name: signedFileName,
      signed_at: now,
    })
    .eq('id', id);

  if (updateErr) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  // Notify admins (settings-driven)
  const settings = await getNotificationSettings(svc);
  const setting = settings.get('documento_firmato:amministrazione');

  if (!setting || setting.inapp_enabled) {
    const { data: admins } = await svc
      .from('user_profiles')
      .select('user_id')
      .eq('role', 'amministrazione')
      .eq('is_active', true);

    if (admins && admins.length > 0) {
      const { data: collab } = await svc
        .from('collaborators')
        .select('nome, cognome')
        .eq('id', doc.collaborator_id)
        .single();

      const nome = collab ? `${collab.nome} ${collab.cognome}` : 'Un collaboratore';
      const notifications = admins.map((a: { user_id: string }) => ({
        user_id: a.user_id,
        tipo: 'documento_firmato',
        titolo: 'Documento firmato ricevuto',
        messaggio: `${nome} ha firmato il documento.`,
        entity_type: 'document',
        entity_id: id,
      }));
      await svc.from('notifications').insert(notifications);
    }
  }

  return NextResponse.json({ stato_firma: 'FIRMATO', signed_at: now });
}
