import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getNotificationSettings, getCollaboratoriForCommunities } from '@/lib/notification-helpers';
import { buildContentNotification } from '@/lib/notification-utils';
import { sendEmail } from '@/lib/email';
import { getRenderedEmail } from '@/lib/email-template-service';

const CreateCommunicationSchema = z.object({
  titolo: z.string().min(1),
  contenuto: z.string().min(1),
  pinned: z.boolean().optional(),
  community_ids: z.array(z.string()).optional(),
  expires_at: z.string().nullable().optional(),
  file_urls: z.array(z.string()).optional(),
});

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
  const parsed = CreateCommunicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }
  const { titolo, contenuto, pinned, community_ids, expires_at, file_urls } = parsed.data;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await svc
    .from('communications')
    .insert({
      titolo: titolo.trim(),
      contenuto: contenuto.trim(),
      pinned: pinned ?? false,
      community_ids: community_ids ?? [],
      expires_at: expires_at ?? null,
      file_urls: file_urls ?? [],
      published_at: new Date().toISOString(),
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
    const setting = settings.get('comunicazione_pubblicata:collaboratore');
    if ((!setting || setting.inapp_enabled) && collaboratori.length > 0) {
      const notifs = collaboratori.map((c) =>
        buildContentNotification(c.user_id, 'communication', data.id, titolo.trim()),
      );
      await svc.from('notifications').insert(notifs).then(({ error: e }) => {
        if (e) console.error('Communication notification insert failed:', e.message);
      });
    }
    if (setting?.email_enabled) {
      const today = new Date().toLocaleDateString('it-IT');
      for (const c of collaboratori) {
        if (c.email) {
          getRenderedEmail('E10', { nome: c.nome, titolo: titolo.trim(), data: today }).then(({ subject, html }) => {
            sendEmail(c.email!, subject, html).catch(() => {});
          }).catch(() => {});
        }
      }
    }
  } catch (e) {
    console.error('Content notification dispatch failed:', e);
  }

  return NextResponse.json({ communication: data }, { status: 201 });
}
