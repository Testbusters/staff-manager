import { describe, it, expect } from 'vitest';
import { getCorsoStato, CORSO_STATO_BADGE, MATERIA_COLORS } from '@/lib/corsi-utils';

describe('getCorsoStato', () => {
  it('returns programmato when start date is in the future', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(getCorsoStato(future.toISOString(), future.toISOString())).toBe('programmato');
  });

  it('returns concluso when end date is in the past', () => {
    expect(getCorsoStato('2020-01-01', '2020-12-31')).toBe('concluso');
  });

  it('returns attivo when today is between start and end', () => {
    const past = new Date();
    past.setMonth(past.getMonth() - 1);
    const future = new Date();
    future.setMonth(future.getMonth() + 1);
    expect(getCorsoStato(past.toISOString(), future.toISOString())).toBe('attivo');
  });

  it('returns attivo when start date is yesterday and end date is tomorrow', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(getCorsoStato(yesterday.toISOString(), tomorrow.toISOString())).toBe('attivo');
  });
});

describe('CORSO_STATO_BADGE', () => {
  it('has entries for all 3 states', () => {
    expect(Object.keys(CORSO_STATO_BADGE)).toEqual(['programmato', 'attivo', 'concluso']);
  });

  it('values are non-empty class strings', () => {
    for (const v of Object.values(CORSO_STATO_BADGE)) {
      expect(v.length).toBeGreaterThan(0);
      expect(v).toContain('bg-');
    }
  });
});

describe('MATERIA_COLORS', () => {
  it('has color entries for known materie', () => {
    expect(MATERIA_COLORS['Logica']).toBeTruthy();
    expect(MATERIA_COLORS['Biologia']).toBeTruthy();
    expect(MATERIA_COLORS['CoCoDà']).toBeTruthy();
  });

  it('all values are bg-* classes', () => {
    for (const v of Object.values(MATERIA_COLORS)) {
      expect(v).toMatch(/^bg-/);
    }
  });
});
