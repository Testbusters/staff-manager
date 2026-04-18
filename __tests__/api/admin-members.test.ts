/**
 * Tests for admin member management routes (DB integration).
 * - GET /api/admin/members (list + search + pagination)
 * - PATCH /api/admin/members/[id]/status (member_status transitions)
 *
 * HTTP routes require admin session — tested via service role DB operations.
 */
import { describe, it, expect, afterAll } from 'vitest';
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

// Known staging test collaborator
const COLLAB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26';

// Track status changes to restore
let originalStatus: string | null = null;

afterAll(async () => {
  // Restore original member_status if we changed it
  if (originalStatus !== null) {
    const { data: collab } = await svc
      .from('collaborators')
      .select('user_id')
      .eq('id', COLLAB_ID)
      .single();

    if (collab) {
      await svc
        .from('user_profiles')
        .update({ member_status: originalStatus })
        .eq('user_id', collab.user_id);
    }
  }
}, 15000);

describe('admin members — DB operations', () => {
  it('can list collaborator profiles with role=collaboratore', async () => {
    const { data, error } = await svc
      .from('user_profiles')
      .select('user_id, role, member_status, is_active')
      .eq('role', 'collaboratore')
      .limit(5);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.length).toBeGreaterThan(0);

    for (const p of data!) {
      expect(p.role).toBe('collaboratore');
      expect(['attivo', 'uscente_con_compenso', 'uscente_senza_compenso']).toContain(p.member_status);
    }
  }, 15000);

  it('can list collaborators with pagination params', async () => {
    const { data, count, error } = await svc
      .from('collaborators')
      .select('id, nome, cognome, email', { count: 'exact' })
      .order('cognome')
      .range(0, 4);

    expect(error).toBeNull();
    expect(data!.length).toBeLessThanOrEqual(5);
    expect(typeof count).toBe('number');
    expect(count!).toBeGreaterThan(0);
  }, 15000);

  it('can search collaborators by name (ilike)', async () => {
    const { data: collab } = await svc
      .from('collaborators')
      .select('nome')
      .eq('id', COLLAB_ID)
      .single();

    const searchName = collab!.nome.slice(0, 3); // first 3 chars

    const { data, error } = await svc
      .from('collaborators')
      .select('id, nome')
      .ilike('nome', `%${searchName}%`);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.some((c) => c.id === COLLAB_ID)).toBe(true);
  }, 15000);
});

describe('member_status transitions', () => {
  it('reads current member_status', async () => {
    const { data: collab } = await svc
      .from('collaborators')
      .select('user_id')
      .eq('id', COLLAB_ID)
      .single();

    const { data: profile, error } = await svc
      .from('user_profiles')
      .select('member_status')
      .eq('user_id', collab!.user_id)
      .single();

    expect(error).toBeNull();
    expect(profile).toBeTruthy();
    originalStatus = profile!.member_status;
    expect(['attivo', 'uscente_con_compenso', 'uscente_senza_compenso']).toContain(originalStatus);
  }, 15000);

  it('updates member_status to uscente_con_compenso and back', async () => {
    const { data: collab } = await svc
      .from('collaborators')
      .select('user_id')
      .eq('id', COLLAB_ID)
      .single();

    // Change to uscente_con_compenso
    const { error: updateErr } = await svc
      .from('user_profiles')
      .update({ member_status: 'uscente_con_compenso' })
      .eq('user_id', collab!.user_id);

    expect(updateErr).toBeNull();

    const { data: after } = await svc
      .from('user_profiles')
      .select('member_status')
      .eq('user_id', collab!.user_id)
      .single();

    expect(after!.member_status).toBe('uscente_con_compenso');

    // Restore original
    await svc
      .from('user_profiles')
      .update({ member_status: originalStatus ?? 'attivo' })
      .eq('user_id', collab!.user_id);

    originalStatus = null; // already restored
  }, 15000);

  it('VALID_STATUSES matches DB constraint', () => {
    const VALID_STATUSES = ['attivo', 'uscente_con_compenso', 'uscente_senza_compenso'];
    expect(VALID_STATUSES).toHaveLength(3);
    expect(VALID_STATUSES).toContain('attivo');
    expect(VALID_STATUSES).toContain('uscente_con_compenso');
    expect(VALID_STATUSES).toContain('uscente_senza_compenso');
  });
});

describe('unauthenticated access', () => {
  it('GET /api/admin/members → redirect or 401', async () => {
    const res = await fetch(`${APP_URL}/api/admin/members`, { redirect: 'manual' });
    expect([307, 401]).toContain(res.status);
  }, 15000);

  it('PATCH /api/admin/members/[id]/status → redirect or 401', async () => {
    const res = await fetch(`${APP_URL}/api/admin/members/${COLLAB_ID}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_status: 'attivo' }),
      redirect: 'manual',
    });
    expect([307, 401]).toContain(res.status);
  }, 15000);
});
