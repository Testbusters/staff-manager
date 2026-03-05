import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ExpenseDetail from '@/components/expense/ExpenseDetail';
import ExpenseActionPanel from '@/components/expense/ExpenseActionPanel';
import Timeline from '@/components/compensation/Timeline';
import type { Role, ExpenseStatus, HistoryEvent } from '@/lib/types';

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) redirect('/pending');

  const { id } = await params;

  const { data: expense, error } = await supabase
    .from('expense_reimbursements')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !expense) notFound();

  const { data: attachments } = await supabase
    .from('expense_attachments')
    .select('*')
    .eq('reimbursement_id', id)
    .order('created_at', { ascending: true });

  const { data: history } = await supabase
    .from('expense_history')
    .select('*')
    .eq('reimbursement_id', id)
    .order('created_at', { ascending: true });

  // Fetch collaborator name for admin/responsabile views
  const { data: collaborator } = await supabase
    .from('collaborators')
    .select('nome, cognome')
    .eq('id', expense.collaborator_id)
    .single();

  const role = profile.role as Role;

  // Enrich history with changed_by_name (role-gated — collaboratore sees role_label only)
  const rawHistory = history ?? [];
  let historyForTimeline: HistoryEvent[] = rawHistory.map((h) => ({
    id: h.id,
    stato_precedente: h.stato_precedente,
    stato_nuovo: h.stato_nuovo,
    role_label: h.role_label,
    note: h.note,
    created_at: h.created_at,
  }));

  if (role !== 'collaboratore') {
    const changedByIds = [...new Set(
      rawHistory.map((h) => h.changed_by).filter((id): id is string => id != null)
    )];
    if (changedByIds.length > 0) {
      const { data: collabs } = await supabase
        .from('collaborators')
        .select('user_id, nome, cognome')
        .in('user_id', changedByIds);
      const nameMap = new Map<string, string>();
      for (const c of collabs ?? []) {
        if (c.user_id) nameMap.set(c.user_id, `${c.nome ?? ''} ${c.cognome ?? ''}`.trim());
      }
      historyForTimeline = rawHistory.map((h) => ({
        id: h.id,
        stato_precedente: h.stato_precedente,
        stato_nuovo: h.stato_nuovo,
        role_label: h.role_label,
        note: h.note,
        created_at: h.created_at,
        changed_by_name: h.changed_by ? (nameMap.get(h.changed_by) ?? null) : null,
      }));
    }
  }

  const backHref =
    role === 'collaboratore'
      ? '/rimborsi'
      : role === 'responsabile_compensi'
      ? '/approvazioni?tab=rimborsi'
      : '/coda?tab=rimborsi';

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground transition">
          ← Indietro
        </Link>
        <span className="text-gray-700">/</span>
        <h1 className="text-xl font-semibold text-foreground">Dettaglio rimborso</h1>
      </div>

      <div className="space-y-6">
        <ExpenseDetail
          expense={expense}
          attachments={attachments ?? []}
          collaborator={role !== 'collaboratore' ? collaborator : null}
        />

        <ExpenseActionPanel
          expenseId={id}
          stato={expense.stato as ExpenseStatus}
          role={role}
        />

        {historyForTimeline.length > 0 && (
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
              Cronologia
            </p>
            <Timeline events={historyForTimeline} />
          </div>
        )}
      </div>
    </div>
  );
}
