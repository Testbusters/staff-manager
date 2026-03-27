import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { z } from 'zod';

const patchSchema = z.object({
  subject: z.string().optional(),
  body_before: z.string().optional(),
  highlight_rows: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  body_after: z.string().optional(),
  cta_label: z.string().optional(),
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const supabase = await createClient();
  const profile = await getAdminProfile(supabase);
  if (!profile) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });

  const { key } = await params;
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await svc
    .from('email_templates')
    .select('*')
    .eq('key', key)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Template non trovato' }, { status: 404 });

  return NextResponse.json({ template: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const supabase = await createClient();
  const profile = await getAdminProfile(supabase);
  if (!profile) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });

  const { key } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const updatePayload = { ...parsed.data, updated_at: new Date().toISOString() };

  const { data, error } = await svc
    .from('email_templates')
    .update(updatePayload)
    .eq('key', key)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return NextResponse.json({ template: data });
}
