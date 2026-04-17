import ExcelJS from 'exceljs';

export type ImportTipo = 'collaboratori' | 'contratti' | 'cu';

// ── XLSX generation ──────────────────────────────────────────────────────────

interface CollabDetail {
  rowIndex: number;
  email:    string;
  status:   string;
  message?: string;
}

interface ContrattoDetail {
  rowIndex: number;
  username: string;
  nome_pdf: string;
  status:   string;
  message?: string;
}

interface CUDetail {
  rowIndex: number;
  username: string;
  nome_pdf: string;
  status:   string;
  message?: string;
}

type AnyDetail = CollabDetail | ContrattoDetail | CUDetail;

function buildCollabRows(details: CollabDetail[]): unknown[][] {
  const rows: unknown[][] = [['Row', 'Email', 'Stato', 'Note']];
  for (const d of details) {
    rows.push([d.rowIndex, d.email, d.status, d.message ?? '']);
  }
  return rows;
}

function buildContrattoRows(details: ContrattoDetail[]): unknown[][] {
  const rows: unknown[][] = [['Row', 'Username', 'File PDF', 'Stato', 'Note']];
  for (const d of details) {
    rows.push([d.rowIndex, d.username, d.nome_pdf, d.status, d.message ?? '']);
  }
  return rows;
}

function buildCURows(details: CUDetail[]): unknown[][] {
  const rows: unknown[][] = [['Row', 'Username', 'File PDF', 'Stato', 'Note']];
  for (const d of details) {
    rows.push([d.rowIndex, d.username, d.nome_pdf, d.status, d.message ?? '']);
  }
  return rows;
}

export async function buildImportXLSX(tipo: ImportTipo, details: AnyDetail[]): Promise<Buffer> {
  let rows: unknown[][];
  if (tipo === 'collaboratori') {
    rows = buildCollabRows(details as CollabDetail[]);
  } else if (tipo === 'contratti') {
    rows = buildContrattoRows(details as ContrattoDetail[]);
  } else {
    rows = buildCURows(details as CUDetail[]);
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Import');
  for (const row of rows) {
    ws.addRow(row);
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ── Type for history API ─────────────────────────────────────────────────────

export interface ImportRunWithUrl {
  id:           string;
  tipo:         ImportTipo;
  imported:     number;
  skipped:      number;
  errors:       number;
  duration_ms:  number | null;
  created_at:   string;
  storage_path: string | null;
  download_url: string | null;
}
