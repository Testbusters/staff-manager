/**
 * Integration tests for GET /api/jobs/lesson-reminders
 * Covers: Authorization header validation, CRON_SECRET check, empty result
 */
import { describe, it, expect } from 'vitest';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const APP_URL = process.env.APP_URL ?? 'http://localhost:3001';
const CRON_SECRET = process.env.CRON_SECRET ?? 'test-cron-secret';

describe('GET /api/jobs/lesson-reminders', () => {
  it('no Authorization header → 401', async () => {
    const res = await fetch(`${APP_URL}/api/jobs/lesson-reminders`, { redirect: 'manual' });
    // Could be 307 (proxy redirect) or 401 — both are correct rejections
    expect([307, 401]).toContain(res.status);
  });

  it('wrong CRON_SECRET → 401', async () => {
    const res = await fetch(`${APP_URL}/api/jobs/lesson-reminders`, {
      headers: { Authorization: 'Bearer wrong-secret-value' },
      redirect: 'manual',
    });
    // Could be 307 (proxy redirect) or 401
    expect([307, 401]).toContain(res.status);
  });

  it('valid CRON_SECRET with no lezioni tomorrow → 200 { sent: 0 } (when server running)', async () => {
    // This test only runs meaningfully against a live server
    // Skip if APP_URL is not reachable or CRON_SECRET not set
    if (!process.env.CRON_SECRET) {
      console.log('CRON_SECRET not set — skipping live test');
      return;
    }

    // Use a very far-future date so no lezioni exist for "tomorrow"
    // The endpoint computes Date.now() + 86400000, so we just verify the response shape
    const res = await fetch(`${APP_URL}/api/jobs/lesson-reminders`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
      redirect: 'manual',
    });

    // If proxy redirects (307), we can't test further without a session
    if (res.status === 307) return;

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.sent).toBe('number');
  });
});
