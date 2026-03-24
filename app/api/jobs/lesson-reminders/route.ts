import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { emailReminderLezione } from '@/lib/email-templates';
import { getCollaboratorInfo } from '@/lib/notification-helpers';

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
    .select('id, corso_id, data, orario_inizio, orario_fine, materia')
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

    const info = await getCollaboratorInfo(a.collaborator_id, svc);
    if (!info?.email) continue;

    const orario = `${lez.orario_inizio} – ${lez.orario_fine}`;
    const ruoloLabel = RUOLO_LABEL[a.ruolo] ?? a.ruolo;

    const { subject, html } = emailReminderLezione({
      nome: info.nome,
      corso: corso.nome,
      lezione_data: lez.data,
      orario,
      materia: lez.materia,
      ruolo: ruoloLabel,
    });

    sendEmail(info.email, subject, html).catch(() => {});
    sent++;
  }

  return NextResponse.json({ sent });
}
