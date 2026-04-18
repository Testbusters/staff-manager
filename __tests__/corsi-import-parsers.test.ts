import { describe, it, expect } from 'vitest';
import {
  parseItalianDate,
  parseOrario,
  resolveMaterie,
  type CorsiImportLookups,
} from '@/lib/corsi-import-sheet';

// ── parseItalianDate ──────────────────────────────────────────────

describe('parseItalianDate', () => {
  it('parses DD/MM/YYYY to ISO date', () => {
    expect(parseItalianDate('15/03/2026')).toBe('2026-03-15');
  });

  it('parses single-digit day/month', () => {
    expect(parseItalianDate('1/2/2026')).toBe('2026-02-01');
  });

  it('returns null for empty string', () => {
    expect(parseItalianDate('')).toBeNull();
  });

  it('returns null for malformed format', () => {
    expect(parseItalianDate('2026-03-15')).toBeNull();
  });

  it('returns null for missing year', () => {
    expect(parseItalianDate('15/03')).toBeNull();
  });

  it('returns null for invalid month', () => {
    expect(parseItalianDate('15/13/2026')).toBeNull();
  });

  it('returns null for invalid day', () => {
    expect(parseItalianDate('32/01/2026')).toBeNull();
  });

  it('rejects 31/02 (February overflow)', () => {
    expect(parseItalianDate('31/02/2026')).toBeNull();
  });

  it('accepts 29/02 on leap year', () => {
    expect(parseItalianDate('29/02/2028')).toBe('2028-02-29');
  });

  it('rejects 29/02 on non-leap year', () => {
    expect(parseItalianDate('29/02/2026')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(parseItalianDate('  15/03/2026  ')).toBe('2026-03-15');
  });

  it('returns null for null-like input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(parseItalianDate(null as any)).toBeNull();
  });
});

// ── parseOrario ──────────────────────────────────────────────────

describe('parseOrario', () => {
  it('parses HH:MM-HH:MM', () => {
    expect(parseOrario('09:00-12:30')).toEqual({
      inizio: '09:00:00',
      fine: '12:30:00',
    });
  });

  it('handles single-digit hours', () => {
    expect(parseOrario('9:00-12:00')).toEqual({
      inizio: '09:00:00',
      fine: '12:00:00',
    });
  });

  it('handles spaces around dash', () => {
    expect(parseOrario('09:00 - 12:30')).toEqual({
      inizio: '09:00:00',
      fine: '12:30:00',
    });
  });

  it('returns null for empty string', () => {
    expect(parseOrario('')).toBeNull();
  });

  it('returns null for malformed format', () => {
    expect(parseOrario('9-12')).toBeNull();
  });

  it('returns null when start >= end', () => {
    expect(parseOrario('14:00-14:00')).toBeNull();
    expect(parseOrario('15:00-14:00')).toBeNull();
  });

  it('returns null for invalid hour', () => {
    expect(parseOrario('25:00-26:00')).toBeNull();
  });

  it('returns null for invalid minutes', () => {
    expect(parseOrario('09:60-12:00')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(parseOrario('  09:00-12:30  ')).toEqual({
      inizio: '09:00:00',
      fine: '12:30:00',
    });
  });
});

// ── resolveMaterie ───────────────────────────────────────────────

describe('resolveMaterie', () => {
  const lookups: CorsiImportLookups = {
    communities: new Map([['testbusters', 'uuid-tb']]),
    materieByCommunity: new Map([
      ['testbusters', new Map([
        ['matematica', 'Matematica'],
        ['fisica', 'Fisica'],
        ['italiano', 'Italiano'],
      ])],
    ]),
  };

  it('resolves a single known materia', () => {
    const result = resolveMaterie('Matematica', 'testbusters', lookups);
    expect(result).toEqual({ ok: true, materie: ['Matematica'] });
  });

  it('is case-insensitive', () => {
    const result = resolveMaterie('matematica', 'testbusters', lookups);
    expect(result).toEqual({ ok: true, materie: ['Matematica'] });
  });

  it('expands M&F composite to Matematica + Fisica', () => {
    const result = resolveMaterie('M&F', 'testbusters', lookups);
    expect(result).toEqual({ ok: true, materie: ['Matematica', 'Fisica'] });
  });

  it('returns error for unknown materia', () => {
    const result = resolveMaterie('Chimica', 'testbusters', lookups);
    expect(result.ok).toBe(false);
  });

  it('returns error for empty materia', () => {
    const result = resolveMaterie('', 'testbusters', lookups);
    expect(result.ok).toBe(false);
  });

  it('returns error for unknown community', () => {
    const result = resolveMaterie('Matematica', 'unknown_community', lookups);
    expect(result.ok).toBe(false);
  });

  it('trims whitespace before lookup', () => {
    const result = resolveMaterie('  Matematica  ', 'testbusters', lookups);
    expect(result).toEqual({ ok: true, materie: ['Matematica'] });
  });
});
