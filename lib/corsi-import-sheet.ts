/**
 * Google Sheets importer for corsi.
 *
 * Source layout (one tab per corso):
 *   - Columns A–E (rows 2+) = lezioni rows
 *       A = data (DD/MM/YYYY)
 *       B = giorno (ignored, derived from data)
 *       C = materia (single materia or "M&F" composite)
 *       D = orario (HH:MM-HH:MM)
 *       E = ore (ignored, computed by DB generated column)
 *   - Columns G (key) + H (value) = corso metadata (key-based lookup, row varies)
 *       Keys: Community, "Responabile DOC" (sheet typo — matched verbatim),
 *             Licenza Zoom, Nome, Codice identificativo, Modalità, Città,
 *             Linea, Q&A max, Note (ignored — no DB column),
 *             Sincronizzato con il gestionale
 *
 * Idempotency: tabs are processed only when the "Sincronizzato con il gestionale"
 * cell equals "TO_PROCESS". On success it becomes "PROCESSED". On failure it
 * becomes "ERROR: <message>" (truncated).
 *
 * Architectural decisions (Phase 1.5):
 *   A — Shared auth via lib/google-sheets-shared.ts (buildAuth).
 *   B — Upfront cross-tab codice_identificativo duplicate scan.
 *   C — Best-effort rollback: if lezioni insert fails after corso insert,
 *       DELETE the corso (CASCADE) and mark the tab ERROR.
 *   E — Prefetch communities + materie lookups once before any tab processing.
 *
 * Override Q3a: materie are emitted in Title Case (e.g. "Matematica").
 */

import { google, type sheets_v4 } from 'googleapis';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildAuth } from './google-sheets-shared';

// ─── Constants ────────────────────────────────────────────────────────────────

const METADATA_KEYS = {
  COMMUNITY: 'Community',
  RESPONSABILE_DOC: 'Responabile DOC', // verbatim sheet typo
  LICENZA_ZOOM: 'Licenza Zoom',
  NOME: 'Nome',
  CODICE: 'Codice identificativo',
  MODALITA: 'Modalità',
  CITTA: 'Città',
  LINEA: 'Linea',
  QA_MAX: 'Q&A max',
  NOTE: 'Note',
  SYNC_STATUS: 'Sincronizzato con il gestionale',
} as const;

const STATUS_TO_PROCESS = 'TO_PROCESS';
const STATUS_PROCESSED = 'PROCESSED';
const ERROR_MESSAGE_MAX = 200;

const MODALITA_MAP: Record<string, 'online' | 'in_aula'> = {
  online: 'online',
  'in aula': 'in_aula',
  in_aula: 'in_aula',
  aula: 'in_aula',
};

// "M&F" composite marker expands to both materie
const MATERIA_COMPOSITE: Record<string, string[]> = {
  'm&f': ['Matematica', 'Fisica'],
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CorsiImportLookups {
  // community name (lowercased) → community id
  communities: Map<string, string>;
  // materia name (lowercased) → Title Case canonical name
  materieByCommunity: Map<string, Map<string, string>>;
}

export interface ParsedLezione {
  data: string; // ISO YYYY-MM-DD
  orario_inizio: string; // HH:MM:SS
  orario_fine: string; // HH:MM:SS
  materie: string[];
}

export interface ParsedCorso {
  nome: string;
  codice_identificativo: string;
  community_id: string;
  community_name: string;
  modalita: 'online' | 'in_aula';
  citta: string | null;
  linea: string | null;
  responsabile_doc: string | null;
  licenza_zoom: string | null;
  max_qa_per_lezione: number | null;
}

export interface ParseSuccess {
  ok: true;
  corso: ParsedCorso;
  lezioni: ParsedLezione[];
  statusCellRef: string; // e.g. "Corsi1!H14"
}

export interface ParseFailure {
  ok: false;
  error: string;
  statusCellRef: string | null;
}

export type ParseResult = ParseSuccess | ParseFailure;

export interface TabOutcome {
  tabName: string;
  status: 'PROCESSED' | 'ERROR' | 'SKIPPED';
  error?: string;
  corso_id?: string;
  nome?: string;
  codice_identificativo?: string;
}

export interface ImportResult {
  results: TabOutcome[];
  summary: { processed: number; errors: number; skipped: number };
}

// ─── Utility parsers ──────────────────────────────────────────────────────────

/**
 * Parse DD/MM/YYYY strict → ISO YYYY-MM-DD. Missing year or malformed → null.
 */
export function parseItalianDate(raw: string): string | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Validate actual calendar date (e.g. rejects 31/02)
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${yyyy}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Parse "HH:MM-HH:MM" → { inizio, fine } as HH:MM:SS. Malformed → null.
 */
export function parseOrario(raw: string): { inizio: string; fine: string } | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const [, h1, m1, h2, m2] = m;
  const toTime = (h: string, min: string): string | null => {
    const hh = Number(h);
    const mm = Number(min);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
  };
  const inizio = toTime(h1, m1);
  const fine = toTime(h2, m2);
  if (!inizio || !fine) return null;
  if (inizio >= fine) return null;
  return { inizio, fine };
}

