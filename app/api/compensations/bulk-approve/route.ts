import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ROLE_LABELS } from '@/lib/types';

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Utente non attivo' }, { status: 403 });
  if (profile.role !== 'amministrazione') {
    return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }

  const { ids } = parsed.data;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: comps, error: fetchError } = await svc
    .from('compensations')
    .select('id, stato')
    .in('id', ids);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const notPending = (comps ?? []).filter((c) => c.stato !== 'IN_ATTESA');
  if (notPending.length > 0) {
    return NextResponse.json(
      { error: 'Alcuni compensi non sono in stato IN_ATTESA.' },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  const { error: updateError } = await svc
    .from('compensations')
    .update({ stato: 'APPROVATO', approved_by: user.id, approved_at: now })
    .in('id', ids);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const historyRows = ids.map((id) => ({
    compensation_id: id,
    stato_precedente: 'IN_ATTESA',
    stato_nuovo: 'APPROVATO',
    changed_by: user.id,
    role_label: ROLE_LABELS['amministrazione'],
    note: null,
  }));

  const { error: historyError } = await svc.from('compensation_history').insert(historyRows);
  if (historyError) console.error('compensation_history insert failed:', historyError.message);

  return NextResponse.json({ approved: ids.length });
}
