import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { buildContractVars, buildReceiptVars, generateDocumentFromTemplate } from '@/lib/document-generation';
import { calcRitenuta, getContractTemplateTipo, getReceiptTemplateTipo } from '@/lib/ritenuta';
import type { ContractTemplateType } from '@/lib/types';
import { isValidUUID } from '@/lib/validate-id';

export async function POST(
  _request: Request,
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
    return NextResponse.json({ error: 'Non puoi ricompilare in questo stato' }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });

  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('id, stato_firma, collaborator_id, tipo, file_original_url')
    .eq('id', id)
    .single();

  if (fetchError || !doc) return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 });
  if (doc.stato_firma !== 'DA_FIRMARE') {
    return NextResponse.json({ error: 'Il documento non è in stato DA_FIRMARE' }, { status: 409 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Fetch full collaborator data + community
  const [collabRes, ccRes] = await Promise.all([
    svc.from('collaborators')
      .select('nome, cognome, codice_fiscale, data_nascita, luogo_nascita, comune, indirizzo, civico_residenza, data_fine_contratto')
      .eq('id', doc.collaborator_id)
      .single(),
    svc.from('collaborator_communities')
      .select('communities(name)')
      .eq('collaborator_id', doc.collaborator_id)
      .maybeSingle(),
  ]);

  if (!collabRes.data) return NextResponse.json({ error: 'Collaboratore non trovato' }, { status: 404 });
  const collab = collabRes.data;
  const communityName = (ccRes.data?.communities as unknown as { name: string } | null)?.name ?? '';

  // Map document tipo to community-aware template type
  const templateType: ContractTemplateType | null =
    doc.tipo === 'CONTRATTO_OCCASIONALE' ? getContractTemplateTipo(communityName)
    : doc.tipo === 'RICEVUTA_PAGAMENTO' ? getReceiptTemplateTipo(communityName)
    : null;

  if (!templateType) {
    return NextResponse.json({ error: 'Tipo documento non supportato per ricompilazione' }, { status: 400 });
  }

  let vars: Record<string, string>;

  if (doc.tipo === 'RICEVUTA_PAGAMENTO') {
    // For receipts, aggregate the collaborator's LIQUIDATO items without a receipt
    const [compsRes, expsRes] = await Promise.all([
      svc.from('compensations').select('importo_lordo').eq('collaborator_id', doc.collaborator_id).eq('stato', 'LIQUIDATO').is('receipt_document_id', null),
      svc.from('expense_reimbursements').select('importo').eq('collaborator_id', doc.collaborator_id).eq('stato', 'LIQUIDATO').is('receipt_document_id', null),
    ]);
    const lordoCompensi = (compsRes.data ?? []).reduce((s, c) => s + (c.importo_lordo ?? 0), 0);
    const lordoRimborsi = (expsRes.data ?? []).reduce((s, e) => s + (e.importo ?? 0), 0);
    const totaleLordo = lordoCompensi + lordoRimborsi;
    const ritenuta = calcRitenuta(communityName, lordoCompensi);
    const netto = totaleLordo - ritenuta;
    vars = buildReceiptVars(collab, { lordo_compensi: lordoCompensi, lordo_rimborsi: lordoRimborsi, totale_lordo: totaleLordo, ritenuta, netto });
  } else {
    vars = buildContractVars(collab);
  }

  const pdfBuffer = await generateDocumentFromTemplate(svc, templateType, vars);
  if (!pdfBuffer) {
    return NextResponse.json({ error: 'Impossibile generare il documento. Verifica che il template sia caricato.' }, { status: 500 });
  }

  // Overwrite file_original_url with new content
  const { error: uploadErr } = await svc.storage
    .from('documents')
    .upload(doc.file_original_url, pdfBuffer, { contentType: 'application/pdf', upsert: true });

  if (uploadErr) {
    console.error('[documents/recompile] upload error:', uploadErr.message);
    return NextResponse.json({ error: 'Errore upload documento' }, { status: 500 });
  }

  // Return a fresh signed URL (1h TTL)
  const { data: signedData } = await svc.storage
    .from('documents')
    .createSignedUrl(doc.file_original_url, 3600);

  return NextResponse.json({ signedUrl: signedData?.signedUrl ?? null });
}
