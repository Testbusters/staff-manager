import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { buildReceiptVars, generateDocumentFromTemplate } from '@/lib/document-generation';
import { getRenderedEmail } from '@/lib/email-template-service';
import { sendEmail } from '@/lib/email';
import { getNotificationSettings } from '@/lib/notification-helpers';

const schema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('bulk') }),
  z.object({
    mode: z.literal('single'),
    compensation_id: z.string().uuid().optional(),
    expense_id: z.string().uuid().optional(),
  }),
]);

async function generateReceiptForCollab(
  svc: SupabaseClient<any, any, any>,
  collabId: string,
  totals: { lordo_compensi: number; lordo_rimborsi: number; totale_lordo: number; ritenuta: number; netto: number },
  settings: Map<string, { inapp_enabled: boolean; email_enabled: boolean }>,
): Promise<{ document_id: string | null; error: string | null }> {
  const { data: collab } = await svc
    .from('collaborators')
    .select('nome, cognome, codice_fiscale, data_nascita, comune, indirizzo, user_id')
    .eq('id', collabId)
    .single();

  if (!collab) return { document_id: null, error: 'Collaboratore non trovato' };

  const vars = buildReceiptVars(collab, totals);
  const pdfBuffer = await generateDocumentFromTemplate(svc, 'RICEVUTA_PAGAMENTO', vars);
  if (!pdfBuffer) return { document_id: null, error: 'Template ricevuta non disponibile' };

  const docId = crypto.randomUUID();
  const anno = new Date().getFullYear();
  const fileName = `ricevuta_pagamento_${anno}_${collab.nome}_${collab.cognome}.pdf`;
  const storagePath = `${collab.user_id}/${docId}/${fileName}`;

  const { error: uploadErr } = await svc.storage
    .from('documents')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: false });

  if (uploadErr) return { document_id: null, error: uploadErr.message };

  const titolo = `Ricevuta di pagamento ${anno}`;

  const { error: insertErr } = await svc.from('documents').insert({
    id: docId,
    collaborator_id: collabId,
    community_id: null,
    tipo: 'RICEVUTA_PAGAMENTO',
    titolo,
    anno,
    file_original_url: storagePath,
    file_original_name: fileName,
    stato_firma: 'DA_FIRMARE',
  });

  if (insertErr) return { document_id: null, error: insertErr.message };

  // In-app notification + email (settings-driven)
  const setting = settings.get('documento_da_firmare:collaboratore') ?? settings.get('new_document:collaboratore');
  const { data: userProfile } = await svc.from('user_profiles').select('user_id').eq('user_id', collab.user_id).single();

  if (userProfile && (!setting || setting.inapp_enabled)) {
    await svc.from('notifications').insert({
      user_id: collab.user_id,
      tipo: 'documento_da_firmare',
      titolo: 'Nuovo documento da firmare',
      messaggio: titolo,
      entity_type: 'document',
      entity_id: docId,
    });
  }

  if (!setting || setting.email_enabled) {
    const { data: authUser } = await svc.auth.admin.getUserById(collab.user_id);
    const email = authUser?.user?.email;
    if (email && collab.nome) {
      getRenderedEmail('E5', {
        nome: collab.nome,
        titoloDocumento: titolo,
        data: new Date().toLocaleDateString('it-IT'),
        link: `/documenti/${docId}`,
      }).then(({ subject, html }) => {
        sendEmail(email, subject, html).catch(() => {});
      }).catch(() => {});
    }
  }

  return { document_id: docId, error: null };
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active || profile.role !== 'amministrazione') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const settings = await getNotificationSettings(svc);

  if (parsed.data.mode === 'bulk') {
    // Fetch all LIQUIDATO items without receipt, group by collaborator
    const [compsRes, expsRes] = await Promise.all([
      svc.from('compensations').select('id, collaborator_id, importo_lordo').eq('stato', 'LIQUIDATO').is('receipt_document_id', null),
      svc.from('expense_reimbursements').select('id, collaborator_id, importo').eq('stato', 'LIQUIDATO').is('receipt_document_id', null),
    ]);

    const comps = compsRes.data ?? [];
    const exps = expsRes.data ?? [];

    const byCollab = new Map<string, { compIds: string[]; expIds: string[]; lordoCompensi: number; lordoRimborsi: number }>();
    for (const c of comps) {
      if (!byCollab.has(c.collaborator_id)) byCollab.set(c.collaborator_id, { compIds: [], expIds: [], lordoCompensi: 0, lordoRimborsi: 0 });
      const entry = byCollab.get(c.collaborator_id)!;
      entry.compIds.push(c.id);
      entry.lordoCompensi += c.importo_lordo ?? 0;
    }
    for (const e of exps) {
      if (!byCollab.has(e.collaborator_id)) byCollab.set(e.collaborator_id, { compIds: [], expIds: [], lordoCompensi: 0, lordoRimborsi: 0 });
      const entry = byCollab.get(e.collaborator_id)!;
      entry.expIds.push(e.id);
      entry.lordoRimborsi += e.importo ?? 0;
    }

    let generated = 0;
    const errors: string[] = [];

    for (const [collabId, data] of byCollab.entries()) {
      const ritenuta = data.lordoCompensi * 0.2;
      const totaleLordo = data.lordoCompensi + data.lordoRimborsi;
      const netto = totaleLordo - ritenuta;

      const { document_id, error } = await generateReceiptForCollab(svc, collabId, {
        lordo_compensi: data.lordoCompensi,
        lordo_rimborsi: data.lordoRimborsi,
        totale_lordo: totaleLordo,
        ritenuta,
        netto,
      }, settings);

      if (error || !document_id) {
        errors.push(`${collabId}: ${error ?? 'unknown'}`);
        continue;
      }

      // Link receipt to all covered items
      if (data.compIds.length > 0) {
        await svc.from('compensations').update({ receipt_document_id: document_id }).in('id', data.compIds);
      }
      if (data.expIds.length > 0) {
        await svc.from('expense_reimbursements').update({ receipt_document_id: document_id }).in('id', data.expIds);
      }

      generated++;
    }

    return NextResponse.json({ generated, errors });
  }

  // Single mode
  const { compensation_id, expense_id } = parsed.data;
  if (!compensation_id && !expense_id) {
    return NextResponse.json({ error: 'compensation_id o expense_id richiesto' }, { status: 400 });
  }

  let collabId: string;
  let lordoCompensi = 0;
  let lordoRimborsi = 0;
  let itemId: string;
  let isComp: boolean;

  if (compensation_id) {
    const { data: comp } = await svc.from('compensations').select('collaborator_id, importo_lordo, stato').eq('id', compensation_id).single();
    if (!comp) return NextResponse.json({ error: 'Compenso non trovato' }, { status: 404 });
    collabId = comp.collaborator_id;
    lordoCompensi = comp.importo_lordo ?? 0;
    itemId = compensation_id;
    isComp = true;
  } else {
    const { data: exp } = await svc.from('expense_reimbursements').select('collaborator_id, importo, stato').eq('id', expense_id!).single();
    if (!exp) return NextResponse.json({ error: 'Rimborso non trovato' }, { status: 404 });
    collabId = exp.collaborator_id;
    lordoRimborsi = exp.importo ?? 0;
    itemId = expense_id!;
    isComp = false;
  }

  const ritenuta = lordoCompensi * 0.2;
  const totaleLordo = lordoCompensi + lordoRimborsi;
  const netto = totaleLordo - ritenuta;

  const { document_id, error } = await generateReceiptForCollab(svc, collabId, {
    lordo_compensi: lordoCompensi,
    lordo_rimborsi: lordoRimborsi,
    totale_lordo: totaleLordo,
    ritenuta,
    netto,
  }, settings);

  if (error || !document_id) {
    return NextResponse.json({ error: error ?? 'Errore generazione ricevuta' }, { status: 500 });
  }

  // Link receipt to this single item
  if (isComp) {
    await svc.from('compensations').update({ receipt_document_id: document_id }).eq('id', itemId);
  } else {
    await svc.from('expense_reimbursements').update({ receipt_document_id: document_id }).eq('id', itemId);
  }

  return NextResponse.json({ document_id });
}
