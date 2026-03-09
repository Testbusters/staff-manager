import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getImportSheetRows } from '@/lib/import-sheet';

export interface PreviewRow {
  rowIndex: number;
  nome: string;
  cognome: string;
  email: string;
  username: string;
  stato: string; // current stato in sheet
  errors: string[];
}

export interface PreviewResponse {
  rows: PreviewRow[];
  validCount: number;
  errorCount: number;
  alreadyImportedCount: number;
}

const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9_]{3,50}$/;
const MAX_ROWS    = 1000;

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

  // ── Fetch sheet rows ────────────────────────────────────────────────────────
  let rawRows: Awaited<ReturnType<typeof getImportSheetRows>>;
  try {
    rawRows = await getImportSheetRows();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Foglio non accessibile: ${msg}` }, { status: 502 });
  }

  if (rawRows.length === 0) {
    return NextResponse.json<PreviewResponse>({ rows: [], validCount: 0, errorCount: 0, alreadyImportedCount: 0 });
  }

  if (rawRows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Il foglio contiene più di ${MAX_ROWS} righe. Suddividi l'import in più sessioni.` },
      { status: 422 },
    );
  }

  // ── Load existing emails + usernames from DB ────────────────────────────────
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const existingEmails    = new Set<string>();
  const existingUsernames = new Set<string>();

  let page = 1;
  while (true) {
    const { data } = await svc.auth.admin.listUsers({ page, perPage: 1000 });
    data.users.forEach(u => existingEmails.add((u.email ?? '').toLowerCase()));
    if (data.users.length < 1000) break;
    page++;
  }

  const { data: collabs } = await svc.from('collaborators').select('username').not('username', 'is', null);
  (collabs ?? []).forEach((c: { username: string }) => existingUsernames.add(c.username.toLowerCase()));

  // ── Validate rows ───────────────────────────────────────────────────────────
  const batchEmails    = new Map<string, number>(); // email → first rowIndex
  const batchUsernames = new Map<string, number>(); // username → first rowIndex

  const rows: PreviewRow[] = rawRows.map((r) => {
    const nome     = r.nome.trim();
    const cognome  = r.cognome.trim();
    const email    = r.email.trim().toLowerCase();
    const username = r.username.trim().toLowerCase();
    const stato    = r.stato.trim();
    const errors: string[] = [];

    if (stato === 'IMPORTED') {
      return { rowIndex: r.rowIndex, nome, cognome, email, username, stato, errors };
    }

    if (!nome)    errors.push('nome mancante');
    if (!cognome) errors.push('cognome mancante');

    if (!email) {
      errors.push('email mancante');
    } else if (!EMAIL_RE.test(email)) {
      errors.push('email non valida');
    } else if (existingEmails.has(email)) {
      errors.push('email già registrata');
    } else if (batchEmails.has(email)) {
      errors.push(`email duplicata nel foglio (riga ${batchEmails.get(email)})`);
    }

    if (!username) {
      errors.push('username mancante');
    } else if (!USERNAME_RE.test(username)) {
      errors.push('username non valido (solo a-z, 0-9, _, 3–50 caratteri)');
    } else if (existingUsernames.has(username)) {
      errors.push('username già in uso');
    } else if (batchUsernames.has(username)) {
      errors.push(`username duplicato nel foglio (riga ${batchUsernames.get(username)})`);
    }

    if (errors.length === 0) {
      batchEmails.set(email, r.rowIndex);
      batchUsernames.set(username, r.rowIndex);
    }

    return { rowIndex: r.rowIndex, nome, cognome, email, username, stato, errors };
  });

  const alreadyImportedCount = rows.filter(r => r.stato === 'IMPORTED').length;
  const toProcess            = rows.filter(r => r.stato !== 'IMPORTED');
  const validCount           = toProcess.filter(r => r.errors.length === 0).length;
  const errorCount           = toProcess.filter(r => r.errors.length > 0).length;

  return NextResponse.json<PreviewResponse>({ rows, validCount, errorCount, alreadyImportedCount });
}
