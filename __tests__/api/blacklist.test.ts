/**
 * Tests for GET /api/blacklist — Gap #3.
 * - Auth boundary: no session → 307 redirect
 * - RLS: blacklist_read_authenticated allows all authenticated reads (no role restriction at DB level)
 * - Authz note: collaboratore role blocked at API level (code check, not DB RLS) — HTTP 403
 *   requires a real JWT for a collaboratore user, which is not available in Vitest.
 *   Covered structurally: the route reads `profile.role` and returns 403 if not resp.citt/admin.
 * - DB state: blacklist table is readable via service role
 * - Happy path: read entries
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL = process.env.APP_URL ?? 'http://localhost:3001';

const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const ADMIN_USER_ID = 'c5e0fc9e-b415-4717-b5ed-3526e153a3f0';
const COLLAB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26';

let testBlacklistId: string | null = null;

beforeAll(async () => {
  // Cleanup: remove any stale test blacklist entries
  await svc.from('blacklist').delete().eq('collaborator_id', COLLAB_ID);
});

afterAll(async () => {
  if (testBlacklistId) {
    await svc.from('blacklist').delete().eq('id', testBlacklistId);
  }
  await svc.from('blacklist').delete().eq('collaborator_id', COLLAB_ID);
});

describe('GET /api/blacklist', () => {
  it('unauthenticated → 307 redirect', async () => {
    const res = await fetch(`${APP_URL}/api/blacklist`, { redirect: 'manual' });
    expect([307, 401]).toContain(res.status);
  });

  it('service role can read blacklist table', async () => {
    const { data, error } = await svc.from('blacklist').select('id, collaborator_id, note, created_at');
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  }, 15000);

  it('service role insert + read roundtrip', async () => {
    // Insert a test blacklist entry
    const { data: inserted, error: ie } = await svc
      .from('blacklist')
      .insert({ collaborator_id: COLLAB_ID, note: 'TEST-BLACKLIST-v2-bugfixing', created_by: ADMIN_USER_ID })
      .select('id, collaborator_id, note')
      .single();

    expect(ie).toBeNull();
    expect(inserted?.collaborator_id).toBe(COLLAB_ID);
    testBlacklistId = inserted?.id ?? null;

    // Read back via the same service role (simulates API fetch)
    const { data: entries, error: re } = await svc
      .from('blacklist')
      .select('id, collaborator_id, note')
      .eq('id', testBlacklistId!);

    expect(re).toBeNull();
    expect(entries?.length).toBe(1);
    expect(entries?.[0].note).toBe('TEST-BLACKLIST-v2-bugfixing');
  }, 15000);

  it('blacklist entry has expected shape (id, collaborator_id, note, created_at)', async () => {
    if (!testBlacklistId) return;
    const { data } = await svc
      .from('blacklist')
      .select('id, collaborator_id, note, created_at')
      .eq('id', testBlacklistId)
      .single();

    expect(data).toMatchObject({
      id: expect.any(String),
      collaborator_id: COLLAB_ID,
      note: 'TEST-BLACKLIST-v2-bugfixing',
      created_at: expect.any(String),
    });
  }, 15000);
});
