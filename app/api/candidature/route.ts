import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { CandidaturaStato } from '@/lib/types';

const STATO_RITIRATA: CandidaturaStato = 'ritirata';

const CreateCollabSchema = z.object({
  tipo: z.enum(['docente_lezione', 'qa_lezione']),
  lezione_id: z.string().uuid(),
});

const CreateCittaSchema = z.object({
  tipo: z.literal('citta_corso'),
  corso_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const role = profile.role;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const body = await req.json();

  // responsabile_cittadino: submit citta_corso candidatura
  if (role === 'responsabile_cittadino') {
    const parsed = CreateCittaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
    }
    const { corso_id } = parsed.data;

    const { data: existing } = await svc
      .from('candidature')
      .select('id')
      .eq('corso_id', corso_id)
      .eq('city_user_id', user.id)
      .eq('tipo', 'citta_corso')
      .neq('stato', STATO_RITIRATA)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Candidatura already exists' }, { status: 409 });
    }

    const { data, error } = await svc
      .from('candidature')
      .insert({ tipo: 'citta_corso', corso_id, city_user_id: user.id })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
    }

    return NextResponse.json({ candidatura: data }, { status: 201 });
  }

  // collaboratore: submit docente/qa candidatura
  if (role !== 'collaboratore') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = CreateCollabSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }
  const { tipo, lezione_id } = parsed.data;

  const { data: collab } = await svc
    .from('collaborators')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!collab) {
    return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
  }

  const { data: blacklisted } = await svc
    .from('blacklist')
    .select('id')
    .eq('collaborator_id', collab.id)
    .maybeSingle();

  if (blacklisted) {
    return NextResponse.json({ error: 'Blacklisted' }, { status: 403 });
  }

  const { data: existing } = await svc
    .from('candidature')
    .select('id')
    .eq('lezione_id', lezione_id)
    .eq('collaborator_id', collab.id)
    .eq('tipo', tipo)
    .neq('stato', STATO_RITIRATA)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Candidatura already exists' }, { status: 409 });
  }

  // Bug #6: prevent qa_lezione candidatura on in_aula courses
  if (tipo === 'qa_lezione') {
    const { data: lezioneRow } = await svc.from('lezioni').select('corso_id').eq('id', lezione_id).single();
    if (lezioneRow) {
      const { data: corsoRow } = await svc.from('corsi').select('modalita').eq('id', lezioneRow.corso_id).single();
      if (corsoRow?.modalita === 'in_aula') {
        return NextResponse.json({ error: 'Q&A candidature not available for in_aula courses' }, { status: 422 });
      }
    }
  }

  const { data, error } = await svc
    .from('candidature')
    .insert({ tipo, lezione_id, collaborator_id: collab.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }

  return NextResponse.json({ candidatura: data }, { status: 201 });
}
