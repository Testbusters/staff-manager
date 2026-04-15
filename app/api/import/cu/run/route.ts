import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getImportCURows, writeCUImportResults } from '@/lib/cu-import-sheet';
import { buildFolderMap, downloadFile } from '@/lib/google-drive';
import { uploadBuffer } from '@/lib/documents-storage';
import { buildImportXLSX } from '@/lib/import-history-utils';

const ANNO_RE    = /CU_(\d{4})_/;
const BATCH_SIZE = 5;
const BATCH_DELAY = 600; // ms — ~8 Drive downloads/sec, within quota

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export interface CURunDetail {
  rowIndex: number;
  username: string;
  nome_pdf: string;
  status:   'imported' | 'skip' | 'error';
  message?: string;
}

export interface CURunResult {
  imported: number;
  skipped:  number;
  errors:   number;
  details:  CURunDetail[];
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

  // ── Fetch sheet rows ─────────────────────────────────────────────────────────
  let rawRows: Awaited<ReturnType<typeof getImportCURows>>;
  try {
    rawRows = await getImportCURows();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Foglio non accessibile: ${msg}` }, { status: 502 });
  }

  if (rawRows.length === 0) {
    return NextResponse.json<CURunResult>({ imported: 0, skipped: 0, errors: 0, details: [] });
  }

  // ── Re-validate: separate valid rows from invalid ────────────────────────────
  type ValidRow = { rowIndex: number; username: string; nome_pdf: string; anno: number };
  const validRows:   ValidRow[]  = [];
  const invalidDetails: CURunDetail[] = [];

  for (const r of rawRows) {
    const username = r.username.trim().toLowerCase();
    const nome_pdf = r.nome_pdf.trim();
    if (!username || !nome_pdf || !nome_pdf.toLowerCase().endsWith('.pdf')) {
      invalidDetails.push({ rowIndex: r.rowIndex, username, nome_pdf, status: 'error', message: 'riga non valida (username o nome file mancante/non .pdf)' });
      continue;
    }
    const match = ANNO_RE.exec(nome_pdf);
    if (!match) {
      invalidDetails.push({ rowIndex: r.rowIndex, username, nome_pdf, status: 'error', message: 'anno non estraibile dal nome file' });
      continue;
    }
    validRows.push({ rowIndex: r.rowIndex, username, nome_pdf, anno: parseInt(match[1], 10) });
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
  const folderId = process.env.CU_DRIVE_FOLDER_ID;
  if (!folderId) return NextResponse.json({ error: 'CU_DRIVE_FOLDER_ID not set' }, { status: 500 });

  let folderMap: Map<string, string>;
  try {
    folderMap = await buildFolderMap(folderId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Drive non accessibile: ${msg}` }, { status: 502 });
  }

  // ── Process in batches ───────────────────────────────────────────────────────
  const runStartTime = Date.now();
  const details: CURunDetail[] = [...invalidDetails];
  const sheetUpdates: { rowIndex: number; stato: 'PROCESSED' | 'SKIP' | 'ERROR'; note: string }[] = [
    ...invalidDetails.map(d => ({
      rowIndex: d.rowIndex,
      stato:    'ERROR' as const,
      note:     d.message ?? 'errore validazione',
    })),
  ];

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (r) => {
      const collab = dbMap.get(r.username);
      if (!collab) {
        const msg = `username "${r.username}" non trovato nel sistema`;
        details.push({ rowIndex: r.rowIndex, username: r.username, nome_pdf: r.nome_pdf, status: 'error', message: msg });
        sheetUpdates.push({ rowIndex: r.rowIndex, stato: 'ERROR', note: msg });
        return;
      }

      const fileId = folderMap.get(r.nome_pdf);
      if (!fileId) {
        const msg = `file "${r.nome_pdf}" non trovato nella cartella Drive`;
        details.push({ rowIndex: r.rowIndex, username: r.username, nome_pdf: r.nome_pdf, status: 'error', message: msg });
        sheetUpdates.push({ rowIndex: r.rowIndex, stato: 'ERROR', note: msg });
        return;
      }

      try {
        // V8: check duplicate (collaborator_id + anno + tipo CU)
        const { data: existing } = await svc
          .from('documents')
          .select('id')
          .eq('collaborator_id', collab.id)
          .eq('tipo', 'CU')
          .eq('anno', r.anno)
          .maybeSingle();

        if (existing) {
          details.push({ rowIndex: r.rowIndex, username: r.username, nome_pdf: r.nome_pdf, status: 'skip', message: `CU ${r.anno} già presente` });
          sheetUpdates.push({ rowIndex: r.rowIndex, stato: 'SKIP', note: `CU ${r.anno} già presente` });
          return;
        }

        // Download PDF from Drive
        const buffer = await downloadFile(fileId);

        // Create document record (placeholder)
        const { data: doc, error: insertErr } = await svc
          .from('documents')
          .insert({
            collaborator_id:    collab.id,
            tipo:               'CU',
            anno:               r.anno,
            titolo:             r.nome_pdf,
            stato_firma:        'NON_RICHIESTO',
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

        // In-app notification
        await svc.from('notifications').insert({
          user_id:     collab.user_id,
          tipo:        'cu_disponibile',
          titolo:      `CU ${r.anno} disponibile`,
          messaggio:   `La tua Certificazione Unica ${r.anno} è disponibile nella sezione Documenti.`,
          entity_type: 'document',
          entity_id:   doc.id,
        });

        details.push({ rowIndex: r.rowIndex, username: r.username, nome_pdf: r.nome_pdf, status: 'imported' });
        sheetUpdates.push({ rowIndex: r.rowIndex, stato: 'PROCESSED', note: '' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        details.push({ rowIndex: r.rowIndex, username: r.username, nome_pdf: r.nome_pdf, status: 'error', message: msg });
        sheetUpdates.push({ rowIndex: r.rowIndex, stato: 'ERROR', note: msg });
      }
    }));

    if (i + BATCH_SIZE < validRows.length) await sleep(BATCH_DELAY);
  }

  // ── Writeback to sheet (non-blocking) ────────────────────────────────────────
  try {
    await writeCUImportResults(sheetUpdates);
  } catch {
    // Non-blocking — import result does not depend on writeback
  }

  const imported = details.filter(d => d.status === 'imported').length;
  const skipped  = details.filter(d => d.status === 'skip').length;
  const errors   = details.filter(d => d.status === 'error').length;

  // ── Record import run + upload XLSX (non-blocking) ──────────────────────────
  try {
    const runId    = crypto.randomUUID();
    const xlsx     = await buildImportXLSX('cu', details);
    const xlsxPath = `cu/${runId}.xlsx`;
    await svc.storage.from('imports').upload(xlsxPath, xlsx, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await svc.from('import_runs').insert({
      id:           runId,
      tipo:         'cu',
      executed_by:  user.id,
      imported,
      skipped,
      errors,
      detail_json:  details,
      duration_ms:  Date.now() - runStartTime,
      storage_path: xlsxPath,
    });
  } catch {
    // Non-blocking — don't fail the import if tracking insert fails
  }

  return NextResponse.json<CURunResult>({ imported, skipped, errors, details });
}
