import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import {
  groupToCollaboratorRows,
  toGSheetRow,
  buildHistoryXLSXWorkbook,
} from '@/lib/export-utils';
import { writeExportRows } from '@/lib/google-sheets';

export async function POST() {
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

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Step 1: fetch compensations and expenses (two separate queries — no PostgREST embedded join)
  const { data: rawComps, error: compErr } = await svc
    .from('compensations')
    .select('id, collaborator_id, importo_lordo, importo_netto, nome_servizio_ruolo')
    .eq('stato', 'APPROVATO')
    .is('exported_at', null);

  if (compErr) return NextResponse.json({ error: compErr.message }, { status: 500 });

  const { data: rawExps, error: expErr } = await svc
    .from('expense_reimbursements')
    .select('id, collaborator_id, importo, categoria')
    .eq('stato', 'APPROVATO')
    .is('exported_at', null);

  if (expErr) return NextResponse.json({ error: expErr.message }, { status: 500 });

  const comps = rawComps ?? [];
  const exps = rawExps ?? [];

  if (comps.length === 0 && exps.length === 0) {
    return NextResponse.json({ error: 'Nessun elemento da esportare' }, { status: 400 });
  }

  // Step 2: fetch collaborator details for all involved IDs
  const allCollabIds = [
    ...new Set([
      ...comps.map((c) => c.collaborator_id),
      ...exps.map((e) => e.collaborator_id),
    ]),
  ];

  const { data: collabRows, error: collabErr } = await svc
    .from('collaborators')
    .select('id, email, nome, cognome, data_nascita, luogo_nascita, comune, indirizzo, codice_fiscale, iban, intestatario_pagamento')
    .in('id', allCollabIds);

  if (collabErr) return NextResponse.json({ error: collabErr.message }, { status: 500 });

  const collabMap = new Map(
    (collabRows ?? []).map((c) => [c.id, c]),
  );

  // Step 3: build typed inputs and aggregate
  const compensationInputs = comps
    .map((c) => {
      const col = collabMap.get(c.collaborator_id);
      if (!col) return null;
      return { ...c, collaborator: col };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const expenseInputs = exps
    .map((e) => {
      const col = collabMap.get(e.collaborator_id);
      if (!col) return null;
      return { ...e, collaborator: col };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const rows = groupToCollaboratorRows(compensationInputs, expenseInputs);

  // Step 4: write to Google Sheet
  try {
    await writeExportRows(rows.map(toGSheetRow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Google Sheets error: ${msg}` }, { status: 500 });
  }

  const now = new Date().toISOString();
  const allCompIds = comps.map((c) => c.id);
  const allExpIds = exps.map((e) => e.id);

  // Step 5: stamp exported_at
  if (allCompIds.length > 0) {
    await svc.from('compensations').update({ exported_at: now }).in('id', allCompIds);
  }
  if (allExpIds.length > 0) {
    await svc.from('expense_reimbursements').update({ exported_at: now }).in('id', allExpIds);
  }

  // Step 6: build XLS and upload to storage
  const wb = buildHistoryXLSXWorkbook(rows);
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  const storagePath = `export-${now.slice(0, 10)}-${Date.now()}.xlsx`;

  const { error: uploadErr } = await svc.storage
    .from('exports')
    .upload(storagePath, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

  if (uploadErr) {
    console.error('Storage upload failed:', uploadErr.message);
  }

  // Step 7: record the run
  const { data: runRow } = await svc
    .from('export_runs')
    .insert({
      exported_by: user.id,
      collaborator_count: rows.length,
      compensation_count: allCompIds.length,
      expense_count: allExpIds.length,
      storage_path: uploadErr ? null : storagePath,
    })
    .select('id')
    .single();

  return NextResponse.json({
    run_id: runRow?.id ?? null,
    collaborator_count: rows.length,
    item_count: allCompIds.length + allExpIds.length,
  });
}
