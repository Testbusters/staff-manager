import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import ExportSection from '@/components/export/ExportSection';
import { groupToCollaboratorRows } from '@/lib/export-utils';
import type { ExportRunWithUrl } from '@/lib/export-utils';

export default async function ExportPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) redirect('/pending');
  if (profile.role !== 'amministrazione') redirect('/');

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Fetch compensations: APPROVATO + not yet exported
  const { data: rawComps } = await svc
    .from('compensations')
    .select('id, collaborator_id, importo_lordo, importo_netto, nome_servizio_ruolo')
    .eq('stato', 'APPROVATO')
    .is('exported_at', null);

  // Fetch expenses: APPROVATO + not yet exported
  const { data: rawExps } = await svc
    .from('expense_reimbursements')
    .select('id, collaborator_id, importo, categoria')
    .eq('stato', 'APPROVATO')
    .is('exported_at', null);

  const comps = rawComps ?? [];
  const exps = rawExps ?? [];

  // Fetch collaborator details (two-step, no PostgREST embedded join)
  const allCollabIds = [
    ...new Set([
      ...comps.map((c) => c.collaborator_id),
      ...exps.map((e) => e.collaborator_id),
    ]),
  ];

  const collabMap = new Map<string, {
    id: string; email: string; nome: string; cognome: string;
    data_nascita: string | null; luogo_nascita: string | null;
    comune: string | null; indirizzo: string | null;
    codice_fiscale: string | null; iban: string | null;
    intestatario_pagamento: string | null;
  }>();

  if (allCollabIds.length > 0) {
    const { data: collabRows } = await svc
      .from('collaborators')
      .select('id, email, nome, cognome, data_nascita, luogo_nascita, comune, indirizzo, codice_fiscale, iban, intestatario_pagamento')
      .in('id', allCollabIds);
    for (const c of collabRows ?? []) collabMap.set(c.id, c);
  }

  const compensationInputs = comps
    .map((c) => {
      const col = collabMap.get(c.collaborator_id);
      return col ? { ...c, collaborator: col } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const expenseInputs = exps
    .map((e) => {
      const col = collabMap.get(e.collaborator_id);
      return col ? { ...e, collaborator: col } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const rows = groupToCollaboratorRows(compensationInputs, expenseInputs);

  // Fetch export history
  const { data: runRows } = await svc
    .from('export_runs')
    .select('id, exported_at, collaborator_count, compensation_count, expense_count, storage_path')
    .order('exported_at', { ascending: false })
    .limit(50);

  const runs: ExportRunWithUrl[] = await Promise.all(
    (runRows ?? []).map(async (run) => {
      let download_url: string | null = null;
      if (run.storage_path) {
        const { data: signed } = await svc.storage
          .from('exports')
          .createSignedUrl(run.storage_path, 3600);
        download_url = signed?.signedUrl ?? null;
      }
      return { ...run, download_url };
    }),
  );

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Export</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Compensi e rimborsi approvati da esportare su Google Sheets.
        </p>
      </div>

      <ExportSection rows={rows} runs={runs} />
    </div>
  );
}
