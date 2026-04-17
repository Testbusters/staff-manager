import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isValidUUID } from '@/lib/validate-id';

const WRITE_ROLES = ['amministrazione'];

const PatchResourceSchema = z.object({
  titolo: z.string().optional(),
  descrizione: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  file_url: z.string().nullable().optional(),
  tag: z.array(z.string()).nullable().optional(),
  community_ids: z.array(z.string()).optional(),
  categoria: z.string().optional(),
});

async function authorizeWriter(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', status: 401 };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return { error: 'Utente non attivo', status: 403 };
  if (!WRITE_ROLES.includes(profile.role)) return { error: 'Non autorizzato', status: 403 };

  return { error: null, status: 200 };
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

  const body = await request.json().catch(() => null);
  const parsed = PatchResourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }
  const update: Record<string, unknown> = {};
  if (parsed.data.titolo !== undefined) update.titolo = parsed.data.titolo.trim();
  if (parsed.data.descrizione !== undefined) update.descrizione = parsed.data.descrizione?.trim() || null;
  if (parsed.data.link !== undefined) update.link = parsed.data.link?.trim() || null;
  if (parsed.data.file_url !== undefined) update.file_url = parsed.data.file_url?.trim() || null;
  if (parsed.data.tag !== undefined) update.tag = parsed.data.tag?.length ? parsed.data.tag : null;
  if (parsed.data.community_ids !== undefined) update.community_ids = parsed.data.community_ids;
  if (parsed.data.categoria !== undefined) update.categoria = parsed.data.categoria;

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await serviceClient
    .from('resources')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return NextResponse.json({ resource: data });
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

  const { error } = await serviceClient.from('resources').delete().eq('id', id);

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
