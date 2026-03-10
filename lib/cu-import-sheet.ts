/**
 * Google Sheets helper for CU (Certificazione Unica) bulk import.
 * Uses the same WebCrypto JWT pattern as lib/import-sheet.ts.
 * Sheet ID and tab name are read from env vars:
 *   CU_SHEET_ID
 *   CU_SHEET_TAB  (default: CU)
 */

import { webcrypto } from 'crypto';

export interface CUSheetRow {
  rowIndex: number;
  username: string;
  nome_pdf: string;
  stato: string;
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
  const id  = process.env.CU_SHEET_ID;
  const tab = process.env.CU_SHEET_TAB ?? 'CU';
  if (!id) throw new Error('CU_SHEET_ID not set');
  return { id, tab };
}

/**
 * Fetches data rows from the CU tab.
 * Skips the header row and rows where col C = 'PROCESSED'.
 */
export async function getImportCURows(): Promise<CUSheetRow[]> {
  const { id, tab } = getSheetConfig();
  const token = await getToken();

  const range = encodeURIComponent(`${tab}!A:D`);
  const res   = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } });
  const data  = await res.json() as { values?: string[][]; error?: { message: string } };

  if (data.error) throw new Error(data.error.message);

  const allRows = data.values ?? [];
  return allRows.slice(1)
    .map((row, i) => ({
      rowIndex: i + 2, // 1-based sheet row
      username: row[0] ?? '',
      nome_pdf: row[1] ?? '',
      stato:    row[2] ?? '',
    }))
    .filter(r => r.stato !== 'PROCESSED');
}

/**
 * Writes import results back to the sheet.
 * Col C = stato (PROCESSED | SKIP | ERROR)
 * Col D = note_errore
 * Single batchUpdate call (1 Sheets write request total).
 */
export async function writeCUImportResults(
  updates: { rowIndex: number; stato: 'PROCESSED' | 'SKIP' | 'ERROR'; note: string }[],
): Promise<void> {
  if (updates.length === 0) return;

  const { id, tab } = getSheetConfig();
  const token = await getToken();

  const data = updates.flatMap(u => [
    { range: `${tab}!C${u.rowIndex}`, values: [[u.stato]] },
    { range: `${tab}!D${u.rowIndex}`, values: [[u.note]] },
  ]);

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
