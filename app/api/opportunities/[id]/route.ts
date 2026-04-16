import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isValidUUID } from '@/lib/validate-id';

const VALID_TIPO = ['Volontariato', 'Formazione', 'Lavoro', 'Altro'];

const PatchOpportunitySchema = z.object({
  titolo: z.string().optional(),
  tipo: z.enum(['Volontariato', 'Formazione', 'Lavoro', 'Altro']).optional(),
  descrizione: z.string().optional(),
  scadenza_candidatura: z.string().nullable().optional(),
  link_candidatura: z.string().nullable().optional(),
  file_url: z.string().nullable().optional(),
  community_ids: z.array(z.string()).optional(),
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
  const parsed = PatchOpportunitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }
  const {
    titolo, tipo, descrizione,
    scadenza_candidatura, link_candidatura, file_url, community_ids,
  } = parsed.data;

  const update: Record<string, unknown> = {};
  if (titolo !== undefined) update.titolo = titolo.trim();
  if (tipo !== undefined) update.tipo = tipo;
  if (descrizione !== undefined) update.descrizione = descrizione.trim();

  if (scadenza_candidatura !== undefined) update.scadenza_candidatura = scadenza_candidatura;
  if (link_candidatura !== undefined) update.link_candidatura = link_candidatura;
  if (file_url !== undefined) update.file_url = file_url;
  if (community_ids !== undefined) update.community_ids = community_ids;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await svc
    .from('opportunities')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return NextResponse.json({ opportunity: data });
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
    .from('opportunities')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
