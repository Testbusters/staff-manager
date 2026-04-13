/**
 * Google Sheets helper for contratti bulk import.
 * Uses the same WebCrypto JWT pattern as lib/import-sheet.ts.
 * Sheet ID from env: CONTRATTI_SHEET_ID
 * Tab name: contratti
 *
 * Column layout (A–C):
 *   A = username
 *   B = nome_pdf
 *   C = stato (TO_PROCESS / PROCESSED — written by run)
 */

import { getAccessToken } from './google-sheets-shared';

export interface ContrattoSheetRow {
  rowIndex: number;
  username: string;
  nome_pdf: string;
  stato:    string;
}

const getToken = (): Promise<string> => getAccessToken();

function getSheetConfig() {
  const id  = process.env.CONTRATTI_SHEET_ID;
  const tab = 'contratti';
  if (!id) throw new Error('CONTRATTI_SHEET_ID not set');
  return { id, tab };
}

/**
 * Fetches data rows from the contratti tab.
 * Skips the header row and rows where stato (col C) = 'PROCESSED'.
 */
export async function getContrattiRows(): Promise<ContrattoSheetRow[]> {
  const { id, tab } = getSheetConfig();
  const token = await getToken();

  const range = encodeURIComponent(`${tab}!A:C`);
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
    .filter(r => r.stato.trim().toUpperCase() !== 'PROCESSED');
}

/**
 * Writes stato=PROCESSED (col C) for successfully imported rows.
 */
export async function writeContrattiResults(
  updates: { rowIndex: number }[],
): Promise<void> {
  if (updates.length === 0) return;

  const { id, tab } = getSheetConfig();
  const token = await getToken();

  const data = updates.map(u => ({
    range:  `${tab}!C${u.rowIndex}`,
    values: [['PROCESSED']],
  }));

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
