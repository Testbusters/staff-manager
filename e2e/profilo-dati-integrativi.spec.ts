import { test, expect } from '@playwright/test';
import { login, dbFirst, dbPatch } from './helpers';

type Collab = {
  id: string;
  regime_alimentare: 'onnivoro' | 'vegetariano' | 'vegano';
  ha_allergie_alimentari: boolean;
  allergie_note: string | null;
  spedizione_nazione: string;
  spedizione_usa_residenza: boolean;
};

const COLLAB_TB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26';

test.describe.serial('Profilo dati integrativi UAT', () => {
  let snapshot: Collab | null = null;

  test.beforeAll(async () => {
    snapshot = await dbFirst<Collab>('collaborators', { id: `eq.${COLLAB_TB_ID}` });
  });

  test.afterAll(async () => {
    if (!snapshot) return;
    await dbPatch('collaborators', { id: `eq.${COLLAB_TB_ID}` }, {
      regime_alimentare: snapshot.regime_alimentare,
      ha_allergie_alimentari: snapshot.ha_allergie_alimentari,
      allergie_note: snapshot.allergie_note,
      spedizione_nazione: snapshot.spedizione_nazione,
      spedizione_usa_residenza: snapshot.spedizione_usa_residenza,
    });
  });

  test('S1 — Collaboratore /profilo mostra 3 nuove sezioni collassate', async ({ page }) => {
    await login(page, 'collaboratore_tb');
    await page.goto('/profilo');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { name: 'Documento identità' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Alimentazione' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Indirizzo di spedizione' })).toBeVisible();

    const tipoDocTrigger = page.getByRole('heading', { name: 'Documento identità' }).locator('xpath=ancestor::*[@role="button"][1]');
    await tipoDocTrigger.click();
    await expect(page.getByText('Tipo documento')).toBeVisible();
    await expect(page.getByText('Numero documento')).toBeVisible();
    await expect(page.getByText('Scadenza', { exact: true })).toBeVisible();
  });

  test('S2 — Toggle allergie mostra Alert GDPR + campo note + consenso', async ({ page }) => {
    await login(page, 'collaboratore_tb');
    await page.goto('/profilo');
    await page.waitForLoadState('domcontentloaded');

    const alimTrigger = page.getByRole('heading', { name: 'Alimentazione' }).locator('xpath=ancestor::*[@role="button"][1]');
    await alimTrigger.click();

    const allergieLabel = page.locator('label', { hasText: 'Ho allergie o intolleranze alimentari' });
    await expect(allergieLabel).toBeVisible();

    await expect(page.getByText('Trattamento dati sanitari')).not.toBeVisible();

    await allergieLabel.click();
    await expect(page.getByText('Trattamento dati sanitari')).toBeVisible({ timeout: 3_000 });
    await expect(page.getByPlaceholder(/Lattosio/)).toBeVisible();
    await expect(page.getByText(/Acconsento al trattamento dei dati sulla salute/)).toBeVisible();

    await allergieLabel.click();
    await expect(page.getByText('Trattamento dati sanitari')).not.toBeVisible({ timeout: 3_000 });
  });

  test('S3 — Cambio regime_alimentare persiste al salvataggio', async ({ page }) => {
    await login(page, 'collaboratore_tb');
    await page.goto('/profilo');
    await page.waitForLoadState('domcontentloaded');

    const alimTrigger = page.getByRole('heading', { name: 'Alimentazione' }).locator('xpath=ancestor::*[@role="button"][1]');
    await alimTrigger.click();

    const regimeTrigger = page.locator('button[role="combobox"]').filter({ hasText: /Onnivoro|Vegetariano|Vegano/ }).first();
    await regimeTrigger.click();
    await page.getByRole('option', { name: 'Vegetariano' }).click();

    const saveBtn = page.getByRole('button', { name: 'Salva modifiche' });
    await expect(saveBtn).toBeVisible({ timeout: 3_000 });

    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/profile') && r.request().method() === 'PATCH', { timeout: 15_000 }),
      saveBtn.click(),
    ]);

    const row = await dbFirst<Collab>('collaborators', { id: `eq.${COLLAB_TB_ID}` });
    expect(row?.regime_alimentare).toBe('vegetariano');
  });

  test('S4 — Spedizione alternativa rivela 5 campi richiesti', async ({ page }) => {
    await login(page, 'collaboratore_tb');
    await page.goto('/profilo');
    await page.waitForLoadState('domcontentloaded');

    const spedTrigger = page.getByRole('heading', { name: 'Indirizzo di spedizione' }).locator('xpath=ancestor::*[@role="button"][1]');
    await spedTrigger.click();

    const switchLabel = page.locator('label', { hasText: 'Usa lo stesso indirizzo della residenza' });
    await expect(switchLabel).toBeVisible();
    await switchLabel.click();

    await expect(page.getByText('Indirizzo', { exact: false }).first()).toBeVisible();
    await expect(page.locator('input[name="spedizione_civico"]')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('input[name="spedizione_cap"]')).toBeVisible();
    await expect(page.locator('input[name="spedizione_citta"]')).toBeVisible();
    await expect(page.locator('input[name="spedizione_provincia"]')).toBeVisible();
  });

  test('S5 — Admin crea utente: sezione Documento identità appare dopo scelta community', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/impostazioni?tab=utenti');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Crea nuovo utente')).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText('Documento identità')).not.toBeVisible();

    const communityTrigger = page.locator('button[role="combobox"]').filter({ hasText: /Seleziona community|Testbusters|Peer4Med/ }).first();
    await communityTrigger.click();
    await page.getByRole('option').first().click();

    const docButton = page.locator('button[aria-label="Mostra dati documento identità"]');
    await expect(docButton).toBeVisible({ timeout: 5_000 });

    await docButton.click();
    await expect(page.getByText('Tipo documento')).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText('Numero documento')).toBeVisible();
  });
});
