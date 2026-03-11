import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { CONTRACT_TEMPLATE_DOCUMENT_TYPE, type ContractTemplateType } from '@/lib/types';
import { buildContractVars, generateDocumentFromTemplate } from '@/lib/document-generation';
import { getRenderedEmail } from '@/lib/email-template-service';
import { sendEmail } from '@/lib/email';

const schema = z.object({
  nome:                z.string().min(1).max(100),
  cognome:             z.string().min(1).max(100),
  codice_fiscale:      z.string().regex(/^[A-Z0-9]{16}$/, 'Codice fiscale non valido (16 caratteri alfanumerici)'),
  data_nascita:        z.string().min(1),          // ISO date
  luogo_nascita:       z.string().min(1).max(100),
  provincia_nascita:   z.string().min(1).max(10),
  comune:              z.string().min(1).max(100),
  provincia_residenza: z.string().min(1).max(10),
  indirizzo:           z.string().min(1).max(200),
  civico_residenza:    z.string().min(1).max(20),
  telefono:            z.string().min(1).max(20),
  iban:                z.string().regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/, 'IBAN non valido'),
  intestatario_pagamento: z.string().min(1).max(100),
  tshirt_size:         z.string().min(1),
  sono_un_figlio_a_carico:   z.boolean(),
});


export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarding_completed, skip_contract_on_onboarding')
    .eq('user_id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 });
  if (profile.onboarding_completed) {
    return NextResponse.json({ error: 'Onboarding già completato' }, { status: 400 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const d = parsed.data;

  // Fetch existing collaborators record (created at invite time with tipo_contratto)
  const { data: existingCollab } = await admin
    .from('collaborators')
    .select('id, tipo_contratto')
    .eq('user_id', user.id)
    .maybeSingle();

  let collaboratorId: string;
  let tipoContratto: string | null;

  const anagraficaFields = {
    nome:                d.nome,
    cognome:             d.cognome,
    email:               user.email ?? '',
    codice_fiscale:      d.codice_fiscale.toUpperCase(),
    data_nascita:        d.data_nascita,
    luogo_nascita:       d.luogo_nascita,
    provincia_nascita:   d.provincia_nascita,
    comune:              d.comune,
    provincia_residenza: d.provincia_residenza,
    indirizzo:           d.indirizzo,
    civico_residenza:    d.civico_residenza,
    telefono:            d.telefono,
    iban:                d.iban,
    intestatario_pagamento: d.intestatario_pagamento,
    tshirt_size:               d.tshirt_size,
    sono_un_figlio_a_carico:   d.sono_un_figlio_a_carico,
  };

  if (existingCollab) {
    const { error: updateErr } = await admin
      .from('collaborators')
      .update(anagraficaFields)
      .eq('id', existingCollab.id);
    if (updateErr) {
      console.error('[onboarding/complete] collaborator update failed:', updateErr);
      return NextResponse.json({ error: 'Errore salvataggio dati', details: updateErr.message }, { status: 500 });
    }
    collaboratorId = existingCollab.id;
    tipoContratto = existingCollab.tipo_contratto;
  } else {
    // Fallback: create record if missing (shouldn't happen with new invite flow)
    const { data: newCollab, error: insertErr } = await admin
      .from('collaborators')
      .insert({ user_id: user.id, ...anagraficaFields })
      .select('id, tipo_contratto')
      .single();
    if (insertErr || !newCollab) {
      return NextResponse.json({ error: 'Errore creazione profilo' }, { status: 500 });
    }
    collaboratorId = newCollab.id;
    tipoContratto = newCollab.tipo_contratto;
  }

  // Generate contract PDF (best-effort — failure does not block onboarding completion)
  let documentId: string | null = null;
  let downloadUrl: string | null = null;

  if (tipoContratto && !profile.skip_contract_on_onboarding) {
    try {
      const tipo = tipoContratto as ContractTemplateType;
      const collabForVars = {
        nome: d.nome,
        cognome: d.cognome,
        codice_fiscale: d.codice_fiscale.toUpperCase(),
        data_nascita: d.data_nascita,
        luogo_nascita: d.luogo_nascita,
        comune: d.comune,
        indirizzo: d.indirizzo,
        civico_residenza: d.civico_residenza,
        data_fine_contratto: existingCollab ? (existingCollab as { data_fine_contratto?: string | null }).data_fine_contratto ?? null : null,
      };
      const vars = buildContractVars(collabForVars);
      const pdfBuffer = await generateDocumentFromTemplate(admin, tipo, vars);

      if (pdfBuffer) {
        const docId = crypto.randomUUID();
        const anno = new Date().getFullYear();
        const fileName = `contratto_occasionale_${anno}.pdf`;
        const storagePath = `${user.id}/${docId}/${fileName}`;

        const { error: uploadErr } = await admin.storage
          .from('documents')
          .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: false });

        if (!uploadErr) {
          const docTipo = CONTRACT_TEMPLATE_DOCUMENT_TYPE[tipo];
          const titolo = `Contratto ${anno}`;
          await admin.from('documents').insert({
            id:                 docId,
            collaborator_id:    collaboratorId,
            community_id:       null,
            tipo:               docTipo,
            titolo,
            anno,
            file_original_url:  storagePath,
            file_original_name: fileName,
            stato_firma:        'DA_FIRMARE',
          });
          documentId = docId;

          const { data: signedData } = await admin.storage
            .from('documents')
            .createSignedUrl(storagePath, 3600);
          downloadUrl = signedData?.signedUrl ?? null;

          // Send E5 notification email (fire-and-forget)
          if (user.email && d.nome) {
            getRenderedEmail('E5', {
              nome: d.nome,
              titoloDocumento: titolo,
              data: new Date().toLocaleDateString('it-IT'),
              link: `/documenti/${docId}`,
            }).then(({ subject, html }) => {
              sendEmail(user.email!, subject, html).catch(() => {});
            }).catch(() => {});
          }
        }
      }
    } catch {
      // Best-effort — contract generation failure never blocks onboarding
    }
  }

  // Mark onboarding complete (and reset skip flag if it was set)
  const onboardingUpdate: Record<string, unknown> = { onboarding_completed: true };
  if (profile.skip_contract_on_onboarding) {
    onboardingUpdate.skip_contract_on_onboarding = false;
  }
  await admin
    .from('user_profiles')
    .update(onboardingUpdate)
    .eq('user_id', user.id);

  return NextResponse.json({ success: true, document_id: documentId, download_url: downloadUrl });
}
