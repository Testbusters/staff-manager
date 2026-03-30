import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

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

  const body = await request.json().catch(() => null);
  const {
    titolo, descrizione, codice_sconto, link,
    valid_from, valid_to, community_ids, fornitore, logo_url, file_url, brand,
  } = body as {
    titolo?: string;
    descrizione?: string | null;
    codice_sconto?: string | null;
    link?: string | null;
    valid_from?: string | null;
    valid_to?: string | null;
    community_ids?: string[];
    fornitore?: string;
    logo_url?: string | null;
    file_url?: string | null;
    brand?: string;
  };

  const update: Record<string, unknown> = {};
  if (titolo !== undefined) update.titolo = titolo.trim();
  if (descrizione !== undefined) update.descrizione = descrizione;
  if (codice_sconto !== undefined) update.codice_sconto = codice_sconto;
  if (link !== undefined) update.link = link;
  if (valid_from !== undefined) update.valid_from = valid_from;
  if (valid_to !== undefined) update.valid_to = valid_to;
  if (community_ids !== undefined) update.community_ids = community_ids;
  if (fornitore !== undefined) update.fornitore = fornitore.trim();
  if (logo_url !== undefined) update.logo_url = logo_url;
  if (file_url !== undefined) update.file_url = file_url;
  if (brand !== undefined) update.brand = brand;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await svc
    .from('discounts')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return NextResponse.json({ discount: data });
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
    .from('discounts')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
