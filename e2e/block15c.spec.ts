/**
 * UAT — Block 15c: UI integrations
 *
 * S1 — Collab dashboard: clicking ticket row opens TicketDetailModal
 * S2 — TicketDetailModal: reply sent → message appears in thread
 * S3 — Responsabile dashboard: clicking comp row opens CompModal detail
 * S4 — Responsabile dashboard: clicking rimborso row opens ExpModal detail
 * S5 — Responsabile dashboard: clicking ticket row navigates to /ticket/[id]
 * S6 — /ticket (collab): badge data-ticket-stato attribute present for all three states
 * S7 — TicketQuickModal: priority field visible (default NORMALE), ALTA submitted
 * S8 — PendingApprovedList: clicking row navigates to /compensi/[id]
 * S9 — PendingApprovedExpenseList: clicking row navigates to /rimborsi/[id]
 */

import { test, expect, type Page } from '@playwright/test';

// ── Supabase REST helpers ──────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function dbGet<T = unknown>(table: string, params = ''): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  return res.json();
}

async function dbFirst<T = unknown>(table: string, params = ''): Promise<T | null> {
  const rows = await dbGet<T>(table, params + '&limit=1');
  return rows[0] ?? null;
}

async function dbPost<T = unknown>(table: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return (Array.isArray(data) ? data[0] : data) as T;
}

async function dbDelete(table: string, filter: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=minimal' },
  });
}

// ── Constants ──────────────────────────────────────────────────────────────────
const COLLAB_ID     = '3a55c2da-4906-42d7-81e1-c7c7b399ab4b'; // collaboratore@test.com
const COMMUNITY_ID  = '6a5aeb11-d4bc-4575-84ad-9c343ea95bbf'; // Testbusters

const CREDS = {
  collaboratore: { email: 'collaboratore@test.com',         password: 'Testbusters123' },
  responsabile:  { email: 'responsabile_compensi@test.com', password: 'Testbusters123' },
};

async function login(page: Page, role: keyof typeof CREDS) {
  const { email, password } = CREDS[role];
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  if (!page.url().includes('/login')) {
    const esci = page.locator('button:has-text("Esci")');
    if (await esci.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await esci.click();
      await page.waitForURL((u) => u.toString().includes('/login'), { timeout: 10_000 });
    } else {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
    }
  }
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 15_000 });
}

// ── Test data ─────────────────────────────────────────────────────────────────
let collabUserId = '';
let ticketOpenId  = '';
let ticketWipId   = '';
let ticketDoneId  = '';
let compAttesaId  = '';
let compApprId    = '';
let expAttesaId   = '';
let expApprId     = '';

const TAG = 'B15c-UAT';

