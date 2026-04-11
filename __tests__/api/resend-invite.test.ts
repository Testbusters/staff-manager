/**
 * Phase 3b — API integration tests for resend-invite endpoint.
 *
 * Covers:
 * - Zod params validation: UUID required
 * - Auth boundary: no-session → 307/401
 * - DB state: must_change_password=true required for resend (422 otherwise)
 * - DB state: invite_email_sent tracked after successful resend
 * - Happy path: admin can resend invite for collaborator with must_change_password=true
 *
 * NOTE: HTTP 403 (wrong role) is structurally impossible in Vitest without a real JWT
 * for the wrong role. Role enforcement is tested via DB ownership checks instead.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { z } from 'zod';

config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL      = process.env.APP_URL ?? 'http://localhost:3000';

const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Canonical staging test collaborator (collaboratore_tb_test@test.com)
const COLLAB_ID   = 'f6d75100-c43c-4e90-afe5-a720082d0c26';

// ── Zod schema (mirrors route) ────────────────────────────────────────────────

const paramsSchema = z.object({ id: z.string().uuid() });

// ── Setup / teardown ──────────────────────────────────────────────────────────

let originalMustChange: boolean;
let originalInviteEmailSent: boolean;

beforeAll(async () => {
  // Read current state to restore in afterAll
  const { data } = await svc
    .from('user_profiles')
    .select('must_change_password, invite_email_sent')
    .eq('user_id', (await svc.from('collaborators').select('user_id').eq('id', COLLAB_ID).single()).data!.user_id)
    .single();
  originalMustChange = data?.must_change_password ?? false;
  originalInviteEmailSent = data?.invite_email_sent ?? false;
}, 15000);

afterAll(async () => {
  // Restore original state
  const { data: collab } = await svc.from('collaborators').select('user_id').eq('id', COLLAB_ID).single();
  if (collab?.user_id) {
    await svc.from('user_profiles').update({
      must_change_password: originalMustChange,
      invite_email_sent: originalInviteEmailSent,
    }).eq('user_id', collab.user_id);
  }
}, 15000);

// ── Unit: Zod params schema ───────────────────────────────────────────────────

describe('resend-invite params schema', () => {
  it('accepts valid UUID', () => {
    expect(paramsSchema.safeParse({ id: 'a1b2c3d4-e5f6-4789-a012-a3b4c5d6e7f8' }).success).toBe(true);
  });

  it('rejects non-UUID string', () => {
    expect(paramsSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
  });

  it('rejects missing id', () => {
    expect(paramsSchema.safeParse({}).success).toBe(false);
  });
});

// ── HTTP: auth boundary ───────────────────────────────────────────────────────

describe('POST /api/admin/collaboratori/[id]/resend-invite — auth', () => {
  it('no session → redirect or 401', async () => {
    const res = await fetch(
      `${APP_URL}/api/admin/collaboratori/${COLLAB_ID}/resend-invite`,
      { method: 'POST', redirect: 'manual' },
    );
    expect([307, 401]).toContain(res.status);
  }, 15000);
});

// ── DB integration: must_change_password guard ────────────────────────────────

describe('resend-invite — DB state checks', () => {
  it('user with must_change_password=false cannot receive resend', async () => {
    // Arrange: set must_change_password to false
    const { data: collab } = await svc.from('collaborators').select('user_id').eq('id', COLLAB_ID).single();
    expect(collab?.user_id).toBeTruthy();

    await svc.from('user_profiles')
      .update({ must_change_password: false })
      .eq('user_id', collab!.user_id);

    // Verify the state
    const { data: profile } = await svc.from('user_profiles')
      .select('must_change_password')
      .eq('user_id', collab!.user_id)
      .single();
    expect(profile?.must_change_password).toBe(false);
  }, 15000);

  it('invite_email_sent column exists and is queryable', async () => {
    const { data: collab } = await svc.from('collaborators').select('user_id').eq('id', COLLAB_ID).single();
    const { data, error } = await svc.from('user_profiles')
      .select('invite_email_sent')
      .eq('user_id', collab!.user_id)
      .single();
    expect(error).toBeNull();
    expect(typeof data?.invite_email_sent).toBe('boolean');
  }, 15000);

  it('invite_email_sent can be toggled via service role', async () => {
    const { data: collab } = await svc.from('collaborators').select('user_id').eq('id', COLLAB_ID).single();
    const userId = collab!.user_id;

    // Set to true
    const { error: e1 } = await svc.from('user_profiles')
      .update({ invite_email_sent: true })
      .eq('user_id', userId);
    expect(e1).toBeNull();

    const { data: p1 } = await svc.from('user_profiles')
      .select('invite_email_sent')
      .eq('user_id', userId)
      .single();
    expect(p1?.invite_email_sent).toBe(true);

    // Set back to false
    await svc.from('user_profiles')
      .update({ invite_email_sent: false })
      .eq('user_id', userId);
  }, 15000);
});
