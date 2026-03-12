import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getContrattiRows, writeContrattiResults } from '@/lib/contratti-import-sheet';
import { buildFolderMap, downloadFile } from '@/lib/google-drive';
import { uploadBuffer } from '@/lib/documents-storage';
import { buildImportXLSX } from '@/lib/import-history-utils';

const ANNO_RE = /(?:contratto(?:tb|p4m))(\d{4})_/i;

export interface ContrattoRunDetail {
  rowIndex: number;
  username: string;
  nome_pdf: string;
  status:   'imported' | 'skip' | 'error';
  message?: string;
}

export interface ContrattoRunResult {
  imported: number;
  skipped:  number;
  errors:   number;
  details:  ContrattoRunDetail[];
}

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: caller } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!caller?.is_active || caller.role !== 'amministrazione') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const runStartTime = Date.now();

  // ── Fetch sheet rows ─────────────────────────────────────────────────────────
  let rawRows: Awaited<ReturnType<typeof getContrattiRows>>;
  try {
    rawRows = await getContrattiRows();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Foglio non accessibile: ${msg}` }, { status: 502 });
  }

  if (rawRows.length === 0) {
    return NextResponse.json<ContrattoRunResult>({ imported: 0, skipped: 0, errors: 0, details: [] });
  }

  // ── Re-validate ──────────────────────────────────────────────────────────────
  type ValidRow = { rowIndex: number; username: string; nome_pdf: string; anno: number | null };
  const validRows: ValidRow[]  = [];
  const details: ContrattoRunDetail[] = [];

  for (const r of rawRows) {
    const username = r.username.trim().toLowerCase();
    const nome_pdf = r.nome_pdf.trim();

    if (!nome_pdf) {
      details.push({ rowIndex: r.rowIndex, username, nome_pdf, status: 'error', message: 'nome file PDF mancante' });
      continue;
    }
    if (!username) {
      details.push({ rowIndex: r.rowIndex, username, nome_pdf, status: 'error', message: 'username mancante' });
      continue;
    }

    const match = ANNO_RE.exec(nome_pdf);
    const anno  = match ? parseInt(match[1], 10) : null;

    validRows.push({ rowIndex: r.rowIndex, username, nome_pdf, anno });
  }

  // ── Batch DB lookup: collaborators ──────────────────────────────────────────
  const uniqueUsernames = [...new Set(validRows.map(r => r.username))];
  const { data: collabs } = await svc
    .from('collaborators')
    .select('id, user_id, username')
    .in('username', uniqueUsernames);

  const dbMap = new Map<string, { id: string; user_id: string }>();
  (collabs ?? []).forEach((c: { id: string; user_id: string; username: string }) =>
    dbMap.set(c.username.toLowerCase(), { id: c.id, user_id: c.user_id }),
  );

  // ── Build Drive folder map ───────────────────────────────────────────────────
  const folderId = process.env.CONTRATTI_DRIVE_FOLDER_ID;
  if (!folderId) return NextResponse.json({ error: 'CONTRATTI_DRIVE_FOLDER_ID not set' }, { status: 500 });

  let folderMap: Map<string, string>;
  try {
    folderMap = await buildFolderMap(folderId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Drive non accessibile: ${msg}` }, { status: 502 });
  }

  // ── Process rows sequentially ────────────────────────────────────────────────
  const importedRowIndices: number[] = [];

  for (const r of validRows) {
    const collab = dbMap.get(r.username);
    if (!collab) {
      details.push({ rowIndex: r.rowIndex, username: r.username, nome_pdf: r.nome_pdf, status: 'error', message: `username "${r.username}" non trovato nel sistema` });
      continue;
    }

    const fileId = folderMap.get(r.nome_pdf);
    if (!fileId) {
      details.push({ rowIndex: r.rowIndex, username: r.username, nome_pdf: r.nome_pdf, status: 'error', message: `file "${r.nome_pdf}" non trovato nella cartella Drive` });
      continue;
    }

    try {
      // V4: check for existing CONTRATTO_OCCASIONALE (warning → skip)
      const { data: existing } = await svc
        .from('documents')
        .select('id')
        .eq('collaborator_id', collab.id)
        .eq('tipo', 'CONTRATTO_OCCASIONALE')
        .maybeSingle();

      if (existing) {
        details.push({ rowIndex: r.rowIndex, username: r.username, nome_pdf: r.nome_pdf, status: 'skip', message: 'contratto già presente' });
        continue;
      }

      // Download PDF from Drive
      const buffer = await downloadFile(fileId);

      // Insert document record (placeholder)
      const { data: doc, error: insertErr } = await svc
        .from('documents')
        .insert({
          collaborator_id:    collab.id,
          tipo:               'CONTRATTO_OCCASIONALE',
          anno:               r.anno,
          titolo:             r.nome_pdf,
          stato_firma:        'FIRMATO',
          file_original_url:  'pending',
          file_original_name: r.nome_pdf,
          requested_at:       new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertErr || !doc) throw new Error(insertErr?.message ?? 'DB insert failed');

      // Upload to Storage
      const storagePath = `${collab.user_id}/${doc.id}/${r.nome_pdf}`;
      const { error: uploadErr } = await uploadBuffer(storagePath, buffer);

      if (uploadErr) {
        await svc.from('documents').delete().eq('id', doc.id);
        throw new Error(`Storage upload failed: ${uploadErr}`);
      }

      // Update storage path
      await svc.from('documents').update({ file_original_url: storagePath }).eq('id', doc.id);

      details.push({ rowIndex: r.rowIndex, username: r.username, nome_pdf: r.nome_pdf, status: 'imported' });
      importedRowIndices.push(r.rowIndex);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      details.push({ rowIndex: r.rowIndex, username: r.username, nome_pdf: r.nome_pdf, status: 'error', message: msg });
    }
  }

  // ── GSheet writeback (non-blocking) ──────────────────────────────────────────
  try {
    await writeContrattiResults(importedRowIndices.map(rowIndex => ({ rowIndex })));
  } catch {
    // Non-blocking — import result does not depend on writeback
  }

  const imported = details.filter(d => d.status === 'imported').length;
  const skipped  = details.filter(d => d.status === 'skip').length;
  const errors   = details.filter(d => d.status === 'error').length;

  // ── Record import run + upload XLSX (non-blocking) ──────────────────────────
  try {
    const runId    = crypto.randomUUID();
    const xlsx     = buildImportXLSX('contratti', details);
    const xlsxPath = `contratti/${runId}.xlsx`;
    await svc.storage.from('imports').upload(xlsxPath, xlsx, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await svc.from('import_runs').insert({
      id:           runId,
      tipo:         'contratti',
      executed_by:  user.id,
      imported,
      skipped,
      errors,
      detail_json:  details,
      duration_ms:  Date.now() - runStartTime,
      storage_path: xlsxPath,
    });
  } catch {
    // Non-blocking
  }

  return NextResponse.json<ContrattoRunResult>({ imported, skipped, errors, details });
}
