import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';

// All profile fields that admin/responsabile can update on a collaborator's record.
// IBAN and intestatario_pagamento are excluded from the shared schema — they are
// sensitive payment fields, accessible only to the collaborator or admin.
// Admin sends them explicitly; they are stripped for responsabile_compensi callers.
const patchSchema = z.object({
  username:            z.string().min(3).max(50).regex(/^[a-z0-9_]+$/, 'Solo lettere minuscole, numeri e _').optional(),
  nome:                z.string().min(1).max(100).optional(),
  cognome:             z.string().min(1).max(100).optional(),
  codice_fiscale:      z.string().regex(/^[A-Z0-9]{16}$/, 'Codice fiscale non valido (16 caratteri alfanumerici)').nullable().optional(),
  data_nascita:        z.string().nullable().optional(),
  luogo_nascita:       z.string().max(100).nullable().optional(),
  provincia_nascita:   z.string().regex(/^[A-Z]{2}$/, 'Sigla provincia non valida').nullable().optional(),
  comune:              z.string().max(100).nullable().optional(),
  provincia_residenza: z.string().regex(/^[A-Z]{2}$/, 'Sigla provincia non valida').nullable().optional(),
  telefono:            z.string().max(20).nullable().optional(),
  indirizzo:           z.string().max(200).nullable().optional(),
  civico_residenza:    z.string().max(20).nullable().optional(),
  tshirt_size:         z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']).nullable().optional(),
  sono_un_figlio_a_carico: z.boolean().optional(),
  importo_lordo_massimale: z.number().min(1).max(5000).nullable().optional(),
  // Admin-only payment field — stripped for responsabile_compensi below
  intestatario_pagamento: z.string().max(100).nullable().optional(),
  // Admin-only profile enrichment fields
  citta:             z.string().min(1).optional(),
  materie_insegnate: z.array(z.string().min(1)).min(1).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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

  if (!caller?.is_active || !['amministrazione', 'responsabile_compensi'].includes(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Community access check for responsabile_compensi
  if (caller.role === 'responsabile_compensi') {
    const { data: uca } = await admin
      .from('user_community_access')
      .select('community_id')
      .eq('user_id', user.id);
    const myCommIds = new Set((uca ?? []).map((u: { community_id: string }) => u.community_id));

    const { data: cc } = await admin
      .from('collaborator_communities')
      .select('community_id')
      .eq('collaborator_id', id);
    const collabCommIds = (cc ?? []).map((c: { community_id: string }) => c.community_id);

    if (!collabCommIds.some((cid: string) => myCommIds.has(cid))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }

  const { username, intestatario_pagamento, citta, materie_insegnate, ...profileFields } = parsed.data;
  // Admin-only fields — stripped for responsabile_compensi
  const adminOnly: Record<string, unknown> = {};
  if (caller.role === 'amministrazione') {
    if (intestatario_pagamento !== undefined) adminOnly.intestatario_pagamento = intestatario_pagamento;
    if (citta !== undefined) adminOnly.citta = citta;
    if (materie_insegnate !== undefined) adminOnly.materie_insegnate = materie_insegnate;
  }

  // Username uniqueness check (if provided)
  if (username !== undefined) {
    const { data: existing } = await admin
      .from('collaborators')
      .select('id')
      .eq('username', username)
      .neq('id', id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Username già in uso' }, { status: 409 });
    }
  }

  const update: Record<string, unknown> = { ...profileFields, ...adminOnly };
  if (username !== undefined) update.username = username;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 });
  }

  const { error } = await admin
    .from('collaborators')
    .update(update)
    .eq('id', id);

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
