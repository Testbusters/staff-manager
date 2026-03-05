/**
 * Thin wrapper around the Google Sheets API.
 * Uses service account credentials from GOOGLE_SERVICE_ACCOUNT_JSON env var.
 * Sheet columns (1-indexed):
 *   A=data_competenza  B=importo_lordo  C=collaboratore(username)
 *   D=nome_servizio_ruolo  E=info_specifiche  F=stato  G=competenza
 */

import { google } from 'googleapis';

const STATO_COL = 'F'; // 0-based index 5
const FIRST_DATA_ROW = 2; // row 1 is header

function buildAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
  const credentials = JSON.parse(raw);
  // Replit Secrets can apply multiple levels of escaping to \n in private_key.
  // Keep replacing until no literal \n sequences remain.
  if (credentials.private_key) {
    let pk = credentials.private_key;
    while (pk.includes('\\n')) {
      pk = pk.replace(/\\n/g, '\n');
    }
    pk = pk.replace(/\r/g, '');
    credentials.private_key = pk;
  }
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
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

  const auth = buildAuth();
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

  const auth = buildAuth();
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
