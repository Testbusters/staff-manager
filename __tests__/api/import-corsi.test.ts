/**
 * Unit tests for corsi-gsheet-import block parsers.
 * Covers the pure logic exported by lib/corsi-import-sheet.ts:
 *   - parseItalianDate, parseOrario, resolveMaterie, parseTab.
 *
 * HTTP/auth boundary tests are covered by the standard auth pattern shared
 * across all admin API routes and verified in Phase 5c smoke test.
 * I/O paths (Google Sheets fetch, Supabase writes) are covered by Phase 4 e2e.
 */

import { describe, it, expect } from 'vitest';
import {
  parseItalianDate,
  parseOrario,
  resolveMaterie,
  parseTab,
  type CorsiImportLookups,
} from '@/lib/corsi-import-sheet';

// ── Fixture lookups ──────────────────────────────────────────────────────────

const TB_ID = '6fdd80e9-2464-4304-9bd7-d5703370a119';
const P4M_ID = '20ef2aac-7447-4576-b815-91d44560f00e';

function makeLookups(): CorsiImportLookups {
  const tbMaterie = new Map<string, string>([
    ['matematica', 'Matematica'],
    ['fisica', 'Fisica'],
    ['logica', 'Logica'],
    ['chimica', 'Chimica'],
  ]);
  const p4mMaterie = new Map<string, string>([
    ['anatomia', 'Anatomia'],
    ['biologia', 'Biologia'],
  ]);
  return {
    communities: new Map([
      ['testbusters', TB_ID],
      ['peer4med', P4M_ID],
    ]),
    materieByCommunity: new Map([
      ['testbusters', tbMaterie],
      ['peer4med', p4mMaterie],
    ]),
  };
}

// Rows are 0-indexed string[][] mirroring the A:H sheet range.
// Helpers keep the test fixtures readable.
function metaRow(key: string, value: string): string[] {
  return ['', '', '', '', '', '', key, value];
}
function lezioneRow(data: string, materia: string, orario: string): string[] {
  return [data, '', materia, orario, '', '', '', ''];
}
function header(): string[] {
  return ['Data', 'Giorno', 'Materia', 'Orario', 'Ore', '', '', ''];
}

// ── parseItalianDate ─────────────────────────────────────────────────────────

describe('parseItalianDate', () => {
  it('parses DD/MM/YYYY', () => {
    expect(parseItalianDate('26/02/2026')).toBe('2026-02-26');
  });
  it('pads single-digit day and month', () => {
    expect(parseItalianDate('3/9/2026')).toBe('2026-09-03');
  });
  it('returns null for empty string', () => {
    expect(parseItalianDate('')).toBeNull();
  });
  it('returns null for missing year (no slashes)', () => {
    expect(parseItalianDate('26 febbraio')).toBeNull();
  });
  it('returns null for ISO format (input is DD/MM/YYYY only)', () => {
    expect(parseItalianDate('2026-02-26')).toBeNull();
  });
  it('rejects calendar-invalid date 31/02/2026', () => {
    expect(parseItalianDate('31/02/2026')).toBeNull();
  });
  it('rejects month > 12', () => {
    expect(parseItalianDate('01/13/2026')).toBeNull();
  });
  it('rejects day > 31', () => {
    expect(parseItalianDate('32/01/2026')).toBeNull();
  });
});

// ── parseOrario ──────────────────────────────────────────────────────────────

describe('parseOrario', () => {
  it('parses HH:MM-HH:MM', () => {
    expect(parseOrario('14:00-16:00')).toEqual({
      inizio: '14:00:00',
      fine: '16:00:00',
    });
  });
  it('tolerates whitespace around hyphen', () => {
    expect(parseOrario('14:00 - 16:00')).toEqual({
      inizio: '14:00:00',
      fine: '16:00:00',
    });
  });
  it('returns null when inizio >= fine', () => {
    expect(parseOrario('16:00-14:00')).toBeNull();
    expect(parseOrario('14:00-14:00')).toBeNull();
  });
  it('returns null for hour > 23', () => {
    expect(parseOrario('25:00-26:00')).toBeNull();
  });
  it('returns null for minute > 59', () => {
    expect(parseOrario('14:75-16:00')).toBeNull();
  });
  it('returns null for malformed input', () => {
    expect(parseOrario('14h-16h')).toBeNull();
    expect(parseOrario('')).toBeNull();
  });
});

// ── resolveMaterie ───────────────────────────────────────────────────────────

describe('resolveMaterie', () => {
  const lookups = makeLookups();

  it('returns Title Case canonical name for known materia (case-insensitive)', () => {
    expect(resolveMaterie('matematica', 'testbusters', lookups)).toEqual({
      ok: true,
      materie: ['Matematica'],
    });
    expect(resolveMaterie('MATEMATICA', 'testbusters', lookups)).toEqual({
      ok: true,
      materie: ['Matematica'],
    });
  });
  it('expands "M&F" composite into [Matematica, Fisica]', () => {
    expect(resolveMaterie('M&F', 'testbusters', lookups)).toEqual({
      ok: true,
      materie: ['Matematica', 'Fisica'],
    });
  });
  it('returns error for unknown materia', () => {
    const res = resolveMaterie('Astrofisica', 'testbusters', lookups);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/materia sconosciuta/);
  });
  it('returns error for empty value', () => {
    const res = resolveMaterie('   ', 'testbusters', lookups);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/vuota/);
  });
  it('returns error when community has no materie lookup', () => {
    const res = resolveMaterie('Matematica', 'unknown', lookups);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/materie non trovate/);
  });
  it('rejects M&F when community lacks one of the composite materie', () => {
    const res = resolveMaterie('M&F', 'peer4med', lookups);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/materia sconosciuta/);
  });
});

