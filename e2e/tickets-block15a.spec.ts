/**
 * UAT — Block 15a: Ticket system overhaul
 *
 * S1 — Admin views /ticket: two sections (ricevuti + recenti), "Apri →" links present
 * S2 — Admin opens APERTO ticket: only "→ Chiuso" visible; no "→ In lavorazione"
 * S3 — Collaboratore sends reply: message appears; last_message_at updated in DB
 * S4 — Responsabile blocked from /ticket/nuova: redirect to /
 * S5 — Priority selectable in creation form: ticket created with ALTA priority visible in list
 * S6 — Auto IN_LAVORAZIONE: after manager replies on APERTO ticket, stato is IN_LAVORAZIONE in DB
 */

import { test, expect, type Page } from '@playwright/test';

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

async function dbDelete(table: string, params: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=minimal' },
  });
}

const CREDS = {
  collaboratore: { email: 'collaboratore@test.com',           password: 'Testbusters123' },
  admin:         { email: 'admin@test.com',                   password: 'Testbusters123' },
  responsabile:  { email: 'responsabile_compensi@test.com',   password: 'Testbusters123' },
};

async function login(page: Page, role: keyof typeof CREDS) {
  const { email, password } = CREDS[role];
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  if (!page.url().includes('/login')) {
    // Already authenticated — sign out first
    await page.goto('/ticket');
    await page.waitForLoadState('domcontentloaded');
    const esciBtn = page.locator('button:has-text("Esci")');
    if (await esciBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await esciBtn.click();
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

const COLLAB_USER_ID = '3a55c2da-4906-42d7-81e1-c7c7b399ab4b'; // collaboratore@test.com collab_id → user_id fetched below
let collabUserId: string;
let testTicketId: string;
let priorityTicketId: string;

test.describe.serial('Block 15a — Ticket overhaul UAT', () => {

  test.beforeAll(async () => {
    // Resolve collaboratore user_id
    const collab = await dbFirst<{ user_id: string }>(
      'collaborators',
      `id=eq.${COLLAB_USER_ID}&select=user_id`,
    );
    if (!collab) throw new Error('collaboratore@test.com not found in collaborators');
    collabUserId = collab.user_id;

    // Cleanup any previous test tickets
    const old = await dbGet<{ id: string }>(
      'tickets',
      `creator_user_id=eq.${collabUserId}&oggetto=like.*B15a*&select=id`,
    );
    for (const t of old) {
      await dbDelete('ticket_messages', `ticket_id=eq.${t.id}`);
      await dbDelete('tickets', `id=eq.${t.id}`);
    }
  });

  test.afterAll(async () => {
    for (const id of [testTicketId, priorityTicketId].filter(Boolean)) {
      await dbDelete('ticket_messages', `ticket_id=eq.${id}`);
      await dbDelete('tickets', `id=eq.${id}`);
    }
  });

  // ── S1 — Admin views /ticket: two sections ─────────────────────────────────
  test('S1 — Admin vede due sezioni su /ticket', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/ticket');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1:has-text("Ticket")')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('h2').filter({ hasText: 'Ticket ricevuti' }).first()).toBeVisible();
    await expect(page.locator('h2').filter({ hasText: 'Ticket recenti' }).first()).toBeVisible();
    // "Apri →" links should be visible (each row renders one)
    await expect(page.locator('a:has-text("Apri →")').first()).toBeVisible();
    console.log('  ✅ S1 — sezioni "Ticket ricevuti" e "Ticket recenti" visibili');
  });

  // ── S2 — Collaboratore creates ticket with ALTA priority ────────────────────
  test('S2 — Collaboratore crea ticket con priorità ALTA', async ({ page }) => {
    await login(page, 'collaboratore');
    await page.goto('/ticket/nuova');
    await page.waitForLoadState('domcontentloaded');

    await page.selectOption('select#priority', 'ALTA');
    await page.selectOption('select#categoria', 'Compenso');
    await page.fill('input#oggetto', '[B15a] Ticket alta priorità');

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/ticket\/[a-f0-9-]+$/, { timeout: 15_000 });

    priorityTicketId = page.url().split('/ticket/')[1];
    console.log(`  ℹ️  priorityTicketId: ${priorityTicketId}`);

    // Verify priority stored in DB
    const ticket = await dbFirst<{ priority: string }>(
      'tickets',
      `id=eq.${priorityTicketId}&select=priority`,
    );
    expect(ticket!.priority).toBe('ALTA');
    console.log('  ✅ S2 — ticket con priorità ALTA creato correttamente in DB');
  });

  // ── S3 — Admin sees priority dot in ticket list ─────────────────────────────
  test('S3 — Admin vede indicatore priorità nella lista ticket', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/ticket');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the Ticket ricevuti section to appear
    await expect(page.locator('h2').filter({ hasText: 'Ticket ricevuti' }).first()).toBeVisible({ timeout: 10_000 });

    // The ticket title should be visible (appears in both sections → use .first())
    const ticketTitle = page.locator('text=[B15a] Ticket alta priorità').first();
    await expect(ticketTitle).toBeVisible({ timeout: 10_000 });

    // Priority dot bg-red-500 must be visible in the row containing the ticket title
    const row = page.locator('div.flex.items-center').filter({ has: page.locator('text=[B15a] Ticket alta priorità') }).first();
    await expect(row.locator('span.bg-red-500')).toBeVisible({ timeout: 5_000 });
    console.log('  ✅ S3 — indicatore priorità ALTA (punto rosso) visibile nella lista admin');
  });

  // ── S4 — Admin opens APERTO ticket: only → Chiuso CTA ──────────────────────
  test('S4 — Admin apre ticket APERTO: solo CTA "→ Chiuso" visibile', async ({ page }) => {
    await login(page, 'admin');
    await page.goto(`/ticket/${priorityTicketId}`);
    await page.waitForLoadState('domcontentloaded');

    // Status badge: APERTO (green)
    await expect(page.locator('span.text-green-300')).toBeVisible({ timeout: 5_000 });

    // Only → Chiuso button present; no → In lavorazione
    await expect(page.locator('button:has-text("→ Chiuso")')).toBeVisible();
    await expect(page.locator('button:has-text("→ In lavorazione")')).not.toBeVisible();
    console.log('  ✅ S4 — solo "→ Chiuso" visibile per ticket APERTO');
  });

  // ── S5 — Create a second ticket for collab reply test ──────────────────────
  test('S5 — Collaboratore crea secondo ticket per test risposta', async ({ page }) => {
    await login(page, 'collaboratore');
    await page.goto('/ticket/nuova');
    await page.waitForLoadState('domcontentloaded');

    await page.selectOption('select#categoria', 'Compenso');
    await page.fill('input#oggetto', '[B15a] Ticket per test risposta');
    await page.fill('textarea#messaggio', 'Primo messaggio di apertura.');

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/ticket\/[a-f0-9-]+$/, { timeout: 15_000 });
    testTicketId = page.url().split('/ticket/')[1];
    console.log(`  ℹ️  testTicketId: ${testTicketId}`);

    await expect(page.locator('text=Tu').first()).toBeVisible();
    console.log('  ✅ S5 — secondo ticket creato, messaggio "Tu" visibile');
  });

  // ── S6 — Admin replies → auto IN_LAVORAZIONE ──────────────────────────────
  test('S6 — Admin risponde → stato auto-avanzato a IN_LAVORAZIONE in DB', async ({ page }) => {
    await login(page, 'admin');
    await page.goto(`/ticket/${testTicketId}`);
    await page.waitForLoadState('domcontentloaded');

    // Ticket starts APERTO
    await expect(page.locator('span.text-green-300')).toBeVisible({ timeout: 5_000 });

    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes(`/api/tickets/${testTicketId}/messages`) && res.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      (async () => {
        await page.fill('textarea', 'Risposta admin — test auto IN_LAVORAZIONE.');
        await page.click('button:has-text("Invia risposta")');
      })(),
    ]);

    // After reply, page refreshes → badge should be IN_LAVORAZIONE (yellow)
    await expect(page.locator('span.text-yellow-300')).toBeVisible({ timeout: 10_000 });

    // Verify DB stato = IN_LAVORAZIONE
    const ticket = await dbFirst<{ stato: string; last_message_at: string }>(
      'tickets',
      `id=eq.${testTicketId}&select=stato,last_message_at`,
    );
    expect(ticket!.stato).toBe('IN_LAVORAZIONE');
    expect(ticket!.last_message_at).not.toBeNull();
    console.log('  ✅ S6 — stato IN_LAVORAZIONE in DB, last_message_at aggiornato');
  });

  // ── S7 — Collaboratore sends reply: last_message_at updated ────────────────
  test('S7 — Collaboratore invia risposta, messaggio visibile nel thread', async ({ page }) => {
    await login(page, 'collaboratore');
    await page.goto(`/ticket/${testTicketId}`);
    await page.waitForLoadState('domcontentloaded');

    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes(`/api/tickets/${testTicketId}/messages`) && res.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      (async () => {
        await page.fill('textarea', 'Aggiornamento dal collaboratore — test B15a.');
        await page.click('button:has-text("Invia risposta")');
      })(),
    ]);

    await expect(
      page.locator('text=Aggiornamento dal collaboratore — test B15a.'),
    ).toBeVisible({ timeout: 10_000 });
    console.log('  ✅ S7 — risposta collaboratore visibile nel thread');
  });

  // ── S8 — Responsabile blocked from /ticket/nuova ──────────────────────────
  test('S8 — Responsabile_compensi bloccato da /ticket/nuova (redirect)', async ({ page }) => {
    await login(page, 'responsabile');
    await page.goto('/ticket/nuova');
    await page.waitForLoadState('domcontentloaded');

    // Should be redirected away from /ticket/nuova (proxy/page-level redirect to /)
    expect(page.url()).not.toContain('/ticket/nuova');
    console.log(`  ✅ S8 — responsabile reindirizzato da /ticket/nuova → ${page.url()}`);
  });

});
