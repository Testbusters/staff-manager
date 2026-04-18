import { describe, it, expect } from 'vitest';
import { NAV_BY_ROLE } from '@/lib/nav';
import type { Role } from '@/lib/types';

const ALL_ROLES: Role[] = [
  'collaboratore',
  'responsabile_compensi',
  'responsabile_cittadino',
  'responsabile_servizi_individuali',
  'amministrazione',
];

describe('NAV_BY_ROLE', () => {
  it('has an entry for every role', () => {
    for (const role of ALL_ROLES) {
      expect(NAV_BY_ROLE[role]).toBeDefined();
      expect(Array.isArray(NAV_BY_ROLE[role])).toBe(true);
    }
  });

  it('every nav item has label, href, and iconName', () => {
    for (const role of ALL_ROLES) {
      for (const item of NAV_BY_ROLE[role]) {
        expect(item.label).toBeTruthy();
        expect(item.href).toBeTruthy();
        expect(item.iconName).toBeTruthy();
      }
    }
  });

  it('collaboratore has Home as first item', () => {
    expect(NAV_BY_ROLE.collaboratore[0].href).toBe('/');
    expect(NAV_BY_ROLE.collaboratore[0].iconName).toBe('Home');
  });

  it('amministrazione has the most nav items', () => {
    const adminCount = NAV_BY_ROLE.amministrazione.length;
    for (const role of ALL_ROLES) {
      expect(adminCount).toBeGreaterThanOrEqual(NAV_BY_ROLE[role].length);
    }
  });

  it('responsabile_servizi_individuali has empty nav (placeholder)', () => {
    expect(NAV_BY_ROLE.responsabile_servizi_individuali).toHaveLength(0);
  });

  it('no duplicate hrefs within the same role', () => {
    for (const role of ALL_ROLES) {
      const hrefs = NAV_BY_ROLE[role].map((i) => i.href).filter((h) => h !== '#');
      const unique = new Set(hrefs);
      expect(unique.size).toBe(hrefs.length);
    }
  });
});
