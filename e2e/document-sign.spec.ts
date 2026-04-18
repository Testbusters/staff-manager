/**
 * T3.2 — Document sign flow e2e
 *
 * Seed a DA_FIRMARE document via service role, then:
 * S1: Verify document exists in DB with stato_firma=DA_FIRMARE
 * S2: Collaboratore sees the document in /profilo?tab=documenti
 * S3: Collaboratore signs via download+upload → DB: FIRMATO
 * S4: Verify document is FIRMATO in DB with signed_at set
 *
 * Roles: collaboratore_tb
 */
import { test, expect } from '@playwright/test';
import { login, dbFirst, dbDelete, dbPost } from './helpers';
import * as fs from 'fs';
import * as path from 'path';

const PREFIX = 'E2E-DOC-SIGN';
const COLLAB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26';
const COLLAB_USER_ID = '80238f5b-78d1-48a3-ac5a-4cf65126a111';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test.describe.serial('Document sign flow', () => {
  let documentId: string;

  test.beforeAll(async () => {
    // Cleanup any leftovers from previous runs
    const leftoverUrl = new URL(`${SUPABASE_URL}/rest/v1/documents`);
    leftoverUrl.searchParams.set('titolo', `like.${PREFIX}%`);
    leftoverUrl.searchParams.set('select', 'id');
    const leftRes = await fetch(leftoverUrl.toString(), {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const leftovers: { id: string }[] = await leftRes.json();
    for (const doc of leftovers) {
      await dbDelete('documents', { 'id': `eq.${doc.id}` });
    }

    // Read the test PDF fixture
    const pdfPath = path.resolve(__dirname, 'fixtures/test-document.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);

    // Upload PDF to Supabase Storage (documents bucket, private)
    const storagePath = `${COLLAB_USER_ID}/e2e-test/${PREFIX}-cu.pdf`;
    await fetch(`${SUPABASE_URL}/storage/v1/object/documents/${storagePath}`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/pdf',
        'x-upsert': 'true',
      },
      body: pdfBuffer,
    });

    // Create document record via service role
    const doc = await dbPost<{ id: string }>('documents', {
      collaborator_id: COLLAB_ID,
      tipo: 'CU',
      anno: 2026,
      titolo: `${PREFIX}-CU-Test`,
      stato_firma: 'DA_FIRMARE',
      file_original_url: storagePath,
      file_original_name: `${PREFIX}-cu.pdf`,
    });
    documentId = doc.id;
  });

  test.afterAll(async () => {
    if (documentId) {
      await dbDelete('documents', { 'id': `eq.${documentId}` });
    }
    // Cleanup storage files
    for (const suffix of ['cu.pdf']) {
      const storagePath = `${COLLAB_USER_ID}/e2e-test/${PREFIX}-${suffix}`;
      await fetch(`${SUPABASE_URL}/storage/v1/object/documents/${storagePath}`, {
        method: 'DELETE',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
    }
    // Try to clean up the signed file too
    if (documentId) {
      const signedPath = `${COLLAB_USER_ID}/${documentId}`;
      // List and delete all files under this path
      const listUrl = `${SUPABASE_URL}/storage/v1/object/list/documents`;
      const listRes = await fetch(listUrl, {
        method: 'POST',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prefix: signedPath }),
      });
      const files: { name: string }[] = await listRes.json().catch(() => []);
      for (const f of files) {
        await fetch(`${SUPABASE_URL}/storage/v1/object/documents/${signedPath}/${f.name}`, {
          method: 'DELETE',
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        });
      }
    }
    // Cleanup any DB leftovers
    const leftoverUrl = new URL(`${SUPABASE_URL}/rest/v1/documents`);
    leftoverUrl.searchParams.set('titolo', `like.${PREFIX}%`);
    leftoverUrl.searchParams.set('select', 'id');
    const leftRes = await fetch(leftoverUrl.toString(), {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const leftovers: { id: string }[] = await leftRes.json();
    for (const doc of leftovers) {
      await dbDelete('documents', { 'id': `eq.${doc.id}` });
    }
  });

  test('S1 — Documento DA_FIRMARE esiste nel DB', async () => {
    const doc = await dbFirst<{ id: string; stato_firma: string; titolo: string }>(
      'documents',
      {
        'id': `eq.${documentId}`,
        'select': 'id,stato_firma,titolo',
      },
    );
    expect(doc).toBeTruthy();
    expect(doc!.stato_firma).toBe('DA_FIRMARE');
    expect(doc!.titolo).toBe(`${PREFIX}-CU-Test`);
  });

  test('S2 — Collaboratore vede il documento nella lista', async ({ page }) => {
    test.skip(!documentId, 'S1 failed — no document created');

    await login(page, 'collaboratore_tb');
    await page.waitForLoadState('domcontentloaded');

    await page.goto('/profilo?tab=documenti');
    await page.waitForLoadState('domcontentloaded');

    // Should see the document title in the list
    await expect(page.locator(`text=${PREFIX}-CU-Test`)).toBeVisible({ timeout: 10_000 });
  });

  test('S3 — Collaboratore firma il documento via download+upload', async ({ page }) => {
    test.skip(!documentId, 'S1 failed — no document created');
    test.setTimeout(60_000);

    await login(page, 'collaboratore_tb');
    await page.waitForLoadState('domcontentloaded');

    // Navigate to document detail
    await page.goto(`/documenti/${documentId}`);
    await page.waitForLoadState('domcontentloaded');

    // Should see signing options
    await expect(page.locator('text=Scarica e firma')).toBeVisible({ timeout: 10_000 });

    // Select "Scarica e firma" mode
    await page.click('text=Scarica e firma');

    // Click "Procedi" button
    const proceedBtn = page.locator('button').filter({ hasText: /Procedi/i });
    await expect(proceedBtn).toBeVisible({ timeout: 5_000 });
    await proceedBtn.click();

    // Upload the signed PDF (reuse the same test fixture)
    const pdfPath = path.resolve(__dirname, 'fixtures/test-document.pdf');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(pdfPath);

    // Check the confirmation checkbox
    const checkbox = page.getByRole('checkbox');
    await checkbox.check();

    // Click "Invia documento firmato"
    const submitBtn = page.locator('button').filter({ hasText: /Invia documento firmato/i });
    await expect(submitBtn).toBeEnabled({ timeout: 5_000 });

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/documents') && r.url().includes('sign'),
        { timeout: 15_000 },
      ),
      submitBtn.click(),
    ]);

    await page.waitForTimeout(2000);

    // Verify DB state
    const doc = await dbFirst<{ stato_firma: string }>('documents', {
      'id': `eq.${documentId}`,
      'select': 'stato_firma',
    });
    expect(doc!.stato_firma).toBe('FIRMATO');
  });

  test('S4 — Documento FIRMATO con signed_at nel DB', async () => {
    test.skip(!documentId, 'S1 failed — no document created');

    const doc = await dbFirst<{ stato_firma: string; signed_at: string | null; file_firmato_url: string | null }>(
      'documents',
      {
        'id': `eq.${documentId}`,
        'select': 'stato_firma,signed_at,file_firmato_url',
      },
    );
    expect(doc).toBeTruthy();
    expect(doc!.stato_firma).toBe('FIRMATO');
    expect(doc!.signed_at).toBeTruthy();
    expect(doc!.file_firmato_url).toBeTruthy();
  });
});
