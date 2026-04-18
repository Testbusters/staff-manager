/**
 * Auth boundary sweep — batch 2 (remaining routes)
 * Verifies that unauthenticated requests are rejected (307 redirect or 401).
 * Requires a running dev server at APP_URL (default http://localhost:3001).
 * Tests are skipped cleanly when the server is not available.
 *
 * Excludes: /api/health (public), /api/errors (client reporting),
 * /api/webhooks/resend (webhook signing), /api/telegram/webhook (bot token),
 * /api/jobs/* (cron secret).
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

// ── Admin routes (batch 2) ──────────────────────────────────────

describe('auth boundary — admin routes (batch 2)', () => {
  it.skipIf(!serverUp)('GET /api/admin/allegati-corsi → 307|401', () =>
    expectAuthReject('/api/admin/allegati-corsi'));

  it.skipIf(!serverUp)('POST /api/admin/allegati-corsi → 307|401', () =>
    expectAuthReject('/api/admin/allegati-corsi', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('PATCH /api/admin/banner/[id] → 307|401', () =>
    expectAuthReject(`/api/admin/banner/${FAKE_UUID}`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('GET /api/admin/blacklist → 307|401', () =>
    expectAuthReject('/api/admin/blacklist'));

  it.skipIf(!serverUp)('POST /api/admin/blacklist → 307|401', () =>
    expectAuthReject('/api/admin/blacklist', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('DELETE /api/admin/blacklist/[id] → 307|401', () =>
    expectAuthReject(`/api/admin/blacklist/${FAKE_UUID}`, 'DELETE'));

  it.skipIf(!serverUp)('POST /api/admin/blocks/clear-flag → 307|401', () =>
    expectAuthReject('/api/admin/blocks/clear-flag', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('POST /api/admin/collaboratori/[id]/resend-invite → 307|401', () =>
    expectAuthReject(`/api/admin/collaboratori/${FAKE_UUID}/resend-invite`, 'POST'));

  it.skipIf(!serverUp)('PATCH /api/admin/collaboratori/[id]/telegram → 307|401', () =>
    expectAuthReject(`/api/admin/collaboratori/${FAKE_UUID}/telegram`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('PATCH /api/admin/communities/[id] → 307|401', () =>
    expectAuthReject(`/api/admin/communities/${FAKE_UUID}`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('POST /api/admin/communities → 307|401', () =>
    expectAuthReject('/api/admin/communities', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('GET /api/admin/contract-templates → 307|401', () =>
    expectAuthReject('/api/admin/contract-templates'));

  it.skipIf(!serverUp)('POST /api/admin/contract-templates → 307|401', () =>
    expectAuthReject('/api/admin/contract-templates', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('GET /api/admin/email-layout → 307|401', () =>
    expectAuthReject('/api/admin/email-layout'));

  it.skipIf(!serverUp)('PATCH /api/admin/email-layout → 307|401', () =>
    expectAuthReject('/api/admin/email-layout', 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('GET /api/admin/email-templates/[key] → 307|401', () =>
    expectAuthReject('/api/admin/email-templates/E1'));

  it.skipIf(!serverUp)('PATCH /api/admin/email-templates/[key] → 307|401', () =>
    expectAuthReject('/api/admin/email-templates/E1', 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('POST /api/admin/import-corsi/run → 307|401', () =>
    expectAuthReject('/api/admin/import-corsi/run', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('GET /api/admin/lookup-options → 307|401', () =>
    expectAuthReject('/api/admin/lookup-options'));

  it.skipIf(!serverUp)('POST /api/admin/lookup-options → 307|401', () =>
    expectAuthReject('/api/admin/lookup-options', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('PATCH /api/admin/lookup-options/[id] → 307|401', () =>
    expectAuthReject(`/api/admin/lookup-options/${FAKE_UUID}`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('DELETE /api/admin/lookup-options/[id] → 307|401', () =>
    expectAuthReject(`/api/admin/lookup-options/${FAKE_UUID}`, 'DELETE'));

  it.skipIf(!serverUp)('GET /api/admin/notification-settings → 307|401', () =>
    expectAuthReject('/api/admin/notification-settings'));

  it.skipIf(!serverUp)('PATCH /api/admin/notification-settings → 307|401', () =>
    expectAuthReject('/api/admin/notification-settings', 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('GET /api/admin/responsabili → 307|401', () =>
    expectAuthReject('/api/admin/responsabili'));

  it.skipIf(!serverUp)('PUT /api/admin/responsabili/[userId]/communities → 307|401', () =>
    expectAuthReject(`/api/admin/responsabili/${FAKE_UUID}/communities`, 'PUT', JSON.stringify({})));

  it.skipIf(!serverUp)('PATCH /api/admin/responsabili/[userId]/publish-permission → 307|401', () =>
    expectAuthReject(`/api/admin/responsabili/${FAKE_UUID}/publish-permission`, 'PATCH', JSON.stringify({})));
});

// ── Monitoring routes ───────────────────────────────────────────

describe('auth boundary — monitoring', () => {
  it.skipIf(!serverUp)('GET /api/admin/monitoring/access-log → 307|401', () =>
    expectAuthReject('/api/admin/monitoring/access-log'));

  it.skipIf(!serverUp)('GET /api/admin/monitoring/app-errors → 307|401', () =>
    expectAuthReject('/api/admin/monitoring/app-errors'));

  it.skipIf(!serverUp)('GET /api/admin/monitoring/db-stats → 307|401', () =>
    expectAuthReject('/api/admin/monitoring/db-stats'));

  it.skipIf(!serverUp)('GET /api/admin/monitoring/email-delivery → 307|401', () =>
    expectAuthReject('/api/admin/monitoring/email-delivery'));

  it.skipIf(!serverUp)('GET /api/admin/monitoring/operations → 307|401', () =>
    expectAuthReject('/api/admin/monitoring/operations'));

  it.skipIf(!serverUp)('GET /api/admin/monitoring/stats → 307|401', () =>
    expectAuthReject('/api/admin/monitoring/stats'));

  it.skipIf(!serverUp)('GET /api/admin/monitoring/supabase-logs → 307|401', () =>
    expectAuthReject('/api/admin/monitoring/supabase-logs'));
});

// ── Compensations (remaining methods) ───────────────────────────

describe('auth boundary — compensations (batch 2)', () => {
  it.skipIf(!serverUp)('POST /api/compensations → 307|401', () =>
    expectAuthReject('/api/compensations', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('DELETE /api/compensations/[id] → 307|401', () =>
    expectAuthReject(`/api/compensations/${FAKE_UUID}`, 'DELETE'));

  it.skipIf(!serverUp)('POST /api/compensations/approve-bulk → 307|401', () =>
    expectAuthReject('/api/compensations/approve-bulk', 'POST', JSON.stringify({ ids: [] })));

  it.skipIf(!serverUp)('POST /api/compensations/bulk-approve → 307|401', () =>
    expectAuthReject('/api/compensations/bulk-approve', 'POST', JSON.stringify({ ids: [] })));

  it.skipIf(!serverUp)('POST /api/compensations/bulk-liquidate → 307|401', () =>
    expectAuthReject('/api/compensations/bulk-liquidate', 'POST', JSON.stringify({ ids: [] })));

  it.skipIf(!serverUp)('GET /api/compensations/communities → 307|401', () =>
    expectAuthReject('/api/compensations/communities'));

  it.skipIf(!serverUp)('GET /api/compensations/competenze → 307|401', () =>
    expectAuthReject('/api/compensations/competenze'));

  it.skipIf(!serverUp)('POST /api/compensations/import/preview → 307|401', () =>
    expectAuthReject('/api/compensations/import/preview', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('POST /api/compensations/import/confirm → 307|401', () =>
    expectAuthReject('/api/compensations/import/confirm', 'POST', JSON.stringify({})));
});

// ── Expenses (remaining methods) ────────────────────────────────

describe('auth boundary — expenses (batch 2)', () => {
  it.skipIf(!serverUp)('POST /api/expenses → 307|401', () =>
    expectAuthReject('/api/expenses', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('DELETE /api/expenses/[id] → 307|401', () =>
    expectAuthReject(`/api/expenses/${FAKE_UUID}`, 'DELETE'));

  it.skipIf(!serverUp)('POST /api/expenses/[id]/attachments → 307|401', () =>
    expectAuthReject(`/api/expenses/${FAKE_UUID}/attachments`, 'POST'));

  it.skipIf(!serverUp)('POST /api/expenses/approve-bulk → 307|401', () =>
    expectAuthReject('/api/expenses/approve-bulk', 'POST', JSON.stringify({ ids: [] })));

  it.skipIf(!serverUp)('POST /api/expenses/bulk-approve → 307|401', () =>
    expectAuthReject('/api/expenses/bulk-approve', 'POST', JSON.stringify({ ids: [] })));

  it.skipIf(!serverUp)('POST /api/expenses/bulk-liquidate → 307|401', () =>
    expectAuthReject('/api/expenses/bulk-liquidate', 'POST', JSON.stringify({ ids: [] })));
});

// ── Documents (remaining methods) ───────────────────────────────

describe('auth boundary — documents (batch 2)', () => {
  it.skipIf(!serverUp)('POST /api/documents → 307|401', () =>
    expectAuthReject('/api/documents', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('GET /api/documents/[id] → 307|401', () =>
    expectAuthReject(`/api/documents/${FAKE_UUID}`));

  it.skipIf(!serverUp)('PATCH /api/documents/[id] → 307|401', () =>
    expectAuthReject(`/api/documents/${FAKE_UUID}`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('DELETE /api/documents/[id] → 307|401', () =>
    expectAuthReject(`/api/documents/${FAKE_UUID}`, 'DELETE'));

  it.skipIf(!serverUp)('POST /api/documents/[id]/sign-guided → 307|401', () =>
    expectAuthReject(`/api/documents/${FAKE_UUID}/sign-guided`, 'POST'));

  it.skipIf(!serverUp)('POST /api/documents/[id]/recompile → 307|401', () =>
    expectAuthReject(`/api/documents/${FAKE_UUID}/recompile`, 'POST'));

  it.skipIf(!serverUp)('POST /api/documents/cu-batch → 307|401', () =>
    expectAuthReject('/api/documents/cu-batch', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('GET /api/documents/receipts/preview → 307|401', () =>
    expectAuthReject('/api/documents/receipts/preview'));
});

// ── Corsi + lezioni + assegnazioni + candidature ────────────────

describe('auth boundary — corsi ecosystem', () => {
  it.skipIf(!serverUp)('GET /api/corsi → 307|401', () =>
    expectAuthReject('/api/corsi'));

  it.skipIf(!serverUp)('POST /api/corsi → 307|401', () =>
    expectAuthReject('/api/corsi', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('GET /api/corsi/[id] → 307|401', () =>
    expectAuthReject(`/api/corsi/${FAKE_UUID}`));

  it.skipIf(!serverUp)('PATCH /api/corsi/[id] → 307|401', () =>
    expectAuthReject(`/api/corsi/${FAKE_UUID}`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('DELETE /api/corsi/[id] → 307|401', () =>
    expectAuthReject(`/api/corsi/${FAKE_UUID}`, 'DELETE'));

  it.skipIf(!serverUp)('GET /api/corsi/[id]/lezioni → 307|401', () =>
    expectAuthReject(`/api/corsi/${FAKE_UUID}/lezioni`));

  it.skipIf(!serverUp)('POST /api/corsi/[id]/lezioni → 307|401', () =>
    expectAuthReject(`/api/corsi/${FAKE_UUID}/lezioni`, 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('PATCH /api/corsi/[id]/lezioni/[lid] → 307|401', () =>
    expectAuthReject(`/api/corsi/${FAKE_UUID}/lezioni/${FAKE_UUID}`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('DELETE /api/corsi/[id]/lezioni/[lid] → 307|401', () =>
    expectAuthReject(`/api/corsi/${FAKE_UUID}/lezioni/${FAKE_UUID}`, 'DELETE'));

  it.skipIf(!serverUp)('PATCH /api/corsi/[id]/valutazioni → 307|401', () =>
    expectAuthReject(`/api/corsi/${FAKE_UUID}/valutazioni`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('POST /api/assegnazioni → 307|401', () =>
    expectAuthReject('/api/assegnazioni', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('POST /api/assegnazioni/corso → 307|401', () =>
    expectAuthReject('/api/assegnazioni/corso', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('DELETE /api/assegnazioni/[id] → 307|401', () =>
    expectAuthReject(`/api/assegnazioni/${FAKE_UUID}`, 'DELETE'));

  it.skipIf(!serverUp)('GET /api/assegnazioni/export → 307|401', () =>
    expectAuthReject('/api/assegnazioni/export'));

  it.skipIf(!serverUp)('POST /api/candidature → 307|401', () =>
    expectAuthReject('/api/candidature', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('PATCH /api/candidature/[id] → 307|401', () =>
    expectAuthReject(`/api/candidature/${FAKE_UUID}`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('GET /api/blacklist → 307|401', () =>
    expectAuthReject('/api/blacklist'));
});

// ── Content routes (comms, events, opportunities, discounts, resources) ──

describe('auth boundary — content routes', () => {
  it.skipIf(!serverUp)('POST /api/communications → 307|401', () =>
    expectAuthReject('/api/communications', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('PATCH /api/communications/[id] → 307|401', () =>
    expectAuthReject(`/api/communications/${FAKE_UUID}`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('DELETE /api/communications/[id] → 307|401', () =>
    expectAuthReject(`/api/communications/${FAKE_UUID}`, 'DELETE'));

  it.skipIf(!serverUp)('GET /api/events → 307|401', () =>
    expectAuthReject('/api/events'));

  it.skipIf(!serverUp)('POST /api/events → 307|401', () =>
    expectAuthReject('/api/events', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('PATCH /api/events/[id] → 307|401', () =>
    expectAuthReject(`/api/events/${FAKE_UUID}`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('DELETE /api/events/[id] → 307|401', () =>
    expectAuthReject(`/api/events/${FAKE_UUID}`, 'DELETE'));

  it.skipIf(!serverUp)('POST /api/opportunities → 307|401', () =>
    expectAuthReject('/api/opportunities', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('PATCH /api/opportunities/[id] → 307|401', () =>
    expectAuthReject(`/api/opportunities/${FAKE_UUID}`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('DELETE /api/opportunities/[id] → 307|401', () =>
    expectAuthReject(`/api/opportunities/${FAKE_UUID}`, 'DELETE'));

  it.skipIf(!serverUp)('POST /api/discounts → 307|401', () =>
    expectAuthReject('/api/discounts', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('PATCH /api/discounts/[id] → 307|401', () =>
    expectAuthReject(`/api/discounts/${FAKE_UUID}`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('DELETE /api/discounts/[id] → 307|401', () =>
    expectAuthReject(`/api/discounts/${FAKE_UUID}`, 'DELETE'));

  it.skipIf(!serverUp)('GET /api/resources → 307|401', () =>
    expectAuthReject('/api/resources'));

  it.skipIf(!serverUp)('POST /api/resources → 307|401', () =>
    expectAuthReject('/api/resources', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('PATCH /api/resources/[id] → 307|401', () =>
    expectAuthReject(`/api/resources/${FAKE_UUID}`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('DELETE /api/resources/[id] → 307|401', () =>
    expectAuthReject(`/api/resources/${FAKE_UUID}`, 'DELETE'));
});

// ── Import routes (batch 2) ─────────────────────────────────────

describe('auth boundary — import (batch 2)', () => {
  it.skipIf(!serverUp)('POST /api/import/collaboratori/preview → 307|401', () =>
    expectAuthReject('/api/import/collaboratori/preview', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('POST /api/import/contratti/preview → 307|401', () =>
    expectAuthReject('/api/import/contratti/preview', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('POST /api/import/contratti/run → 307|401', () =>
    expectAuthReject('/api/import/contratti/run', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('POST /api/import/cu/preview → 307|401', () =>
    expectAuthReject('/api/import/cu/preview', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('POST /api/import/cu/run → 307|401', () =>
    expectAuthReject('/api/import/cu/run', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('GET /api/import/history → 307|401', () =>
    expectAuthReject('/api/import/history'));
});

// ── Export routes (batch 2) ─────────────────────────────────────

describe('auth boundary — export (batch 2)', () => {
  it.skipIf(!serverUp)('POST /api/export/gsheet → 307|401', () =>
    expectAuthReject('/api/export/gsheet', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('GET /api/export/history → 307|401', () =>
    expectAuthReject('/api/export/history'));
});

// ── Tickets (remaining) ─────────────────────────────────────────

describe('auth boundary — tickets (batch 2)', () => {
  it.skipIf(!serverUp)('GET /api/tickets → 307|401', () =>
    expectAuthReject('/api/tickets'));

  it.skipIf(!serverUp)('POST /api/tickets → 307|401', () =>
    expectAuthReject('/api/tickets', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('GET /api/tickets/[id] → 307|401', () =>
    expectAuthReject(`/api/tickets/${FAKE_UUID}`));

  it.skipIf(!serverUp)('POST /api/tickets/[id]/messages → 307|401', () =>
    expectAuthReject(`/api/tickets/${FAKE_UUID}/messages`, 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('PATCH /api/tickets/[id]/status → 307|401', () =>
    expectAuthReject(`/api/tickets/${FAKE_UUID}/status`, 'PATCH', JSON.stringify({})));
});

// ── Profile (remaining) ─────────────────────────────────────────

describe('auth boundary — profile (batch 2)', () => {
  it.skipIf(!serverUp)('PATCH /api/profile → 307|401', () =>
    expectAuthReject('/api/profile', 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('POST /api/profile/avatar → 307|401', () =>
    expectAuthReject('/api/profile/avatar', 'POST'));

  it.skipIf(!serverUp)('PATCH /api/profile/communities → 307|401', () =>
    expectAuthReject('/api/profile/communities', 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('PATCH /api/profile/theme → 307|401', () =>
    expectAuthReject('/api/profile/theme', 'PATCH', JSON.stringify({})));
});

// ── Notifications + feedback + misc ─────────────────────────────

describe('auth boundary — notifications & misc', () => {
  it.skipIf(!serverUp)('GET /api/notifications → 307|401', () =>
    expectAuthReject('/api/notifications'));

  it.skipIf(!serverUp)('PATCH /api/notifications → 307|401', () =>
    expectAuthReject('/api/notifications', 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('PATCH /api/notifications/[id] → 307|401', () =>
    expectAuthReject(`/api/notifications/${FAKE_UUID}`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('DELETE /api/notifications/[id] → 307|401', () =>
    expectAuthReject(`/api/notifications/${FAKE_UUID}`, 'DELETE'));

  it.skipIf(!serverUp)('POST /api/feedback → 307|401', () =>
    expectAuthReject('/api/feedback', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('PATCH /api/feedback/[id] → 307|401', () =>
    expectAuthReject(`/api/feedback/${FAKE_UUID}`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('DELETE /api/feedback/[id] → 307|401', () =>
    expectAuthReject(`/api/feedback/${FAKE_UUID}`, 'DELETE'));

  it.skipIf(!serverUp)('GET /api/lookup-options → 307|401', () =>
    expectAuthReject('/api/lookup-options'));

  it.skipIf(!serverUp)('POST /api/liquidazione-requests → 307|401', () =>
    expectAuthReject('/api/liquidazione-requests', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('GET /api/liquidazione-requests → 307|401', () =>
    expectAuthReject('/api/liquidazione-requests'));

  it.skipIf(!serverUp)('PATCH /api/liquidazione-requests/[id] → 307|401', () =>
    expectAuthReject(`/api/liquidazione-requests/${FAKE_UUID}`, 'PATCH', JSON.stringify({})));

  it.skipIf(!serverUp)('POST /api/telegram/connect → 307|401', () =>
    expectAuthReject('/api/telegram/connect', 'POST', JSON.stringify({})));

  it.skipIf(!serverUp)('DELETE /api/telegram/disconnect → 307|401', () =>
    expectAuthReject('/api/telegram/disconnect', 'DELETE'));
});
