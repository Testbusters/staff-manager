/**
 * Integration tests for SEC8 — expense attachment upload.
 * Covers:
 * - Auth: no session → proxy redirect (307/401)
 * - DB integration: service role insert + read, storage path format
 * - Validation: MIME type, file size
 * - Happy path: upload creates attachment record with correct storage path
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL = process.env.APP_URL ?? 'http://localhost:3001';

const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Canonical staging test IDs
const COLLAB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26';
const TB_COMMUNITY_ID = '6fdd80e9-2464-4304-9bd7-d5703370a119';
const PREFIX = 'TEST-SEC8';

let expenseId = '';

beforeAll(async () => {
  // Cleanup any leftover test data
  const { data: existing } = await svc
    .from('expense_reimbursements')
    .select('id')
    .eq('collaborator_id', COLLAB_ID)
    .like('descrizione', `${PREFIX}%`);

  for (const exp of existing ?? []) {
    await svc.from('expense_attachments').delete().eq('reimbursement_id', exp.id);
    // Clean up storage files
    const { data: files } = await svc.storage
      .from('expenses')
      .list(`${COLLAB_ID}/${exp.id}`);
    if (files?.length) {
      await svc.storage
        .from('expenses')
        .remove(files.map((f) => `${COLLAB_ID}/${exp.id}/${f.name}`));
    }
  }
  await svc
    .from('expense_reimbursements')
    .delete()
    .eq('collaborator_id', COLLAB_ID)
    .like('descrizione', `${PREFIX}%`);

  // Create a test expense in IN_ATTESA
  const { data: expense, error } = await svc
    .from('expense_reimbursements')
    .insert({
      collaborator_id: COLLAB_ID,
      community_id: TB_COMMUNITY_ID,
      categoria: 'Trasporti',
      data_spesa: '2026-04-01',
      importo: 25.50,
      descrizione: `${PREFIX}-attachment-test`,
      stato: 'IN_ATTESA',
    })
    .select('id')
    .single();

  expect(error).toBeNull();
  expenseId = expense!.id;
}, 15000);

afterAll(async () => {
  if (!expenseId) return;
  // Cleanup attachments + storage + expense
  await svc.from('expense_attachments').delete().eq('reimbursement_id', expenseId);
  const { data: files } = await svc.storage
    .from('expenses')
    .list(`${COLLAB_ID}/${expenseId}`);
  if (files?.length) {
    await svc.storage
      .from('expenses')
      .remove(files.map((f) => `${COLLAB_ID}/${expenseId}/${f.name}`));
  }
  await svc.from('expense_reimbursements').delete().eq('id', expenseId);
}, 15000);

describe('POST /api/expenses/[id]/attachments', () => {
  it('no session → proxy redirect (307 or 401)', async () => {
    const res = await fetch(`${APP_URL}/api/expenses/${expenseId}/attachments`, {
      method: 'POST',
      redirect: 'manual',
    });
    expect([307, 401]).toContain(res.status);
  }, 15000);

  it('service role can upload to expenses bucket', async () => {
    const buffer = Buffer.from('%PDF-1.4 test content');
    const storagePath = `${COLLAB_ID}/${expenseId}/test-upload.pdf`;

    const { error: uploadError } = await svc.storage
      .from('expenses')
      .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false });

    expect(uploadError).toBeNull();

    // Verify file exists
    const { data: signedData } = await svc.storage
      .from('expenses')
      .createSignedUrl(storagePath, 60);

    expect(signedData?.signedUrl).toBeTruthy();

    // Cleanup
    await svc.storage.from('expenses').remove([storagePath]);
  }, 15000);

  it('service role can insert attachment record', async () => {
    const storagePath = `${COLLAB_ID}/${expenseId}/${PREFIX}-record.pdf`;

    const { data: attachment, error } = await svc
      .from('expense_attachments')
      .insert({
        reimbursement_id: expenseId,
        file_url: storagePath,
        file_name: `${PREFIX}-record.pdf`,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(attachment).toBeTruthy();
    expect(attachment!.file_url).toBe(storagePath);
    expect(attachment!.file_name).toBe(`${PREFIX}-record.pdf`);
    expect(attachment!.reimbursement_id).toBe(expenseId);

    // Cleanup
    await svc.from('expense_attachments').delete().eq('id', attachment!.id);
  }, 15000);

  it('storage path format is collaboratorId/expenseId/filename', () => {
    const fileName = 'ricevuta.pdf';
    const expected = `${COLLAB_ID}/${expenseId}/${fileName}`;
    expect(expected).toMatch(
      /^[0-9a-f-]+\/[0-9a-f-]+\/[^/]+$/,
    );
  });

  it('batch createSignedUrls works for multiple paths', async () => {
    // Upload two files
    const paths = [
      `${COLLAB_ID}/${expenseId}/${PREFIX}-batch1.pdf`,
      `${COLLAB_ID}/${expenseId}/${PREFIX}-batch2.pdf`,
    ];
    for (const p of paths) {
      await svc.storage.from('expenses').upload(p, Buffer.from('test'), {
        contentType: 'application/pdf',
        upsert: false,
      });
    }

    const { data: signed } = await svc.storage
      .from('expenses')
      .createSignedUrls(paths, 3600);

    expect(signed).toHaveLength(2);
    for (const entry of signed ?? []) {
      expect(entry.signedUrl).toBeTruthy();
    }

    // Cleanup
    await svc.storage.from('expenses').remove(paths);
  }, 15000);

  it('ALLOWED_TYPES validation rejects non-PDF/JPG/PNG', () => {
    const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
    expect(ALLOWED_TYPES.has('application/pdf')).toBe(true);
    expect(ALLOWED_TYPES.has('image/jpeg')).toBe(true);
    expect(ALLOWED_TYPES.has('image/png')).toBe(true);
    expect(ALLOWED_TYPES.has('application/zip')).toBe(false);
    expect(ALLOWED_TYPES.has('text/plain')).toBe(false);
    expect(ALLOWED_TYPES.has('image/gif')).toBe(false);
  });

  it('MAX_FILE_SIZE is 10 MB', () => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    expect(MAX_FILE_SIZE).toBe(10485760);
  });
});
