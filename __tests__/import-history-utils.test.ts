import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { buildImportXLSX, type ImportTipo } from '../lib/import-history-utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function parseWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(new Uint8Array(buffer).buffer as ArrayBuffer);
  return wb;
}

function sheetValues(ws: ExcelJS.Worksheet): unknown[][] {
  const out: unknown[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const arr: unknown[] = [];
    // ExcelJS row.values has a leading `undefined` at index 0 (1-based indexing)
    const raw = row.values as unknown[];
    for (let i = 1; i < raw.length; i++) {
      arr.push(raw[i] ?? '');
    }
    out.push(arr);
  });
  return out;
}

// ── collaboratori ─────────────────────────────────────────────────────────────

describe('buildImportXLSX — collaboratori', () => {
  it('empty details → header-only sheet', async () => {
    const buf = await buildImportXLSX('collaboratori', []);
    expect(Buffer.isBuffer(buf)).toBe(true);

    const wb = await parseWorkbook(buf);
    const ws = wb.getWorksheet('Import');
    expect(ws).toBeDefined();

    const rows = sheetValues(ws!);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(['Row', 'Email', 'Stato', 'Note']);
  });

  it('single imported row → correct values', async () => {
    const buf = await buildImportXLSX('collaboratori', [
      { rowIndex: 2, email: 'mario@test.com', status: 'imported' },
    ]);
    const wb = await parseWorkbook(buf);
    const rows = sheetValues(wb.getWorksheet('Import')!);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual([2, 'mario@test.com', 'imported', '']);
  });

  it('error row with message → message preserved', async () => {
    const buf = await buildImportXLSX('collaboratori', [
      { rowIndex: 5, email: 'bad@test.com', status: 'error', message: 'username già esistente' },
    ]);
    const wb = await parseWorkbook(buf);
    const rows = sheetValues(wb.getWorksheet('Import')!);
    expect(rows[1]).toEqual([5, 'bad@test.com', 'error', 'username già esistente']);
  });

  it('multiple rows preserved in order', async () => {
    const buf = await buildImportXLSX('collaboratori', [
      { rowIndex: 2, email: 'a@test.com', status: 'imported' },
      { rowIndex: 3, email: 'b@test.com', status: 'error', message: 'X' },
      { rowIndex: 4, email: 'c@test.com', status: 'imported' },
    ]);
    const wb = await parseWorkbook(buf);
    const rows = sheetValues(wb.getWorksheet('Import')!);
    expect(rows).toHaveLength(4);
    expect(rows[1][1]).toBe('a@test.com');
    expect(rows[2][1]).toBe('b@test.com');
    expect(rows[2][3]).toBe('X');
    expect(rows[3][1]).toBe('c@test.com');
  });
});

// ── contratti ─────────────────────────────────────────────────────────────────

describe('buildImportXLSX — contratti', () => {
  it('header + imported row', async () => {
    const buf = await buildImportXLSX('contratti', [
      { rowIndex: 3, username: 'mrossi', nome_pdf: 'contrattotb2026_mrossi.pdf', status: 'imported' },
    ]);
    const wb = await parseWorkbook(buf);
    const rows = sheetValues(wb.getWorksheet('Import')!);
    expect(rows[0]).toEqual(['Row', 'Username', 'File PDF', 'Stato', 'Note']);
    expect(rows[1]).toEqual([3, 'mrossi', 'contrattotb2026_mrossi.pdf', 'imported', '']);
  });

  it('skip status with message', async () => {
    const buf = await buildImportXLSX('contratti', [
      { rowIndex: 7, username: 'lverdi', nome_pdf: 'x.pdf', status: 'skip', message: 'contratto già presente' },
    ]);
    const wb = await parseWorkbook(buf);
    const rows = sheetValues(wb.getWorksheet('Import')!);
    expect(rows[1]).toEqual([7, 'lverdi', 'x.pdf', 'skip', 'contratto già presente']);
  });
});

// ── cu ────────────────────────────────────────────────────────────────────────

describe('buildImportXLSX — cu', () => {
  it('header + imported row', async () => {
    const buf = await buildImportXLSX('cu', [
      { rowIndex: 2, username: 'mrossi', nome_pdf: 'CU_2025_mrossi.pdf', status: 'imported' },
    ]);
    const wb = await parseWorkbook(buf);
    const rows = sheetValues(wb.getWorksheet('Import')!);
    expect(rows[0]).toEqual(['Row', 'Username', 'File PDF', 'Stato', 'Note']);
    expect(rows[1]).toEqual([2, 'mrossi', 'CU_2025_mrossi.pdf', 'imported', '']);
  });

  it('mixed statuses in order', async () => {
    const tipo: ImportTipo = 'cu';
    const buf = await buildImportXLSX(tipo, [
      { rowIndex: 2, username: 'a', nome_pdf: 'a.pdf', status: 'imported' },
      { rowIndex: 3, username: 'b', nome_pdf: 'b.pdf', status: 'skip', message: 'already' },
      { rowIndex: 4, username: 'c', nome_pdf: 'c.pdf', status: 'error', message: 'not found' },
    ]);
    const wb = await parseWorkbook(buf);
    const rows = sheetValues(wb.getWorksheet('Import')!);
    expect(rows).toHaveLength(4);
    expect(rows[1][3]).toBe('imported');
    expect(rows[2][3]).toBe('skip');
    expect(rows[2][4]).toBe('already');
    expect(rows[3][3]).toBe('error');
    expect(rows[3][4]).toBe('not found');
  });

  it('undefined message → empty string', async () => {
    const buf = await buildImportXLSX('cu', [
      { rowIndex: 10, username: 'u', nome_pdf: 'f.pdf', status: 'imported' },
    ]);
    const wb = await parseWorkbook(buf);
    const rows = sheetValues(wb.getWorksheet('Import')!);
    expect(rows[1][4]).toBe('');
  });
});

// ── Sheet name + file shape ───────────────────────────────────────────────────

describe('buildImportXLSX — workbook shape', () => {
  it('worksheet is named "Import"', async () => {
    const buf = await buildImportXLSX('collaboratori', []);
    const wb = await parseWorkbook(buf);
    expect(wb.worksheets).toHaveLength(1);
    expect(wb.worksheets[0].name).toBe('Import');
  });

  it('returns a Node Buffer (not ArrayBuffer)', async () => {
    const buf = await buildImportXLSX('cu', []);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });
});