test.describe.serial('Block 15c — UI integrations UAT', () => {

  test.beforeAll(async () => {
    // Resolve auth user_id for collaboratore@test.com
    const collab = await dbFirst<{ user_id: string }>(
      'collaborators',
      `id=eq.${COLLAB_ID}&select=user_id`,
    );
    if (!collab) throw new Error(`collaborators row not found for id=${COLLAB_ID}`);
    collabUserId = collab.user_id;

    // ── Cleanup first ──────────────────────────────────────────────────────────
    const oldTickets = await dbGet<{ id: string }>(
      'tickets',
      `creator_user_id=eq.${collabUserId}&oggetto=like.*${TAG}*&select=id`,
    );
    for (const t of oldTickets) {
      await dbDelete('ticket_messages', `ticket_id=eq.${t.id}`);
      await dbDelete('tickets', `id=eq.${t.id}`);
    }
    await dbDelete('compensations', `collaborator_id=eq.${COLLAB_ID}&nome_servizio_ruolo=like.*${TAG}*`);
    await dbDelete('expense_reimbursements', `collaborator_id=eq.${COLLAB_ID}&descrizione=like.*${TAG}*`);

    // ── Create tickets ─────────────────────────────────────────────────────────
    const tBase = {
      creator_user_id: collabUserId,
      categoria: 'Compenso',
      oggetto: `[${TAG}] ticket`,
      priority: 'NORMALE',
    };
    const tOpen  = await dbPost<{ id: string }>('tickets', { ...tBase, stato: 'APERTO',         oggetto: `[${TAG}] aperto` });
    const tWip   = await dbPost<{ id: string }>('tickets', { ...tBase, stato: 'IN_LAVORAZIONE', oggetto: `[${TAG}] wip` });
    const tDone  = await dbPost<{ id: string }>('tickets', { ...tBase, stato: 'CHIUSO',         oggetto: `[${TAG}] chiuso` });
    ticketOpenId = tOpen.id;
    ticketWipId  = tWip.id;
    ticketDoneId = tDone.id;

    // ── Create compensations ───────────────────────────────────────────────────
    const compBase = { collaborator_id: COLLAB_ID, community_id: COMMUNITY_ID, importo_lordo: 120, importo_netto: 96 };
    const cAtt  = await dbPost<{ id: string }>('compensations', { ...compBase, stato: 'IN_ATTESA',  nome_servizio_ruolo: `[${TAG}] attesa` });
    const cAppr = await dbPost<{ id: string }>('compensations', { ...compBase, stato: 'APPROVATO',  nome_servizio_ruolo: `[${TAG}] approvato` });
    compAttesaId = cAtt.id;
    compApprId   = cAppr.id;

    // ── Create expenses ────────────────────────────────────────────────────────
    const expBase = { collaborator_id: COLLAB_ID, importo: 55, categoria: 'Trasferta', data_spesa: new Date().toISOString().slice(0, 10) };
    const eAtt  = await dbPost<{ id: string }>('expense_reimbursements', { ...expBase, stato: 'IN_ATTESA', descrizione: `[${TAG}] attesa` });
    const eAppr = await dbPost<{ id: string }>('expense_reimbursements', { ...expBase, stato: 'APPROVATO', descrizione: `[${TAG}] approvato` });
    expAttesaId = eAtt.id;
    expApprId   = eAppr.id;
  });

  test.afterAll(async () => {
    for (const id of [ticketOpenId, ticketWipId, ticketDoneId].filter(Boolean)) {
      await dbDelete('ticket_messages', `ticket_id=eq.${id}`);
      await dbDelete('tickets', `id=eq.${id}`);
    }
    for (const id of [compAttesaId, compApprId].filter(Boolean)) {
      await dbDelete('compensations', `id=eq.${id}`);
    }
    for (const id of [expAttesaId, expApprId].filter(Boolean)) {
      await dbDelete('expense_reimbursements', `id=eq.${id}`);
    }
  });

  // ── S1 — Collab dashboard: ticket row → TicketDetailModal ──────────────────
  test('S1 — Ticket aperto in dashboard collab apre TicketDetailModal', async ({ page }) => {
    await login(page, 'collaboratore');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Find the "I tuoi ticket aperti" card and click the first button
    const section = page.locator('div.rounded-2xl').filter({ hasText: 'I tuoi ticket aperti' });
    await expect(section).toBeVisible({ timeout: 10_000 });
    const firstBtn = section.locator('button').first();
    await expect(firstBtn).toBeVisible({ timeout: 5_000 });
    await firstBtn.click();

    // Modal should open
    const modal = page.locator('div.fixed.inset-0.z-50');
    await expect(modal).toBeVisible({ timeout: 8_000 });
    // Modal header shows ticket subject area
    await expect(modal.locator('p.text-sm.font-semibold')).toBeVisible();
    console.log('  ✅ S1 — TicketDetailModal aperto da dashboard collab');
  });

  // ── S2 — TicketDetailModal: reply sent ────────────────────────────────────
  test('S2 — Risposta in TicketDetailModal appare nel thread', async ({ page }) => {
    await login(page, 'collaboratore');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const section = page.locator('div.rounded-2xl').filter({ hasText: 'I tuoi ticket aperti' });
    await expect(section.locator('button').first()).toBeVisible({ timeout: 10_000 });
    await section.locator('button').first().click();

    const modal = page.locator('div.fixed.inset-0.z-50');
    await expect(modal).toBeVisible({ timeout: 8_000 });

    // Wait for thread to load (no longer "Caricamento…")
    await expect(modal.locator('p:has-text("Caricamento")')).not.toBeVisible({ timeout: 8_000 });

    // Type and send reply
    const replyMsg = `UAT reply ${Date.now()}`;
    await modal.locator('textarea').fill(replyMsg);
    await modal.locator('button').filter({ hasText: /^Invia$/ }).click();

    // Message should appear in thread (the textarea clears after send)
    await expect(modal.locator('textarea')).toHaveValue('', { timeout: 8_000 });
    // Thread should contain our message text
    await expect(modal.locator(`p:has-text("${replyMsg}")`)).toBeVisible({ timeout: 8_000 });
    console.log('  ✅ S2 — Risposta inviata appare nel thread');
  });

  // ── S3 — Responsabile dashboard: comp row → CompModal ─────────────────────
  test('S3 — Comp IN_ATTESA in dashboard responsabile apre CompModal', async ({ page }) => {
    await login(page, 'responsabile');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Find "Compensi in attesa" section
    const section = page.locator('div.rounded-2xl').filter({ hasText: 'Compensi in attesa' });
    await expect(section).toBeVisible({ timeout: 10_000 });
    const firstBtn = section.locator('button').first();
    await expect(firstBtn).toBeVisible({ timeout: 5_000 });
    await firstBtn.click();

    // CompModal opens
    const modal = page.locator('div.fixed.inset-0.z-50');
    await expect(modal).toBeVisible({ timeout: 8_000 });
    await expect(modal.locator('h3:has-text("Dettaglio compenso")')).toBeVisible({ timeout: 5_000 });
    await expect(modal.locator('p:has-text("Caricamento")')).not.toBeVisible({ timeout: 8_000 });
    await expect(modal.locator('p.text-xs.text-gray-500').filter({ hasText: 'Lordo' })).toBeVisible({ timeout: 5_000 });
    console.log('  ✅ S3 — CompModal aperto da dashboard responsabile');
  });

  // ── S4 — Responsabile dashboard: rimborso row → ExpModal ──────────────────
  test('S4 — Rimborso IN_ATTESA in dashboard responsabile apre ExpModal', async ({ page }) => {
    await login(page, 'responsabile');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const section = page.locator('div.rounded-2xl').filter({ hasText: 'Rimborsi in attesa' });
    await expect(section).toBeVisible({ timeout: 10_000 });
    const firstBtn = section.locator('button').first();
    await expect(firstBtn).toBeVisible({ timeout: 5_000 });
    await firstBtn.click();

    const modal = page.locator('div.fixed.inset-0.z-50');
    await expect(modal).toBeVisible({ timeout: 8_000 });
    await expect(modal.locator('h3:has-text("Dettaglio rimborso")')).toBeVisible({ timeout: 5_000 });
    // Wait for async data to load (API returns { reimbursement: ... })
    await expect(modal.locator('p.text-xs.text-gray-500').filter({ hasText: 'Importo' })).toBeVisible({ timeout: 15_000 });
    console.log('  ✅ S4 — ExpModal aperto da dashboard responsabile');
  });

  // ── S5 — Responsabile dashboard: ticket row → /ticket/[id] ────────────────
  test('S5 — Ticket in dashboard responsabile naviga a /ticket/[id]', async ({ page }) => {
    await login(page, 'responsabile');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const section = page.locator('div.rounded-2xl').filter({ hasText: 'Ticket ricevuti' });
    await expect(section).toBeVisible({ timeout: 10_000 });
    const firstRow = section.locator('a[href^="/ticket/"]').first();
    await expect(firstRow).toBeVisible({ timeout: 5_000 });

    const href = await firstRow.getAttribute('href');
    await firstRow.click();
    await page.waitForURL((u) => u.toString().includes('/ticket/'), { timeout: 10_000 });

    expect(page.url()).toContain(href ?? '/ticket/');
    console.log(`  ✅ S5 — Navigazione a ${page.url()}`);
  });

  // ── S6 — /ticket (collab): data-ticket-stato badge attribute ──────────────
  test('S6 — Badge data-ticket-stato presenti per APERTO, IN_LAVORAZIONE, CHIUSO', async ({ page }) => {
    await login(page, 'collaboratore');
    await page.goto('/ticket');
    await page.waitForLoadState('domcontentloaded');

    // All three stato badges should be present (we created one ticket per state)
    await expect(page.locator('span[data-ticket-stato="APERTO"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('span[data-ticket-stato="IN_LAVORAZIONE"]').first()).toBeVisible();
    await expect(page.locator('span[data-ticket-stato="CHIUSO"]').first()).toBeVisible();
    console.log('  ✅ S6 — Tutti e tre i badge data-ticket-stato visibili');
  });

  // ── S7 — TicketQuickModal: priority field, ALTA submission ─────────────────
  test('S7 — TicketQuickModal ha campo priorità, default NORMALE, accetta ALTA', async ({ page }) => {
    await login(page, 'collaboratore');
    await page.goto('/compensi');
    await page.waitForLoadState('domcontentloaded');

    // Open modal
    await page.locator('button:has-text("Apri ticket")').click();
    const modal = page.locator('div.fixed.inset-0.z-50');
    await expect(modal).toBeVisible({ timeout: 8_000 });

    // Priority select exists and defaults to NORMALE
    const prioritySel = modal.locator('select#quick-priority');
    await expect(prioritySel).toBeVisible();
    await expect(prioritySel).toHaveValue('NORMALE');

    // Change to ALTA, fill required fields
    await prioritySel.selectOption('ALTA');
    await modal.locator('select').first().selectOption({ index: 1 }); // categoria (Riferimento)
    await modal.locator('input[type="text"], textarea').first().fill(`[${TAG}] quick modal ALTA`);

    // Submit → redirects to /ticket/[id]
    await Promise.all([
      page.waitForURL((u) => u.toString().includes('/ticket/') && !u.toString().includes('/nuova'), { timeout: 15_000 }),
      modal.locator('button[type="submit"]').click(),
    ]);

    const ticketId = page.url().split('/ticket/')[1]?.split('?')[0];
    expect(ticketId).toBeTruthy();

    // Verify priority in DB
    const ticket = await dbFirst<{ priority: string }>('tickets', `id=eq.${ticketId}&select=priority`);
    expect(ticket?.priority).toBe('ALTA');

    // Cleanup the created ticket
    if (ticketId) {
      await dbDelete('ticket_messages', `ticket_id=eq.${ticketId}`);
      await dbDelete('tickets', `id=eq.${ticketId}`);
    }
    console.log('  ✅ S7 — Ticket ALTA creato con TicketQuickModal');
  });

  // ── S8 — PendingApprovedList: row click → /compensi/[id] ──────────────────
  test('S8 — PendingApprovedList: click su riga naviga a /compensi/[id]', async ({ page }) => {
    await login(page, 'collaboratore');
    await page.goto('/compensi');
    await page.waitForLoadState('domcontentloaded');

    // "Da ricevere" section header
    const section = page.locator('div.rounded-xl').filter({ hasText: 'Da ricevere' });
    await expect(section).toBeVisible({ timeout: 10_000 });

    // Click first clickable row
    const firstRow = section.locator('tr.cursor-pointer').first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    await page.waitForURL((u) => u.toString().includes('/compensi/'), { timeout: 10_000 });
    expect(page.url()).toContain('/compensi/');
    console.log(`  ✅ S8 — Navigazione a ${page.url()}`);
  });

  // ── S9 — PendingApprovedExpenseList: row click → /rimborsi/[id] ───────────
  test('S9 — PendingApprovedExpenseList: click su riga naviga a /rimborsi/[id]', async ({ page }) => {
    await login(page, 'collaboratore');
    await page.goto('/compensi');
    await page.waitForLoadState('domcontentloaded');

    // Switch to Rimborsi tab first
    await page.locator('button', { hasText: 'Rimborsi' }).click();

    // "Da liquidare" section header
    const section = page.locator('div.rounded-xl').filter({ hasText: 'Da liquidare' });
    await expect(section).toBeVisible({ timeout: 10_000 });

    const firstRow = section.locator('tr.cursor-pointer').first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    await page.waitForURL((u) => u.toString().includes('/rimborsi/'), { timeout: 10_000 });
    expect(page.url()).toContain('/rimborsi/');
    console.log(`  ✅ S9 — Navigazione a ${page.url()}`);
  });

});
