import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getNotificationSettings, getCollaboratorInfo } from '@/lib/notification-helpers';
import { emailValutazioneCorso } from '@/lib/email-templates';
import { sendEmail } from '@/lib/email';
import { sendTelegram, telegramValutazioneCorso } from '@/lib/telegram';

const ValutazioneSchema = z.object({
  collaborator_id: z.string().uuid(),
  ruolo: z.enum(['docente', 'cocoda']),
  materia: z.string().optional(),
  valutazione: z.number().min(1).max(10),
}).refine(
  (d) => d.ruolo !== 'docente' || (d.materia !== undefined && d.materia.length > 0),
  { message: 'materia is required for docente', path: ['materia'] },
);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, citta_responsabile')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'responsabile_cittadino') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!profile.citta_responsabile) {
    return NextResponse.json({ error: 'No citta_responsabile set' }, { status: 403 });
  }

  const { id: corsoId } = await params;

  const body = await req.json();
  const parsed = ValutazioneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }
  const { collaborator_id, ruolo, materia, valutazione } = parsed.data;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Verify corso belongs to resp.citt's city
  const { data: corso } = await svc
    .from('corsi')
    .select('citta, nome')
    .eq('id', corsoId)
    .single();

  if (!corso || corso.citta !== profile.citta_responsabile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch lezioni - filter by materia for docente
  let lezioniQuery = svc
    .from('lezioni')
    .select('id')
    .eq('corso_id', corsoId);

  if (ruolo === 'docente' && materia) {
    lezioniQuery = lezioniQuery.eq('materia', materia);
  }

  const { data: lezioni } = await lezioniQuery;
  const lezioniIds = (lezioni ?? []).map((l: { id: string }) => l.id);

  if (lezioniIds.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  // Update only assegnazioni matching collaborator + ruolo + lezioni (materia-filtered for docente)
  const { data, error } = await svc
    .from('assegnazioni')
    .update({ valutazione })
    .eq('collaborator_id', collaborator_id)
    .eq('ruolo', ruolo)
    .in('lezione_id', lezioniIds)
    .select();

  if (error) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }

  // Fire-and-forget notification
  (async () => {
    try {
      const [settings, person] = await Promise.all([
        getNotificationSettings(svc),
        getCollaboratorInfo(collaborator_id, svc),
      ]);
      const cfg = settings.get('valutazione_corso:collaboratore');
      if (!cfg || !person) return;

      const ruoloLabel = ruolo === 'docente' ? 'Docente' : "CoCoD'à";

      if (cfg.email_enabled && person.email) {
        const { subject, html } = emailValutazioneCorso({
          nome: person.nome,
          corso: corso.nome,
          ruolo: ruoloLabel,
          materia: materia ?? undefined,
          valutazione,
        });
        sendEmail(person.email, subject, html).catch(() => {});
      }

      if (cfg.telegram_enabled && person.telegram_chat_id) {
        const msg = telegramValutazioneCorso({
          nome: person.nome,
          corso: corso.nome,
          ruolo: ruoloLabel,
          materia: materia ?? undefined,
          valutazione,
        });
        sendTelegram(person.telegram_chat_id, msg).catch(() => {});
      }
    } catch {
      // fire-and-forget — never block the response
    }
  })();

  return NextResponse.json({ updated: data?.length ?? 0 });
}
