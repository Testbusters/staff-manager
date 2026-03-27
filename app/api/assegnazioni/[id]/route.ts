import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function DELETE(
  _req: NextRequest,
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

  const { id } = await params;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Fetch the assegnazione
  const { data: assegnazione } = await svc
    .from('assegnazioni')
    .select('id, ruolo, lezione_id')
    .eq('id', id)
    .maybeSingle();

  if (!assegnazione) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (assegnazione.ruolo !== 'cocoda') {
    return NextResponse.json({ error: 'Only cocoda assegnazioni can be removed' }, { status: 400 });
  }

  // Defense-in-depth: verify lezione's corso belongs to the resp.citt's city
  if (profile.citta_responsabile) {
    const { data: lezione } = await svc
      .from('lezioni')
      .select('corso_id')
      .eq('id', assegnazione.lezione_id)
      .single();

    if (lezione) {
      const { data: corso } = await svc
        .from('corsi')
        .select('citta')
        .eq('id', lezione.corso_id)
        .single();

      if (!corso || corso.citta !== profile.citta_responsabile) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
  }

  const { error } = await svc
    .from('assegnazioni')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  return NextResponse.json({ success: true });
}
