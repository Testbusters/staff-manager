import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { fetchPendingRows } from '@/lib/google-sheets';

const RITENUTA_RATE = 0.2;
const VALID_COMPETENZE = ['corsi', 'produzione_materiale', 'sb', 'extra'];

function parseDate(raw: string): string | null {
  // Accepts dd/MM/yyyy or ISO yyyy-MM-dd
  if (!raw) return null;
  let isoDate: string;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    isoDate = raw;
  } else {
    const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const [, d, mo, y] = m;
    isoDate = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Validate that the date is a real calendar date (e.g. 2025-11-31 is invalid)
  const [y, mo, d] = isoDate.split('-').map(Number);
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() + 1 !== mo || date.getDate() !== d) {
    return null;
  }
  return isoDate;
}

function parseImporto(raw: string): number | null {
  // Handle European/US number formats: "1,000.00" or "1.000,00"
  if (!raw) return null;
  const clean = raw.replace(/[^\d.,-]/g, '');
  // If comma appears after dot → already en-US style: "1,000.00" → strip commas
  // If dot appears after comma → EU style: "1.000,00" → swap
  const lastComma = clean.lastIndexOf(',');
  const lastDot = clean.lastIndexOf('.');
  let normalized: string;
  if (lastComma > lastDot) {
    // EU: "1.234,56" → "1234.56"
    normalized = clean.replace(/\./g, '').replace(',', '.');
  } else {
    // EN: "1,234.56" → "1234.56"
    normalized = clean.replace(/,/g, '');
  }
  const n = parseFloat(normalized);
  return isNaN(n) ? null : Math.round(n * 100) / 100;
}

export interface PreviewRow {
  rowIndex: number;
  collaboratore: string;
  collaborator_id: string;
  data_competenza: string;
  importo_lordo: number;
  ritenuta_acconto: number;
  importo_netto: number;
  nome_servizio_ruolo: string | null;
  info_specifiche: string | null;
  competenza: string | null;
}

export interface RowError {
  rowIndex: number;
  collaboratore: string;
  reason: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function validateRows(serviceClient: any) {
  const rawRows = await fetchPendingRows();

  if (rawRows.length === 0) {
    return { rows: [], errors: [] };
  }

  // Bulk-fetch collaborators by username for all rows
  const usernames = [...new Set(rawRows.map((r) => r.collaboratore).filter(Boolean))];
  const { data: collabData } = await serviceClient
    .from('collaborators')
    .select('id, username')
    .in('username', usernames);

  const collabByUsername = new Map<string, string>(
    (collabData ?? []).map((c: { id: string; username: string }) => [c.username, c.id])
  );

  const rows: PreviewRow[] = [];
  const errors: RowError[] = [];

  for (const raw of rawRows) {
    const errs: string[] = [];

    const collaborator_id = collabByUsername.get(raw.collaboratore);
    if (!collaborator_id) errs.push(`username "${raw.collaboratore}" non trovato`);

    const data_competenza = parseDate(raw.data_competenza);
    if (!data_competenza) errs.push(`data_competenza non valida: "${raw.data_competenza}"`);

    const importo_lordo = parseImporto(raw.importo_lordo);
    if (importo_lordo === null || importo_lordo <= 0)
      errs.push(`importo non valido: "${raw.importo_lordo}"`);

    const competenza = raw.competenza || null;
    if (competenza && !VALID_COMPETENZE.includes(competenza))
      errs.push(`competenza non valida: "${competenza}"`);

    if (errs.length > 0) {
      errors.push({ rowIndex: raw.rowIndex, collaboratore: raw.collaboratore, reason: errs.join('; ') });
      continue;
    }

    const lordo = importo_lordo!;
    const ritenuta = Math.round(lordo * RITENUTA_RATE * 100) / 100;
    const netto = Math.round((lordo - ritenuta) * 100) / 100;

    rows.push({
      rowIndex: raw.rowIndex,
      collaboratore: raw.collaboratore,
      collaborator_id: collaborator_id!,
      data_competenza: data_competenza!,
      importo_lordo: lordo,
      ritenuta_acconto: ritenuta,
      importo_netto: netto,
      nome_servizio_ruolo: raw.nome_servizio_ruolo || null,
      info_specifiche: raw.info_specifiche && raw.info_specifiche !== '-' ? raw.info_specifiche : null,
      competenza,
    });
  }

  return { rows, errors };
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

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const { rows, errors } = await validateRows(serviceClient);
    return NextResponse.json({ rows, errors, total: rows.length + errors.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore lettura foglio';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
