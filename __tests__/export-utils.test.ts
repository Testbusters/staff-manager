import { describe, it, expect } from 'vitest';
import {
  groupToCollaboratorRows,
  formatDate,
  formatEuro,
  toGSheetRow,
} from '../lib/export-utils';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseCollab = {
  email: 'mario@test.com',
  nome: 'Mario',
  cognome: 'Rossi',
  data_nascita: '1990-01-15',
  luogo_nascita: 'Roma',
  comune: 'Milano',
  indirizzo: 'Via Roma 1',
  codice_fiscale: 'RSSMRA90A15H501Z',
  iban: 'IT60X0542811101000000123456',
  intestatario_pagamento: 'Mario Rossi',
};

const makeComp = (id: string, collaborator_id: string, lordo: number, netto: number) => ({
  id,
  collaborator_id,
  importo_lordo: lordo,
  importo_netto: netto,
  nome_servizio_ruolo: 'Sviluppo web',
  collaborator: { ...baseCollab },
});

const makeExp = (id: string, collaborator_id: string, importo: number) => ({
  id,
  collaborator_id,
  importo,
  categoria: 'Trasporto',
  collaborator: { ...baseCollab },
});

// ── groupToCollaboratorRows ───────────────────────────────────────────────────

describe('groupToCollaboratorRows', () => {
  it('empty arrays → empty result', () => {
    expect(groupToCollaboratorRows([], [])).toHaveLength(0);
  });

  it('single compensation → 1 row with correct values', () => {
    const rows = groupToCollaboratorRows([makeComp('c1', 'col1', 100, 80)], []);
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.collaborator_id).toBe('col1');
    expect(r.importo_lordo).toBe(100);
    expect(r.importo_netto).toBe(80);
    expect(r.ritenuta).toBe(20);
    expect(r.compensation_ids).toEqual(['c1']);
    expect(r.expense_ids).toHaveLength(0);
    expect(r.descrizione).toBe('Sviluppo web');
  });

  it('single expense → 1 row with ritenuta 0', () => {
    const rows = groupToCollaboratorRows([], [makeExp('e1', 'col1', 50)]);
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.importo_lordo).toBe(50);
    expect(r.importo_netto).toBe(50);
    expect(r.ritenuta).toBe(0);
    expect(r.expense_ids).toEqual(['e1']);
    expect(r.compensation_ids).toHaveLength(0);
  });

  it('comp + expense same collaborator → 1 row, amounts summed', () => {
    const rows = groupToCollaboratorRows(
      [makeComp('c1', 'col1', 200, 160)],
      [makeExp('e1', 'col1', 50)],
    );
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.importo_lordo).toBe(250);
    expect(r.importo_netto).toBe(210);
    expect(r.compensation_ids).toEqual(['c1']);
    expect(r.expense_ids).toEqual(['e1']);
    expect(r.descrizione).toContain('Sviluppo web');
    expect(r.descrizione).toContain('Trasporto');
  });

  it('two different collaborators → 2 rows', () => {
    const rows = groupToCollaboratorRows(
      [makeComp('c1', 'col1', 100, 80)],
      [makeExp('e1', 'col2', 50)],
    );
    expect(rows).toHaveLength(2);
  });

  it('two comps same collaborator → 1 row, both IDs collected', () => {
    const rows = groupToCollaboratorRows(
      [makeComp('c1', 'col1', 100, 80), makeComp('c2', 'col1', 50, 40)],
      [],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].compensation_ids).toHaveLength(2);
    expect(rows[0].importo_lordo).toBe(150);
    expect(rows[0].importo_netto).toBe(120);
    expect(rows[0].ritenuta).toBe(30);
  });
});

// ── formatDate ────────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('null → empty string', () => {
    expect(formatDate(null)).toBe('');
  });

  it('valid ISO date → DD/MM/YYYY', () => {
    expect(formatDate('1990-01-15')).toBe('15/01/1990');
  });

  it('invalid string → empty string', () => {
    expect(formatDate('not-a-date')).toBe('');
  });
});

// ── formatEuro ────────────────────────────────────────────────────────────────

describe('formatEuro', () => {
  it('whole number → includes €', () => {
    const result = formatEuro(3);
    expect(result).toContain('3');
    expect(result).toContain('€');
  });

  it('decimal → 2 decimal places', () => {
    const result = formatEuro(2.4);
    expect(result).toMatch(/2[,.]?4[0]/);
  });

  it('zero → formats correctly', () => {
    const result = formatEuro(0);
    expect(result).toContain('0');
    expect(result).toContain('€');
  });
});

// ── toGSheetRow ───────────────────────────────────────────────────────────────

describe('toGSheetRow', () => {
  it('returns exactly 15 columns', () => {
    const rows = groupToCollaboratorRows([makeComp('c1', 'col1', 100, 80)], []);
    const gRow = toGSheetRow(rows[0]);
    expect(gRow).toHaveLength(15);
  });

  it('column order: email at 0, nome+cognome at 1, nome at 2, cognome at 3', () => {
    const rows = groupToCollaboratorRows([makeComp('c1', 'col1', 100, 80)], []);
    const gRow = toGSheetRow(rows[0]);
    expect(gRow[0]).toBe('mario@test.com');
    expect(gRow[1]).toBe('Mario Rossi');
    expect(gRow[2]).toBe('Mario');
    expect(gRow[3]).toBe('Rossi');
  });

  it('data_nascita at col 4 formatted as DD/MM/YYYY', () => {
    const rows = groupToCollaboratorRows([makeComp('c1', 'col1', 100, 80)], []);
    const gRow = toGSheetRow(rows[0]);
    expect(gRow[4]).toBe('15/01/1990');
  });

  it('importo_lordo at col 9, importo_netto at 10, ritenuta at 11', () => {
    const rows = groupToCollaboratorRows([makeComp('c1', 'col1', 100, 80)], []);
    const gRow = toGSheetRow(rows[0]);
    expect(gRow[9]).toContain('100');
    expect(gRow[10]).toContain('80');
    expect(gRow[11]).toContain('20');
  });

  it('iban at col 13, intestatario at col 14', () => {
    const rows = groupToCollaboratorRows([makeComp('c1', 'col1', 100, 80)], []);
    const gRow = toGSheetRow(rows[0]);
    expect(gRow[13]).toBe('IT60X0542811101000000123456');
    expect(gRow[14]).toBe('Mario Rossi');
  });

  it('null fields → empty string', () => {
    const comp = {
      ...makeComp('c1', 'col1', 100, 80),
      collaborator: {
        ...baseCollab,
        data_nascita: null,
        luogo_nascita: null,
        comune: null,
        indirizzo: null,
        codice_fiscale: null,
        iban: null,
        intestatario_pagamento: null,
      },
    };
    const rows = groupToCollaboratorRows([comp], []);
    const gRow = toGSheetRow(rows[0]);
    expect(gRow[4]).toBe('');
    expect(gRow[5]).toBe('');
    expect(gRow[13]).toBe('');
    expect(gRow[14]).toBe('');
  });
});
