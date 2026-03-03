/**
 * UAT — Documenti features
 * Scenari S1, S7, S8, S10, S12, S13, S14
 *
 * Copertura:
 *   S1  — Raggruppamento per macro-tipo + badge violet CONTRATTO
 *   S7  — Collaboratore carica CONTRATTO, stato_firma=NON_RICHIESTO (DB verify)
 *   S8  — Collaboratore tenta secondo CONTRATTO → errore 409
 *   S10 — Admin carica CONTRATTO_OCCASIONALE con DA_FIRMARE (DB verify)
 *   S12 — Admin elimina contratto via UI → redirect + assenza DB
 *   S13 — File senza checkbox → pulsante Invia disabled
 *   S14 — File + checkbox → stato FIRMATO nel DB
 */

import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

// ── Supabase REST helpers ─────────────────────────────────────────────────────
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

async function dbInsert(table: string, data: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  const rows = await res.json();
  return rows[0]?.id;
}

async function dbDelete(table: string, params: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=minimal' },
  });
}

// ── Login helper ──────────────────────────────────────────────────────────────
const CREDS = {
  admin:         { email: 'admin@test.com', password: 'Testbusters123' },
  collaboratore: { email: 'collaboratore@test.com',  password: 'Testbusters123' },
};

async function login(page: Page, role: keyof typeof CREDS) {
  const { email, password } = CREDS[role];
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 15_000 });
}

// ── Fixtures ──────────────────────────────────────────────────────────────────
const COLLABORATOR_ID = '3a55c2da-4906-42d7-81e1-c7c7b399ab4b'; // collaboratore@test.com

let tempDir: string;
let badgeDocId: string;       // CONTRATTO_OCCASIONALE seeded for S1
let ricevutaDocId: string;    // RICEVUTA_PAGAMENTO seeded for S1
let collabContractId: string; // CONTRATTO uploaded by collab in S7
let adminContractId: string;  // CONTRATTO_OCCASIONALE DA_FIRMARE created in S10, used in S12-S14

