import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isValidUUID } from '@/lib/validate-id';

const PatchLezioneSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  orario_inizio: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  orario_fine: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  materia: z.string().min(1).optional(),
});

async function getAdminContext(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, isAdmin: false };
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();
  return { user, isAdmin: profile?.is_active && profile.role === 'amministrazione' };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lid: string }> },
) {
  const { user, isAdmin } = await getAdminContext(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, lid } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });
  if (!isValidUUID(lid)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });
  const body = await req.json();
  const parsed = PatchLezioneSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data, error } = await svc.from('lezioni').update(parsed.data).eq('id', lid).select().single();
  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  return NextResponse.json({ lezione: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lid: string }> },
) {
  const { user, isAdmin } = await getAdminContext(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, lid } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });
  if (!isValidUUID(lid)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { error } = await svc.from('lezioni').delete().eq('id', lid);
  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
