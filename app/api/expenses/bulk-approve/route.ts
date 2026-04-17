import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ROLE_LABELS } from '@/lib/types';
import { getYtd, isOverMassimale } from '@/lib/massimale';
import type { MassimaleImpact } from '@/components/admin/MassimaleCheckModal';

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

  // Fetch expenses with full details for massimale check
  const { data: expenses, error: fetchError } = await svc
    .from('expense_reimbursements')
    .select('id, stato, collaborator_id, importo, categoria, data_spesa')
    .in('id', ids);

  if (fetchError) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  const notPending = (expenses ?? []).filter((e) => e.stato !== 'IN_ATTESA');
  if (notPending.length > 0) {
    return NextResponse.json(
      { error: 'Alcuni rimborsi non sono in stato IN_ATTESA.' },
      { status: 400 },
    );
  }

  // Fetch collaborator massimale + ytd data
  const collabIds = [...new Set((expenses ?? []).map((e) => e.collaborator_id))];
  const { data: collabs } = await svc
    .from('collaborators')
    .select('id, nome, cognome, importo_lordo_massimale, approved_lordo_ytd, approved_year')
    .in('id', collabIds);

  const collabMap = new Map((collabs ?? []).map((c) => [c.id, c]));

  // Group incoming items by collaborator
  const byCollab = new Map<string, Array<{ id: string; collaborator_id: string; importo: number | null; categoria: string | null; data_spesa: string | null }>>();
  for (const exp of (expenses ?? [])) {
    if (!byCollab.has(exp.collaborator_id)) byCollab.set(exp.collaborator_id, []);
    byCollab.get(exp.collaborator_id)!.push(exp);
  }

  // Split into allowed / blocked
  const allowedIds: string[] = [];
  const blocked: MassimaleImpact[] = [];

  for (const [collabId, items] of byCollab) {
    const collab = collabMap.get(collabId);
    const totale = items.reduce((s, e) => s + (e.importo ?? 0), 0);

    if (collab && isOverMassimale(getYtd(collab), totale, collab.importo_lordo_massimale)) {
      const ytd = getYtd(collab);
      blocked.push({
        collaboratorId: collabId,
        collabName: `${collab.nome ?? ''} ${collab.cognome ?? ''}`.trim(),
        massimale: collab.importo_lordo_massimale!,
        already_approved: ytd,
        totale,
        eccedenza: ytd + totale - collab.importo_lordo_massimale!,
        items: items.map((e) => ({
          id: e.id,
          importo: e.importo ?? 0,
          label: e.categoria ?? null,
          date: e.data_spesa ?? null,
        })),
      });
    } else {
      allowedIds.push(...items.map((e) => e.id));
    }
  }

  const errors: string[] = [];

  if (allowedIds.length > 0) {
    const now = new Date().toISOString();
    const { error: updateError } = await svc
      .from('expense_reimbursements')
      .update({ stato: 'APPROVATO', approved_by: user.id, approved_at: now })
      .in('id', allowedIds);

    if (updateError) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

    const historyRows = allowedIds.map((id) => ({
      reimbursement_id: id,
      stato_precedente: 'IN_ATTESA',
      stato_nuovo: 'APPROVATO',
      changed_by: user.id,
      role_label: ROLE_LABELS['amministrazione'],
      note: null,
    }));
    const { error: historyError } = await svc.from('expense_history').insert(historyRows);
    if (historyError) console.error('expense_history insert failed:', historyError.message);

    // Update approved_lordo_ytd counter per collaborator
    const year = new Date().getFullYear();
    const deltaByCollab = new Map<string, number>();
    for (const exp of (expenses ?? [])) {
      if (allowedIds.includes(exp.id)) {
        deltaByCollab.set(
          exp.collaborator_id,
          (deltaByCollab.get(exp.collaborator_id) ?? 0) + (exp.importo ?? 0),
        );
      }
    }
    const ytdResults = await Promise.all(
      Array.from(deltaByCollab, ([collabId, delta]) => {
        const collab = collabMap.get(collabId);
        const currentYtd = collab ? getYtd(collab) : 0;
        return svc.from('collaborators').update({
          approved_lordo_ytd: currentYtd + delta,
          approved_year: year,
        }).eq('id', collabId).then(({ error }) => {
          if (error) errors.push(`ytd update failed for ${collabId}: ${error.message}`);
        });
      }),
    );
  }

  return NextResponse.json({ approved: allowedIds, blocked, errors });
}
