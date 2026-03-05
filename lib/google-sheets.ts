/**
 * Thin wrapper around the Google Sheets API.
 * Uses service account credentials from GOOGLE_SERVICE_ACCOUNT_JSON env var.
 * Sheet columns (1-indexed):
 *   A=data_competenza  B=importo_lordo  C=collaboratore(username)
 *   D=nome_servizio_ruolo  E=info_specifiche  F=stato  G=competenza
 */

import { google } from 'googleapis';
import { webcrypto } from 'crypto';

const STATO_COL = 'F'; // 0-based index 5
const FIRST_DATA_ROW = 2; // row 1 is header

/**
 * Strip PEM headers/footers and decode to raw DER bytes.
 * This avoids going through crypto.createPrivateKey (PEM path) which fails on
 * Node.js 20 / OpenSSL 3.6.0 (Replit) with DECODER routines::unsupported.
 */
function pemToDer(pem: string): Buffer {
  const b64 = pem.replace(/-----[^\n]+-----|[\r\n]/g, '');
  return Buffer.from(b64, 'base64');
}

/**
 * Obtain a Google OAuth2 access token for a service account using WebCrypto
 * (SubtleCrypto) instead of the legacy crypto.createPrivateKey code path.
 * WebCrypto uses a different OpenSSL pathway and works on OpenSSL 3.6.0.
 */
async function fetchServiceAccountToken(clientEmail: string, pk: string): Promise<string> {
  const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
  const now = Math.floor(Date.now() / 1000);

  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const signingInput = `${header}.${payload}`;

  const cryptoKey = await webcrypto.subtle.importKey(
    'pkcs8',
    pemToDer(pk),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await webcrypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    Buffer.from(signingInput),
  );

  const assertion = `${signingInput}.${Buffer.from(sig).toString('base64url')}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${body}`);
  }

  const { access_token } = await res.json() as { access_token: string };
  return access_token;
}

async function buildAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');

  const { client_email, private_key } = JSON.parse(raw) as { client_email: string; private_key: string };

  // Replit Secrets can apply multiple levels of escaping to \n in private_key.
  let pk = private_key ?? '';
  while (pk.includes('\\n')) pk = pk.replace(/\\n/g, '\n');
  pk = pk.replace(/\r/g, '');

  const accessToken = await fetchServiceAccountToken(client_email, pk);

  // Provide the pre-obtained access token to googleapis — no further key
  // parsing happens, so OpenSSL 3.6.0 compatibility is not an issue.
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

export interface SheetRow {
  /** 1-based row number in the sheet */
  rowIndex: number;
  data_competenza: string;
  importo_lordo: string;
  collaboratore: string;
  nome_servizio_ruolo: string;
  info_specifiche: string;
  stato: string;
  competenza: string;
}

/**
 * Fetches all data rows (excluding header) from the configured sheet.
 * Returns only rows where stato === 'TO_PROCESS'.
 */
export async function fetchPendingRows(): Promise<SheetRow[]> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const tabName = process.env.GOOGLE_SHEET_TAB_NAME ?? 'Sheet1';
  if (!sheetId) throw new Error('GOOGLE_SHEET_ID not set');

  const auth = await buildAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!A:G`,
  });

  const rawRows = res.data.values ?? [];
  // Skip header row (index 0 in array = row 1 in sheet)
  const result: SheetRow[] = [];
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const stato = (row[5] ?? '').trim();
    if (stato !== 'TO_PROCESS') continue;
    result.push({
      rowIndex: i + 1, // 1-based sheet row number
      data_competenza:      (row[0] ?? '').trim(),
      importo_lordo:        (row[1] ?? '').trim(),
      collaboratore:        (row[2] ?? '').trim(),
      nome_servizio_ruolo:  (row[3] ?? '').trim(),
      info_specifiche:      (row[4] ?? '').trim(),
      stato,
      competenza:           (row[6] ?? '').trim(),
    });
  }
  return result;
}

/**
 * Writes "PROCESSED" to the stato column for each given 1-based row number.
 */
export async function markRowsProcessed(rowNumbers: number[]): Promise<void> {
  if (rowNumbers.length === 0) return;

  const sheetId = process.env.GOOGLE_SHEET_ID;
  const tabName = process.env.GOOGLE_SHEET_TAB_NAME ?? 'Sheet1';
  if (!sheetId) throw new Error('GOOGLE_SHEET_ID not set');

  const auth = await buildAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const data = rowNumbers.map((rowNum) => ({
    range: `${tabName}!${STATO_COL}${rowNum}`,
    values: [['PROCESSED']],
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data,
    },
  });
}
