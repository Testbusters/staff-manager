import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isValidUUID } from '@/lib/validate-id';

const ADMIN_ROLES = ['amministrazione'];

const PatchSchema = z.object({
  member_status: z.enum(['attivo', 'uscente_con_compenso', 'uscente_senza_compenso']),
  is_active: z.boolean(),
  data_ingresso: z.string().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Utente non attivo' }, { status: 403 });
  if (!ADMIN_ROLES.includes(profile.role)) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Payload non valido' }, { status: 400 });
  }
  const { member_status, is_active, data_ingresso } = parsed.data;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Resolve user_id from collaborator id
  const { data: collab, error: collabError } = await svc
    .from('collaborators')
    .select('id, user_id')
    .eq('id', id)
    .single();

  if (collabError || !collab) {
    return NextResponse.json({ error: 'Collaboratore non trovato' }, { status: 404 });
  }

  // Parallel updates
  const [profileUpdate, collabUpdate] = await Promise.all([
    svc.from('user_profiles')
      .update({ member_status, is_active })
      .eq('user_id', collab.user_id),
    svc.from('collaborators')
      .update({ data_ingresso: data_ingresso ?? null })
      .eq('id', id),
  ]);

  if (profileUpdate.error) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
  if (collabUpdate.error) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }

  return NextResponse.json({ updated: true });
}
