import ExcelJS from 'exceljs';

export interface ExportCollaboratorRow {
  collaborator_id: string;
  email: string;
  nome: string;
  cognome: string;
  data_nascita: string | null;
  luogo_nascita: string | null;
  comune: string | null;
  indirizzo: string | null;
  codice_fiscale: string | null;
  iban: string | null;
  intestatario_pagamento: string | null;
  importo_lordo: number;
  importo_netto: number;
  ritenuta: number;
  descrizione: string;
  compensation_ids: string[];
  expense_ids: string[];
}

export interface ExportRun {
  id: string;
  exported_at: string;
  collaborator_count: number;
  compensation_count: number;
  expense_count: number;
  storage_path: string | null;
}

export interface ExportRunWithUrl extends ExportRun {
  download_url: string | null;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatEuro(n: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

// ── Aggregation ───────────────────────────────────────────────────────────────

interface CompensationInput {
  id: string;
  collaborator_id: string;
  importo_lordo: number;
  importo_netto: number;
  nome_servizio_ruolo: string | null;
  collaborator: {
    email: string;
    nome: string;
    cognome: string;
    data_nascita: string | null;
    luogo_nascita: string | null;
    comune: string | null;
    indirizzo: string | null;
    codice_fiscale: string | null;
    iban: string | null;
    intestatario_pagamento: string | null;
  };
}

interface ExpenseInput {
  id: string;
  collaborator_id: string;
  importo: number;
  categoria: string | null;
  collaborator: {
    email: string;
    nome: string;
    cognome: string;
    data_nascita: string | null;
    luogo_nascita: string | null;
    comune: string | null;
    indirizzo: string | null;
    codice_fiscale: string | null;
    iban: string | null;
    intestatario_pagamento: string | null;
  };
}

export function groupToCollaboratorRows(
  compensations: CompensationInput[],
  expenses: ExpenseInput[],
): ExportCollaboratorRow[] {
  const map = new Map<string, ExportCollaboratorRow>();

  for (const c of compensations) {
    const existing = map.get(c.collaborator_id);
    const label = c.nome_servizio_ruolo ?? 'Compenso';
    if (existing) {
      existing.importo_lordo += c.importo_lordo ?? 0;
      existing.importo_netto += c.importo_netto ?? 0;
      existing.ritenuta = existing.importo_lordo - existing.importo_netto;
      existing.descrizione = existing.descrizione
        ? `${existing.descrizione}, ${label}`
        : label;
      existing.compensation_ids.push(c.id);
    } else {
      const lordo = c.importo_lordo ?? 0;
      const netto = c.importo_netto ?? 0;
      map.set(c.collaborator_id, {
        collaborator_id: c.collaborator_id,
        email: c.collaborator.email,
        nome: c.collaborator.nome,
        cognome: c.collaborator.cognome,
        data_nascita: c.collaborator.data_nascita,
        luogo_nascita: c.collaborator.luogo_nascita,
        comune: c.collaborator.comune,
        indirizzo: c.collaborator.indirizzo,
        codice_fiscale: c.collaborator.codice_fiscale,
        iban: c.collaborator.iban,
        intestatario_pagamento: c.collaborator.intestatario_pagamento,
        importo_lordo: lordo,
        importo_netto: netto,
        ritenuta: lordo - netto,
        descrizione: label,
        compensation_ids: [c.id],
        expense_ids: [],
      });
    }
  }

  for (const e of expenses) {
    const existing = map.get(e.collaborator_id);
    const label = e.categoria ?? 'Rimborso';
    if (existing) {
      existing.importo_netto += e.importo;
      existing.importo_lordo += e.importo;
      existing.ritenuta = existing.importo_lordo - existing.importo_netto;
      existing.descrizione = existing.descrizione
        ? `${existing.descrizione}, ${label}`
        : label;
      existing.expense_ids.push(e.id);
    } else {
      map.set(e.collaborator_id, {
        collaborator_id: e.collaborator_id,
        email: e.collaborator.email,
        nome: e.collaborator.nome,
        cognome: e.collaborator.cognome,
        data_nascita: e.collaborator.data_nascita,
        luogo_nascita: e.collaborator.luogo_nascita,
        comune: e.collaborator.comune,
        indirizzo: e.collaborator.indirizzo,
        codice_fiscale: e.collaborator.codice_fiscale,
        iban: e.collaborator.iban,
        intestatario_pagamento: e.collaborator.intestatario_pagamento,
        importo_lordo: e.importo,
        importo_netto: e.importo,
        ritenuta: 0,
        descrizione: label,
        compensation_ids: [],
        expense_ids: [e.id],
      });
    }
  }

  return Array.from(map.values());
}

// ── GSheet row builder ────────────────────────────────────────────────────────

// Column order (15):
// 1. email  2. nome+cognome  3. nome  4. cognome  5. data_nascita
// 6. luogo_nascita  7. comune  8. indirizzo  9. codice_fiscale
// 10. importo_lordo  11. importo_netto  12. ritenuta  13. descrizione
// 14. iban  15. intestatario_pagamento
export function toGSheetRow(row: ExportCollaboratorRow): string[] {
  return [
    row.email,
    `${row.nome} ${row.cognome}`.trim(),
    row.nome,
    row.cognome,
    formatDate(row.data_nascita),
    row.luogo_nascita ?? '',
    row.comune ?? '',
    row.indirizzo ?? '',
    row.codice_fiscale ?? '',
    formatEuro(row.importo_lordo),
    formatEuro(row.importo_netto),
    formatEuro(row.ritenuta),
    row.descrizione,
    row.iban ?? '',
    row.intestatario_pagamento ?? '',
  ];
}

// ── XLSX history builder ──────────────────────────────────────────────────────

const HISTORY_HEADERS = [
  'Email',
  'Nome e cognome',
  'Nome',
  'Cognome',
  'Data di nascita',
  'Comune di nascita',
  'Comune di residenza',
  'Via di residenza',
  'Codice Fiscale',
  'Compenso Lordo',
  'Compenso Netto',
  'Ritenuta',
  'Descrizione compenso',
  'IBAN',
  'Intestatario pagamento',
];

export async function buildHistoryXLSXWorkbook(rows: ExportCollaboratorRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Export');
  ws.addRow(HISTORY_HEADERS);
  for (const r of rows) {
    ws.addRow(toGSheetRow(r));
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
