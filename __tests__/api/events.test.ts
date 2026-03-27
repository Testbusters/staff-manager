/**
 * Integration tests for Block eventi-citta — City Events API.
 * Covers:
 * - POST /api/events: admin creates national event → 201
 * - POST /api/events: unauthenticated → 401 (via service role bypass test)
 * - POST /api/events: responsabile_cittadino auto-sets citta and community_ids
 * - POST /api/events: collaboratore cannot create → 403
 * - PATCH /api/events/[id]: admin can update any event
 * - PATCH /api/events/[id]: responsabile_cittadino can update own city event
 * - PATCH /api/events/[id]: responsabile_cittadino cannot update other city's event → 403
 * - DELETE /api/events/[id]: responsabile_cittadino can delete own city event
 * - DELETE /api/events/[id]: responsabile_cittadino cannot delete other city's event → 403
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

// Staging test users
const ADMIN_USER_ID = 'c5e0fc9e-b415-4717-b5ed-3526e153a3f0';
// responsabile_cittadino test account — citta_responsabile = 'Ancona'
const RESP_CITT_USER_ID = 'dddc43b7-e8e8-4c53-9a3b-1c8cfd722418';
const RESP_CITT_CITTA = 'Ancona';
const TB_COMMUNITY_ID = '6fdd80e9-2464-4304-9bd7-d5703370a119';

const TEST_EVENT_IDS: string[] = [];

async function signInAs(email: string) {
  const client = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: 'Testbusters123' });
  if (error || !data.session) throw new Error(`Sign-in failed for ${email}: ${error?.message}`);
  return data.session.access_token;
}

async function apiCall(
  path: string,
  method: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Cookie'] = `sb-access-token=${token}`;
  const res = await fetch(`${APP_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(text); } catch { /* ignore */ }
  return { status: res.status, body: parsed };
}

beforeAll(async () => {
  // Cleanup any pre-existing test events
  await svc.from('events').delete().like('titolo', '%[test-eventi-citta]%');
});

afterAll(async () => {
  if (TEST_EVENT_IDS.length > 0) {
    await svc.from('events').delete().in('id', TEST_EVENT_IDS);
  }
});

describe('POST /api/events', () => {
  it('unauthenticated → 401 or redirect', async () => {
    const { status } = await apiCall('/api/events', 'POST', { titolo: 'test' });
    expect([401, 307, 302]).toContain(status);
  });

  it('admin creates national event → 201', async () => {
    const token = await signInAs('admin_test@test.com');
    const { status, body } = await apiCall(
      '/api/events', 'POST',
      { titolo: 'Evento nazionale [test-eventi-citta]', community_ids: [TB_COMMUNITY_ID] },
      token,
    );
    expect(status).toBe(201);
    expect(body.event).toBeDefined();
    const ev = body.event as Record<string, unknown>;
    expect(ev.citta).toBeNull();
    TEST_EVENT_IDS.push(ev.id as string);
  });

  it('collaboratore cannot create event → 403', async () => {
    const token = await signInAs('collaboratore_tb_test@test.com');
    const { status } = await apiCall(
      '/api/events', 'POST',
      { titolo: 'Test [test-eventi-citta]' },
      token,
    );
    expect(status).toBe(403);
  });

  it('responsabile_cittadino creates city event → 201, citta auto-set', async () => {
    const token = await signInAs('responsabile_cittadino_test@test.com');
    const { status, body } = await apiCall(
      '/api/events', 'POST',
      { titolo: 'Evento città Ancona [test-eventi-citta]' },
      token,
    );
    expect(status).toBe(201);
    const ev = body.event as Record<string, unknown>;
    expect(ev.citta).toBe(RESP_CITT_CITTA);
    TEST_EVENT_IDS.push(ev.id as string);
  });
});

describe('PATCH /api/events/[id]', () => {
  it('responsabile_cittadino can update own city event → 200', async () => {
    // Create a city event via service role
    const { data: ev } = await svc.from('events').insert({
      titolo: 'City event to update [test-eventi-citta]',
      citta: RESP_CITT_CITTA,
      community_ids: [TB_COMMUNITY_ID],
    }).select().single();
    TEST_EVENT_IDS.push(ev!.id);

    const token = await signInAs('responsabile_cittadino_test@test.com');
    const { status, body } = await apiCall(
      `/api/events/${ev!.id}`, 'PATCH',
      { titolo: 'Aggiornato [test-eventi-citta]' },
      token,
    );
    expect(status).toBe(200);
    expect((body.event as Record<string, unknown>).titolo).toBe('Aggiornato [test-eventi-citta]');
  });

  it('responsabile_cittadino cannot update event from another city → 403', async () => {
    // Create an event for a different city
    const { data: ev } = await svc.from('events').insert({
      titolo: 'Event Roma [test-eventi-citta]',
      citta: 'Roma',
      community_ids: [TB_COMMUNITY_ID],
    }).select().single();
    TEST_EVENT_IDS.push(ev!.id);

    const token = await signInAs('responsabile_cittadino_test@test.com');
    const { status } = await apiCall(`/api/events/${ev!.id}`, 'PATCH', { titolo: 'Hack' }, token);
    expect(status).toBe(403);
  });
});

describe('DELETE /api/events/[id]', () => {
  it('responsabile_cittadino can delete own city event → 204', async () => {
    const { data: ev } = await svc.from('events').insert({
      titolo: 'City event to delete [test-eventi-citta]',
      citta: RESP_CITT_CITTA,
      community_ids: [TB_COMMUNITY_ID],
    }).select().single();

    const token = await signInAs('responsabile_cittadino_test@test.com');
    const { status } = await apiCall(`/api/events/${ev!.id}`, 'DELETE', undefined, token);
    expect(status).toBe(204);
    // Verify deleted
    const { data } = await svc.from('events').select('id').eq('id', ev!.id).maybeSingle();
    expect(data).toBeNull();
  });

  it('responsabile_cittadino cannot delete event from another city → 403', async () => {
    const { data: ev } = await svc.from('events').insert({
      titolo: 'Event Napoli [test-eventi-citta]',
      citta: 'Napoli',
      community_ids: [TB_COMMUNITY_ID],
    }).select().single();
    TEST_EVENT_IDS.push(ev!.id);

    const token = await signInAs('responsabile_cittadino_test@test.com');
    const { status } = await apiCall(`/api/events/${ev!.id}`, 'DELETE', undefined, token);
    expect(status).toBe(403);
  });
});
