/**
 * T2.5 — Document lifecycle (DB integration)
 *
 * Tests document CRUD and state transitions at the DB level:
 * - Insert document record (admin creates)
 * - Read: single + list by collaborator
 * - State transitions: DA_FIRMARE → FIRMATO (via stato_firma column)
 * - Delete: document removal
 *
 * Schema: documents table uses `stato_firma` (not `stato`),
 *   `file_original_url`/`file_original_name` (not `file_path`),
 *   `file_firmato_url`/`file_firmato_name` for signed version.
 *
 * Requires staging Supabase.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL?.includes('gjwkvgfwkdwzqlvudgqr')) {
  throw new Error('Wrong Supabase project — aborting test. Only run against staging.');
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const COLLAB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26';
const COMMUNITY_ID = '6fdd80e9-2464-4304-9bd7-d5703370a119';
const PREFIX = 'TEST-DOC-LIFE';

const createdIds: string[] = [];

async function cleanup() {
  if (!createdIds.length) return;
  await svc.from('documents').delete().in('id', createdIds);
}

function makeDoc(suffix: string, overrides: Record<string, unknown> = {}) {
  return {
    collaborator_id: COLLAB_ID,
    community_id: COMMUNITY_ID,
    tipo: 'CU',
    stato_firma: 'DA_FIRMARE',
    file_original_url: `test/${PREFIX}-${suffix}.pdf`,
    file_original_name: `${PREFIX}-${suffix}.pdf`,
    titolo: `${PREFIX}-${suffix}`,
    anno: 2026,
    ...overrides,
  };
}

beforeAll(async () => {
  const { data: leftovers } = await svc
    .from('documents')
    .select('id')
    .like('titolo', `${PREFIX}%`);
  if (leftovers?.length) {
    const ids = leftovers.map((r: { id: string }) => r.id);
    await svc.from('documents').delete().in('id', ids);
  }
}, 15000);

afterAll(async () => {
  await cleanup();
}, 15000);

// ── Create ──────────────────────────────────────────────────────

describe('document create', () => {
  it('inserts a document with required fields', async () => {
    const { data, error } = await svc
      .from('documents')
      .insert(makeDoc('create1'))
      .select('id, stato_firma, tipo, collaborator_id, file_original_url, community_id')
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    createdIds.push(data!.id);

    expect(data!.stato_firma).toBe('DA_FIRMARE');
    expect(data!.collaborator_id).toBe(COLLAB_ID);
    expect(data!.community_id).toBe(COMMUNITY_ID);
    expect(data!.tipo).toBe('CU');
  }, 15000);

  it('defaults created_at', async () => {
    const { data, error } = await svc
      .from('documents')
      .insert(makeDoc('create2'))
      .select('id, created_at')
      .single();

    expect(error).toBeNull();
    createdIds.push(data!.id);
    expect(data!.created_at).toBeTruthy();
  }, 15000);
});

// ── Read ────────────────────────────────────────────────────────

describe('document read', () => {
  let readId: string;

  beforeAll(async () => {
    const { data } = await svc
      .from('documents')
      .insert(makeDoc('read1'))
      .select('id')
      .single();
    readId = data!.id;
    createdIds.push(readId);
  }, 15000);

  it('reads single document by id', async () => {
    const { data, error } = await svc
      .from('documents')
      .select('id, stato_firma, tipo')
      .eq('id', readId)
      .single();

    expect(error).toBeNull();
    expect(data!.stato_firma).toBe('DA_FIRMARE');
  }, 15000);

  it('reads documents by collaborator', async () => {
    const { data, error } = await svc
      .from('documents')
      .select('id')
      .eq('collaborator_id', COLLAB_ID)
      .like('titolo', `${PREFIX}%`);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  }, 15000);
});

// ── State transitions ───────────────────────────────────────────

describe('document state transitions', () => {
  let transId: string;

  beforeAll(async () => {
    const { data } = await svc
      .from('documents')
      .insert(makeDoc('trans1'))
      .select('id')
      .single();
    transId = data!.id;
    createdIds.push(transId);
  }, 15000);

  it('DA_FIRMARE → FIRMATO', async () => {
    const { error } = await svc
      .from('documents')
      .update({
        stato_firma: 'FIRMATO',
        signed_at: new Date().toISOString(),
        file_firmato_url: `test/${PREFIX}-trans1-signed.pdf`,
        file_firmato_name: `${PREFIX}-trans1-signed.pdf`,
      })
      .eq('id', transId);

    expect(error).toBeNull();

    const { data } = await svc
      .from('documents')
      .select('stato_firma, signed_at, file_firmato_url')
      .eq('id', transId)
      .single();

    expect(data!.stato_firma).toBe('FIRMATO');
    expect(data!.signed_at).toBeTruthy();
    expect(data!.file_firmato_url).toContain('signed');
  }, 15000);
});

// ── Delete ──────────────────────────────────────────────────────

describe('document delete', () => {
  it('deletes a document record', async () => {
    const { data } = await svc
      .from('documents')
      .insert(makeDoc('del1'))
      .select('id')
      .single();
    const id = data!.id;

    const { error } = await svc.from('documents').delete().eq('id', id);
    expect(error).toBeNull();

    const { data: check } = await svc
      .from('documents')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    expect(check).toBeNull();
  }, 15000);
});

// ── macro_type generated column ─────────────────────────────────

describe('document macro_type', () => {
  it('macro_type is auto-generated from tipo', async () => {
    const { data, error } = await svc
      .from('documents')
      .insert(makeDoc('macro1'))
      .select('id, tipo, macro_type')
      .single();

    expect(error).toBeNull();
    createdIds.push(data!.id);

    // CU → macro_type should be CU
    expect(data!.macro_type).toBe('CU');
  }, 15000);
});
