import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getNotificationSettings, getCollaboratoriForCommunities } from '@/lib/notification-helpers';
import { buildContentNotification } from '@/lib/notification-utils';
import { sendEmail } from '@/lib/email';
import { getRenderedEmail } from '@/lib/email-template-service';
import { createOpportunitySchema } from '@/lib/schemas/opportunity';

const VALID_TIPO = ['Volontariato', 'Formazione', 'Lavoro', 'Altro'];

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Utente non attivo' }, { status: 403 });
  if (profile.role !== 'amministrazione') return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = createOpportunitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }
  const {
    titolo, tipo, descrizione,
    scadenza_candidatura, link_candidatura, file_url, community_ids,
  } = parsed.data;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await svc
    .from('opportunities')
    .insert({
      titolo: titolo.trim(),
      tipo: tipo ?? 'ALTRO',
      descrizione: descrizione.trim(),

      scadenza_candidatura: scadenza_candidatura || null,
      link_candidatura: link_candidatura?.trim() || null,
      file_url: file_url?.trim() || null,
      community_ids: community_ids ?? [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  // Fire content notifications
  try {
    const [settings, collaboratori] = await Promise.all([
      getNotificationSettings(svc),
      getCollaboratoriForCommunities(community_ids ?? [], svc),
    ]);
    const setting = settings.get('opportunita_pubblicata:collaboratore');
    if ((!setting || setting.inapp_enabled) && collaboratori.length > 0) {
      const notifs = collaboratori.map((c) =>
        buildContentNotification(c.user_id, 'opportunity', data.id, titolo.trim()),
      );
      await svc.from('notifications').insert(notifs).then(({ error: e }) => {
        if (e) console.error('Opportunity notification insert failed:', e.message);
      });
    }
    if (setting?.email_enabled) {
      const today = new Date().toLocaleDateString('it-IT');
      for (const c of collaboratori) {
        if (c.email) {
          getRenderedEmail('E12', { nome: c.nome, tipo: 'Opportunità', titolo: titolo.trim(), data: today, genere: 'a' }).then(({ subject, html }) => {
            sendEmail(c.email!, subject, html).catch(() => {});
          }).catch(() => {});
        }
      }
    }
  } catch (e) {
    console.error('Content notification dispatch failed:', e);
  }

  return NextResponse.json({ opportunity: data }, { status: 201 });
}
