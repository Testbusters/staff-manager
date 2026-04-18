import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { isValidUUID } from '@/lib/validate-id';
import { adminProfilePatchApiSchema as patchSchema } from '@/lib/schemas/api';
import { deriveConsensoDatiSaluteTimestamp } from '@/lib/schemas/collaborator';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });

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

  if (parsed.data.ha_allergie_alimentari === true) {
    const note = parsed.data.allergie_note;
    if (!note || note.trim().length === 0) {
      return NextResponse.json(
        { error: 'Descrizione allergie obbligatoria quando si attiva il flag' },
        { status: 400 },
      );
    }
  }

  const { username, intestatario_pagamento, citta, materie_insegnate, ...profileFields } = parsed.data;
  // Stripped for responsabile_compensi
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

  const allergieTouched = 'ha_allergie_alimentari' in parsed.data;

  if (Object.keys(update).length === 0 && !allergieTouched) {
    return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 });
  }

  if (Object.keys(update).length > 0) {
    const { error } = await admin
      .from('collaborators')
      .update(update)
      .eq('id', id);

    if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }

  if (allergieTouched) {
    const { data: collab } = await admin
      .from('collaborators')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();
    if (collab?.user_id) {
      await admin
        .from('user_profiles')
        .update({
          data_consenso_dati_salute: deriveConsensoDatiSaluteTimestamp(parsed.data.ha_allergie_alimentari),
        })
        .eq('user_id', collab.user_id);
    }
  }

  return NextResponse.json({ ok: true });
}
