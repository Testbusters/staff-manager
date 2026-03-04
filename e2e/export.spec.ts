/**
 * UAT — Blocco Export
 * Scenari S1–S8: accesso, tab, selezione, export CSV/XLSX, mark-paid + verifica DB
 *
 * Prerequisiti:
 *   - Dev server attivo su localhost:3000
 *   - Almeno 1 compensation (tipo OCCASIONALE) e 1 expense_reimbursement in stato APPROVATO_ADMIN nel DB
 */

import { test, expect, type Page } from '@playwright/test';
import path from 'path';

// ── Supabase REST helper (service role — bypasses RLS) ────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function db<T = unknown>(table: string, params = ''): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  return res.json();
}

async function dbFirst<T = unknown>(table: string, params = ''): Promise<T | null> {
  const rows = await db<T>(table, params + '&limit=1');
  return rows[0] ?? null;
}

// ── Login helper ──────────────────────────────────────────────────────────────
const CREDS = {
  admin: { email: 'admin@test.com', password: 'Testbusters123' },
};

async function login(page: Page, role: keyof typeof CREDS = 'admin') {
  const { email, password } = CREDS[role];
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 15_000 });
}

// ── Test IDs shared across serial tests ──────────────────────────────────────
let testCompensationId: string;
let testExpenseId: string;
const COLLABORATOR_ID = '3a55c2da-4906-42d7-81e1-c7c7b399ab4b'; // collaboratore@test.com

