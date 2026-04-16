import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isValidUUID } from '@/lib/validate-id';

const PatchCommunicationSchema = z.object({
  titolo: z.string().optional(),
  contenuto: z.string().optional(),
  pinned: z.boolean().optional(),
  community_ids: z.array(z.string()).optional(),
  expires_at: z.string().nullable().optional(),
  file_urls: z.array(z.string()).optional(),
});

async function authorizeAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, error: 'Unauthorized', status: 401 as const };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return { user: null, error: 'Utente non attivo', status: 403 as const };
  if (profile.role !== 'amministrazione') return { user: null, error: 'Non autorizzato', status: 403 as const };

  return { user, error: null, status: 200 as const };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });
  const supabase = await createClient();
  const auth = await authorizeAdmin(supabase);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = PatchCommunicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }
  const { titolo, contenuto, pinned, community_ids, expires_at, file_urls } = parsed.data;

  const update: Record<string, unknown> = {};
  if (titolo !== undefined) update.titolo = titolo.trim();
  if (contenuto !== undefined) update.contenuto = contenuto.trim();
  if (pinned !== undefined) update.pinned = pinned;
  if (community_ids !== undefined) update.community_ids = community_ids;
  if (expires_at !== undefined) update.expires_at = expires_at;
  if (file_urls !== undefined) update.file_urls = file_urls;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await svc
    .from('communications')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return NextResponse.json({ communication: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });
  const supabase = await createClient();
  const auth = await authorizeAdmin(supabase);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await svc
    .from('communications')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
