import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getImportCURows } from '@/lib/cu-import-sheet';
import { buildFolderMap } from '@/lib/google-drive';

export interface CUPreviewRow {
  rowIndex: number;
  username: string;
  nome_pdf: string;
  anno:     number | null;
  stato:    'valid' | 'warning' | 'error';
  errors:   string[];
  warnings: string[];
}

export interface CUPreviewResponse {
  rows:              CUPreviewRow[];
  totalCount:        number;
  validCount:        number;
  warningCount:      number;
  skipCount:         number; // always 0 at preview time — skip determined at run time (V8)
  errorCount:        number;
  blockingUsernames: string[]; // usernames not found in DB — confirm disabled if non-empty
}

const ANNO_RE = /CU_(\d{4})_/;

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

  // ── Fetch sheet rows ─────────────────────────────────────────────────────────
  let rawRows: Awaited<ReturnType<typeof getImportCURows>>;
  try {
    rawRows = await getImportCURows();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Foglio non accessibile: ${msg}` }, { status: 502 });
  }

  if (rawRows.length === 0) {
    return NextResponse.json<CUPreviewResponse>({
      rows: [], totalCount: 0, validCount: 0, warningCount: 0, skipCount: 0, errorCount: 0, blockingUsernames: [],
    });
  }

  // ── Batch DB lookup: which usernames exist? ─────────────────────────────────
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const uniqueUsernames = [...new Set(rawRows.map(r => r.username.trim().toLowerCase()).filter(Boolean))];
  const { data: collabs } = await svc
    .from('collaborators')
    .select('username')
    .in('username', uniqueUsernames);

  const dbUsernameSet = new Set(
    (collabs ?? []).map((c: { username: string }) => c.username.toLowerCase()),
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

  // ── Stateless per-row validation ─────────────────────────────────────────────
  const batchUsernames     = new Map<string, number>(); // username → first rowIndex seen
  const batchPdfs          = new Map<string, number>(); // nome_pdf → first rowIndex seen
  const blockingUsernameSet = new Set<string>();

  const rows: CUPreviewRow[] = rawRows.map(r => {
    const username = r.username.trim().toLowerCase();
    const nome_pdf = r.nome_pdf.trim();
    const errors:   string[] = [];
    const warnings: string[] = [];

    // V1: username non vuoto
    if (!username) errors.push('username mancante');
    // V2: nome_pdf non vuoto
    if (!nome_pdf) errors.push('nome file PDF mancante');
    // V5: deve terminare con .pdf
    if (nome_pdf && !nome_pdf.toLowerCase().endsWith('.pdf')) errors.push('il nome file non termina con .pdf');

    // V4: anno estraibile da nome_pdf
    let anno: number | null = null;
    if (nome_pdf) {
      const match = ANNO_RE.exec(nome_pdf);
      if (!match) errors.push('anno non estraibile dal nome file (formato atteso: CU_YYYY_)');
      else         anno = parseInt(match[1], 10);
    }

    // V3: username deve esistere in DB (blocking)
    if (username && !dbUsernameSet.has(username)) {
      errors.push(`username "${username}" non trovato nel sistema`);
      blockingUsernameSet.add(username);
    }

    // Only check duplicates if no hard errors yet
    if (errors.length === 0) {
      // V6: username duplicato nel foglio (warning)
      if (batchUsernames.has(username)) {
        warnings.push(`username duplicato nel foglio (riga ${batchUsernames.get(username)})`);
      } else {
        batchUsernames.set(username, r.rowIndex);
      }

      // V7: nome_pdf duplicato nel foglio (warning)
      if (batchPdfs.has(nome_pdf)) {
        warnings.push(`nome file duplicato nel foglio (riga ${batchPdfs.get(nome_pdf)})`);
      } else {
        batchPdfs.set(nome_pdf, r.rowIndex);
      }

      // Warn if file not found in Drive (non-blocking: may fail at run time)
      if (nome_pdf && !folderMap.has(nome_pdf)) {
        warnings.push('file non trovato nella cartella Drive');
      }
    }

    const stato: CUPreviewRow['stato'] =
      errors.length > 0   ? 'error' :
      warnings.length > 0 ? 'warning' : 'valid';

    return { rowIndex: r.rowIndex, username, nome_pdf, anno, stato, errors, warnings };
  });

  const blockingUsernames = [...blockingUsernameSet];
  const validCount        = rows.filter(r => r.stato === 'valid').length;
  const warningCount      = rows.filter(r => r.stato === 'warning').length;
  const errorCount        = rows.filter(r => r.stato === 'error').length;

  return NextResponse.json<CUPreviewResponse>({
    rows,
    totalCount:   rows.length,
    validCount,
    warningCount,
    skipCount:    0,
    errorCount,
    blockingUsernames,
  });
}
