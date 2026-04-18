import { describe, it, expect } from 'vitest';
import { generatePassword } from '@/lib/password';

describe('generatePassword', () => {
  it('returns a 10-character string', () => {
    const pw = generatePassword();
    expect(pw).toHaveLength(10);
  });

  it('contains at least one uppercase letter', () => {
    const pw = generatePassword();
    expect(pw).toMatch(/[A-Z]/);
  });

  it('contains at least one lowercase letter', () => {
    const pw = generatePassword();
    expect(pw).toMatch(/[a-z]/);
  });

  it('contains at least one digit', () => {
    const pw = generatePassword();
    expect(pw).toMatch(/[0-9]/);
  });

  it('contains at least one special character', () => {
    const pw = generatePassword();
    expect(pw).toMatch(/[!@#$%]/);
  });

  it('excludes ambiguous characters (0, O, 1, l, I)', () => {
    // Run multiple times to increase confidence
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword();
      expect(pw).not.toMatch(/[0OlI1]/);
    }
  });

  it('generates different passwords each call', () => {
    const passwords = new Set(Array.from({ length: 20 }, () => generatePassword()));
    // With 10-char random passwords, 20 calls should produce at least 15 unique values
    expect(passwords.size).toBeGreaterThanOrEqual(15);
  });
});
