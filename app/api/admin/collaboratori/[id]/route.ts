import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { isValidUUID } from '@/lib/validate-id';

const patchSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-z0-9_]+$/, 'Solo lettere minuscole, numeri e _'),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: caller } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!caller?.is_active || !['amministrazione', 'responsabile_compensi'].includes(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Community access check for responsabile_compensi
  if (caller.role === 'responsabile_compensi') {
    const { data: uca } = await admin
      .from('user_community_access')
      .select('community_id')
      .eq('user_id', user.id);
    const myCommIds = new Set((uca ?? []).map((u: { community_id: string }) => u.community_id));

    const { data: cc } = await admin
      .from('collaborator_communities')
      .select('community_id')
      .eq('collaborator_id', id);
    const collabCommIds = (cc ?? []).map((c: { community_id: string }) => c.community_id);

    if (!collabCommIds.some((cid: string) => myCommIds.has(cid))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }

  // Uniqueness check — exclude the target record itself
  const { data: existing } = await admin
    .from('collaborators')
    .select('id')
    .eq('username', parsed.data.username)
    .neq('id', id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Username già in uso' }, { status: 409 });
  }

  const { error } = await admin
    .from('collaborators')
    .update({ username: parsed.data.username })
    .eq('id', id);

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return NextResponse.json({ ok: true, username: parsed.data.username });
}
