import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe.serial('RHF Migration UAT', () => {
  // S1 — Login form works (regression smoke)
  test('S1 — Login form accepts valid credentials', async ({ page }) => {
    await login(page, 'collaboratore_tb');
    await page.waitForLoadState('domcontentloaded');
    // Should land on dashboard (not /login)
    expect(page.url()).not.toContain('/login');
  });

  // S2 — Login button disabled when fields are empty (RHF watch guards submit)
  test('S2 — Login button disabled when fields empty', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    const submitBtn = page.locator('button[type="submit"]');
    // Empty fields — button should be disabled
    await expect(submitBtn).toBeDisabled();
    // Fill email only — still disabled
    await page.fill('input[type="email"]', 'test@test.com');
    await expect(submitBtn).toBeDisabled();
    // Fill password too — button enabled
    await page.fill('input[type="password"]', 'password');
    await expect(submitBtn).toBeEnabled();
  });

  // S3 — TicketForm shows inline validation errors on empty submit (Wave 1 canary)
  test('S3 — TicketForm inline validation errors', async ({ page }) => {
    await login(page, 'collaboratore_tb');
    await page.goto('/ticket/nuova');
    await page.waitForLoadState('domcontentloaded');

    // Clear oggetto (subject) and submit — categoria (Select) starts empty, oggetto starts empty
    await page.click('button[type="submit"]');

    // FormMessage elements should appear for required fields
    const messages = page.locator('[data-slot="form-message"]');
    await expect(messages.first()).toBeVisible({ timeout: 5_000 });

    // At least 2 validation messages: categoria + oggetto
    const count = await messages.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  // S4 — ProfileForm loads with collaborator data and shows save bar on edit
  test('S4 — ProfileForm loads data and shows save bar on edit', async ({ page }) => {
    await login(page, 'collaboratore_tb');
    await page.goto('/profilo');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the form to populate — nome field should have a value
    const nomeInput = page.locator('input[name="nome"]');
    await expect(nomeInput).toBeVisible({ timeout: 10_000 });
    const nomeValue = await nomeInput.inputValue();
    expect(nomeValue.length).toBeGreaterThan(0);

    // Save bar should NOT be visible (form not dirty)
    await expect(page.getByText('Salva modifiche')).not.toBeVisible();

    // Modify a field to trigger isDirty
    await nomeInput.fill(nomeValue + 'x');

    // Save bar should appear
    await expect(page.getByText('Salva modifiche')).toBeVisible({ timeout: 3_000 });

    // Revert to original value — save bar should disappear
    await nomeInput.fill(nomeValue);
    await expect(page.getByText('Salva modifiche')).not.toBeVisible({ timeout: 3_000 });
  });

  // S5 — ProfileForm shows inline validation on required fields after submit attempt
  test('S5 — ProfileForm inline validation on required fields', async ({ page }) => {
    await login(page, 'collaboratore_tb');
    await page.goto('/profilo');
    await page.waitForLoadState('domcontentloaded');

    const nomeInput = page.locator('input[name="nome"]');
    await expect(nomeInput).toBeVisible({ timeout: 10_000 });

    // Clear nome (required) to make form dirty + invalid
    await nomeInput.fill('');

    // Save bar appears (dirty) — click submit to trigger validation
    const saveBtn = page.getByText('Salva modifiche');
    await expect(saveBtn).toBeVisible({ timeout: 3_000 });
    await saveBtn.click();

    // After failed submit, aria-invalid should be set on the nome input
    await expect(nomeInput).toHaveAttribute('aria-invalid', 'true', { timeout: 5_000 });
    // FormMessage should appear somewhere on the page
    const messages = page.locator('[data-slot="form-message"]');
    await expect(messages.first()).toBeVisible({ timeout: 5_000 });
  });

  // S6 — ExpenseForm wizard step validation blocks advancement
  test('S6 — ExpenseForm step validation blocks empty advancement', async ({ page }) => {
    await login(page, 'collaboratore_tb');
    await page.goto('/rimborsi/nuova');
    await page.waitForLoadState('domcontentloaded');

    // Step 1 should be visible
    await expect(page.getByText('Dati rimborso')).toBeVisible({ timeout: 10_000 });

    // Try to advance without filling required fields
    await page.click('button:has-text("Avanti")');

    // Should still be on step 1 (not step 2) — inline errors visible
    await expect(page.getByText('Dati rimborso')).toBeVisible();
    const messages = page.locator('[data-slot="form-message"]');
    await expect(messages.first()).toBeVisible({ timeout: 5_000 });
  });
});
