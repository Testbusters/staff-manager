/**
 * Google Sheets helper for collaboratori bulk import.
 * Uses the same WebCrypto JWT pattern as lib/google-sheets.ts.
 * Sheet ID and tab name are read from env vars:
 *   IMPORT_COLLABORATORI_SHEET_ID
 *   IMPORT_COLLABORATORI_SHEET_TAB  (default: import_collaboratori)
 *
 * Column layout (A–J):
 *   A = nome
 *   B = cognome
 *   C = email
 *   D = username
 *   E = stato (TO_PROCESS / PROCESSED / ERROR — written by run)
 *   F = community (testbusters | peer4med)
 *   G = data_ingresso (ISO date, e.g. 2025-01-01)
 *   H = data_fine_contratto (ISO date, e.g. 2026-12-31 — optional)
 *   I = password (written by run on PROCESSED rows)
 *   J = note_errore (written by run on ERROR rows)
 */

import { webcrypto } from 'crypto';

export interface ImportSheetRow {
  rowIndex:              number;
  nome:                  string;
  cognome:               string;
  email:                 string;
  username:              string;
  stato:                 string;
  community:             string;
  data_ingresso:         string;
  data_fine_contratto:   string;
}

export interface SheetUpdate {
  rowIndex:    number;
  stato:       'PROCESSED' | 'ERROR';
  password?:   string;   // col I — set on PROCESSED rows
  noteErrore?: string;   // col J — set on ERROR rows
}

function pemToDer(pem: string): Buffer {
  const b64 = pem.replace(/-----[^\n]+-----|[\r\n]/g, '');
  return Buffer.from(b64, 'base64');
}

async function getToken(): Promise<string> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');

  const { client_email, private_key: rawKey } = JSON.parse(raw) as { client_email: string; private_key: string };
  let pk = rawKey;
  while (pk.includes('\\n')) pk = pk.replace(/\\n/g, '\n');
  pk = pk.replace(/\r/g, '');

  const now     = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: client_email, scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  })).toString('base64url');

  const si  = `${header}.${payload}`;
  const key = await webcrypto.subtle.importKey('pkcs8', pemToDer(pk),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', key, Buffer.from(si));
  const assertion = `${si}.${Buffer.from(sig).toString('base64url')}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const { access_token, error } = await res.json() as { access_token?: string; error?: string };
  if (!access_token) throw new Error(`Google token error: ${error}`);
  return access_token;
}

function getSheetConfig() {
  const id  = process.env.IMPORT_COLLABORATORI_SHEET_ID;
  const tab = process.env.IMPORT_COLLABORATORI_SHEET_TAB ?? 'import_collaboratori_tb';
  if (!id) throw new Error('IMPORT_COLLABORATORI_SHEET_ID not set');
  return { id, tab };
}

/**
 * Fetches all data rows (excluding header) from the import sheet.
 * Skips rows where stato (col E) = 'PROCESSED'.
 */
export async function getImportSheetRows(): Promise<ImportSheetRow[]> {
  const { id, tab } = getSheetConfig();
  const token = await getToken();

  const range = encodeURIComponent(`${tab}!A:J`);
  const res   = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } });
  const data  = await res.json() as { values?: string[][]; error?: { message: string } };

  if (data.error) throw new Error(data.error.message);

  const allRows = data.values ?? [];
  // Skip header row (index 0); skip rows with stato = PROCESSED
  return allRows.slice(1)
    .map((row, i) => ({
      rowIndex:            i + 2, // 1-based sheet row
      nome:                row[0] ?? '',
      cognome:             row[1] ?? '',
      email:               row[2] ?? '',
      username:            row[3] ?? '',
      stato:               row[4] ?? '',
      community:           row[5] ?? '',
      data_ingresso:       row[6] ?? '',
      data_fine_contratto: row[7] ?? '',
    }))
    .filter(r => r.stato.trim().toUpperCase() !== 'PROCESSED');
}

/**
 * Writes import results back to the sheet.
 * Col E = stato (PROCESSED | ERROR)
 * Col I = password (only on PROCESSED rows)
 * Col J = note_errore (only on ERROR rows)
 */
export async function writeImportResults(updates: SheetUpdate[]): Promise<void> {
  if (updates.length === 0) return;

  const { id, tab } = getSheetConfig();
  const token = await getToken();

  const data: { range: string; values: string[][] }[] = [];
  for (const u of updates) {
    data.push({ range: `${tab}!E${u.rowIndex}`, values: [[u.stato]] });
    if (u.stato === 'PROCESSED' && u.password) {
      data.push({ range: `${tab}!I${u.rowIndex}`, values: [[u.password]] });
    }
    if (u.stato === 'ERROR' && u.noteErrore) {
      data.push({ range: `${tab}!J${u.rowIndex}`, values: [[u.noteErrore]] });
    }
  }

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${id}/values:batchUpdate`,
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ valueInputOption: 'RAW', data }),
    },
  );
  const json = await res.json() as { error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
}
