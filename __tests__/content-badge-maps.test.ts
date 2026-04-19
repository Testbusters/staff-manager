import { describe, it, expect } from 'vitest';
import { OPP_TIPO_COLORS, EVENT_TIPO_COLORS, getExpiryBadgeData } from '@/lib/content-badge-maps';

describe('OPP_TIPO_COLORS', () => {
  it('has entries for all opportunity types', () => {
    expect(OPP_TIPO_COLORS['Volontariato']).toBeTruthy();
    expect(OPP_TIPO_COLORS['Formazione']).toBeTruthy();
    expect(OPP_TIPO_COLORS['Lavoro']).toBeTruthy();
    expect(OPP_TIPO_COLORS['Altro']).toBeTruthy();
  });

  it('has exactly 4 entries', () => {
    expect(Object.keys(OPP_TIPO_COLORS)).toHaveLength(4);
  });
});

describe('EVENT_TIPO_COLORS', () => {
  it('has entries for all event types', () => {
    expect(EVENT_TIPO_COLORS['Convention']).toBeTruthy();
    expect(EVENT_TIPO_COLORS['Attivita_interna']).toBeTruthy();
    expect(EVENT_TIPO_COLORS['Workshop']).toBeTruthy();
    expect(EVENT_TIPO_COLORS['Formazione']).toBeTruthy();
    expect(EVENT_TIPO_COLORS['Altro']).toBeTruthy();
  });

  it('has exactly 5 entries', () => {
    expect(Object.keys(EVENT_TIPO_COLORS)).toHaveLength(5);
  });
});

describe('getExpiryBadgeData', () => {
  it('returns null when valid_to is null', () => {
    expect(getExpiryBadgeData(null)).toBeNull();
  });

  it('returns Scaduto for past date', () => {
    const result = getExpiryBadgeData('2020-01-01');
    expect(result).not.toBeNull();
    expect(result!.label).toBe('Scaduto');
  });

  it('returns In scadenza for date within 7 days', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const result = getExpiryBadgeData(soon.toISOString().slice(0, 10));
    expect(result).not.toBeNull();
    expect(result!.label).toBe('In scadenza');
  });

  it('returns Attivo for date more than 7 days away', () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const result = getExpiryBadgeData(future.toISOString().slice(0, 10));
    expect(result).not.toBeNull();
    expect(result!.label).toBe('Attivo');
  });

  it('badge objects have cls property', () => {
    const result = getExpiryBadgeData('2020-01-01');
    expect(result!.cls).toBeTruthy();
    expect(typeof result!.cls).toBe('string');
  });
});
