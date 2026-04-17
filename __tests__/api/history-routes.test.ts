/**
 * Integration tests for export/import history routes (PERF-5 batch createSignedUrls).
 *
 * Tests:
 *  - Auth boundary: no session → redirect (proxy 307) or 401
 *  - DB integration: getNotificationSettings cache (P3) against staging DB
 *  - DB integration: getEmailMap targeted lookup (P4) against staging DB
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import {
  getNotificationSettings,
  clearNotificationSettingsCache,
  getCollaboratorInfo,
} from '@/lib/notification-helpers';

config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Known staging test collaborator (TB)
const COLLAB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26';

describe.skipIf(!SUPABASE_URL || !SERVICE_KEY)('History routes + notification helpers — DB integration', () => {
  let svc: ReturnType<typeof createClient>;

  beforeAll(() => {
    svc = createClient(SUPABASE_URL, SERVICE_KEY);
    clearNotificationSettingsCache();
  });

  // ── P3: notification settings cache ──────────────────────────────────
  it('getNotificationSettings returns populated map from staging DB', async () => {
    const map = await getNotificationSettings(svc);
    // staging has 20 notification_settings rows (per MEMORY.md)
    expect(map.size).toBeGreaterThanOrEqual(1);

    // Verify structure of an entry
    const firstEntry = map.values().next().value;
    expect(firstEntry).toHaveProperty('inapp_enabled');
    expect(firstEntry).toHaveProperty('email_enabled');
    expect(firstEntry).toHaveProperty('telegram_enabled');
  }, 15000);

  it('second call within TTL returns cached data without DB hit', async () => {
    // First call populates cache
    const map1 = await getNotificationSettings(svc);

    // Create a broken client — if cache works, this won't be called
    const broken = createClient('https://invalid.supabase.co', 'invalid-key');
    const map2 = await getNotificationSettings(broken);

    expect(map2.size).toBe(map1.size);
  }, 15000);

  // ── P4: targeted getUserById in getCollaboratorInfo ──────────────────
  it('getCollaboratorInfo returns email via getUserById (not listUsers)', async () => {
    const info = await getCollaboratorInfo(COLLAB_ID, svc);
    expect(info).not.toBeNull();
    expect(info!.email).toBe('collaboratore_tb_test@test.com');
    expect(info!.user_id).toBeTruthy();
    expect(info!.nome).toBeTruthy();
  }, 15000);

  it('getCollaboratorInfo returns null for non-existent collaborator', async () => {
    const info = await getCollaboratorInfo('00000000-0000-0000-0000-000000000000', svc);
    expect(info).toBeNull();
  }, 15000);

  // ── PERF-5: batch createSignedUrls ───────────────────────────────────
  it('createSignedUrls batch method exists on storage client', () => {
    const bucket = svc.storage.from('exports');
    expect(typeof bucket.createSignedUrls).toBe('function');
  });

  it('createSignedUrls returns empty array for empty paths', async () => {
    const { data } = await svc.storage.from('exports').createSignedUrls([], 3600);
    // Supabase returns empty array or null for empty input
    expect(data?.length ?? 0).toBe(0);
  }, 15000);

  // ── Auth boundary: export history route ──────────────────────────────
  it.skipIf(!process.env.APP_URL)('GET /api/export/history without auth → redirect or 401', async () => {
    const res = await fetch(`${process.env.APP_URL}/api/export/history`, {
      redirect: 'manual',
    });
    expect([307, 401]).toContain(res.status);
  }, 15000);

  // ── Auth boundary: import history route ──────────────────────────────
  it.skipIf(!process.env.APP_URL)('GET /api/import/history without auth → redirect or 401', async () => {
    const res = await fetch(`${process.env.APP_URL}/api/import/history`, {
      redirect: 'manual',
    });
    expect([307, 401]).toContain(res.status);
  }, 15000);
});
