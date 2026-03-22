import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const ValutazioneSchema = z.object({
  collaborator_id: z.string().uuid(),
  valutazione: z.number().min(1).max(10),
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
    .select('role, citta_responsabile')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'responsabile_cittadino') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!profile.citta_responsabile) {
    return NextResponse.json({ error: 'No citta_responsabile set' }, { status: 403 });
  }

  const { id: corsoId } = await params;

  const body = await req.json();
  const parsed = ValutazioneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }
  const { collaborator_id, valutazione } = parsed.data;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Verify corso belongs to resp.citt's city
  const { data: corso } = await svc
    .from('corsi')
    .select('citta')
    .eq('id', corsoId)
    .single();

  if (!corso || corso.citta !== profile.citta_responsabile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: lezioni } = await svc
    .from('lezioni')
    .select('id')
    .eq('corso_id', corsoId);

  const lezioniIds = (lezioni ?? []).map((l: { id: string }) => l.id);

  if (lezioniIds.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const { data, error } = await svc
    .from('assegnazioni')
    .update({ valutazione })
    .eq('collaborator_id', collaborator_id)
    .in('lezione_id', lezioniIds)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: data?.length ?? 0 });
}
