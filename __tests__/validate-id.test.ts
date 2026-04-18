import { describe, it, expect } from 'vitest';
import { isValidUUID } from '@/lib/validate-id';

describe('isValidUUID', () => {
  it('accepts valid v4 UUID', () => {
    expect(isValidUUID('a1b2c3d4-e5f6-4789-a012-a3b4c5d6e7f8')).toBe(true);
  });

  it('accepts uppercase UUID', () => {
    expect(isValidUUID('A1B2C3D4-E5F6-4789-A012-A3B4C5D6E7F8')).toBe(true);
  });

  it('accepts nil UUID', () => {
    expect(isValidUUID('00000000-0000-0000-0000-000000000000')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidUUID('')).toBe(false);
  });

  it('rejects short string', () => {
    expect(isValidUUID('a1b2c3d4')).toBe(false);
  });

  it('rejects UUID without dashes', () => {
    expect(isValidUUID('a1b2c3d4e5f64789a012a3b4c5d6e7f8')).toBe(false);
  });

  it('rejects UUID with extra chars', () => {
    expect(isValidUUID('a1b2c3d4-e5f6-4789-a012-a3b4c5d6e7f8x')).toBe(false);
  });

  it('rejects non-hex characters', () => {
    expect(isValidUUID('g1b2c3d4-e5f6-4789-a012-a3b4c5d6e7f8')).toBe(false);
  });
});
