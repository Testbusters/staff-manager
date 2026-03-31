import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getCorsoStato } from '@/lib/corsi-utils';

const PatchCorsoSchema = z.object({
  nome: z.string().min(1).optional(),
  codice_identificativo: z.string().min(1).optional(),
  community_id: z.string().uuid().optional(),
  modalita: z.enum(['online', 'in_aula']).optional(),
  citta: z.string().nullable().optional(),
  linea: z.string().nullable().optional(),
  responsabile_doc: z.string().nullable().optional(),
  licenza_zoom: z.string().nullable().optional(),
  data_inizio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  data_fine: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  max_docenti_per_lezione: z.number().int().min(1).optional(),
  max_qa_per_lezione: z.number().int().min(0).optional(),
  link_lw: z.string().nullable().optional(),
  link_zoom: z.string().nullable().optional(),
  link_telegram_corsisti: z.string().nullable().optional(),
  link_qa_assignments: z.string().nullable().optional(),
  link_questionari: z.string().nullable().optional(),
  link_emergenza: z.string().nullable().optional(),
});

async function getAuthContext(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, role: null };
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();
  return { user, role: (profile?.is_active ? profile.role : null) as string | null };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, role } = await getAuthContext(req);
  if (!user || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [{ data: corso, error }, { data: lezioni, error: lezioniError }] = await Promise.all([
    svc.from('corsi').select('*, community:communities(id, name)').eq('id', id).single(),
    svc.from('lezioni').select('*').eq('corso_id', id).order('data').order('orario_inizio'),
  ]);

  if (error || !corso) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (lezioniError) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return NextResponse.json({
    corso: { ...corso, stato: getCorsoStato(corso.data_inizio, corso.data_fine) },
    lezioni: lezioni ?? [],
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, role } = await getAuthContext(req);
  if (!user || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  if (role === 'responsabile_cittadino') {
    const allowed = z.object({ citta: z.string().nullable() });
    const parsed = allowed.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    const { data, error } = await svc.from('corsi').update(parsed.data).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
    return NextResponse.json({ corso: { ...data, stato: getCorsoStato(data.data_inizio, data.data_fine) } });
  }

  if (role !== 'amministrazione') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = PatchCorsoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const { data, error } = await svc.from('corsi').update(parsed.data).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return NextResponse.json({ corso: { ...data, stato: getCorsoStato(data.data_inizio, data.data_fine) } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, role } = await getAuthContext(req);
  if (!user || !role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (role !== 'amministrazione') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { error } = await svc.from('corsi').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
