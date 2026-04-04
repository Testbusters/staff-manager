import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getCorsoStato } from '@/lib/corsi-utils';
import { getCollaboratoriForCity, getNotificationSettings } from '@/lib/notification-helpers';
import { sendEmail } from '@/lib/email';
import { emailNuovoCorsoInCitta } from '@/lib/email-templates';
import { sendTelegram, telegramNuovoCorsoInCitta } from '@/lib/telegram';

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
  max_qa_per_lezione: z.number().int().min(0).optional(),
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
  const community_id_raw = searchParams.get('community_id');
  const stato_filter = searchParams.get('stato');

  const community_id_parsed = community_id_raw
    ? z.string().uuid().safeParse(community_id_raw)
    : null;
  if (community_id_parsed && !community_id_parsed.success) {
    return NextResponse.json({ error: 'Invalid community_id' }, { status: 400 });
  }
  const community_id = community_id_parsed?.data ?? null;

  let query = svc.from('corsi').select('*, community:communities(id, name)').order('data_inizio', { ascending: false }).limit(500);
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

  // Notify collaboratori in the corso's city — fire-and-forget
  if (parsed.data.citta) {
    const citta = parsed.data.citta;
    const communityId = parsed.data.community_id;
    const corsoNome = data.nome as string;
    const dataInizio = new Date(data.data_inizio).toLocaleDateString('it-IT');
    const dataFine = new Date(data.data_fine).toLocaleDateString('it-IT');

    Promise.all([
      getCollaboratoriForCity(citta, [communityId], svc),
      getNotificationSettings(svc),
    ])
      .then(([collaboratori, settings]) => {
        const setting = settings.get('nuovo_corso_citta:collaboratore');
        for (const c of collaboratori) {
          if (setting?.email_enabled && c.email) {
            const { subject, html } = emailNuovoCorsoInCitta({
              nome: c.nome,
              corso: corsoNome,
              citta,
              dataInizio,
              dataFine,
            });
            sendEmail(c.email, subject, html).catch(() => {});
          }
          if (setting?.telegram_enabled && c.telegram_chat_id) {
            sendTelegram(
              c.telegram_chat_id,
              telegramNuovoCorsoInCitta({ nome: c.nome, corso: corsoNome, citta, dataInizio, dataFine }),
            ).catch(() => {});
          }
        }
      })
      .catch(() => {});
  }

  return NextResponse.json(
    { corso: { ...data, stato: getCorsoStato(data.data_inizio, data.data_fine) } },
    { status: 201 },
  );
}
