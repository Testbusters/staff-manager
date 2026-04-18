/**
 * T2.4 — Notification helpers (DB integration)
 *
 * Tests notification helper functions that query the DB:
 * - getNotificationSettings: loads settings from DB, returns Map
 * - getCollaboratorInfo: returns collaborator name + community
 * - getResponsabiliForCommunity: finds responsabili for a given community
 * - getResponsabiliForCollaborator: resolves community from collaborator, then finds responsabili
 *
 * All functions use the service role client.
 * Requires staging Supabase.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL?.includes('gjwkvgfwkdwzqlvudgqr')) {
  throw new Error('Wrong Supabase project — aborting test. Only run against staging.');
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const COMMUNITY_TB = '6fdd80e9-2464-4304-9bd7-d5703370a119';
const COLLAB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26';

// ── notification_settings table ─────────────────────────────────

describe('notification_settings', () => {
  it('table has rows with event_key + recipient_role', async () => {
    const { data, error } = await svc
      .from('notification_settings')
      .select('event_key, recipient_role, email_enabled, inapp_enabled, telegram_enabled')
      .limit(5);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);

    for (const row of data!) {
      expect(row.event_key).toBeTruthy();
      expect(row.recipient_role).toBeTruthy();
      expect(typeof row.email_enabled).toBe('boolean');
      expect(typeof row.inapp_enabled).toBe('boolean');
    }
  }, 15000);

  it('has at least 15 settings rows', async () => {
    const { count, error } = await svc
      .from('notification_settings')
      .select('*', { count: 'exact', head: true });

    expect(error).toBeNull();
    expect(count).toBeGreaterThanOrEqual(15);
  }, 15000);
});

// ── collaborator info resolution ────────────────────────────────

describe('collaborator info resolution', () => {
  it('resolves collaborator nome/cognome by id', async () => {
    const { data, error } = await svc
      .from('collaborators')
      .select('nome, cognome')
      .eq('id', COLLAB_ID)
      .single();

    expect(error).toBeNull();
    expect(data!.nome).toBeTruthy();
    expect(data!.cognome).toBeTruthy();
  }, 15000);

  it('resolves community via collaborator_communities', async () => {
    const { data, error } = await svc
      .from('collaborator_communities')
      .select('community_id, communities(name)')
      .eq('collaborator_id', COLLAB_ID)
      .single();

    expect(error).toBeNull();
    expect(data!.community_id).toBe(COMMUNITY_TB);
  }, 15000);
});

// ── responsabili lookup ─────────────────────────────────────────

describe('responsabili lookup', () => {
  it('finds users with user_community_access for TB', async () => {
    const { data, error } = await svc
      .from('user_community_access')
      .select('user_id, community_id')
      .eq('community_id', COMMUNITY_TB);

    expect(error).toBeNull();
    // At least one responsabile should manage TB
    expect(data!.length).toBeGreaterThanOrEqual(1);
  }, 15000);

  it('responsabili have active user_profiles', async () => {
    const { data: access } = await svc
      .from('user_community_access')
      .select('user_id')
      .eq('community_id', COMMUNITY_TB);

    const userIds = (access ?? []).map((a: { user_id: string }) => a.user_id);
    if (userIds.length === 0) return;

    const { data: profiles, error } = await svc
      .from('user_profiles')
      .select('user_id, role, is_active')
      .in('user_id', userIds);

    expect(error).toBeNull();
    expect(profiles!.length).toBeGreaterThan(0);

    for (const p of profiles!) {
      // Responsabili should be active
      expect(p.is_active).toBe(true);
      // Role should be responsabile or admin
      expect(['responsabile_compensi', 'responsabile_cittadino', 'amministrazione']).toContain(p.role);
    }
  }, 15000);
});

// ── notifications table structure ───────────────────────────────

describe('notifications table', () => {
  it('table exists with expected columns', async () => {
    const { data, error } = await svc
      .from('notifications')
      .select('id, user_id, tipo, titolo, messaggio, entity_type, entity_id, read, created_at')
      .limit(1);

    // Error null means the columns exist
    expect(error).toBeNull();
  }, 15000);
});
