import { describe, it, expect } from 'vitest';
import { generateUsername } from '@/lib/username';

describe('generateUsername', () => {
  it('produces lowercase nome_cognome', () => {
    expect(generateUsername('Mario', 'Rossi')).toBe('mario_rossi');
  });

  it('removes accents', () => {
    expect(generateUsername('André', 'Duplàcé')).toBe('andre_duplace');
  });

  it('replaces non-alphanumeric chars with underscore', () => {
    expect(generateUsername("De'Luca", 'O Brien')).toBe('de_luca_o_brien');
  });

  it('trims leading and trailing underscores', () => {
    expect(generateUsername(' -Mario- ', ' -Rossi- ')).toBe('mario_rossi');
  });

  it('handles empty nome', () => {
    expect(generateUsername('', 'Rossi')).toBe('rossi');
  });

  it('handles empty cognome', () => {
    expect(generateUsername('Mario', '')).toBe('mario');
  });

  it('handles both empty', () => {
    expect(generateUsername('', '')).toBe('');
  });

  it('handles whitespace-only inputs', () => {
    expect(generateUsername('  ', '  ')).toBe('');
  });

  it('collapses multiple underscores', () => {
    expect(generateUsername('  Ma  rio  ', 'Rossi')).toBe('ma_rio_rossi');
  });

  it('handles mixed case', () => {
    expect(generateUsername('MARIO', 'ROSSI')).toBe('mario_rossi');
  });

  it('handles numbers in name', () => {
    expect(generateUsername('Mario2', 'Rossi3')).toBe('mario2_rossi3');
  });

  it('handles unicode characters', () => {
    expect(generateUsername('Müller', 'Straße')).toBe('muller_stra_e');
  });
});
