import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';

const postSchema = z.object({
  type:      z.enum(['citta', 'materia']),
  community: z.enum(['testbusters', 'peer4med']),
  nome:      z.string().min(1).max(100),
});

async function getCallerRole(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();
  if (!profile?.is_active || profile.role !== 'amministrazione') return null;
  return user;
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const user = await getCallerRole(cookieStore);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const community = searchParams.get('community');

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let query = svc.from('lookup_options').select('id, type, community, nome, sort_order').order('sort_order');
  if (type) query = query.eq('type', type);
  if (community) query = query.eq('community', community);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ options: data ?? [] });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const user = await getCallerRole(cookieStore);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Compute next sort_order for this type+community
  const { data: existing } = await svc
    .from('lookup_options')
    .select('sort_order')
    .eq('type', parsed.data.type)
    .eq('community', parsed.data.community)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sort_order = (existing?.sort_order ?? 0) + 1;

  const { data, error } = await svc
    .from('lookup_options')
    .insert({ ...parsed.data, sort_order })
    .select('id, type, community, nome, sort_order')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Opzione già esistente' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ option: data }, { status: 201 });
}
