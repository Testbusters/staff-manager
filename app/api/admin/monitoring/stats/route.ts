import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (profile.role !== 'amministrazione') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [comps, rimborsi, docs, tickets, onboarding] = await Promise.all([
    svc.from('compensations').select('id', { count: 'exact', head: true }).eq('stato', 'IN_ATTESA'),
    svc.from('expense_reimbursements').select('id', { count: 'exact', head: true }).eq('stato', 'IN_ATTESA'),
    svc.from('documents').select('id', { count: 'exact', head: true }).eq('stato_firma', 'DA_FIRMARE'),
    svc.from('tickets').select('id', { count: 'exact', head: true }).eq('stato', 'APERTO'),
    svc.from('user_profiles').select('user_id', { count: 'exact', head: true }).eq('onboarding_completed', false).eq('role', 'collaboratore'),
  ]);

  return NextResponse.json({
    compensi_in_attesa: comps.count ?? 0,
    rimborsi_in_attesa: rimborsi.count ?? 0,
    doc_da_firmare: docs.count ?? 0,
    ticket_aperti: tickets.count ?? 0,
    onboarding_incompleti: onboarding.count ?? 0,
  });
}
