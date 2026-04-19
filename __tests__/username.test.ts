import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateUsername, generateUniqueUsername } from '@/lib/username';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL?.includes('gjwkvgfwkdwzqlvudgqr')) {
  throw new Error('Wrong Supabase project — only run against staging.');
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

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

describe('generateUniqueUsername (integration)', () => {
  // Uses existing staging collaborator username 'collaboratore_test_2' (collaboratore_tb_test@test.com)
  // No insert/delete needed — read-only test against known staging data.
  const EXISTING_USERNAME = 'collaboratore_test_2';
  const EXISTING_COLLAB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26';

  it('returns base when no collision', async () => {
    const result = await generateUniqueUsername('uat_username_unique_xyz', svc);
    expect(result).toBe('uat_username_unique_xyz');
  }, 15000);

  it('appends _2 when base collides with existing username', async () => {
    const result = await generateUniqueUsername(EXISTING_USERNAME, svc);
    expect(result).toBe(`${EXISTING_USERNAME}_2`);
  }, 15000);

  it('returns base when excludeId matches the colliding record', async () => {
    const result = await generateUniqueUsername(EXISTING_USERNAME, svc, EXISTING_COLLAB_ID);
    expect(result).toBe(EXISTING_USERNAME);
  }, 15000);

  it('returns empty string for empty base', async () => {
    const result = await generateUniqueUsername('', svc);
    expect(result).toBe('');
  }, 15000);
});
