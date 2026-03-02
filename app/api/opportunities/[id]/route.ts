import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const VALID_TIPO = ['LAVORO', 'FORMAZIONE', 'STAGE', 'PROGETTO', 'ALTRO'];

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
  const supabase = await createClient();
  const auth = await authorizeAdmin(supabase);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const {
    titolo, tipo, descrizione, requisiti,
    scadenza_candidatura, link_candidatura, file_url, community_id,
  } = body as {
    titolo?: string;
    tipo?: string;
    descrizione?: string;
    requisiti?: string | null;
    scadenza_candidatura?: string | null;
    link_candidatura?: string | null;
    file_url?: string | null;
    community_id?: string | null;
  };

  if (tipo && !VALID_TIPO.includes(tipo)) {
    return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (titolo !== undefined) update.titolo = titolo.trim();
  if (tipo !== undefined) update.tipo = tipo;
  if (descrizione !== undefined) update.descrizione = descrizione.trim();
  if (requisiti !== undefined) update.requisiti = requisiti;
  if (scadenza_candidatura !== undefined) update.scadenza_candidatura = scadenza_candidatura;
  if (link_candidatura !== undefined) update.link_candidatura = link_candidatura;
  if (file_url !== undefined) update.file_url = file_url;
  if (community_id !== undefined) update.community_id = community_id;

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ opportunity: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({}, { status: 204 });
}
