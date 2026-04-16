import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import {
  getNotificationSettings,
  getCollaboratoriForCommunities,
  getCollaboratoriForCity,
} from '@/lib/notification-helpers';
import { buildContentNotification } from '@/lib/notification-utils';
import { sendEmail } from '@/lib/email';
import { getRenderedEmail } from '@/lib/email-template-service';

const WRITE_ROLES = ['amministrazione', 'responsabile_cittadino'];

const CreateEventSchema = z.object({
  titolo: z.string().min(1),
  descrizione: z.string().optional(),
  start_datetime: z.string().optional(),
  end_datetime: z.string().optional(),
  location: z.string().optional(),
  luma_url: z.string().optional(),
  luma_embed_url: z.string().optional(),
  community_ids: z.array(z.string()).optional(),
  tipo: z.string().optional(),
  file_url: z.string().optional(),
});

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_datetime', { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return NextResponse.json({ events: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active, citta_responsabile')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Utente non attivo' }, { status: 403 });
  if (!WRITE_ROLES.includes(profile.role)) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = CreateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }
  const {
    titolo, descrizione, start_datetime, end_datetime,
    location, luma_url, luma_embed_url, community_ids, tipo, file_url,
  } = parsed.data;

  // For responsabile_cittadino: auto-set citta and derive community_ids from their community
  let eventCitta: string | null = null;
  let effectiveCommunityIds = community_ids ?? [];

  if (profile.role === 'responsabile_cittadino') {
    if (!profile.citta_responsabile) {
      return NextResponse.json({ error: 'Città responsabile non configurata' }, { status: 400 });
    }
    eventCitta = profile.citta_responsabile;

    // Fetch resp.citt's community
    const serviceClientTemp = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: collabRow } = await serviceClientTemp
      .from('collaborators')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (collabRow) {
      const { data: cc } = await serviceClientTemp
        .from('collaborator_communities')
        .select('community_id')
        .eq('collaborator_id', collabRow.id)
        .single();
      if (cc) effectiveCommunityIds = [cc.community_id];
    }
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await serviceClient
    .from('events')
    .insert({
      titolo: titolo.trim(),
      descrizione: descrizione?.trim() || null,
      start_datetime: start_datetime || null,
      end_datetime: end_datetime || null,
      location: location?.trim() || null,
      luma_url: luma_url?.trim() || null,
      luma_embed_url: luma_embed_url?.trim() || null,
      community_ids: effectiveCommunityIds,
      tipo: tipo?.trim() || null,
      file_url: file_url?.trim() || null,
      citta: eventCitta,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  // Fire content notifications
  try {
    const settings = await getNotificationSettings(serviceClient);
    const setting = settings.get('evento_pubblicato:collaboratore');

    // City events notify only collabs in that city; national events use community filter
    const collaboratori = eventCitta
      ? await getCollaboratoriForCity(eventCitta, effectiveCommunityIds, serviceClient)
      : await getCollaboratoriForCommunities(effectiveCommunityIds, serviceClient);

    if ((!setting || setting.inapp_enabled) && collaboratori.length > 0) {
      const notifs = collaboratori.map((c) =>
        buildContentNotification(c.user_id, 'event', data.id, titolo.trim()),
      );
      await serviceClient.from('notifications').insert(notifs).then(({ error: e }) => {
        if (e) console.error('Event notification insert failed:', e.message);
      });
    }
    if (setting?.email_enabled) {
      const today = new Date().toLocaleDateString('it-IT');
      for (const c of collaboratori) {
        if (c.email) {
          getRenderedEmail('E11', { nome: c.nome, titolo: titolo.trim(), data: today }).then(({ subject, html }) => {
            sendEmail(c.email!, subject, html).catch(() => {});
          }).catch(() => {});
        }
      }
    }
  } catch (e) {
    console.error('Content notification dispatch failed:', e);
  }

  return NextResponse.json({ event: data }, { status: 201 });
}
