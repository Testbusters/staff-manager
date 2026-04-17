import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isValidUUID } from '@/lib/validate-id';

const WRITE_ROLES = ['amministrazione', 'responsabile_cittadino'];

const PatchEventSchema = z.object({
  titolo: z.string().optional(),
  descrizione: z.string().nullable().optional(),
  start_datetime: z.string().nullable().optional(),
  end_datetime: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  luma_url: z.string().nullable().optional(),
  luma_embed_url: z.string().nullable().optional(),
  tipo: z.string().nullable().optional(),
  community_ids: z.array(z.string()).optional(),
  file_url: z.string().nullable().optional(),
});

async function authorizeWriter(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', status: 401, user: null, role: null, cittaResponsabile: null };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active, citta_responsabile')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return { error: 'Utente non attivo', status: 403, user: null, role: null, cittaResponsabile: null };
  if (!WRITE_ROLES.includes(profile.role)) return { error: 'Non autorizzato', status: 403, user: null, role: null, cittaResponsabile: null };

  return { error: null, status: 200, user, role: profile.role as string, cittaResponsabile: profile.citta_responsabile as string | null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });
  const supabase = await createClient();
  const auth = await authorizeWriter(supabase);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Ownership check for responsabile_cittadino
  if (auth.role === 'responsabile_cittadino') {
    const { data: existing } = await serviceClient.from('events').select('citta').eq('id', id).single();
    if (!existing || existing.citta !== auth.cittaResponsabile) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  const parsed = PatchEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }
  const update: Record<string, unknown> = {};
  if (parsed.data.titolo !== undefined) update.titolo = parsed.data.titolo.trim();
  if (parsed.data.descrizione !== undefined) update.descrizione = parsed.data.descrizione?.trim() || null;
  if (parsed.data.start_datetime !== undefined) update.start_datetime = parsed.data.start_datetime || null;
  if (parsed.data.end_datetime !== undefined) update.end_datetime = parsed.data.end_datetime || null;
  if (parsed.data.location !== undefined) update.location = parsed.data.location?.trim() || null;
  if (parsed.data.luma_url !== undefined) update.luma_url = parsed.data.luma_url?.trim() || null;
  if (parsed.data.luma_embed_url !== undefined) update.luma_embed_url = parsed.data.luma_embed_url?.trim() || null;
  if (parsed.data.tipo !== undefined) update.tipo = parsed.data.tipo?.trim() || null;
  // responsabile_cittadino cannot change community_ids or citta
  if (auth.role === 'amministrazione') {
    if (parsed.data.community_ids !== undefined) update.community_ids = parsed.data.community_ids;
    if (parsed.data.file_url !== undefined) update.file_url = parsed.data.file_url?.trim() || null;
  }

  const { data, error } = await serviceClient
    .from('events')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return NextResponse.json({ event: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });
  const supabase = await createClient();
  const auth = await authorizeWriter(supabase);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Ownership check for responsabile_cittadino
  if (auth.role === 'responsabile_cittadino') {
    const { data: existing } = await serviceClient.from('events').select('citta').eq('id', id).single();
    if (!existing || existing.citta !== auth.cittaResponsabile) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
    }
  }

  const { error } = await serviceClient.from('events').delete().eq('id', id);

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
