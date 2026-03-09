import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { ReceiptPreviewItem } from '@/lib/types';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active || profile.role !== 'amministrazione') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Fetch LIQUIDATO compensations without receipt
  const [compsRes, expsRes, pendingCompsRes, pendingExpsRes] = await Promise.all([
    svc.from('compensations')
      .select('collaborator_id, importo_lordo')
      .eq('stato', 'LIQUIDATO')
      .is('receipt_document_id', null),
    svc.from('expense_reimbursements')
      .select('collaborator_id, importo')
      .eq('stato', 'LIQUIDATO')
      .is('receipt_document_id', null),
    svc.from('compensations').select('id').eq('stato', 'APPROVATO'),
    svc.from('expense_reimbursements').select('id').eq('stato', 'APPROVATO'),
  ]);

  const comps = compsRes.data ?? [];
  const exps = expsRes.data ?? [];
  const pendingCount = (pendingCompsRes.data?.length ?? 0) + (pendingExpsRes.data?.length ?? 0);

  // Aggregate by collaborator
  const byCollab = new Map<string, { lordoCompensi: number; lordoRimborsi: number }>();
  for (const c of comps) {
    const k = c.collaborator_id;
    if (!byCollab.has(k)) byCollab.set(k, { lordoCompensi: 0, lordoRimborsi: 0 });
    byCollab.get(k)!.lordoCompensi += c.importo_lordo ?? 0;
  }
  for (const e of exps) {
    const k = e.collaborator_id;
    if (!byCollab.has(k)) byCollab.set(k, { lordoCompensi: 0, lordoRimborsi: 0 });
    byCollab.get(k)!.lordoRimborsi += e.importo ?? 0;
  }

  if (byCollab.size === 0) {
    return NextResponse.json({ items: [], pending_approvato_count: pendingCount });
  }

  // Fetch collaborator names
  const collabIds = [...byCollab.keys()];
  const { data: collabs } = await svc
    .from('collaborators')
    .select('id, nome, cognome')
    .in('id', collabIds);

  const collabMap = new Map((collabs ?? []).map((c) => [c.id, c]));

  const items: ReceiptPreviewItem[] = [...byCollab.entries()].map(([collabId, totals]) => {
    const collab = collabMap.get(collabId);
    const ritenuta = totals.lordoCompensi * 0.2;
    const totaleLordo = totals.lordoCompensi + totals.lordoRimborsi;
    const netto = totaleLordo - ritenuta;
    return {
      collaborator_id: collabId,
      nome: collab?.nome ?? '',
      cognome: collab?.cognome ?? '',
      lordo_compensi: totals.lordoCompensi,
      lordo_rimborsi: totals.lordoRimborsi,
      totale_lordo: totaleLordo,
      ritenuta,
      netto,
    };
  });

  return NextResponse.json({ items, pending_approvato_count: pendingCount });
}
