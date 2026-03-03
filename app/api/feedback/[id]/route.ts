import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'amministrazione') return null;
  return user;
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });

  const { id } = await params;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await svc
    .from('feedback')
    .update({ stato: 'completato' })
    .eq('id', id);

  if (error) return NextResponse.json({ error: 'Errore aggiornamento' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });

  const { id } = await params;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Fetch screenshot_path before deleting the record
  const { data: row } = await svc
    .from('feedback')
    .select('screenshot_path')
    .eq('id', id)
    .single();

  const { error } = await svc.from('feedback').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Errore eliminazione' }, { status: 500 });

  // Clean up storage file if present (non-blocking)
  if (row?.screenshot_path) {
    await svc.storage.from('feedback').remove([row.screenshot_path]);
  }

  return NextResponse.json({ ok: true });
}