/**
 * Normalize a materia cell value. Handles composite markers (M&F) and
 * case-insensitive lookup against the community's materie lookup.
 * Returns canonical Title Case names.
 */
export function resolveMaterie(
  raw: string,
  communityKey: string,
  lookups: CorsiImportLookups,
): { ok: true; materie: string[] } | { ok: false; error: string } {
  const value = (raw ?? '').trim();
  if (!value) return { ok: false, error: 'materia vuota' };

  const composite = MATERIA_COMPOSITE[value.toLowerCase()];
  const candidates = composite ?? [value];

  const materieLookup = lookups.materieByCommunity.get(communityKey);
  if (!materieLookup) {
    return { ok: false, error: `materie non trovate per community "${communityKey}"` };
  }

  const resolved: string[] = [];
  for (const candidate of candidates) {
    const canonical = materieLookup.get(candidate.toLowerCase());
    if (!canonical) {
      return { ok: false, error: `materia sconosciuta: "${candidate}"` };
    }
    resolved.push(canonical);
  }

  return { ok: true, materie: resolved };
}

/**
 * Find the first row index (0-based in the provided array) where column G
 * equals the given key (case-insensitive, trimmed). Returns -1 if missing.
 */
function findMetaRow(rows: string[][], key: string): number {
  const target = key.toLowerCase().trim();
  for (let i = 0; i < rows.length; i++) {
    const g = (rows[i]?.[6] ?? '').toLowerCase().trim();
    if (g === target) return i;
  }
  return -1;
}

function getMetaValue(rows: string[][], key: string): string {
  const idx = findMetaRow(rows, key);
  if (idx < 0) return '';
  return (rows[idx]?.[7] ?? '').trim();
}

// ─── Tab parser ───────────────────────────────────────────────────────────────

/**
 * Parse a single tab. `rows` is the A1:H range with 0-based rows.
 * Row 0 is the header ("Data", "Giorno", ...) and is skipped for lezioni.
 */