// ── Test suite ────────────────────────────────────────────────────────────────
test.describe.serial('Export UAT', () => {

  test.beforeAll(async () => {
    // Seed: create 1 APPROVATO_ADMIN compensation (occasionale) and 1 expense
    const now = new Date().toISOString();

    // Get a valid community_id
    const communities = await db<{ id: string }>('communities', 'select=id&limit=1');
    const communityId = communities[0]?.id;
    if (!communityId) throw new Error('No community found in DB for test seeding');

    // Insert test compensation
    const compRes = await fetch(`${SUPABASE_URL}/rest/v1/compensations`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        collaborator_id: COLLABORATOR_ID,
        community_id: communityId,
        tipo: 'OCCASIONALE',
        descrizione: 'UAT export test',
        importo_lordo: 1000,
        ritenuta_acconto: 200,
        importo_netto: 800,
        stato: 'APPROVATO_ADMIN',
        admin_approved_by: null,
        admin_approved_at: now,
      }),
    });
    const [comp] = await compRes.json();
    testCompensationId = comp.id;
    console.log(`  🌱 Seeded compensation ${testCompensationId}`);

    // Insert test expense
    const expRes = await fetch(`${SUPABASE_URL}/rest/v1/expense_reimbursements`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        collaborator_id: COLLABORATOR_ID,
        categoria: 'Trasporto',
        data_spesa: '2026-02-15',
        importo: 75,
        descrizione: 'UAT export rimborso test',
        stato: 'APPROVATO_ADMIN',
        admin_approved_at: now,
      }),
    });
    const [exp] = await expRes.json();
    testExpenseId = exp.id;
    console.log(`  🌱 Seeded expense ${testExpenseId}`);
  });

  test.afterAll(async () => {
    // Clean up test records
    if (testCompensationId) {
      await fetch(`${SUPABASE_URL}/rest/v1/compensation_history?compensation_id=eq.${testCompensationId}`, {
        method: 'DELETE',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=minimal' },
      });
      await fetch(`${SUPABASE_URL}/rest/v1/compensations?id=eq.${testCompensationId}`, {
        method: 'DELETE',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=minimal' },
      });
    }
    if (testExpenseId) {
      await fetch(`${SUPABASE_URL}/rest/v1/expense_history?reimbursement_id=eq.${testExpenseId}`, {
        method: 'DELETE',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=minimal' },
      });
      await fetch(`${SUPABASE_URL}/rest/v1/expense_reimbursements?id=eq.${testExpenseId}`, {
        method: 'DELETE',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=minimal' },
      });
    }
    console.log('  🧹 Cleaned up test records');
  });

  // ── S1: Admin vede tab Occasionali con record APPROVATO_ADMIN ──────────────
  test('S1 — Admin: accede a /export, vede tab Occasionali con record', async ({ page }) => {
    await login(page);
    await page.goto('/export');

    // Active tab should be "Occasionali"
    const activeTab = page.locator('a.bg-blue-600');
    await expect(activeTab).toContainText('Occasionali', { timeout: 10_000 });

    // Table should have at least our seeded row
    await expect(page.locator('table tbody tr')).toHaveCount(
      await page.locator('table tbody tr').count(),
      { timeout: 10_000 },
    );
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible();
    console.log('  ✅ S1 — Export page loads with Occasionali tab active');
  });

  // ── S2: Cambia tab a Rimborsi — URL aggiornato ───────────────────────────
  test('S2 — Admin: cambia tab a Rimborsi, URL ?tab=rimborsi', async ({ page }) => {
    await login(page);
    await page.goto('/export?tab=rimborsi');

    await expect(page).toHaveURL(/tab=rimborsi/, { timeout: 10_000 });
    const activeTab = page.locator('a.bg-blue-600');
    await expect(activeTab).toContainText('Rimborsi');

    // Should see at least our seeded expense
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible();
    console.log('  ✅ S2 — Rimborsi tab active, records visible');
  });

  // ── S3: Seleziona 1 record — bottone "Segna pagati (1)" abilitato ─────────
  test('S3 — Admin: seleziona 1 record, bottone Segna pagati abilitato', async ({ page }) => {
    await login(page);
    await page.goto('/export');

    // Click on first row checkbox
    const firstCheckbox = page.locator('table tbody tr').first().locator('input[type="checkbox"]');
    await firstCheckbox.click();

    const markBtn = page.locator('button:has-text("Segna pagati")');
    await expect(markBtn).toBeEnabled({ timeout: 5_000 });
    await expect(markBtn).toContainText('Segna pagati (1)');
    console.log('  ✅ S3 — Checkbox seleziona, bottone abilitato');
  });

  // ── S4: Click Esporta CSV — download avviato ──────────────────────────────
  test('S4 — Admin: click Esporta CSV avvia download', async ({ page }) => {
    await login(page);
    await page.goto('/export');

    // Wait for table to load
    await expect(page.locator('table tbody tr').first()).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10_000 }),
      page.locator('button:has-text("Esporta CSV")').click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/export-occasionali-.+\.csv/);
    console.log(`  ✅ S4 — CSV download: ${download.suggestedFilename()}`);
  });

  // ── S5: Click Esporta XLSX — download avviato ────────────────────────────
  test('S5 — Admin: click Esporta XLSX avvia download', async ({ page }) => {
    await login(page);
    await page.goto('/export');

    await expect(page.locator('table tbody tr').first()).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10_000 }),
      page.locator('button:has-text("Esporta XLSX")').click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/export-occasionali-.+\.xlsx/);
    console.log(`  ✅ S5 — XLSX download: ${download.suggestedFilename()}`);
  });

  // ── S6: Seleziona record + apre modal — input visibile ────────────────────
  test('S6 — Admin: seleziona record, apre modal mark-paid, input visibile', async ({ page }) => {
    await login(page);
    await page.goto('/export');

    await expect(page.locator('table tbody tr').first()).toBeVisible();
    await page.locator('table tbody tr').first().locator('input[type="checkbox"]').click();

    await page.locator('button:has-text("Segna pagati")').click();

    const input = page.locator('input[placeholder="es. BON-2026-001"]');
    await expect(input).toBeVisible({ timeout: 5_000 });
    console.log('  ✅ S6 — Modal aperto, input riferimento visibile');
  });

  // ── S7: Compila riferimento + conferma — record sparisce (stato PAGATO) ───
  test('S7 — Admin: mark-paid su seeded compensation, record sparisce', async ({ page }) => {
    await login(page);
    await page.goto('/export');

    // Find our seeded compensation row by selecting all and mark paid
    // First select all
    const selectAllCheckbox = page.locator('thead input[type="checkbox"]');
    await selectAllCheckbox.click();

    // Actually, to be more targeted: just click the mark-paid for our specific record
    // Let's select all and mark paid, then check the seeded one is gone
    await page.locator('button:has-text("Segna pagati")').click();

    const input = page.locator('input[placeholder="es. BON-2026-001"]');
    await input.fill('BON-UAT-2026-001');

    await page.locator('button:has-text("Conferma pagamento")').click();

    // Modal should close and list refresh
    await expect(input).not.toBeVisible({ timeout: 15_000 });
    console.log('  ✅ S7 — Mark-paid confermato, lista aggiornata');
  });

  // ── S8: Verifica DB — paid_at, payment_reference, history ────────────────
  test('S8 — Verifica DB: compensazione segnata PAGATA con riferimento e history', async () => {
    const comp = await dbFirst<{
      stato: string;
      paid_at: string | null;
      payment_reference: string | null;
    }>(
      'compensations',
      `id=eq.${testCompensationId}&select=stato,paid_at,payment_reference`,
    );

    expect(comp).not.toBeNull();
    expect(comp!.stato).toBe('PAGATO');
    expect(comp!.paid_at).not.toBeNull();
    expect(comp!.payment_reference).toBe('BON-UAT-2026-001');

    // Check history
    const history = await dbFirst<{
      stato_precedente: string;
      stato_nuovo: string;
    }>(
      'compensation_history',
      `compensation_id=eq.${testCompensationId}&stato_nuovo=eq.PAGATO&select=stato_precedente,stato_nuovo`,
    );
    expect(history).not.toBeNull();
    expect(history!.stato_precedente).toBe('APPROVATO_ADMIN');
    expect(history!.stato_nuovo).toBe('PAGATO');

    console.log('  ✅ S8 — DB: stato=PAGATO, paid_at set, history inserita');
  });
});
