import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { emailAssegnazioneCorsi } from '@/lib/email-templates';
import { sendTelegram, telegramAssegnazioneCorsi } from '@/lib/telegram';
import { getCollaboratorInfo, getNotificationSettings } from '@/lib/notification-helpers';

const schema = z.object({
  lezione_id: z.string().uuid(),
  collaborator_id: z.string().uuid(),
  ruolo: z.enum(['cocoda', 'docente', 'qa']),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active, citta_responsabile')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (profile.role !== 'responsabile_cittadino') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const { lezione_id, collaborator_id, ruolo } = parsed.data;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Fetch lezione -> corso once for city check + max validation
  const { data: lezione } = await svc
    .from('lezioni')
    .select('corso_id')
    .eq('id', lezione_id)
    .single();

  if (lezione) {
    const { data: corso } = await svc
      .from('corsi')
      .select('citta, max_docenti_per_lezione, max_qa_per_lezione')
      .eq('id', lezione.corso_id)
      .single();

    // Defense-in-depth: verify lezione's corso belongs to the resp.citt's city
    if (profile.citta_responsabile) {
      if (!corso || corso.citta !== profile.citta_responsabile) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Max validation for docente and qa per lezione
    if (corso && (ruolo === 'docente' || ruolo === 'qa')) {
      const maxVal = ruolo === 'docente'
        ? (corso.max_docenti_per_lezione ?? 0)
        : (corso.max_qa_per_lezione ?? 0);

      const { count } = await svc
        .from('assegnazioni')
        .select('id', { count: 'exact', head: true })
        .eq('lezione_id', lezione_id)
        .eq('ruolo', ruolo);

      if ((count ?? 0) >= maxVal) {
        const label = ruolo === 'docente' ? 'docenti' : 'Q&A';
        return NextResponse.json(
          { error: `Massimo ${maxVal} ${label} per lezione raggiunto` },
          { status: 422 },
        );
      }
    }
  }

  // Duplicate check
  const { data: existing } = await svc
    .from('assegnazioni')
    .select('id')
    .eq('lezione_id', lezione_id)
    .eq('collaborator_id', collaborator_id)
    .eq('ruolo', ruolo)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Assegnazione già esistente' }, { status: 409 });
  }

  const { data, error } = await svc
    .from('assegnazioni')
    .insert({ lezione_id, collaborator_id, ruolo, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  // E13 + Telegram: send assignment notifications fire-and-forget
  try {
    const [info, settings] = await Promise.all([
      getCollaboratorInfo(collaborator_id, svc),
      getNotificationSettings(svc),
    ]);
    const setting = settings.get('assegnazione_corso:collaboratore');
    if (info) {
      const { data: lez } = await svc.from('lezioni').select('corso_id').eq('id', lezione_id).single();
      if (lez) {
        const { data: corso } = await svc.from('corsi').select('nome').eq('id', lez.corso_id).single();
        if (corso) {
          const ruoloLabel = ruolo === 'docente' ? 'Docente' : ruolo === 'qa' ? 'Q&A' : "CoCoD'à";
          if (setting?.email_enabled && info.email) {
            const { subject, html } = emailAssegnazioneCorsi({
              nome: info.nome,
              corso: corso.nome,
              ruolo: ruoloLabel,
            });
            sendEmail(info.email, subject, html).catch(() => {});
          }
          if (setting?.telegram_enabled && info.telegram_chat_id) {
            sendTelegram(
              info.telegram_chat_id,
              telegramAssegnazioneCorsi({ nome: info.nome, corso: corso.nome, ruolo: ruoloLabel }),
            ).catch(() => {});
          }
        }
      }
    }
  } catch {
    // fire-and-forget — never block the response
  }

  return NextResponse.json({ assegnazione: data }, { status: 201 });
}
