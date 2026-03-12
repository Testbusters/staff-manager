import * as XLSX from 'xlsx';

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

function buildCollabSheet(details: CollabDetail[]): XLSX.WorkSheet {
  const rows: unknown[][] = [['Row', 'Email', 'Stato', 'Note']];
  for (const d of details) {
    rows.push([d.rowIndex, d.email, d.status, d.message ?? '']);
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

function buildContrattoSheet(details: ContrattoDetail[]): XLSX.WorkSheet {
  const rows: unknown[][] = [['Row', 'Username', 'File PDF', 'Stato', 'Note']];
  for (const d of details) {
    rows.push([d.rowIndex, d.username, d.nome_pdf, d.status, d.message ?? '']);
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

function buildCUSheet(details: CUDetail[]): XLSX.WorkSheet {
  const rows: unknown[][] = [['Row', 'Username', 'File PDF', 'Stato', 'Note']];
  for (const d of details) {
    rows.push([d.rowIndex, d.username, d.nome_pdf, d.status, d.message ?? '']);
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

export function buildImportXLSX(tipo: ImportTipo, details: AnyDetail[]): Buffer {
  const wb = XLSX.utils.book_new();

  let ws: XLSX.WorkSheet;
  if (tipo === 'collaboratori') {
    ws = buildCollabSheet(details as CollabDetail[]);
  } else if (tipo === 'contratti') {
    ws = buildContrattoSheet(details as ContrattoDetail[]);
  } else {
    ws = buildCUSheet(details as CUDetail[]);
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Import');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
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
