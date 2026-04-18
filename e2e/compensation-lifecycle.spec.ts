/**
 * T3.1 — Compensation lifecycle e2e
 *
 * Full workflow: responsabile creates → collab sees → admin approves → admin liquidates
 * Roles: responsabile_compensi, collaboratore_tb, admin
 */
import { test, expect } from '@playwright/test';
import { login, db, dbDelete, dbFirst } from './helpers';

const PREFIX = 'E2E-COMP-LIFE';
const COLLAB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26';

test.describe.serial('Compensation lifecycle', () => {
  let compensationId: string;

  test.afterAll(async () => {
    // Cleanup: delete test compensation + history
    if (compensationId) {
      await dbDelete('compensation_history', { 'compensation_id': `eq.${compensationId}` });
      await dbDelete('compensations', { 'id': `eq.${compensationId}` });
    }
    // Also cleanup any leftovers by prefix
    const leftovers = await db<{ id: string }>('compensations', {
      'nome_servizio_ruolo': `like.${PREFIX}%`,
      'select': 'id',
    });
    for (const r of leftovers) {
      await dbDelete('compensation_history', { 'compensation_id': `eq.${r.id}` });
      await dbDelete('compensations', { 'id': `eq.${r.id}` });
    }
  });

  test('S1 — Responsabile crea compenso via wizard', async ({ page }) => {
    test.setTimeout(60_000);
    await login(page, 'responsabile_compensi');
    await page.waitForLoadState('domcontentloaded');

    // Navigate to create wizard
    await page.goto('/approvazioni/carica');
    await page.waitForLoadState('domcontentloaded');

    // Step 1: Search for collaborator
    await page.fill('input[placeholder*="Cerca"]', 'Collaboratore Test');
    await page.waitForTimeout(1500);

    // Click "Seleziona →" on the matching row (it's a shadcn Button variant="ghost")
    await page.click('button:has-text("Seleziona")');

    // Step 2: Fill compensation data
    // Wait for step 2 to render
    await expect(page.locator('text=Nome servizio / Ruolo')).toBeVisible({ timeout: 5_000 });

    // nome_servizio_ruolo
    await page.fill('input[placeholder*="Compenso lezioni"]', `${PREFIX}-docenza`);

    // data_competenza — DatePicker: click trigger button, then select a day
    const dateBtn = page.locator('button').filter({ hasText: 'Seleziona data' });
    await dateBtn.click();
    // Pick the 15th day of the current month from the calendar popover
    const dayCell = page.locator('[role="gridcell"] button').filter({ hasText: /^15$/ }).first();
    await dayCell.click();
    // Close calendar popover by pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // competenza — Radix Select: trigger has role="combobox"
    const selectTrigger = page.getByRole('combobox');
    await expect(selectTrigger).toBeVisible({ timeout: 5_000 });
    await selectTrigger.click();
    // Select "Corsi" from the dropdown
    await page.getByRole('option', { name: 'Corsi' }).click();
    await page.waitForTimeout(300);

    // importo_lordo
    await page.fill('input[type="number"]', '100');

    // Click "Avanti →"
    await page.click('button:has-text("Avanti")');
    await page.waitForTimeout(500);

    // Step 3: Confirm — click "Crea compenso"
    await expect(page.locator('button:has-text("Crea compenso")')).toBeVisible({ timeout: 5_000 });

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/compensations') && r.request().method() === 'POST' && !r.url().includes('transition'),
        { timeout: 15_000 },
      ),
      page.click('button:has-text("Crea compenso")'),
    ]);

    // Wait for navigation/success
    await page.waitForTimeout(2000);

    // Verify in DB
    const comp = await dbFirst<{ id: string; stato: string; nome_servizio_ruolo: string }>(
      'compensations',
      {
        'collaborator_id': `eq.${COLLAB_ID}`,
        'nome_servizio_ruolo': `eq.${PREFIX}-docenza`,
        'select': 'id,stato,nome_servizio_ruolo',
        'order': 'created_at.desc',
      },
    );

    expect(comp).toBeTruthy();
    expect(comp!.stato).toBe('IN_ATTESA');
    compensationId = comp!.id;
  });

  test('S2 — Collaboratore vede il compenso nella lista', async ({ page }) => {
    test.skip(!compensationId, 'S1 failed — no compensation created');

    await login(page, 'collaboratore_tb');
    await page.waitForLoadState('domcontentloaded');

    await page.goto('/compensi');
    await page.waitForLoadState('domcontentloaded');

    // Should see the compensation in the list
    const compText = page.locator(`text=${PREFIX}-docenza`);
    await expect(compText).toBeVisible({ timeout: 10_000 });

    // Status badge should show IN_ATTESA
    const badge = page.locator('[data-stato="IN_ATTESA"]').first();
    await expect(badge).toBeVisible();
  });

  test('S3 — Admin approva il compenso', async ({ page }) => {
    test.skip(!compensationId, 'S1 failed — no compensation created');

    await login(page, 'admin');
    await page.waitForLoadState('domcontentloaded');

    // Navigate directly to compensation detail
    await page.goto(`/compensi/${compensationId}`);
    await page.waitForLoadState('domcontentloaded');

    // Click "Approva" button
    await expect(page.locator('button:has-text("Approva")')).toBeVisible({ timeout: 10_000 });

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/compensations') && r.url().includes('transition'),
        { timeout: 15_000 },
      ),
      page.click('button:has-text("Approva")'),
    ]);

    await page.waitForTimeout(1500);

    // Verify DB state
    const comp = await dbFirst<{ stato: string }>('compensations', {
      'id': `eq.${compensationId}`,
      'select': 'stato',
    });
    expect(comp!.stato).toBe('APPROVATO');
  });

  test('S4 — Admin liquida il compenso', async ({ page }) => {
    test.skip(!compensationId, 'S1 failed — no compensation created');

    await login(page, 'admin');
    await page.waitForLoadState('domcontentloaded');

    await page.goto(`/compensi/${compensationId}`);
    await page.waitForLoadState('domcontentloaded');

    // Click "Segna come liquidato" button
    await expect(page.locator('button:has-text("Segna come liquidato")')).toBeVisible({ timeout: 10_000 });
    await page.click('button:has-text("Segna come liquidato")');

    // Fill payment reference in dialog
    const dialog = page.locator('[data-slot="dialog-content"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Fill optional payment reference
    const refInput = dialog.locator('input[type="text"]');
    await refInput.fill('E2E-BANK-REF-001');

    // Click "Conferma liquidazione"
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/compensations') && r.url().includes('transition'),
        { timeout: 15_000 },
      ),
      dialog.locator('button:has-text("Conferma liquidazione")').click(),
    ]);

    await page.waitForTimeout(1500);

    // Verify DB state
    const comp = await dbFirst<{ stato: string }>('compensations', {
      'id': `eq.${compensationId}`,
      'select': 'stato',
    });
    expect(comp!.stato).toBe('LIQUIDATO');
  });

  test('S5 — Collaboratore vede stato aggiornato a LIQUIDATO', async ({ page }) => {
    test.skip(!compensationId, 'S1 failed — no compensation created');

    await login(page, 'collaboratore_tb');
    await page.waitForLoadState('domcontentloaded');

    await page.goto(`/compensi/${compensationId}`);
    await page.waitForLoadState('domcontentloaded');

    // Status badge should show LIQUIDATO
    const badge = page.locator('[data-stato="LIQUIDATO"]');
    await expect(badge).toBeVisible({ timeout: 10_000 });
  });
});
