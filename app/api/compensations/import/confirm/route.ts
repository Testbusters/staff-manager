import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { fetchPendingRows, markRowsProcessed } from '@/lib/google-sheets';
import { ROLE_LABELS } from '@/lib/types';
import type { Role } from '@/lib/types';

const RITENUTA_RATE = 0.2;
const VALID_COMPETENZE = ['corsi', 'produzione_materiale', 'sb', 'extra'];

function parseDate(raw: string): string | null {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseImporto(raw: string): number | null {
  if (!raw) return null;
  const clean = raw.replace(/[^\d.,-]/g, '');
  const lastComma = clean.lastIndexOf(',');
  const lastDot = clean.lastIndexOf('.');
  let normalized: string;
  if (lastComma > lastDot) {
    normalized = clean.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = clean.replace(/,/g, '');
  }
  const n = parseFloat(normalized);
  return isNaN(n) ? null : Math.round(n * 100) / 100;
}

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
  if (!['responsabile_compensi', 'amministrazione'].includes(profile.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const role = profile.role as Role;
  const roleLabel = ROLE_LABELS[role];

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Re-fetch and re-validate (stateless — no trust of client state)
  let rawRows;
  try {
    rawRows = await fetchPendingRows();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore lettura foglio';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (rawRows.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0, errors: [] });
  }

  // Bulk-fetch collaborators
  const usernames = [...new Set(rawRows.map((r) => r.collaboratore).filter(Boolean))];
  const { data: collabData } = await serviceClient
    .from('collaborators')
    .select('id, username')
    .in('username', usernames);

  const collabByUsername = new Map<string, string>(
    (collabData ?? []).map((c: { id: string; username: string }) => [c.username, c.id])
  );

  type ValidRow = {
    rowIndex: number;
    collaborator_id: string;
    data_competenza: string;
    importo_lordo: number;
    ritenuta_acconto: number;
    importo_netto: number;
    nome_servizio_ruolo: string | null;
    info_specifiche: string | null;
    competenza: string | null;
  };

  const validRows: ValidRow[] = [];
  const errors: { rowIndex: number; collaboratore: string; reason: string }[] = [];

  for (const raw of rawRows) {
    const errs: string[] = [];

    const collaborator_id = collabByUsername.get(raw.collaboratore);
    if (!collaborator_id) errs.push(`username "${raw.collaboratore}" non trovato`);

    const data_competenza = parseDate(raw.data_competenza);
    if (!data_competenza) errs.push(`data_competenza non valida`);

    const importo_lordo = parseImporto(raw.importo_lordo);
    if (importo_lordo === null || importo_lordo <= 0) errs.push(`importo non valido`);

    const competenza = raw.competenza || null;
    if (competenza && !VALID_COMPETENZE.includes(competenza))
      errs.push(`competenza non valida: "${competenza}"`);

    if (errs.length > 0) {
      errors.push({ rowIndex: raw.rowIndex, collaboratore: raw.collaboratore, reason: errs.join('; ') });
      continue;
    }

    const lordo = importo_lordo!;
    validRows.push({
      rowIndex: raw.rowIndex,
      collaborator_id: collaborator_id!,
      data_competenza: data_competenza!,
      importo_lordo: lordo,
      ritenuta_acconto: Math.round(lordo * RITENUTA_RATE * 100) / 100,
      importo_netto: Math.round(lordo * (1 - RITENUTA_RATE) * 100) / 100,
      nome_servizio_ruolo: raw.nome_servizio_ruolo || null,
      info_specifiche: raw.info_specifiche && raw.info_specifiche !== '-' ? raw.info_specifiche : null,
      competenza,
    });
  }

  if (validRows.length === 0) {
    return NextResponse.json({ imported: 0, skipped: errors.length, errors });
  }

  // Insert compensations
  const inserts = validRows.map((r) => ({
    collaborator_id: r.collaborator_id,
    community_id: null,
    stato: 'IN_ATTESA',
    data_competenza: r.data_competenza,
    importo_lordo: r.importo_lordo,
    ritenuta_acconto: r.ritenuta_acconto,
    importo_netto: r.importo_netto,
    nome_servizio_ruolo: r.nome_servizio_ruolo,
    info_specifiche: r.info_specifiche,
    competenza: r.competenza,
    periodo_riferimento: null,
  }));

  const { data: inserted, error: insertError } = await serviceClient
    .from('compensations')
    .insert(inserts)
    .select('id');

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Insert history entries
  const historyInserts = (inserted ?? []).map((comp: { id: string }, i: number) => ({
    compensation_id: comp.id,
    stato_precedente: null,
    stato_nuovo: 'IN_ATTESA',
    changed_by: user.id,
    role_label: roleLabel,
    note: 'Importato da Google Sheet',
  }));

  if (historyInserts.length > 0) {
    await serviceClient.from('compensation_history').insert(historyInserts);
  }

  // Writeback: mark imported rows as PROCESSED
  const importedRowNumbers = validRows.map((r) => r.rowIndex);
  try {
    await markRowsProcessed(importedRowNumbers);
  } catch {
    // Non-blocking: DB records are already saved; writeback failure is logged only
    console.error('GSheet writeback failed for rows:', importedRowNumbers);
  }

  return NextResponse.json({
    imported: validRows.length,
    skipped: errors.length,
    errors,
  });
}
