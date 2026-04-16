/**
 * Integration tests for rate limiting guards (SEC3 + SEC4 + SEC-NEW-8).
 *
 * Covers:
 * - Unit: rate limit constants exported with sensible values
 * - DB: COUNT query for pending compensations per collaborator
 * - DB: COUNT query for pending expenses per collaborator
 * - DB: COUNT query for recent collaborator creation (hourly)
 * - DB: auth.users.updated_at accessible via admin API for cooldown check
 *
 * NOTE: these tests verify the query logic returns correct counts against
 * staging data. They do NOT insert 20+ records to actually trigger the cap
 * (impractical and pollutes staging).
 */

import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

import {
  MAX_PENDING_COMPENSATIONS,
  MAX_PENDING_EXPENSES,
  MAX_USERS_PER_HOUR,
  RESEND_INVITE_COOLDOWN_MS,
} from '@/lib/rate-limits';

config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Canonical staging test accounts
const COLLAB_TB_ID  = 'f6d75100-c43c-4e90-afe5-a720082d0c26';
const COLLAB_P4M_ID = '608ccbe6-bed0-4fcf-aaf5-95768ef5c11f';

// ── Unit: constants ──────────────────────────────────────────────────────────

describe('rate-limits constants', () => {
  it('MAX_PENDING_COMPENSATIONS is a positive integer', () => {
    expect(MAX_PENDING_COMPENSATIONS).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_PENDING_COMPENSATIONS)).toBe(true);
  });

  it('MAX_PENDING_EXPENSES is a positive integer', () => {
    expect(MAX_PENDING_EXPENSES).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_PENDING_EXPENSES)).toBe(true);
  });

  it('MAX_USERS_PER_HOUR is a positive integer', () => {
    expect(MAX_USERS_PER_HOUR).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_USERS_PER_HOUR)).toBe(true);
  });

  it('RESEND_INVITE_COOLDOWN_MS is at least 1 minute', () => {
    expect(RESEND_INVITE_COOLDOWN_MS).toBeGreaterThanOrEqual(60_000);
  });
});

// ── DB: pending compensations count query ────────────────────────────────────

describe('compensations rate limit query', () => {
  it('count query returns a number for existing collaborator', async () => {
    const { count, error } = await svc
      .from('compensations')
      .select('*', { count: 'exact', head: true })
      .eq('collaborator_id', COLLAB_TB_ID)
      .eq('stato', 'IN_ATTESA');

    expect(error).toBeNull();
    expect(typeof count).toBe('number');
    expect(count).toBeLessThan(MAX_PENDING_COMPENSATIONS);
  }, 15000);

  it('count query returns 0 for non-existent collaborator', async () => {
    const { count, error } = await svc
      .from('compensations')
      .select('*', { count: 'exact', head: true })
      .eq('collaborator_id', 'a1b2c3d4-e5f6-4789-a012-a3b4c5d6e7f8')
      .eq('stato', 'IN_ATTESA');

    expect(error).toBeNull();
    expect(count).toBe(0);
  }, 15000);
});

// ── DB: pending expenses count query ─────────────────────────────────────────

describe('expenses rate limit query', () => {
  it('count query returns a number for existing collaborator', async () => {
    const { count, error } = await svc
      .from('expense_reimbursements')
      .select('*', { count: 'exact', head: true })
      .eq('collaborator_id', COLLAB_TB_ID)
      .in('stato', ['IN_ATTESA', 'INVIATO']);

    expect(error).toBeNull();
    expect(typeof count).toBe('number');
    expect(count).toBeLessThan(MAX_PENDING_EXPENSES);
  }, 15000);
});

// ── DB: create-user hourly count query ───────────────────────────────────────

describe('create-user rate limit query', () => {
  it('count query for recent collaborators returns a number', async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error } = await svc
      .from('collaborators')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo);

    expect(error).toBeNull();
    expect(typeof count).toBe('number');
    expect(count).toBeLessThan(MAX_USERS_PER_HOUR);
  }, 15000);

  it('total collaborator count is a positive number', async () => {
    const { count, error } = await svc
      .from('collaborators')
      .select('*', { count: 'exact', head: true });

    expect(error).toBeNull();
    expect(count).toBeGreaterThan(0);
  }, 15000);
});

// ── DB: resend-invite cooldown via auth.users.updated_at ─────────────────────

describe('resend-invite cooldown query', () => {
  it('getUserById returns updated_at as a valid timestamp', async () => {
    // Get user_id for test collaborator
    const { data: collab } = await svc
      .from('collaborators')
      .select('user_id')
      .eq('id', COLLAB_TB_ID)
      .single();

    expect(collab?.user_id).toBeTruthy();

    const { data: authUser, error } = await svc.auth.admin.getUserById(collab!.user_id);
    expect(error).toBeNull();
    expect(authUser?.user?.updated_at).toBeTruthy();

    const updatedAt = new Date(authUser!.user!.updated_at!);
    expect(updatedAt.getTime()).toBeGreaterThan(0);
    expect(updatedAt.getTime()).toBeLessThanOrEqual(Date.now());
  }, 15000);

  it('cooldown calculation correctly identifies recent vs stale update', () => {
    const now = Date.now();

    // 1 minute ago — within cooldown
    const recent = new Date(now - 60_000).toISOString();
    const recentDelta = now - new Date(recent).getTime();
    expect(recentDelta).toBeLessThan(RESEND_INVITE_COOLDOWN_MS);

    // 10 minutes ago — outside cooldown
    const stale = new Date(now - 10 * 60_000).toISOString();
    const staleDelta = now - new Date(stale).getTime();
    expect(staleDelta).toBeGreaterThan(RESEND_INVITE_COOLDOWN_MS);
  });
});
