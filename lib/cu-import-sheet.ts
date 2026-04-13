/**
 * Google Sheets helper for CU (Certificazione Unica) bulk import.
 * Uses the same WebCrypto JWT pattern as lib/import-sheet.ts.
 * Sheet ID and tab name are read from env vars:
 *   CU_SHEET_ID
 *   CU_SHEET_TAB  (default: CU)
 */

import { getAccessToken } from './google-sheets-shared';

export interface CUSheetRow {
  rowIndex: number;
  username: string;
  nome_pdf: string;
  stato: string;
}

const getToken = (): Promise<string> => getAccessToken();

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
