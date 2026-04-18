import { describe, it, expect } from 'vitest';
import { getYtd, isOverMassimale } from '@/lib/massimale';

const CURRENT_YEAR = new Date().getFullYear();

describe('getYtd', () => {
  it('returns approved_lordo_ytd for current year', () => {
    expect(getYtd({ approved_lordo_ytd: 3000, approved_year: CURRENT_YEAR })).toBe(3000);
  });

  it('returns 0 for past year', () => {
    expect(getYtd({ approved_lordo_ytd: 3000, approved_year: CURRENT_YEAR - 1 })).toBe(0);
  });

  it('returns 0 for future year', () => {
    expect(getYtd({ approved_lordo_ytd: 3000, approved_year: CURRENT_YEAR + 1 })).toBe(0);
  });

  it('handles string-like number via Number()', () => {
    // approved_lordo_ytd could come from DB as a string-like numeric
    expect(getYtd({ approved_lordo_ytd: 1500.50, approved_year: CURRENT_YEAR })).toBe(1500.50);
  });
});

describe('isOverMassimale', () => {
  it('returns false when massimale is null', () => {
    expect(isOverMassimale(3000, 500, null)).toBe(false);
  });

  it('returns false when massimale is 0 (falsy)', () => {
    expect(isOverMassimale(3000, 500, 0)).toBe(false);
  });

  it('returns false when ytd + incoming <= massimale', () => {
    expect(isOverMassimale(4000, 1000, 5000)).toBe(false);
  });

  it('returns false when exactly at massimale', () => {
    expect(isOverMassimale(4000, 1000, 5000)).toBe(false);
  });

  it('returns true when ytd + incoming > massimale', () => {
    expect(isOverMassimale(4000, 1001, 5000)).toBe(true);
  });

  it('returns true when already over before incoming', () => {
    expect(isOverMassimale(6000, 100, 5000)).toBe(true);
  });
});
