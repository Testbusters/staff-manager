import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isValidUUID } from '@/lib/validate-id';

const CreateLezioneSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  orario_inizio: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  orario_fine: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  materie: z.array(z.string().min(1)).min(1),
});

async function getRole(req: NextRequest): Promise<{ userId: string | null; role: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { userId: null, role: null };
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();
  return { userId: user.id, role: profile?.is_active ? (profile.role as string) : null };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await getRole(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data, error } = await svc
    .from('lezioni')
    .select('*')
    .eq('corso_id', id)
    .order('data')
    .order('orario_inizio');

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  return NextResponse.json({ lezioni: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, role } = await getRole(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (role !== 'amministrazione') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });
  const body = await req.json();
  const parsed = CreateLezioneSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data, error } = await svc
    .from('lezioni')
    .insert({ ...parsed.data, corso_id: id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  return NextResponse.json({ lezione: data }, { status: 201 });
}
