import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getNotificationSettings, getCollaboratoriForCommunities } from '@/lib/notification-helpers';
import { buildContentNotification } from '@/lib/notification-utils';
import { sendEmail } from '@/lib/email';
import { getRenderedEmail } from '@/lib/email-template-service';
import { createDiscountSchema } from '@/lib/schemas/discount';

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
  const parsed = createDiscountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }
  const {
    titolo, descrizione, codice_sconto, link,
    valid_from, valid_to, community_ids, fornitore, logo_url, file_url, brand,
  } = parsed.data;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await svc
    .from('discounts')
    .insert({
      titolo: titolo.trim(),
      descrizione: descrizione?.trim() || null,
      codice_sconto: codice_sconto?.trim() || null,
      link: link?.trim() || null,
      valid_from: valid_from || null,
      valid_to: valid_to || null,
      community_ids: community_ids ?? [],
      fornitore: fornitore?.trim() ?? '',
      logo_url: logo_url?.trim() || null,
      file_url: file_url?.trim() || null,
      brand: brand ?? 'testbusters',
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
    const setting = settings.get('sconto_pubblicato:collaboratore');
    if ((!setting || setting.inapp_enabled) && collaboratori.length > 0) {
      const notifs = collaboratori.map((c) =>
        buildContentNotification(c.user_id, 'discount', data.id, titolo.trim()),
      );
      await svc.from('notifications').insert(notifs).then(({ error: e }) => {
        if (e) console.error('Discount notification insert failed:', e.message);
      });
    }
    if (setting?.email_enabled) {
      const today = new Date().toLocaleDateString('it-IT');
      for (const c of collaboratori) {
        if (c.email) {
          getRenderedEmail('E12', { nome: c.nome, tipo: 'Sconto', titolo: titolo.trim(), data: today, genere: 'o' }).then(({ subject, html }) => {
            sendEmail(c.email!, subject, html).catch(() => {});
          }).catch(() => {});
        }
      }
    }
  } catch (e) {
    console.error('Content notification dispatch failed:', e);
  }

  return NextResponse.json({ discount: data }, { status: 201 });
}
