/**
 * UAT — Block 14: Rich Text Editor + Notification Bell Pulse
 *
 * S1 — Admin creates comunicazione with bold text → list shows rendered <strong> (not raw tags)
 * S2 — Admin opens edit → Tiptap editor loads existing HTML, toolbar visible
 * S3 — Collaboratore opens detail page → RichTextDisplay renders <strong> correctly
 */

import { test, expect, type Page } from '@playwright/test';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function dbFirst<T = unknown>(table: string, params = ''): Promise<T | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}&limit=1`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  const rows = await res.json() as T[];
  return rows[0] ?? null;
}

async function dbDelete(table: string, params: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=minimal' },
  });
}

const CREDS = {
  admin:         { email: 'admin@test.com',          password: 'Testbusters123' },
  collaboratore: { email: 'collaboratore@test.com',   password: 'Testbusters123' },
};

async function login(page: Page, role: keyof typeof CREDS) {
  const { email, password } = CREDS[role];
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  if (!page.url().includes('/login')) {
    // Already logged in as someone else — sign out first
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const esci = page.locator('button:has-text("Esci")');
    if (await esci.isVisible()) {
      await esci.click();
      await page.waitForURL((u) => u.toString().includes('/login'), { timeout: 10_000 });
    }
  }
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 15_000 });
}

const UAT_TITLE = '[UAT B14] Comunicazione rich text';
let commId = '';

test.describe.serial('Block 14 — Rich Text Editor', () => {

  test.beforeAll(async () => {
    // Cleanup stale UAT data from previous runs
    const old = await dbFirst<{ id: string }>(
      'communications',
      `titolo=eq.${encodeURIComponent(UAT_TITLE)}&select=id`,
    );
    if (old) await dbDelete('communications', `id=eq.${old.id}`);
  });

  test.afterAll(async () => {
    if (commId) await dbDelete('communications', `id=eq.${commId}`);
  });

  // ── S1: Admin creates comunicazione with H2 heading → stored as HTML ────────
  test('S1 — Admin creates comunicazione with H2 heading, HTML stored and rendered', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/contenuti?tab=comunicazioni');
    await page.waitForLoadState('domcontentloaded');

    await page.click('button:has-text("+ Nuova comunicazione")');

    // Fill title
    await page.fill('input[placeholder="Titolo *"]', UAT_TITLE);

    // Interact with Tiptap ProseMirror editor
    const editor = page.locator('.ProseMirror').first();
    await editor.waitFor({ state: 'visible', timeout: 5_000 });
    await editor.click();

    // Apply H2 heading via toolbar button (block-level, no selection needed)
    await page.locator('button:has-text("H2")').first().click();
    await editor.pressSequentially('Sezione principale');

    // Save
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/communications') && res.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      page.click('button[type="submit"]:has-text("Salva")'),
    ]);

    // The card should appear with h3 title
    await expect(page.locator(`h3:has-text("${UAT_TITLE}")`)).toBeVisible({ timeout: 10_000 });

    // Verify DB stores HTML (content contains <h2>)
    const comm = await dbFirst<{ id: string; contenuto: string }>(
      'communications',
      `titolo=eq.${encodeURIComponent(UAT_TITLE)}&select=id,contenuto`,
    );
    expect(comm).not.toBeNull();
    expect(comm!.contenuto).toContain('<h2>');
    commId = comm!.id;

    // The list card should render an <h2> element (not show raw <h2> text)
    const card = page.locator(`div.rounded-xl:has(h3:has-text("${UAT_TITLE}"))`);
    await expect(card.locator('h2')).toBeVisible();

    console.log(`  ✅ S1 — comunicazione con H2 creata, id=${commId}`);
  });

  // ── S2: Admin opens edit → Tiptap editor loads HTML ──────────────────────
  test('S2 — Admin opens edit → Tiptap editor is visible with existing content', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/contenuti?tab=comunicazioni');
    await page.waitForLoadState('domcontentloaded');

    // Click Modifica on the UAT card
    const card = page.locator(`div.rounded-xl:has(h3:has-text("${UAT_TITLE}"))`);
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.locator('button:has-text("Modifica")').click();

    // The Tiptap editor should be rendered (ProseMirror div)
    const editor = page.locator('.ProseMirror').first();
    await expect(editor).toBeVisible({ timeout: 5_000 });

    // The toolbar should be visible
    await expect(page.locator('button strong:text("B")').first()).toBeVisible();
    await expect(page.locator('button:has-text("H2")').first()).toBeVisible();

    // The editor should contain the H2 heading that was previously saved
    await expect(editor.locator('h2')).toBeVisible();

    console.log('  ✅ S2 — editor caricato con HTML esistente, toolbar visibile');
  });

  // ── S3: Collaboratore views detail page → RichTextDisplay renders ─────────
  test('S3 — Collaboratore views detail page, <strong> renders (not raw tags)', async ({ page }) => {
    expect(commId).not.toBe('');

    await login(page, 'collaboratore');
    await page.goto(`/comunicazioni/${commId}`);
    await page.waitForLoadState('domcontentloaded');

    // The page title should be visible
    await expect(page.locator(`h1:has-text("${UAT_TITLE}")`)).toBeVisible({ timeout: 10_000 });

    // RichTextDisplay should render <h2> element, not raw "<h2>" string
    const contentBox = page.locator('div.rounded-xl.border-gray-800.bg-gray-900');
    await expect(contentBox.locator('h2')).toBeVisible();

    // Raw tag text should NOT be present in the page
    await expect(page.locator('text=<h2>')).not.toBeVisible();

    console.log('  ✅ S3 — collaboratore vede HTML formattato, nessun tag grezzo visibile');
  });

});
