/**
 * Tests for simple GET lookup routes:
 * - GET /api/compensations/communities
 * - GET /api/compensations/competenze
 * - GET /api/lookup-options
 * - GET /api/health
 *
 * Covers: DB data existence, schema shape, auth boundaries (via service role DB queries).
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL = process.env.APP_URL ?? 'http://localhost:3001';

if (!SUPABASE_URL?.includes('gjwkvgfwkdwzqlvudgqr')) {
  throw new Error('Wrong Supabase project — only run against staging.');
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Known staging IDs
const COMMUNITY_TB = '6fdd80e9-2464-4304-9bd7-d5703370a119';

describe('GET /api/health', () => {
  it('returns 200 with status ok (public endpoint)', async () => {
    const res = await fetch(`${APP_URL}/api/health`);
    // health may return 200 or redirect depending on proxy config
    if (res.ok) {
      const body = await res.json();
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeTruthy();
    } else {
      // Proxy might redirect unauthenticated requests
      expect([200, 307]).toContain(res.status);
    }
  }, 15000);
});

describe('compensation_competenze table', () => {
  it('has active competenze rows with key and label', async () => {
    const { data, error } = await svc
      .from('compensation_competenze')
      .select('key, label, active, sort_order')
      .eq('active', true)
      .order('sort_order');

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.length).toBeGreaterThan(0);

    for (const row of data!) {
      expect(row.key).toBeTruthy();
      expect(row.label).toBeTruthy();
      expect(row.active).toBe(true);
      expect(typeof row.sort_order).toBe('number');
    }
  }, 15000);

  it('includes known competenze keys', async () => {
    const { data } = await svc
      .from('compensation_competenze')
      .select('key')
      .eq('active', true);

    const keys = data!.map((r) => r.key);
    expect(keys).toContain('corsi');
    expect(keys).toContain('produzione_materiale');
  }, 15000);
});

describe('communities table (used by /api/compensations/communities)', () => {
  it('has Testbusters community with expected fields', async () => {
    const { data, error } = await svc
      .from('communities')
      .select('id, name, is_active')
      .eq('id', COMMUNITY_TB)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.name).toBe('Testbusters');
    expect(data!.is_active).toBe(true);
  }, 15000);
});

describe('lookup_options table (used by /api/lookup-options)', () => {
  it('has citta entries for Testbusters', async () => {
    const { data, error } = await svc
      .from('lookup_options')
      .select('id, nome, type, community, sort_order')
      .eq('type', 'citta')
      .eq('community', 'testbusters')
      .order('sort_order');

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.length).toBeGreaterThan(0);

    for (const row of data!) {
      expect(row.nome).toBeTruthy();
      expect(row.type).toBe('citta');
      expect(row.community).toBe('testbusters');
    }
  }, 15000);

  it('has materia entries for Testbusters', async () => {
    const { data, error } = await svc
      .from('lookup_options')
      .select('id, nome, type')
      .eq('type', 'materia')
      .eq('community', 'testbusters');

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  }, 15000);

  it('returns empty for non-existent type', async () => {
    const { data, error } = await svc
      .from('lookup_options')
      .select('id')
      .eq('type', 'nonexistent_type_xyz')
      .eq('community', 'testbusters');

    expect(error).toBeNull();
    expect(data).toEqual([]);
  }, 15000);
});

describe('unauthenticated access to lookup routes', () => {
  it('GET /api/compensations/communities → redirect or 401', async () => {
    const res = await fetch(`${APP_URL}/api/compensations/communities`, { redirect: 'manual' });
    expect([307, 401]).toContain(res.status);
  }, 15000);

  it('GET /api/compensations/competenze → redirect or 401', async () => {
    const res = await fetch(`${APP_URL}/api/compensations/competenze`, { redirect: 'manual' });
    expect([307, 401]).toContain(res.status);
  }, 15000);

  it('GET /api/lookup-options → redirect or 401', async () => {
    const res = await fetch(`${APP_URL}/api/lookup-options?type=citta&community=testbusters`, { redirect: 'manual' });
    expect([307, 401]).toContain(res.status);
  }, 15000);
});
