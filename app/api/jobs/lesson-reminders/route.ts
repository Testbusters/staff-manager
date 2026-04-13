import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { emailReminderLezione } from '@/lib/email-templates';
import { sendTelegram, telegramReminderLezione } from '@/lib/telegram';
import { getNotificationSettings } from '@/lib/notification-helpers';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Tomorrow's date
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const { data: lezioni } = await svc
    .from('lezioni')
    .select('id, corso_id, data, orario_inizio, orario_fine, materie')
    .eq('data', tomorrow);

  if (!lezioni || lezioni.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const lezioniIds = lezioni.map((l) => l.id);
  const corsoIds = [...new Set(lezioni.map((l) => l.corso_id))];

  const [{ data: assegnazioni }, { data: corsi }] = await Promise.all([
    svc.from('assegnazioni').select('lezione_id, collaborator_id, ruolo').in('lezione_id', lezioniIds),
    svc.from('corsi').select('id, nome').in('id', corsoIds),
  ]);

  const lezioneMap = new Map(lezioni.map((l) => [l.id, l]));
  const corsoMap = new Map((corsi ?? []).map((c) => [c.id, c]));

  // Fetch notification settings + collaborators in parallel
  const uniqueCollabIds = [...new Set((assegnazioni ?? []).map((a) => a.collaborator_id))];
  const [{ data: collabs }, settings] = await Promise.all([
    svc
      .from('collaborators')
      .select('id, user_id, nome, cognome, telegram_chat_id')
      .in('id', uniqueCollabIds),
    getNotificationSettings(svc),
  ]);
  const reminderSetting = settings.get('reminder_lezione_24h:collaboratore');

  const collabInfoMap = new Map((collabs ?? []).map((c) => [c.id, c]));

  // Batch: fetch all auth users in parallel
  const uniqueUserIds = [...new Set((collabs ?? []).map((c) => c.user_id).filter(Boolean))];
  const authResults = await Promise.all(
    uniqueUserIds.map((uid) => svc.auth.admin.getUserById(uid)),
  );
  const emailMap = new Map(
    authResults
      .filter((r) => !r.error && r.data.user)
      .map((r) => [r.data.user!.id, r.data.user!.email ?? '']),
  );

  const RUOLO_LABEL: Record<string, string> = {
    docente: 'Docente',
    qa: "Q&A",
    cocoda: "CoCoD'à",
  };

  let sent = 0;
  for (const a of assegnazioni ?? []) {
    const lez = lezioneMap.get(a.lezione_id);
    if (!lez) continue;

    const corso = corsoMap.get(lez.corso_id);
    if (!corso) continue;

    const collab = collabInfoMap.get(a.collaborator_id);
    if (!collab) continue;

    const email = emailMap.get(collab.user_id);
    if (!email) continue;

    const orario = `${lez.orario_inizio} – ${lez.orario_fine}`;
    const ruoloLabel = RUOLO_LABEL[a.ruolo] ?? a.ruolo;

    if (reminderSetting?.email_enabled && email) {
      const { subject, html } = emailReminderLezione({
        nome: collab.nome,
        corso: corso.nome,
        lezione_data: lez.data,
        orario,
        materia: (lez.materie ?? []).join(', '),
        ruolo: ruoloLabel,
      });
      sendEmail(email, subject, html).catch(() => {});
    }

    if (reminderSetting?.telegram_enabled && collab.telegram_chat_id != null) {
      sendTelegram(
        BigInt(collab.telegram_chat_id),
        telegramReminderLezione({
          nome: collab.nome,
          corso: corso.nome,
          lezione_data: lez.data,
          orario,
          materia: (lez.materie ?? []).join(', '),
          ruolo: ruoloLabel,
        }),
      ).catch(() => {});
    }

    sent++;
  }

  return NextResponse.json({ sent });
}
