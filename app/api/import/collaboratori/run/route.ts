import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { generatePassword } from '@/lib/password';
import { getImportSheetRows, writeImportResults, type SheetUpdate } from '@/lib/import-sheet';
import { sendEmail } from '@/lib/email';
import { getRenderedEmail } from '@/lib/email-template-service';
import { buildImportXLSX } from '@/lib/import-history-utils';

const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9_]{3,50}$/;
const BATCH_SIZE  = 10;
const BATCH_DELAY = 300; // ms between batches

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export interface RunResult {
  imported: number;
  skipped:  number;
  errors:   number;
  details:  { rowIndex: number; email: string; status: 'imported' | 'skipped' | 'error'; message?: string }[];
}

export async function POST(request: Request) {
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

  const body = await request.json().catch(() => null) as { skipContract?: boolean };
  const skipContract = body.skipContract ?? true;

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // ── Load community UUID map ─────────────────────────────────────────────────
  const { data: communityRows } = await svc.from('communities').select('id, name');
  const communityMap = new Map<string, string>();
  (communityRows ?? []).forEach((c: { id: string; name: string }) => {
    communityMap.set(c.name.toLowerCase(), c.id);
  });

  // ── Fetch + filter rows ─────────────────────────────────────────────────────
  let rawRows: Awaited<ReturnType<typeof getImportSheetRows>>;
  try {
    rawRows = await getImportSheetRows();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Foglio non accessibile: ${msg}` }, { status: 502 });
  }

  const toProcess = rawRows.filter(r => {
    const nome          = r.nome.trim();
    const cognome       = r.cognome.trim();
    const email         = r.email.trim().toLowerCase();
    const username      = r.username.trim().toLowerCase();
    const community     = r.community.trim().toLowerCase();
    const data_ingresso = r.data_ingresso.trim();
    return (
      nome && cognome &&
      EMAIL_RE.test(email) && USERNAME_RE.test(username) &&
      communityMap.has(community) &&
      !isNaN(Date.parse(data_ingresso))
    );
  });

  if (toProcess.length === 0) {
    return NextResponse.json<RunResult>({ imported: 0, skipped: rawRows.length, errors: 0, details: [] });
  }

  // ── Process in batches ──────────────────────────────────────────────────────
  const runStartTime = Date.now();
  const details: RunResult['details'] = [];
  const sheetUpdates: SheetUpdate[] = [];

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (r) => {
      const email               = r.email.trim().toLowerCase();
      const username            = r.username.trim().toLowerCase();
      const nome                = r.nome.trim();
      const cognome             = r.cognome.trim();
      const community           = r.community.trim().toLowerCase();
      const data_ingresso       = r.data_ingresso.trim();
      const data_fine_contratto = r.data_fine_contratto.trim() || null;
      const communityId   = communityMap.get(community)!;
      const password      = generatePassword();

      try {
        // 1. Create auth user
        const { data: authData, error: authErr } = await svc.auth.admin.createUser({
          email, password, email_confirm: true,
        });
        if (authErr || !authData.user) throw new Error(authErr?.message ?? 'createUser failed');
        const userId = authData.user.id;

        // 2. Insert user_profiles
        const { error: profileErr } = await svc.from('user_profiles').insert({
          user_id:                      userId,
          role:                         'collaboratore',
          is_active:                    true,
          must_change_password:         true,
          onboarding_completed:         false,
          skip_contract_on_onboarding:  skipContract,
        });
        if (profileErr) {
          await svc.auth.admin.deleteUser(userId).catch(() => {});
          throw new Error('user_profiles: ' + profileErr.message);
        }

        // 3. Insert collaborators
        const { data: collabData, error: collabErr } = await svc.from('collaborators').insert({
          user_id:             userId,
          email,
          nome,
          cognome,
          username,
          tipo_contratto:      'OCCASIONALE',
          data_ingresso,
          data_fine_contratto,
        }).select('id').single();
        if (collabErr || !collabData) {
          await svc.auth.admin.deleteUser(userId).catch(() => {});
          throw new Error('collaborators: ' + (collabErr?.message ?? 'insert failed'));
        }
        const collaboratorId = collabData.id;

        // 4. Assign community
        const { error: communityErr } = await svc.from('collaborator_communities').insert({
          collaborator_id: collaboratorId,
          community_id:    communityId,
        });
        if (communityErr) {
          // Non-blocking — log but don't fail the import
          console.error(`collaborator_communities insert failed for row ${r.rowIndex}:`, communityErr.message);
        }

        // 5. Send invitation email
        try {
          const { subject, html } = await getRenderedEmail('E8', { email, password, ruolo: 'Collaboratore' });
          await sendEmail(email, subject, html);
        } catch (emailErr) {
          console.error(`[import/run] email send failed for ${email}:`, emailErr);
        }

        details.push({ rowIndex: r.rowIndex, email, status: 'imported' });
        sheetUpdates.push({ rowIndex: r.rowIndex, stato: 'PROCESSED', password });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        details.push({ rowIndex: r.rowIndex, email, status: 'error', message: msg });
        sheetUpdates.push({ rowIndex: r.rowIndex, stato: 'ERROR', noteErrore: msg });
      }
    }));

    if (i + BATCH_SIZE < toProcess.length) await sleep(BATCH_DELAY);
  }

  // ── Write results back to sheet ─────────────────────────────────────────────
  try {
    await writeImportResults(sheetUpdates);
  } catch {
    // Non-blocking — import succeeded even if sheet writeback fails
  }

  const imported = details.filter(d => d.status === 'imported').length;
  const errors   = details.filter(d => d.status === 'error').length;

  // ── Record import run + upload XLSX (non-blocking) ──────────────────────────
  try {
    const runId     = crypto.randomUUID();
    const xlsx      = buildImportXLSX('collaboratori', details);
    const xlsxPath  = `collaboratori/${runId}.xlsx`;
    await svc.storage.from('imports').upload(xlsxPath, xlsx, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await svc.from('import_runs').insert({
      id:           runId,
      tipo:         'collaboratori',
      executed_by:  user.id,
      imported,
      skipped:      0,
      errors,
      detail_json:  details,
      duration_ms:  Date.now() - runStartTime,
      storage_path: xlsxPath,
    });
  } catch {
    // Non-blocking — don't fail the import if tracking insert fails
  }

  return NextResponse.json<RunResult>({ imported, skipped: 0, errors, details });
}
