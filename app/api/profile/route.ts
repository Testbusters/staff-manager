import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { profilePatchSchema, deriveConsensoDatiSaluteTimestamp } from '@/lib/schemas/collaborator';

// data_ingresso is admin-only; email goes through auth.admin
const SELF_EDIT_FIELDS = [
  'nome', 'cognome', 'codice_fiscale', 'data_nascita', 'luogo_nascita', 'provincia_nascita',
  'comune', 'provincia_residenza', 'telefono', 'indirizzo', 'civico_residenza',
  'iban', 'intestatario_pagamento', 'tshirt_size', 'sono_un_figlio_a_carico', 'importo_lordo_massimale',
  'citta', 'materie_insegnate',
  'numero_documento_identita', 'tipo_documento_identita', 'scadenza_documento_identita',
  'ha_allergie_alimentari', 'allergie_note', 'regime_alimentare',
  'spedizione_usa_residenza', 'spedizione_indirizzo', 'spedizione_civico',
  'spedizione_cap', 'spedizione_citta', 'spedizione_provincia', 'spedizione_nazione',
] as const;

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = profilePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }

  // GDPR Art.9 cross-field guard: se ha_allergie_alimentari=true, consenso + note obbligatori
  if (parsed.data.ha_allergie_alimentari === true) {
    if (parsed.data.consenso_dati_salute !== true) {
      return NextResponse.json({ error: 'Consenso Art.9 GDPR richiesto per salvare le allergie' }, { status: 400 });
    }
    const note = parsed.data.allergie_note;
    if (!note || note.trim().length === 0) {
      return NextResponse.json({ error: 'Descrivi le allergie o intolleranze' }, { status: 400 });
    }
  }

  // Strip to only allowed self-edit fields
  const update: Record<string, unknown> = {};
  for (const field of SELF_EDIT_FIELDS) {
    if (field in parsed.data) update[field] = parsed.data[field as keyof typeof parsed.data];
  }

  const newEmail = parsed.data.email?.trim().toLowerCase();
  const emailChanged = !!newEmail && newEmail !== user.email?.toLowerCase();

  const allergieTouched = 'ha_allergie_alimentari' in parsed.data;

  if (Object.keys(update).length === 0 && !emailChanged && !allergieTouched) {
    return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 });
  }

  const collabUpdate = Object.keys(update).length > 0
    ? supabase.from('collaborators').update(update).eq('user_id', user.id)
    : null;
  const profileUpdate = allergieTouched
    ? supabase.from('user_profiles').update({
        data_consenso_dati_salute: deriveConsensoDatiSaluteTimestamp(parsed.data.ha_allergie_alimentari),
      }).eq('user_id', user.id)
    : null;

  const results = await Promise.all([collabUpdate, profileUpdate].filter(Boolean));
  for (const r of results) {
    if (r && 'error' in r && r.error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }

  if (emailChanged) {
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { error: emailError } = await svc.auth.admin.updateUserById(user.id, {
      email: newEmail,
      email_confirm: true,
    });
    if (emailError) {
      console.error('[profile] email update error:', emailError.message);
      return NextResponse.json({ error: 'Errore aggiornamento email' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, emailChanged });
}