// ── Suite ─────────────────────────────────────────────────────────────────────
test.describe.serial('Documenti features UAT', () => {

  test.beforeAll(async () => {
    // Cleanup first — avoids stale data from previous runs
    const existing = await dbGet<{ id: string }>('documents',
      `collaborator_id=eq.${COLLABORATOR_ID}&select=id`);
    for (const d of existing) {
      await dbDelete('notifications', `entity_id=eq.${d.id}`);
      await dbDelete('documents', `id=eq.${d.id}`);
    }

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-features-'));

    const now = new Date().toISOString();

    // Seed CONTRATTO_OCCASIONALE (NON_RICHIESTO) for S1 badge test
    badgeDocId = await dbInsert('documents', {
      collaborator_id: COLLABORATOR_ID,
      tipo:            'CONTRATTO_OCCASIONALE',
      titolo:          'Contratto Badge Test',
      stato_firma:     'NON_RICHIESTO',
      file_original_url:  `${COLLABORATOR_ID}/badge-test/contratto.pdf`,
      file_original_name: 'contratto.pdf',
      requested_at: now,
    });

    // Seed RICEVUTA_PAGAMENTO for S1 section grouping
    ricevutaDocId = await dbInsert('documents', {
      collaborator_id: COLLABORATOR_ID,
      tipo:            'RICEVUTA_PAGAMENTO',
      titolo:          'Ricevuta Badge Test',
      stato_firma:     'NON_RICHIESTO',
      file_original_url:  `${COLLABORATOR_ID}/ricevuta-test/ricevuta.pdf`,
      file_original_name: 'ricevuta.pdf',
      requested_at: now,
    });

    console.log(`  🌱 Seeded docs: contratto=${badgeDocId}, ricevuta=${ricevutaDocId}`);
  });

  test.afterAll(async () => {
    // Hard cleanup: remove all test docs for this collaborator
    const remaining = await dbGet<{ id: string }>('documents',
      `collaborator_id=eq.${COLLABORATOR_ID}&select=id`);
    for (const d of remaining) {
      await dbDelete('notifications', `entity_id=eq.${d.id}`);
      await dbDelete('documents', `id=eq.${d.id}`);
    }
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`  🧹 Cleaned ${remaining.length} test document(s)`);
  });

  // ── S1 — Raggruppamento per macro-tipo + badge violet ─────────────────────
  test('S1 — Admin: lista raggruppata per macro-tipo, badge violet per CONTRATTO', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/documenti');

    // Section headers for both macro types visible
    await expect(page.locator('h3:has-text("Contratto")')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('h3:has-text("Ricevuta di pagamento")')).toBeVisible();

    // Badge violet with "Occasionale" text in CONTRATTO section
    const badge = page.locator('span.text-violet-300').first();
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Occasionale');

    console.log('  ✅ S1 — Sezioni macro-tipo e badge violet verificati');
  });

  // ── S7 — Collaboratore carica CONTRATTO, stato_firma forzato NON_RICHIESTO ─
  test('S7 — Collaboratore: carica CONTRATTO, form senza selector collab né toggle firma', async ({ page }) => {
    // Remove seeded CONTRATTO before collab upload (uniqueness constraint)
    await dbDelete('documents', `id=eq.${badgeDocId}`);

    await login(page, 'collaboratore');
    await page.goto('/documenti?tab=carica');

    // Form visible
    await expect(page.locator('select').first()).toBeVisible({ timeout: 10_000 });

    // No "Firma richiesta" toggle (non-admin)
    await expect(page.locator('label:has-text("Firma richiesta")')).not.toBeVisible();

    // Select CONTRATTO_OCCASIONALE from grouped dropdown
    await page.locator('select').first().selectOption('CONTRATTO_OCCASIONALE');

    // Toggle still absent after contratto selected (non-admin)
    await expect(page.locator('label:has-text("Firma richiesta")')).not.toBeVisible();

    // Fill titolo
    await page.fill('input[placeholder*="Contratto"]', 'Contratto Collab UAT');

    // Upload PDF
    const pdfPath = path.join(tempDir, 'contratto-collab.pdf');
    fs.writeFileSync(pdfPath, '%PDF-1.4 collab contract UAT');
    await page.locator('input[type="file"]').setInputFiles(pdfPath);

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/documents') && r.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      page.click('button:has-text("Carica documento")'),
    ]);

    await expect(page.locator('text=Documento caricato con successo')).toBeVisible({ timeout: 10_000 });

    // Verify DB: stato_firma must be NON_RICHIESTO (server-enforced)
    const doc = await dbFirst<{ id: string; stato_firma: string }>(
      'documents',
      `collaborator_id=eq.${COLLABORATOR_ID}&tipo=eq.CONTRATTO_OCCASIONALE&titolo=eq.Contratto Collab UAT&select=id,stato_firma`,
    );
    expect(doc).not.toBeNull();
    expect(doc!.stato_firma).toBe('NON_RICHIESTO');
    collabContractId = doc!.id;

    console.log(`  ✅ S7 — CONTRATTO ${collabContractId} caricato, stato_firma=NON_RICHIESTO`);
  });

  // ── S8 — Collaboratore tenta secondo CONTRATTO → errore 409 ───────────────
  test('S8 — Collaboratore: secondo CONTRATTO → errore "contratto già esistente"', async ({ page }) => {
    await login(page, 'collaboratore');
    await page.goto('/documenti?tab=carica');

    await page.locator('select').first().selectOption('CONTRATTO_OCCASIONALE');
    await page.fill('input[placeholder*="Contratto"]', 'Contratto Secondo UAT');

    const pdfPath = path.join(tempDir, 'contratto-secondo.pdf');
    fs.writeFileSync(pdfPath, '%PDF-1.4 second contract UAT');
    await page.locator('input[type="file"]').setInputFiles(pdfPath);

    await page.click('button:has-text("Carica documento")');

    // Error div visible with message about existing contract
    const errorDiv = page.locator('div.text-red-400').first();
    await expect(errorDiv).toBeVisible({ timeout: 10_000 });
    await expect(errorDiv).toContainText('contratto');

    console.log('  ✅ S8 — Secondo CONTRATTO bloccato con messaggio errore visibile');
  });

  // ── S10 — Admin carica CONTRATTO_OCCASIONALE con DA_FIRMARE ─────────────
  test('S10 — Admin: carica CONTRATTO_OCCASIONALE DA_FIRMARE, DB verifica stato', async ({ page }) => {
    // Remove all docs for this collaborator before admin upload (collab contract from S7 + seeded docs)
    const stray = await dbGet<{ id: string }>('documents',
      `collaborator_id=eq.${COLLABORATOR_ID}&select=id`);
    for (const d of stray) await dbDelete('documents', `id=eq.${d.id}`);

    await login(page, 'admin');
    await page.goto('/documenti?tab=carica');

    // Select collaboratore (first select — admin form)
    await page.locator('select').first().selectOption(COLLABORATOR_ID);

    // Select CONTRATTO_OCCASIONALE (second select — tipo)
    await page.locator('select').nth(1).selectOption('CONTRATTO_OCCASIONALE');

    // "Firma richiesta" toggle appears for admin + CONTRATTO
    await expect(page.locator('label:has-text("Firma richiesta")')).toBeVisible({ timeout: 5_000 });

    // Select DA_FIRMARE
    await page.locator('input[type="radio"][value="DA_FIRMARE"]').check();

    await page.fill('input[placeholder*="Contratto"]', 'Contratto Admin Occasionale UAT');

    const pdfPath = path.join(tempDir, 'contratto-admin.pdf');
    fs.writeFileSync(pdfPath, '%PDF-1.4 admin occasionale contract UAT');
    await page.locator('input[type="file"]').setInputFiles(pdfPath);

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/documents') && r.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      page.click('button:has-text("Carica documento")'),
    ]);

    await expect(page.locator('text=Documento caricato con successo')).toBeVisible({ timeout: 10_000 });

    // Verify DB: stato_firma = DA_FIRMARE
    const doc = await dbFirst<{ id: string; stato_firma: string }>(
      'documents',
      `collaborator_id=eq.${COLLABORATOR_ID}&tipo=eq.CONTRATTO_OCCASIONALE&macro_type=eq.CONTRATTO&select=id,stato_firma`,
    );
    expect(doc).not.toBeNull();
    expect(doc!.stato_firma).toBe('DA_FIRMARE');
    adminContractId = doc!.id;

    console.log(`  ✅ S10 — CONTRATTO_OCCASIONALE ${adminContractId} caricato, stato_firma=DA_FIRMARE`);
  });

  // ── S13 — File selezionato, checkbox non spuntata → pulsante disabled ─────
  test('S13 — Collaboratore: file senza checkbox → "Invia documento firmato" disabled', async ({ page }) => {
    await login(page, 'collaboratore');
    await page.goto(`/documenti/${adminContractId}`);

    const signBtn = page.locator('button:has-text("Invia documento firmato")');
    await expect(signBtn).toBeVisible({ timeout: 10_000 });
    await expect(signBtn).toBeDisabled();

    // Select a file
    const pdfPath = path.join(tempDir, 'firmato-test.pdf');
    fs.writeFileSync(pdfPath, '%PDF-1.4 signed UAT');
    await page.locator('input[type="file"]').setInputFiles(pdfPath);

    // Checkbox appears, button still disabled
    await expect(page.locator('input[type="checkbox"]')).toBeVisible({ timeout: 5_000 });
    await expect(signBtn).toBeDisabled();

    console.log('  ✅ S13 — Senza checkbox, pulsante Invia è disabled');
  });

  // ── S14 — File + checkbox → FIRMATO nel DB ────────────────────────────────
  test('S14 — Collaboratore: file + checkbox → documento FIRMATO nel DB', async ({ page }) => {
    await login(page, 'collaboratore');
    await page.goto(`/documenti/${adminContractId}`);

    // Select file
    const pdfPath = path.join(tempDir, 'firmato-test.pdf');
    if (!fs.existsSync(pdfPath)) fs.writeFileSync(pdfPath, '%PDF-1.4 signed UAT');
    await page.locator('input[type="file"]').setInputFiles(pdfPath);

    // Check confirmation checkbox
    await page.locator('input[type="checkbox"]').check();

    const signBtn = page.locator('button:has-text("Invia documento firmato")');
    await expect(signBtn).toBeEnabled({ timeout: 5_000 });

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/sign') && r.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      signBtn.click(),
    ]);

    await expect(page.locator('text=Documento firmato inviato correttamente')).toBeVisible({ timeout: 10_000 });

    // Verify DB
    const doc = await dbFirst<{ stato_firma: string; signed_at: string | null }>(
      'documents',
      `id=eq.${adminContractId}&select=stato_firma,signed_at`,
    );
    expect(doc!.stato_firma).toBe('FIRMATO');
    expect(doc!.signed_at).not.toBeNull();

    console.log('  ✅ S14 — DB: stato_firma=FIRMATO, signed_at valorizzato');
  });

  // ── S12 — Admin elimina contratto via UI ──────────────────────────────────
  test('S12 — Admin: elimina contratto → redirect /documenti, assente nel DB', async ({ page }) => {
    await login(page, 'admin');
    await page.goto(`/documenti/${adminContractId}`);

    // Delete section visible (admin + CONTRATTO)
    await expect(page.locator('text=Elimina contratto').first()).toBeVisible({ timeout: 10_000 });

    // Accept the confirm dialog
    page.once('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("Elimina contratto")');

    // Redirect to /documenti
    await page.waitForURL('**/documenti', { timeout: 15_000 });

    // Document no longer in DB
    const doc = await dbFirst('documents', `id=eq.${adminContractId}&select=id`);
    expect(doc).toBeNull();
    adminContractId = ''; // mark as deleted

    console.log('  ✅ S12 — Contratto eliminato, redirect /documenti, rimosso da DB');
  });

});
