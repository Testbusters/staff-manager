/**
 * Unit tests for Block 13b import utilities.
 * Tests the parse/calc logic extracted from the import routes.
 * HTTP/auth boundary tests are covered by manual smoke test (Phase 5c)
 * and by the standard auth pattern shared across all API routes.
 */

import { describe, it, expect } from 'vitest';

// ── parseDate utility (inline test of logic used in route) ──

function parseDate(raw: string): string | null {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

describe('parseDate', () => {
  it('parses dd/MM/yyyy', () => {
    expect(parseDate('26/02/2026')).toBe('2026-02-26');
  });
  it('passes through ISO yyyy-MM-dd', () => {
    expect(parseDate('2026-02-26')).toBe('2026-02-26');
  });
  it('returns null for empty string', () => {
    expect(parseDate('')).toBeNull();
  });
  it('returns null for invalid format', () => {
    expect(parseDate('not-a-date')).toBeNull();
  });
  it('pads single-digit day and month', () => {
    expect(parseDate('3/9/2025')).toBe('2025-09-03');
  });
});

// ── parseImporto utility ──

function parseImporto(raw: string): number | null {
  if (!raw) return null;
  const clean = raw.replace(/[^\d.,-]/g, '');
  const lastComma = clean.lastIndexOf(',');
  const lastDot = clean.lastIndexOf('.');
  let normalized: string;
  if (lastComma > lastDot) {
    normalized = clean.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = clean.replace(/,/g, '');
  }
  const n = parseFloat(normalized);
  return isNaN(n) ? null : Math.round(n * 100) / 100;
}

describe('parseImporto', () => {
  it('parses plain number', () => {
    expect(parseImporto('160.00')).toBe(160);
  });
  it('parses EN thousand-separator "1,000.00"', () => {
    expect(parseImporto('1,000.00')).toBe(1000);
  });
  it('parses EU format "1.000,00"', () => {
    expect(parseImporto('1.000,00')).toBe(1000);
  });
  it('parses "200.00" correctly', () => {
    expect(parseImporto('200.00')).toBe(200);
  });
  it('returns null for empty string', () => {
    expect(parseImporto('')).toBeNull();
  });
  it('returns null for non-numeric', () => {
    expect(parseImporto('abc')).toBeNull();
  });
  it('rounds to 2 decimal places', () => {
    expect(parseImporto('100.999')).toBe(101);
  });
});

// ── Ritenuta calculation ──

describe('ritenuta acconto calculation', () => {
  const RATE = 0.2;
  function calc(lordo: number) {
    const ritenuta = Math.round(lordo * RATE * 100) / 100;
    const netto = Math.round((lordo - ritenuta) * 100) / 100;
    return { ritenuta, netto };
  }

  it('160 lordo → 32 ritenuta, 128 netto', () => {
    expect(calc(160)).toEqual({ ritenuta: 32, netto: 128 });
  });
  it('200 lordo → 40 ritenuta, 160 netto', () => {
    expect(calc(200)).toEqual({ ritenuta: 40, netto: 160 });
  });
  it('150 lordo → 30 ritenuta, 120 netto', () => {
    expect(calc(150)).toEqual({ ritenuta: 30, netto: 120 });
  });
});
