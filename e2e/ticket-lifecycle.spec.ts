/**
 * T3.4 — Ticket lifecycle e2e
 *
 * Full workflow: collaboratore creates → admin sees → admin replies → admin closes
 * S1: Collaboratore creates ticket → DB: APERTO
 * S2: Admin sees ticket in the list
 * S3: Admin replies with a message → DB: IN_LAVORAZIONE (auto-advanced)
 * S4: Admin closes ticket → DB: CHIUSO
 * S5: Collaboratore sees updated status CHIUSO
 *
 * Roles: collaboratore_tb, admin
 */
import { test, expect } from '@playwright/test';
import { login, db, dbFirst, dbDelete } from './helpers';

const PREFIX = 'E2E-TICKET-LIFE';

test.describe.serial('Ticket lifecycle', () => {
  let ticketId: string;

  test.afterAll(async () => {
    if (ticketId) {
      await dbDelete('ticket_messages', { 'ticket_id': `eq.${ticketId}` });
      await dbDelete('tickets', { 'id': `eq.${ticketId}` });
    }
    // Cleanup leftovers by oggetto prefix
    const leftovers = await db<{ id: string }>('tickets', {
      'oggetto': `like.${PREFIX}%`,
      'select': 'id',
    });
    for (const t of leftovers) {
      await dbDelete('ticket_messages', { 'ticket_id': `eq.${t.id}` });
      await dbDelete('tickets', { 'id': `eq.${t.id}` });
    }
  });

  test('S1 — Collaboratore crea un ticket', async ({ page }) => {
    await login(page, 'collaboratore_tb');
    await page.waitForLoadState('domcontentloaded');

    // Navigate to create ticket page
    await page.goto('/ticket/nuova');
    await page.waitForLoadState('domcontentloaded');

    // Fill category (Riferimento) — Radix Select
    const catSelect = page.getByRole('combobox').first();
    await catSelect.click();
    await page.getByRole('option', { name: 'Compenso' }).click();

    // Fill subject
    await page.fill('input[name="oggetto"]', `${PREFIX}-problema-compensi`);

    // Fill initial message (optional but useful for the test)
    await page.fill('textarea[name="messaggio"]', 'Messaggio iniziale di test per il ticket e2e.');

    // Submit
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/tickets') && r.request().method() === 'POST' && !r.url().includes('messages'),
        { timeout: 15_000 },
      ),
      page.click('button[type="submit"]'),
    ]);

    await page.waitForTimeout(2000);

    // Verify in DB
    const ticket = await dbFirst<{ id: string; stato: string; oggetto: string }>(
      'tickets',
      {
        'oggetto': `eq.${PREFIX}-problema-compensi`,
        'select': 'id,stato,oggetto',
        'order': 'created_at.desc',
      },
    );

    expect(ticket).toBeTruthy();
    expect(ticket!.stato).toBe('APERTO');
    ticketId = ticket!.id;
  });

  test('S2 — Admin vede il ticket nella lista', async ({ page }) => {
    test.skip(!ticketId, 'S1 failed — no ticket created');

    await login(page, 'admin');
    await page.waitForLoadState('domcontentloaded');

    await page.goto('/ticket');
    await page.waitForLoadState('domcontentloaded');

    // Should see the ticket in the list (may appear in multiple sections)
    await expect(page.locator(`text=${PREFIX}-problema-compensi`).first()).toBeVisible({ timeout: 10_000 });

    // Status badge should show APERTO
    const badge = page.locator('[data-ticket-stato="APERTO"]').first();
    await expect(badge).toBeVisible();
  });

  test('S3 — Admin risponde al ticket', async ({ page }) => {
    test.skip(!ticketId, 'S1 failed — no ticket created');
    test.setTimeout(45_000);

    await login(page, 'admin');
    await page.waitForLoadState('domcontentloaded');

    // Navigate to ticket detail
    await page.goto(`/ticket/${ticketId}`);
    await page.waitForLoadState('domcontentloaded');

    // Should see the ticket detail (appears in breadcrumb + h2)
    await expect(page.locator('h2').filter({ hasText: `${PREFIX}-problema-compensi` })).toBeVisible({ timeout: 10_000 });

    // Fill reply message
    await page.fill('textarea', 'Risposta admin di test - il compenso è in lavorazione.');

    // Submit reply
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/tickets') && r.url().includes('messages') && r.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      page.click('button:has-text("Invia risposta")'),
    ]);

    await page.waitForTimeout(1500);

    // Verify DB: ticket should be auto-advanced to IN_LAVORAZIONE
    const ticket = await dbFirst<{ stato: string }>('tickets', {
      'id': `eq.${ticketId}`,
      'select': 'stato',
    });
    expect(ticket!.stato).toBe('IN_LAVORAZIONE');
  });

  test('S4 — Admin chiude il ticket', async ({ page }) => {
    test.skip(!ticketId, 'S1 failed — no ticket created');

    await login(page, 'admin');
    await page.waitForLoadState('domcontentloaded');

    await page.goto(`/ticket/${ticketId}`);
    await page.waitForLoadState('domcontentloaded');

    // The TicketStatusInline component shows "→ Chiuso" button for IN_LAVORAZIONE
    const closeBtn = page.locator('button').filter({ hasText: 'Chiuso' });
    await expect(closeBtn).toBeVisible({ timeout: 10_000 });

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/tickets') && r.url().includes('status'),
        { timeout: 15_000 },
      ),
      closeBtn.click(),
    ]);

    await page.waitForTimeout(1500);

    // Verify DB state
    const ticket = await dbFirst<{ stato: string }>('tickets', {
      'id': `eq.${ticketId}`,
      'select': 'stato',
    });
    expect(ticket!.stato).toBe('CHIUSO');
  });

  test('S5 — Collaboratore vede stato CHIUSO', async ({ page }) => {
    test.skip(!ticketId, 'S1 failed — no ticket created');

    await login(page, 'collaboratore_tb');
    await page.waitForLoadState('domcontentloaded');

    await page.goto(`/ticket/${ticketId}`);
    await page.waitForLoadState('domcontentloaded');

    // Should see CHIUSO status text (may appear multiple times on the page)
    await expect(page.getByText('CHIUSO', { exact: true }).first()).toBeVisible({ timeout: 10_000 });

    // Should see closed ticket banner
    await expect(page.locator('text=Questo ticket')).toBeVisible();
  });
});
