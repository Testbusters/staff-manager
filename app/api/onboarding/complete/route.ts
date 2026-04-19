import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { CONTRACT_TEMPLATE_DOCUMENT_TYPE, type ContractTemplateType } from '@/lib/types';
import { buildContractVars, generateDocumentFromTemplate } from '@/lib/document-generation';
import { getContractTemplateTipo } from '@/lib/ritenuta';
import { getRenderedEmail } from '@/lib/email-template-service';
import { sendEmail } from '@/lib/email';
import { onboardingSchema, deriveConsensoDatiSaluteTimestamp } from '@/lib/schemas/collaborator';


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
    return NextResponse.json({ error: 'Onboarding già completato' }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(body);
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
    codice_fiscale:      d.codice_fiscale ? d.codice_fiscale.toUpperCase() : null,
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
    importo_lordo_massimale:   d.importo_lordo_massimale ?? null,
    citta:                     d.citta,
    materie_insegnate:         d.materie_insegnate,
    numero_documento_identita:   d.numero_documento_identita,
    tipo_documento_identita:     d.tipo_documento_identita,
    scadenza_documento_identita: d.scadenza_documento_identita,
    ha_allergie_alimentari:      d.ha_allergie_alimentari,
    allergie_note:               d.allergie_note,
    regime_alimentare:           d.regime_alimentare,
    spedizione_usa_residenza:    d.spedizione_usa_residenza,
    spedizione_indirizzo:        d.spedizione_indirizzo,
    spedizione_civico:           d.spedizione_civico,
    spedizione_cap:              d.spedizione_cap,
    spedizione_citta:            d.spedizione_citta,
    spedizione_provincia:        d.spedizione_provincia,
    spedizione_nazione:          d.spedizione_nazione,
  };

  if (existingCollab) {
    const { error: updateErr } = await admin
      .from('collaborators')
      .update(anagraficaFields)
      .eq('id', existingCollab.id);
    if (updateErr) {
      console.error('[onboarding/complete] collaborator update failed:', updateErr);
      return NextResponse.json({ error: 'Errore salvataggio dati' }, { status: 500 });
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
      // Determine community-aware template tipo
      const { data: ccOnboarding } = await admin
        .from('collaborator_communities')
        .select('communities(name)')
        .eq('collaborator_id', collaboratorId)
        .maybeSingle();
      const onboardingCommunity = (ccOnboarding?.communities as unknown as { name: string } | null)?.name ?? '';
      const tipo: ContractTemplateType = getContractTemplateTipo(onboardingCommunity);
      const collabForVars = {
        nome: d.nome,
        cognome: d.cognome,
        codice_fiscale: d.codice_fiscale ? d.codice_fiscale.toUpperCase() : '',
        data_nascita: d.data_nascita ?? '',
        luogo_nascita: d.luogo_nascita ?? '',
        comune: d.comune ?? '',
        indirizzo: d.indirizzo ?? '',
        civico_residenza: d.civico_residenza ?? '',
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
    } catch (err) {
      // Best-effort — contract generation failure never blocks onboarding
      console.error('[onboarding/complete] contract generation failed:', err);
    }
  }

  const onboardingUpdate: Record<string, unknown> = {
    onboarding_completed: true,
    data_consenso_dati_salute: deriveConsensoDatiSaluteTimestamp(d.ha_allergie_alimentari),
  };
  if (profile.skip_contract_on_onboarding) {
    onboardingUpdate.skip_contract_on_onboarding = false;
  }
  await admin
    .from('user_profiles')
    .update(onboardingUpdate)
    .eq('user_id', user.id);

  return NextResponse.json({ success: true, document_id: documentId, download_url: downloadUrl });
}