// ── parseTab ─────────────────────────────────────────────────────────────────

describe('parseTab', () => {
  const lookups = makeLookups();

  function happyPathRows(overrides: Record<string, string> = {}): string[][] {
    const meta: Record<string, string> = {
      Community: 'Testbusters',
      Nome: 'Corso Test 2026',
      'Codice identificativo': 'CT-2026-001',
      Modalità: 'Online',
      Città: 'Milano',
      Linea: 'Linea A',
      'Responabile DOC': 'Mario Rossi',
      'Licenza Zoom': 'zoom-1',
      'Q&A max': '3',
      'Sincronizzato con il gestionale': 'TO_PROCESS',
      ...overrides,
    };
    const rows: string[][] = [
      header(),
      lezioneRow('15/03/2026', 'Matematica', '14:00-16:00'),
      lezioneRow('22/03/2026', 'M&F', '14:00-16:00'),
    ];
    // Pad metadata rows starting at index 3.
    for (const [k, v] of Object.entries(meta)) {
      rows.push(metaRow(k, v));
    }
    return rows;
  }

  it('happy path returns ok with corso, lezioni, and statusCellRef', () => {
    const res = parseTab('Corsi1', happyPathRows(), lookups);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.corso.nome).toBe('Corso Test 2026');
    expect(res.corso.codice_identificativo).toBe('CT-2026-001');
    expect(res.corso.community_id).toBe(TB_ID);
    expect(res.corso.modalita).toBe('online');
    expect(res.corso.citta).toBe('Milano');
    expect(res.corso.max_qa_per_lezione).toBe(3);
    expect(res.lezioni).toHaveLength(2);
    expect(res.lezioni[0].materie).toEqual(['Matematica']);
    expect(res.lezioni[1].materie).toEqual(['Matematica', 'Fisica']);
    expect(res.statusCellRef).toMatch(/^Corsi1!H\d+$/);
  });

  it('citta "ASSEGNAZIONE" → corso.citta === null', () => {
    const res = parseTab('Corsi1', happyPathRows({ Città: 'ASSEGNAZIONE' }), lookups);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.corso.citta).toBeNull();
  });

  it('modalità "In aula" → "in_aula" (case-insensitive)', () => {
    const res = parseTab('Corsi1', happyPathRows({ Modalità: 'IN AULA' }), lookups);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.corso.modalita).toBe('in_aula');
  });

  it('missing Nome → error with statusCellRef set', () => {
    const res = parseTab('Corsi1', happyPathRows({ Nome: '' }), lookups);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/Nome/);
    expect(res.statusCellRef).toMatch(/^Corsi1!H\d+$/);
  });

  it('missing Codice → error', () => {
    const res = parseTab(
      'Corsi1',
      happyPathRows({ 'Codice identificativo': '' }),
      lookups,
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Codice/);
  });

  it('unknown community → error', () => {
    const res = parseTab('Corsi1', happyPathRows({ Community: 'Foobar' }), lookups);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/community sconosciuta/);
  });

  it('invalid modalità → error', () => {
    const res = parseTab('Corsi1', happyPathRows({ Modalità: 'Ibrido' }), lookups);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/modalità/);
  });

  it('non-numeric Q&A max → error', () => {
    const res = parseTab('Corsi1', happyPathRows({ 'Q&A max': 'tre' }), lookups);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Q&A max/);
  });

  it('invalid lezione date → error references the row', () => {
    const meta: Record<string, string> = {
      Community: 'Testbusters',
      Nome: 'X',
      'Codice identificativo': 'X-1',
      Modalità: 'Online',
      Città: 'Milano',
      'Sincronizzato con il gestionale': 'TO_PROCESS',
    };
    const rows: string[][] = [
      header(),
      lezioneRow('31/02/2026', 'Matematica', '14:00-16:00'),
    ];
    for (const [k, v] of Object.entries(meta)) rows.push(metaRow(k, v));
    const res = parseTab('Corsi1', rows, lookups);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/data non valida/);
  });

  it('no lezione rows → error "nessuna lezione valida"', () => {
    const meta: Record<string, string> = {
      Community: 'Testbusters',
      Nome: 'X',
      'Codice identificativo': 'X-2',
      Modalità: 'Online',
      Città: 'Milano',
      'Sincronizzato con il gestionale': 'TO_PROCESS',
    };
    const rows: string[][] = [header()];
    for (const [k, v] of Object.entries(meta)) rows.push(metaRow(k, v));
    const res = parseTab('Corsi1', rows, lookups);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/nessuna lezione/);
  });

  it('blank rows between lezioni are skipped, not treated as terminator', () => {
    const meta: Record<string, string> = {
      Community: 'Testbusters',
      Nome: 'Y',
      'Codice identificativo': 'Y-1',
      Modalità: 'Online',
      Città: 'Milano',
      'Sincronizzato con il gestionale': 'TO_PROCESS',
    };
    const rows: string[][] = [
      header(),
      lezioneRow('15/03/2026', 'Matematica', '14:00-16:00'),
      ['', '', '', '', '', '', '', ''], // blank
      lezioneRow('22/03/2026', 'Fisica', '14:00-16:00'),
    ];
    for (const [k, v] of Object.entries(meta)) rows.push(metaRow(k, v));
    const res = parseTab('Corsi1', rows, lookups);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.lezioni).toHaveLength(2);
  });
});
