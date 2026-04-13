/**
 * Thin wrapper around the Google Sheets API.
 * Uses service account credentials from GOOGLE_SERVICE_ACCOUNT_JSON env var.
 * Sheet columns (1-indexed):
 *   A=data_competenza  B=importo_lordo  C=collaboratore(username)
 *   D=nome_servizio_ruolo  E=info_specifiche  F=stato  G=competenza
 */

import { google } from 'googleapis';
import { buildAuth } from './google-sheets-shared';

const STATO_COL = 'F'; // 0-based index 5
const FIRST_DATA_ROW = 2; // row 1 is header

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
  const tabName = process.env.GOOGLE_SHEET_TAB_NAME ?? 'compensation_import';
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
 * Appends export rows to the export sheet.
 * Reads GOOGLE_SHEET_EXPORT_ID + GOOGLE_SHEET_EXPORT_TAB_NAME env vars.
 * No header row is written — assumes the sheet already has headers.
 */
export async function writeExportRows(rows: string[][]): Promise<void> {
  if (rows.length === 0) return;

  const sheetId = process.env.GOOGLE_SHEET_EXPORT_ID;
  const tabName = process.env.GOOGLE_SHEET_EXPORT_TAB_NAME ?? 'Export';
  if (!sheetId) throw new Error('GOOGLE_SHEET_EXPORT_ID not set');

  const auth = await buildAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${tabName}!A:O`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });
}

/**
 * Writes "PROCESSED" to the stato column for each given 1-based row number.
 */
export async function markRowsProcessed(rowNumbers: number[]): Promise<void> {
  if (rowNumbers.length === 0) return;

  const sheetId = process.env.GOOGLE_SHEET_ID;
  const tabName = process.env.GOOGLE_SHEET_TAB_NAME ?? 'compensation_import';
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
