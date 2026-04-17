import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getNotificationSettings,
  clearNotificationSettingsCache,
  type SettingsMap,
} from '@/lib/notification-helpers';

// Minimal mock for SupabaseClient used by getNotificationSettings
function createMockSvc(rows: Array<Record<string, unknown>>) {
  return {
    from: () => ({
      select: () => Promise.resolve({ data: rows, error: null }),
    }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any; // cast: only the subset used by getNotificationSettings matters
}

describe('getNotificationSettings — TTL cache (P3)', () => {
  beforeEach(() => {
    clearNotificationSettingsCache();
    vi.restoreAllMocks();
  });

  it('returns settings map keyed by event_key:recipient_role', async () => {
    const rows = [
      { event_key: 'comp_approve', recipient_role: 'collaboratore', inapp_enabled: true, email_enabled: true, telegram_enabled: false },
      { event_key: 'comp_approve', recipient_role: 'responsabile', inapp_enabled: true, email_enabled: false, telegram_enabled: true },
    ];
    const svc = createMockSvc(rows);
    const map: SettingsMap = await getNotificationSettings(svc);

    expect(map.size).toBe(2);
    expect(map.get('comp_approve:collaboratore')).toEqual({
      inapp_enabled: true,
      email_enabled: true,
      telegram_enabled: false,
    });
    expect(map.get('comp_approve:responsabile')).toEqual({
      inapp_enabled: true,
      email_enabled: false,
      telegram_enabled: true,
    });
  });

  it('serves cached result on second call within TTL', async () => {
    const rows = [
      { event_key: 'e1', recipient_role: 'r1', inapp_enabled: true, email_enabled: false, telegram_enabled: false },
    ];
    const svc = createMockSvc(rows);
    const selectSpy = vi.spyOn(svc.from('notification_settings') as ReturnType<typeof svc.from>, 'select');

    // First call: hits DB
    const map1 = await getNotificationSettings(svc);
    expect(map1.size).toBe(1);

    // Second call: should return cached — create a different svc to prove it's not called
    const svc2 = createMockSvc([]);
    const map2 = await getNotificationSettings(svc2);
    expect(map2.size).toBe(1); // still has original data, not empty
  });

  it('refreshes cache after TTL expires', async () => {
    const rows = [
      { event_key: 'e1', recipient_role: 'r1', inapp_enabled: true, email_enabled: false, telegram_enabled: false },
    ];
    const svc = createMockSvc(rows);
    await getNotificationSettings(svc);

    // Advance time past 5 min TTL
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 5 * 60 * 1000 + 1);

    const svc2 = createMockSvc([]);
    const map2 = await getNotificationSettings(svc2);
    expect(map2.size).toBe(0); // fetched fresh from svc2 (empty)

    vi.useRealTimers();
  });

  it('clearNotificationSettingsCache forces a refresh', async () => {
    const rows = [
      { event_key: 'e1', recipient_role: 'r1', inapp_enabled: true, email_enabled: false, telegram_enabled: false },
    ];
    const svc = createMockSvc(rows);
    await getNotificationSettings(svc);

    clearNotificationSettingsCache();

    const svc2 = createMockSvc([]);
    const map2 = await getNotificationSettings(svc2);
    expect(map2.size).toBe(0); // cache was cleared, fetched fresh
  });

  it('handles null telegram_enabled gracefully (defaults to false)', async () => {
    const rows = [
      { event_key: 'e1', recipient_role: 'r1', inapp_enabled: true, email_enabled: true, telegram_enabled: null },
    ];
    const svc = createMockSvc(rows);
    const map = await getNotificationSettings(svc);

    expect(map.get('e1:r1')?.telegram_enabled).toBe(false);
  });

  it('handles empty data (null) from query', async () => {
    const svc = {
      from: () => ({
        select: () => Promise.resolve({ data: null, error: null }),
      }),
    } as never;
    const map = await getNotificationSettings(svc);
    expect(map.size).toBe(0);
  });
});