export function parseTab(
  tabName: string,
  rows: string[][],
  lookups: CorsiImportLookups,
): ParseResult {
  // Locate the status cell first so failures can still surface in the sheet.
  const statusRowIdx = findMetaRow(rows, METADATA_KEYS.SYNC_STATUS);
  const statusCellRef =
    statusRowIdx >= 0 ? `${tabName}!H${statusRowIdx + 1}` : null;

  // Corso metadata
  const communityRaw = getMetaValue(rows, METADATA_KEYS.COMMUNITY);
  const codice = getMetaValue(rows, METADATA_KEYS.CODICE);
  const nome = getMetaValue(rows, METADATA_KEYS.NOME);
  const modalitaRaw = getMetaValue(rows, METADATA_KEYS.MODALITA);
  const cittaRaw = getMetaValue(rows, METADATA_KEYS.CITTA);
  const linea = getMetaValue(rows, METADATA_KEYS.LINEA) || null;
  const responsabileDoc =
    getMetaValue(rows, METADATA_KEYS.RESPONSABILE_DOC) || null;
  const licenzaZoom = getMetaValue(rows, METADATA_KEYS.LICENZA_ZOOM) || null;
  const qaMaxRaw = getMetaValue(rows, METADATA_KEYS.QA_MAX);

  if (!nome) return { ok: false, error: 'campo "Nome" mancante', statusCellRef };
  if (!codice) {
    return { ok: false, error: 'campo "Codice identificativo" mancante', statusCellRef };
  }

  const communityKey = communityRaw.toLowerCase().trim();
  const communityId = lookups.communities.get(communityKey);
  if (!communityId) {
    return {
      ok: false,
      error: `community sconosciuta: "${communityRaw}"`,
      statusCellRef,
    };
  }

  const modalita = MODALITA_MAP[modalitaRaw.toLowerCase().trim()];
  if (!modalita) {
    return {
      ok: false,
      error: `modalità non valida: "${modalitaRaw}" (atteso: Online | In aula)`,
      statusCellRef,
    };
  }

  const citta =
    cittaRaw && cittaRaw.toUpperCase() !== 'ASSEGNAZIONE' ? cittaRaw : null;

  let maxQa: number | null = null;
  if (qaMaxRaw) {
    const n = Number(qaMaxRaw);
    if (!Number.isInteger(n) || n < 0) {
      return {
        ok: false,
        error: `"Q&A max" non numerico: "${qaMaxRaw}"`,
        statusCellRef,
      };
    }
    maxQa = n;
  }

  // Lezioni (rows 2+, 0-based index >= 1, until we hit an empty data cell)
  const lezioni: ParsedLezione[] = [];
  for (let i = 1; i < rows.length; i++) {
    const dataRaw = (rows[i]?.[0] ?? '').trim();
    if (!dataRaw) continue; // skip blank rows — metadata may be interleaved

    const data = parseItalianDate(dataRaw);
    if (!data) {
      return {
        ok: false,
        error: `riga ${i + 1}: data non valida "${dataRaw}" (atteso DD/MM/YYYY)`,
        statusCellRef,
      };
    }

    const orarioRaw = (rows[i]?.[3] ?? '').trim();
    const orario = parseOrario(orarioRaw);
    if (!orario) {
      return {
        ok: false,
        error: `riga ${i + 1}: orario non valido "${orarioRaw}" (atteso HH:MM-HH:MM)`,
        statusCellRef,
      };
    }

    const materiaRaw = (rows[i]?.[2] ?? '').trim();
    const materieRes = resolveMaterie(materiaRaw, communityKey, lookups);
    if (!materieRes.ok) {
      return {
        ok: false,
        error: `riga ${i + 1}: ${materieRes.error}`,
        statusCellRef,
      };
    }

    lezioni.push({
      data,
      orario_inizio: orario.inizio,
      orario_fine: orario.fine,
      materie: materieRes.materie,
    });
  }

  if (lezioni.length === 0) {
    return { ok: false, error: 'nessuna lezione valida nel tab', statusCellRef };
  }

  return {
    ok: true,
    corso: {
      nome,
      codice_identificativo: codice,
      community_id: communityId,
      community_name: communityRaw,
      modalita,
      citta,
      linea,
      responsabile_doc: responsabileDoc,
      licenza_zoom: licenzaZoom,
      max_qa_per_lezione: maxQa,
    },
    lezioni,
    statusCellRef: statusCellRef!, // present iff tab passed TO_PROCESS gate
  };
}

// ─── Lookup prefetch (Decision E) ─────────────────────────────────────────────

export async function prefetchLookups(
  svc: SupabaseClient,
): Promise<CorsiImportLookups> {
  const [commRes, matRes] = await Promise.all([
    svc.from('communities').select('id, name'),
    svc
      .from('lookup_options')
      .select('community, nome')
      .eq('type', 'materia'),
  ]);

  if (commRes.error) throw new Error(`communities fetch: ${commRes.error.message}`);
  if (matRes.error) throw new Error(`materie fetch: ${matRes.error.message}`);

  const communities = new Map<string, string>();
  for (const row of commRes.data ?? []) {
    communities.set(String(row.name).toLowerCase().trim(), row.id);
  }

  const materieByCommunity = new Map<string, Map<string, string>>();
  for (const row of matRes.data ?? []) {
    const communityKey = String(row.community).toLowerCase().trim();
    const materiaKey = String(row.nome).toLowerCase().trim();
    if (!materieByCommunity.has(communityKey)) {
      materieByCommunity.set(communityKey, new Map());
    }
    materieByCommunity.get(communityKey)!.set(materiaKey, String(row.nome));
  }

  return { communities, materieByCommunity };
}

