import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getContrattiRows } from '@/lib/contratti-import-sheet';
import { buildFolderMap } from '@/lib/google-drive';

export interface ContrattoPreviewRow {
  rowIndex:  number;
  username:  string;
  nome_pdf:  string;
  anno:      number | null;
  stato:     'valid' | 'warning' | 'error';
  errors:    string[];
  warnings:  string[];
}

export interface ContrattoPreviewResponse {
  rows:              ContrattoPreviewRow[];
  totalCount:        number;
  validCount:        number;
  warningCount:      number;
  errorCount:        number;
  blockingUsernames: string[];
}

// Extract year from filename (e.g. contrattotb2024_mario_rossi_firmato_20240101.pdf → 2024)
const ANNO_RE = /(?:contratto(?:tb|p4m))(\d{4})_/i;

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
  let rawRows: Awaited<ReturnType<typeof getContrattiRows>>;
  try {
    rawRows = await getContrattiRows();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Foglio non accessibile: ${msg}` }, { status: 502 });
  }

  if (rawRows.length === 0) {
    return NextResponse.json<ContrattoPreviewResponse>({
      rows: [], totalCount: 0, validCount: 0, warningCount: 0, errorCount: 0, blockingUsernames: [],
    });
  }

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // ── Batch DB lookup: which usernames exist? ─────────────────────────────────
  const uniqueUsernames = [...new Set(rawRows.map(r => r.username.trim().toLowerCase()).filter(Boolean))];
  const { data: collabs } = await svc
    .from('collaborators')
    .select('id, username')
    .in('username', uniqueUsernames);

  const dbCollabMap = new Map<string, string>(); // username → collab_id
  (collabs ?? []).forEach((c: { id: string; username: string }) =>
    dbCollabMap.set(c.username.toLowerCase(), c.id),
  );

  // ── Existing CONTRATTO_OCCASIONALE documents ─────────────────────────────────
  const allCollabIds = [...dbCollabMap.values()];
  let existingContrattoSet = new Set<string>(); // collab_id with existing contract
  if (allCollabIds.length > 0) {
    const { data: existing } = await svc
      .from('documents')
      .select('collaborator_id')
      .eq('tipo', 'CONTRATTO_OCCASIONALE')
      .in('collaborator_id', allCollabIds);
    existingContrattoSet = new Set(
      (existing ?? []).map((d: { collaborator_id: string }) => d.collaborator_id),
    );
  }

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

  // ── Per-row validation ───────────────────────────────────────────────────────
  const blockingUsernameSet = new Set<string>();

  const rows: ContrattoPreviewRow[] = rawRows.map(r => {
    const username = r.username.trim().toLowerCase();
    const nome_pdf = r.nome_pdf.trim();
    const errors:   string[] = [];
    const warnings: string[] = [];

    // V1: nome_pdf non vuoto
    if (!nome_pdf) errors.push('nome file PDF mancante');

    // V2: nome_pdf trovato in Drive
    if (nome_pdf && !folderMap.has(nome_pdf)) {
      errors.push(`file "${nome_pdf}" non trovato nella cartella Drive`);
    }

    // V3: username trovato in DB
    if (!username) {
      errors.push('username mancante');
      blockingUsernameSet.add('(vuoto)');
    } else if (!dbCollabMap.has(username)) {
      errors.push(`username "${username}" non trovato nel sistema`);
      blockingUsernameSet.add(username);
    }

    // V4: documento già esistente (warning — skip, non blocca)
    const collabId = dbCollabMap.get(username);
    if (collabId && existingContrattoSet.has(collabId)) {
      warnings.push('contratto già presente — sarà saltato');
    }

    // V6: anno estraibile dal filename
    let anno: number | null = null;
    if (nome_pdf) {
      const match = ANNO_RE.exec(nome_pdf);
      if (!match) warnings.push('anno non estraibile dal nome file — verrà impostato a null');
      else         anno = parseInt(match[1], 10);
    }

    const stato: ContrattoPreviewRow['stato'] =
      errors.length > 0   ? 'error' :
      warnings.length > 0 ? 'warning' : 'valid';

    return { rowIndex: r.rowIndex, username, nome_pdf, anno, stato, errors, warnings };
  });

  const blockingUsernames = [...blockingUsernameSet];
  const validCount        = rows.filter(r => r.stato === 'valid').length;
  const warningCount      = rows.filter(r => r.stato === 'warning').length;
  const errorCount        = rows.filter(r => r.stato === 'error').length;

  return NextResponse.json<ContrattoPreviewResponse>({
    rows,
    totalCount: rows.length,
    validCount,
    warningCount,
    errorCount,
    blockingUsernames,
  });
}
