import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { sendEmail } from '@/lib/email';
import { getRenderedEmail } from '@/lib/email-template-service';
import { generateUsername, generateUniqueUsername } from '@/lib/username';
import { generatePassword } from '@/lib/password';

const schema = z.object({
  email: z.string().email(),
  community_id: z.string().uuid(),
  tipo_contratto: z.enum(['OCCASIONALE', 'OCCASIONALE_P4M']),
  citta: z.string().min(1),
  salta_firma: z.boolean().optional(),
  // Anagrafica (opzionale — pre-fill per l'onboarding)
  username:            z.string().min(3).max(50).regex(/^[a-z0-9_]+$/, 'Solo lettere minuscole, numeri e _').optional(),
  nome:                z.string().min(1).max(100).optional(),
  cognome:             z.string().min(1).max(100).optional(),
  codice_fiscale:      z.string().max(16).nullable().optional(),
  data_nascita:        z.string().nullable().optional(),
  luogo_nascita:       z.string().max(100).nullable().optional(),
  provincia_nascita:   z.string().max(10).nullable().optional(),
  comune:              z.string().max(100).nullable().optional(),
  provincia_residenza: z.string().max(10).nullable().optional(),
  indirizzo:           z.string().max(200).nullable().optional(),
  civico_residenza:    z.string().max(20).nullable().optional(),
  telefono:            z.string().max(20).nullable().optional(),
  intestatario_pagamento: z.string().max(100).nullable().optional(),
  data_ingresso:            z.string().min(1, 'Obbligatoria').optional(),
  data_fine_contratto:      z.string().nullable().optional(),
  sono_un_figlio_a_carico:  z.boolean().optional(),
  importo_lordo_massimale:  z.number().min(0).max(5000).nullable().optional(),
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

  const { data: caller } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!caller?.is_active || !['amministrazione'].includes(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }

  const {
    email, community_id, tipo_contratto, citta, salta_firma,
    username: usernameInput,
    nome, cognome, codice_fiscale, data_nascita,
    luogo_nascita, provincia_nascita,
    comune, provincia_residenza,
    indirizzo, civico_residenza, telefono, intestatario_pagamento, data_ingresso,
    data_fine_contratto, sono_un_figlio_a_carico, importo_lordo_massimale,
  } = parsed.data;

  const role = 'collaboratore';

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const password = generatePassword();

  // 1. Create auth user
  const { data: newAuthUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !newAuthUser.user) {
    const msg = createError?.message ?? 'Errore creazione utente';
    const alreadyExists = msg.toLowerCase().includes('already');
    return NextResponse.json(
      { error: alreadyExists ? 'Email già registrata' : msg },
      { status: 400 },
    );
  }

  const userId = newAuthUser.user.id;

  // 2. Create user_profiles row (onboarding_completed=false for new users)
  const { error: profileError } = await admin.from('user_profiles').insert({
    user_id: userId,
    role,
    is_active: true,
    must_change_password: true,
    onboarding_completed: false,
    skip_contract_on_onboarding: salta_firma ?? false,
    theme_preference: 'dark',
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: 'Errore creazione profilo' }, { status: 500 });
  }

  // 3. Create collaborators record with citta and tipo_contratto
  const nomeTrimmed    = nome?.trim() || null;
  const cognomeTrimmed = cognome?.trim() || null;

  // Resolve username: explicit (validate uniqueness) or auto-generate
  let resolvedUsername: string | null = null;
  if (usernameInput) {
    const { data: existing } = await admin
      .from('collaborators')
      .select('id')
      .eq('username', usernameInput)
      .maybeSingle();
    if (existing) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: 'Username già in uso' }, { status: 409 });
    }
    resolvedUsername = usernameInput;
  } else if (nomeTrimmed && cognomeTrimmed) {
    const base = generateUsername(nomeTrimmed, cognomeTrimmed);
    resolvedUsername = base ? await generateUniqueUsername(base, admin) : null;
  }

  const { data: newCollab, error: collabError } = await admin.from('collaborators').insert({
    user_id:             userId,
    email,
    tipo_contratto,
    citta,
    username:            resolvedUsername,
    nome:                nomeTrimmed,
    cognome:             cognomeTrimmed,
    codice_fiscale:      codice_fiscale ?? null,
    data_nascita:        data_nascita ?? null,
    luogo_nascita:       luogo_nascita ?? null,
    provincia_nascita:   provincia_nascita ?? null,
    comune:              comune ?? null,
    provincia_residenza: provincia_residenza ?? null,
    indirizzo:           indirizzo ?? null,
    civico_residenza:    civico_residenza ?? null,
    telefono:            telefono ?? null,
    intestatario_pagamento:  intestatario_pagamento ?? null,
    data_ingresso:           data_ingresso ?? null,
    data_fine_contratto:     data_fine_contratto ?? null,
    sono_un_figlio_a_carico: sono_un_figlio_a_carico ?? false,
    importo_lordo_massimale: importo_lordo_massimale ?? null,
  }).select('id').single();

  if (collabError || !newCollab) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: 'Errore creazione collaboratore' }, { status: 500 });
  }

  // 4. Assign community
  await admin.from('collaborator_communities').insert({
    collaborator_id: newCollab.id,
    community_id,
  });

  // 5. Send invitation email (fire-and-forget — never blocks the response)
  getRenderedEmail('E8', { email, password, ruolo: role }).then(({ subject, html }) => {
    sendEmail(email, subject, html).catch(() => {});
  }).catch(() => {});

  return NextResponse.json({ email, password });
}