// ─── Sheet I/O helpers ────────────────────────────────────────────────────────

function getSheetConfig() {
  const id = process.env.IMPORT_CORSI_SHEET_ID;
  if (!id) throw new Error('IMPORT_CORSI_SHEET_ID not set');
  return { id };
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const status =
        (err as { code?: number; response?: { status?: number } })?.code ??
        (err as { response?: { status?: number } })?.response?.status;
      if (status !== 429 || attempt === maxAttempts) throw err;
      const delay = 500 * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function truncateError(msg: string): string {
  return msg.length > ERROR_MESSAGE_MAX
    ? `${msg.slice(0, ERROR_MESSAGE_MAX - 3)}...`
    : msg;
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

/**
 * Run the corsi import.
 *
 * Flow:
 *   1. Prefetch lookups (communities + materie).
 *   2. List all tabs, fetch A1:H for each.
 *   3. Skip tabs where status cell ≠ TO_PROCESS.
 *   4. Parse each TO_PROCESS tab; accumulate parse errors.
 *   5. Decision B: scan parsed corsi for duplicate codice across tabs → ERROR.
 *   6. Also reject codici already present in the DB.
 *   7. Per survivor: INSERT corso, then INSERT lezioni. On lezioni failure,
 *      DELETE corso (CASCADE) and record ERROR.
 *   8. Single batchUpdate writes PROCESSED / ERROR:msg to each status cell.
 *
 * `createdBy` is required for the corsi.created_by FK. `notify` is accepted
 * for future E17 notification wiring but currently has no effect — direct
 * service-role inserts bypass the route that would send emails.
 */
export async function runImport(
  svc: SupabaseClient,
  createdBy: string,
  _notify: boolean,
): Promise<ImportResult> {
  const { id: spreadsheetId } = getSheetConfig();
  const auth = await buildAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const lookups = await prefetchLookups(svc);

  // Enumerate tabs
  const meta = await withRetry(() =>
    sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' }),
  );
  const tabNames = (meta.data.sheets ?? [])
    .map((s: sheets_v4.Schema$Sheet) => s.properties?.title ?? '')
    .filter((t: string) => !!t);

  // Fetch all ranges in one batchGet to minimise API calls
  const ranges = tabNames.map((t) => `${t}!A1:H50`);
  const batch = await withRetry(() =>
    sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges }),
  );
  const valueRanges = batch.data.valueRanges ?? [];

  const results: TabOutcome[] = [];
  const parsedByTab = new Map<string, ParseSuccess>();
  const statusWrites: { range: string; values: string[][] }[] = [];

  // First pass: skip non-TO_PROCESS, parse the rest
  for (let i = 0; i < tabNames.length; i++) {
    const tabName = tabNames[i];
    const rows = (valueRanges[i]?.values as string[][] | undefined) ?? [];

    const statusRowIdx = findMetaRow(rows, METADATA_KEYS.SYNC_STATUS);
    const statusValue =
      statusRowIdx >= 0 ? (rows[statusRowIdx]?.[7] ?? '').trim() : '';

    if (statusValue.toUpperCase() !== STATUS_TO_PROCESS) {
      results.push({ tabName, status: 'SKIPPED' });
      continue;
    }

    const parsed = parseTab(tabName, rows, lookups);
    if (!parsed.ok) {
      results.push({ tabName, status: 'ERROR', error: parsed.error });
      if (parsed.statusCellRef) {
        statusWrites.push({
          range: parsed.statusCellRef,
          values: [[`ERROR: ${truncateError(parsed.error)}`]],
        });
      }
      continue;
    }
    parsedByTab.set(tabName, parsed);
  }

  // Decision B — cross-tab duplicate codice detection
  const codiceCounts = new Map<string, string[]>();
  for (const [tabName, parsed] of parsedByTab) {
    const k = parsed.corso.codice_identificativo;
    if (!codiceCounts.has(k)) codiceCounts.set(k, []);
    codiceCounts.get(k)!.push(tabName);
  }
  const duplicateCodici = new Set<string>();
  for (const [codice, tabs] of codiceCounts) {
    if (tabs.length > 1) duplicateCodici.add(codice);
  }

  // Reject codici already present in DB
  const codiciToCheck = Array.from(codiceCounts.keys()).filter(
    (c) => !duplicateCodici.has(c),
  );
  let existingCodici = new Set<string>();
  if (codiciToCheck.length > 0) {
    const existingRes = await svc
      .from('corsi')
      .select('codice_identificativo')
      .in('codice_identificativo', codiciToCheck);
    if (existingRes.error) {
      throw new Error(`corsi existing check: ${existingRes.error.message}`);
    }
    existingCodici = new Set(
      (existingRes.data ?? []).map((r) => String(r.codice_identificativo)),
    );
  }

  // Second pass: insert corso + lezioni for each survivor
  for (const [tabName, parsed] of parsedByTab) {
    const { corso, lezioni, statusCellRef } = parsed;

    if (duplicateCodici.has(corso.codice_identificativo)) {
      const error = `codice "${corso.codice_identificativo}" duplicato in più tab`;
      results.push({ tabName, status: 'ERROR', error });
      statusWrites.push({
        range: statusCellRef,
        values: [[`ERROR: ${truncateError(error)}`]],
      });
      continue;
    }

    if (existingCodici.has(corso.codice_identificativo)) {
      const error = `codice "${corso.codice_identificativo}" già presente nel gestionale`;
      results.push({ tabName, status: 'ERROR', error });
      statusWrites.push({
        range: statusCellRef,
        values: [[`ERROR: ${truncateError(error)}`]],
      });
      continue;
    }

    const lezioniDates = lezioni.map((l) => l.data).sort();
    const data_inizio = lezioniDates[0];
    const data_fine = lezioniDates[lezioniDates.length - 1];

    const corsoInsert: Record<string, unknown> = {
      nome: corso.nome,
      codice_identificativo: corso.codice_identificativo,
      community_id: corso.community_id,
      modalita: corso.modalita,
      citta: corso.citta,
      linea: corso.linea,
      responsabile_doc: corso.responsabile_doc,
      licenza_zoom: corso.licenza_zoom,
      data_inizio,
      data_fine,
      created_by: createdBy,
    };
    if (corso.max_qa_per_lezione !== null) {
      corsoInsert.max_qa_per_lezione = corso.max_qa_per_lezione;
    }

    const corsoRes = await svc
      .from('corsi')
      .insert(corsoInsert)
      .select('id')
      .single();

    if (corsoRes.error || !corsoRes.data) {
      const error = `insert corso: ${corsoRes.error?.message ?? 'no data'}`;
      results.push({ tabName, status: 'ERROR', error });
      statusWrites.push({
        range: statusCellRef,
        values: [[`ERROR: ${truncateError(error)}`]],
      });
      continue;
    }

    const corsoId = corsoRes.data.id as string;

    const lezioniRows = lezioni.map((l) => ({
      corso_id: corsoId,
      data: l.data,
      orario_inizio: l.orario_inizio,
      orario_fine: l.orario_fine,
      materie: l.materie,
    }));

    const lezioniRes = await svc.from('lezioni').insert(lezioniRows);

    if (lezioniRes.error) {
      // Decision C — best-effort rollback
      await svc.from('corsi').delete().eq('id', corsoId);
      const error = `insert lezioni: ${lezioniRes.error.message}`;
      results.push({ tabName, status: 'ERROR', error });
      statusWrites.push({
        range: statusCellRef,
        values: [[`ERROR: ${truncateError(error)}`]],
      });
      continue;
    }

    results.push({
      tabName,
      status: 'PROCESSED',
      corso_id: corsoId,
      nome: corso.nome,
      codice_identificativo: corso.codice_identificativo,
    });
    statusWrites.push({
      range: statusCellRef,
      values: [[STATUS_PROCESSED]],
    });
  }

  // Single batchUpdate for all status cells
  if (statusWrites.length > 0) {
    await withRetry(() =>
      sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: statusWrites.map((w) => ({ range: w.range, values: w.values })),
        },
      }),
    );
  }

  const summary = {
    processed: results.filter((r) => r.status === 'PROCESSED').length,
    errors: results.filter((r) => r.status === 'ERROR').length,
    skipped: results.filter((r) => r.status === 'SKIPPED').length,
  };

  return { results, summary };
}
