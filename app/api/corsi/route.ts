import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getCorsoStato } from '@/lib/corsi-utils';

const CreateCorsoSchema = z.object({
  nome: z.string().min(1),
  codice_identificativo: z.string().min(1),
  community_id: z.string().uuid(),
  modalita: z.enum(['online', 'in_aula']),
  citta: z.string().nullable().optional(),
  linea: z.string().nullable().optional(),
  responsabile_doc: z.string().nullable().optional(),
  licenza_zoom: z.string().nullable().optional(),
  data_inizio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  data_fine: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  max_docenti_per_lezione: z.number().int().min(1).optional(),
  max_qa_per_lezione: z.number().int().min(1).optional(),
  link_lw: z.string().nullable().optional(),
  link_zoom: z.string().nullable().optional(),
  link_telegram_corsisti: z.string().nullable().optional(),
  link_qa_assignments: z.string().nullable().optional(),
  link_questionari: z.string().nullable().optional(),
  link_emergenza: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const role = profile.role as string;

  const allowedRoles = ['collaboratore', 'responsabile_cittadino', 'responsabile_compensi', 'amministrazione'];
  if (!allowedRoles.includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { searchParams } = new URL(req.url);
  const community_id = searchParams.get('community_id');
  const stato_filter = searchParams.get('stato');

  let query = svc.from('corsi').select('*, community:communities(id, name)').order('data_inizio', { ascending: false });
  if (community_id) query = query.eq('community_id', community_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  const corsi = (data ?? []).map((c: Record<string, unknown>) => ({
    ...c,
    stato: getCorsoStato(c.data_inizio as string, c.data_fine as string),
  }));

  const filtered = stato_filter ? corsi.filter((c) => c.stato === stato_filter) : corsi;
  return NextResponse.json({ corsi: filtered });
}

export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const parsed = CreateCorsoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await svc
    .from('corsi')
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  return NextResponse.json(
    { corso: { ...data, stato: getCorsoStato(data.data_inizio, data.data_fine) } },
    { status: 201 },
  );
}
