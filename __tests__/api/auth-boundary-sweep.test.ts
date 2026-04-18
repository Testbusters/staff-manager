/**
 * Auth boundary sweep — batch 1 (30 highest-risk routes)
 * Verifies that unauthenticated requests are rejected (307 redirect or 401).
 * Requires a running dev server at APP_URL (default http://localhost:3001).
 * Tests are skipped cleanly when the server is not available.
 */
import { describe, it, expect, beforeAll } from 'vitest';

const APP_URL = process.env.APP_URL ?? 'http://localhost:3001';
const FAKE_UUID = 'a1b2c3d4-e5f6-4789-a012-a3b4c5d6e7f8';

let serverUp = false;

beforeAll(async () => {
  try {
    const res = await fetch(APP_URL, { redirect: 'manual' });
    serverUp = res.status > 0;
  } catch {
    serverUp = false;
  }
});

async function expectAuthReject(path: string, method = 'GET', body?: BodyInit) {
  const opts: RequestInit = { method, redirect: 'manual' };
  if (body) {
    opts.body = body;
    opts.headers = { 'Content-Type': 'application/json' };
  }
  const res = await fetch(`${APP_URL}${path}`, opts);
  expect(
    [307, 401],
    `${method} ${path} should reject unauthenticated (got ${res.status})`,
  ).toContain(res.status);
}

// ── Admin routes (highest risk) ─────────────────────────────────

describe('auth boundary — admin routes', () => {
  it.skipIf(!serverUp)('POST /api/admin/create-user → 307|401', () =>
    expectAuthReject('/api/admin/create-user', 'POST', JSON.stringify({ email: 'x@x.com' })));

  it.skipIf(!serverUp)('GET /api/admin/collaboratori → 307|401', () =>
    expectAuthReject('/api/admin/collaboratori'));

  it.skipIf(!serverUp)('GET /api/admin/collaboratori/[id] → 307|401', () =>
    expectAuthReject(`/api/admin/collaboratori/${FAKE_UUID}`));

  it.skipIf(!serverUp)('POST /api/admin/collaboratori/[id]/password → 307|401', () =>
    expectAuthReject(`/api/admin/collaboratori/${FAKE_UUID}/password`, 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('PATCH /api/admin/collaboratori/[id]/profile → 307|401', () =>
    expectAuthReject(`/api/admin/collaboratori/${FAKE_UUID}/profile`, 'PATCH', JSON.stringify({ nome: 'Test' })));

  it.skipIf(!serverUp)('GET /api/admin/communities → 307|401', () =>
    expectAuthReject('/api/admin/communities'));

  it.skipIf(!serverUp)('GET /api/admin/communities/[id] → 307|401', () =>
    expectAuthReject(`/api/admin/communities/${FAKE_UUID}`));

  it.skipIf(!serverUp)('GET /api/admin/members → 307|401', () =>
    expectAuthReject('/api/admin/members'));

  it.skipIf(!serverUp)('PATCH /api/admin/members/[id] → 307|401', () =>
    expectAuthReject(`/api/admin/members/${FAKE_UUID}`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('PATCH /api/admin/members/[id]/status → 307|401', () =>
    expectAuthReject(`/api/admin/members/${FAKE_UUID}/status`, 'PATCH', JSON.stringify({ status: 'attivo' })));

  it.skipIf(!serverUp)('PATCH /api/admin/members/[id]/data-ingresso → 307|401', () =>
    expectAuthReject(`/api/admin/members/${FAKE_UUID}/data-ingresso`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('GET /api/admin/email-templates → 307|401', () =>
    expectAuthReject('/api/admin/email-templates'));
});

// ── Financial routes (high risk) ─────────────────────────────────

describe('auth boundary — financial routes', () => {
  it.skipIf(!serverUp)('GET /api/compensations → 307|401', () =>
    expectAuthReject('/api/compensations'));

  it.skipIf(!serverUp)('GET /api/compensations/[id] → 307|401', () =>
    expectAuthReject(`/api/compensations/${FAKE_UUID}`));

  it.skipIf(!serverUp)('PATCH /api/compensations/[id]/edit → 307|401', () =>
    expectAuthReject(`/api/compensations/${FAKE_UUID}/edit`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('POST /api/compensations/[id]/transition → 307|401', () =>
    expectAuthReject(`/api/compensations/${FAKE_UUID}/transition`, 'POST', JSON.stringify({ action: 'approve' })));

  it.skipIf(!serverUp)('POST /api/compensations/approve-all → 307|401', () =>
    expectAuthReject('/api/compensations/approve-all', 'POST', JSON.stringify({ community_id: FAKE_UUID })));

  it.skipIf(!serverUp)('GET /api/expenses → 307|401', () =>
    expectAuthReject('/api/expenses'));

  it.skipIf(!serverUp)('GET /api/expenses/[id] → 307|401', () =>
    expectAuthReject(`/api/expenses/${FAKE_UUID}`));

  it.skipIf(!serverUp)('POST /api/expenses/[id]/transition → 307|401', () =>
    expectAuthReject(`/api/expenses/${FAKE_UUID}/transition`, 'POST', JSON.stringify({ action: 'approve' })));

  it.skipIf(!serverUp)('POST /api/expenses/approve-all → 307|401', () =>
    expectAuthReject('/api/expenses/approve-all', 'POST', JSON.stringify({ community_id: FAKE_UUID })));

  it.skipIf(!serverUp)('GET /api/documents → 307|401', () =>
    expectAuthReject('/api/documents'));

  it.skipIf(!serverUp)('POST /api/documents/[id]/sign → 307|401', () =>
    expectAuthReject(`/api/documents/${FAKE_UUID}/sign`, 'POST'));

  it.skipIf(!serverUp)('POST /api/documents/generate-receipts → 307|401', () =>
    expectAuthReject('/api/documents/generate-receipts', 'POST', JSON.stringify({})));
});

// ── Auth & onboarding routes ─────────────────────────────────────

describe('auth boundary — auth & onboarding', () => {
  it.skipIf(!serverUp)('POST /api/auth/change-password → 307|401', () =>
    expectAuthReject('/api/auth/change-password', 'POST', JSON.stringify({ password: 'x' })));

  it.skipIf(!serverUp)('POST /api/auth/clear-force-change → 307|401', () =>
    expectAuthReject('/api/auth/clear-force-change', 'POST'));

  it.skipIf(!serverUp)('PATCH /api/profile/password → 307|401', () =>
    expectAuthReject('/api/profile/password', 'PATCH', JSON.stringify({ password: 'x' })));

  it.skipIf(!serverUp)('POST /api/onboarding/complete → 307|401', () =>
    expectAuthReject('/api/onboarding/complete', 'POST', JSON.stringify({})));
});

// ── Import/export routes ─────────────────────────────────────────

describe('auth boundary — import/export', () => {
  it.skipIf(!serverUp)('POST /api/import/collaboratori/run → 307|401', () =>
    expectAuthReject('/api/import/collaboratori/run', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('POST /api/export/mark-paid → 307|401', () =>
    expectAuthReject('/api/export/mark-paid', 'POST', JSON.stringify({ ids: [], table: 'compensations' })));
});
