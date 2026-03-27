import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { z } from 'zod';

const patchSchema = z.object({
  brand_color: z.string().optional(),
  logo_url: z.string().optional(),
  header_title: z.string().optional(),
  footer_address: z.string().optional(),
  footer_legal: z.string().optional(),
});

async function getAdminProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();
  if (!profile?.is_active || profile.role !== 'amministrazione') return null;
  return profile;
}

export async function GET() {
  const supabase = await createClient();
  const profile = await getAdminProfile(supabase);
  if (!profile) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await svc
    .from('email_layout_config')
    .select('*')
    .limit(1)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Layout non trovato' }, { status: 404 });

  return NextResponse.json({ layout: data });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const profile = await getAdminProfile(supabase);
  if (!profile) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Get the single row id first
  const { data: existing } = await svc.from('email_layout_config').select('id').limit(1).single();
  if (!existing) return NextResponse.json({ error: 'Layout non trovato' }, { status: 404 });

  const updatePayload = { ...parsed.data, updated_at: new Date().toISOString() };

  const { data, error } = await svc
    .from('email_layout_config')
    .update(updatePayload)
    .eq('id', existing.id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return NextResponse.json({ layout: data });
}
