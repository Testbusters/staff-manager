/**
 * T2.3 — Expense CRUD (DB integration)
 *
 * Tests expense_reimbursements create, read, update, delete at the DB level:
 * - Insert via service role, verify fields persisted
 * - Read: single + list with stato filter
 * - Edit: update importo on IN_ATTESA record
 * - Delete: IN_ATTESA removable
 * - State transitions: IN_ATTESA → APPROVATO → LIQUIDATO
 * - History tracking
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
const ADMIN_USER_ID = 'c5e0fc9e-b415-4717-b5ed-3526e153a3f0';
const PREFIX = 'TEST-EXP-CRUD';

const createdIds: string[] = [];

async function cleanup() {
  if (!createdIds.length) return;
  await svc.from('expense_history').delete().in('reimbursement_id', createdIds);
  await svc.from('expense_reimbursements').delete().in('id', createdIds);
}

const COMMUNITY_ID = '6fdd80e9-2464-4304-9bd7-d5703370a119';

function makeExp(suffix: string, overrides: Record<string, unknown> = {}) {
  return {
    collaborator_id: COLLAB_ID,
    community_id: COMMUNITY_ID,
    stato: 'IN_ATTESA',
    importo: 75.50,
    categoria: 'materiale_didattico',
    descrizione: `${PREFIX}-${suffix}`,
    data_spesa: '2026-02-10',
    ...overrides,
  };
}

beforeAll(async () => {
  const { data: leftovers } = await svc
    .from('expense_reimbursements')
    .select('id')
    .like('descrizione', `${PREFIX}%`);
  if (leftovers?.length) {
    const ids = leftovers.map((r: { id: string }) => r.id);
    await svc.from('expense_history').delete().in('reimbursement_id', ids);
    await svc.from('expense_reimbursements').delete().in('id', ids);
  }
}, 15000);

afterAll(async () => {
  await cleanup();
}, 15000);

// ── Create ──────────────────────────────────────────────────────

describe('expense create', () => {
  it('inserts a record with required fields', async () => {
    const { data, error } = await svc
      .from('expense_reimbursements')
      .insert(makeExp('create-1'))
      .select('id, stato, importo, categoria, descrizione, collaborator_id')
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    createdIds.push(data!.id);

    expect(data!.stato).toBe('IN_ATTESA');
    expect(data!.importo).toBe(75.50);
    expect(data!.categoria).toBe('materiale_didattico');
    expect(data!.collaborator_id).toBe(COLLAB_ID);
  }, 15000);

  it('defaults created_at on insert', async () => {
    const { data, error } = await svc
      .from('expense_reimbursements')
      .insert(makeExp('create-ts'))
      .select('id, created_at')
      .single();

    expect(error).toBeNull();
    createdIds.push(data!.id);
    expect(data!.created_at).toBeTruthy();
  }, 15000);
});

// ── Read ────────────────────────────────────────────────────────

describe('expense read', () => {
  let readId: string;

  beforeAll(async () => {
    const { data } = await svc
      .from('expense_reimbursements')
      .insert(makeExp('read-1'))
      .select('id')
      .single();
    readId = data!.id;
    createdIds.push(readId);
  }, 15000);

  it('reads single record by id', async () => {
    const { data, error } = await svc
      .from('expense_reimbursements')
      .select('id, stato, descrizione')
      .eq('id', readId)
      .single();

    expect(error).toBeNull();
    expect(data!.descrizione).toBe(`${PREFIX}-read-1`);
  }, 15000);

  it('reads list with stato filter', async () => {
    const { data, error } = await svc
      .from('expense_reimbursements')
      .select('id')
      .eq('stato', 'IN_ATTESA')
      .like('descrizione', `${PREFIX}%`);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  }, 15000);
});

// ── Update (edit) ───────────────────────────────────────────────

describe('expense edit', () => {
  let editId: string;

  beforeAll(async () => {
    const { data } = await svc
      .from('expense_reimbursements')
      .insert(makeExp('edit-1'))
      .select('id')
      .single();
    editId = data!.id;
    createdIds.push(editId);
  }, 15000);

  it('updates importo on IN_ATTESA record', async () => {
    const { error } = await svc
      .from('expense_reimbursements')
      .update({ importo: 100 })
      .eq('id', editId);

    expect(error).toBeNull();

    const { data } = await svc
      .from('expense_reimbursements')
      .select('importo')
      .eq('id', editId)
      .single();

    expect(data!.importo).toBe(100);
  }, 15000);

  it('updates descrizione and categoria', async () => {
    const { error } = await svc
      .from('expense_reimbursements')
      .update({ descrizione: `${PREFIX}-edited`, categoria: 'viaggio' })
      .eq('id', editId);

    expect(error).toBeNull();

    const { data } = await svc
      .from('expense_reimbursements')
      .select('descrizione, categoria')
      .eq('id', editId)
      .single();

    expect(data!.descrizione).toBe(`${PREFIX}-edited`);
    expect(data!.categoria).toBe('viaggio');
  }, 15000);
});

// ── Delete ──────────────────────────────────────────────────────

describe('expense delete', () => {
  it('deletes IN_ATTESA record', async () => {
    const { data } = await svc
      .from('expense_reimbursements')
      .insert(makeExp('del-1'))
      .select('id')
      .single();

    const id = data!.id;

    const { error } = await svc.from('expense_reimbursements').delete().eq('id', id);
    expect(error).toBeNull();

    const { data: check } = await svc
      .from('expense_reimbursements')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    expect(check).toBeNull();
  }, 15000);
});

// ── State transition chain ──────────────────────────────────────

describe('expense state transitions', () => {
  let chainId: string;

  beforeAll(async () => {
    const { data } = await svc
      .from('expense_reimbursements')
      .insert(makeExp('chain-1'))
      .select('id')
      .single();
    chainId = data!.id;
    createdIds.push(chainId);
  }, 15000);

  it('IN_ATTESA → APPROVATO', async () => {
    const { error } = await svc
      .from('expense_reimbursements')
      .update({ stato: 'APPROVATO', approved_by: ADMIN_USER_ID, approved_at: new Date().toISOString() })
      .eq('id', chainId);
    expect(error).toBeNull();

    const { data } = await svc.from('expense_reimbursements').select('stato').eq('id', chainId).single();
    expect(data!.stato).toBe('APPROVATO');
  }, 15000);

  it('APPROVATO → LIQUIDATO', async () => {
    const { error } = await svc
      .from('expense_reimbursements')
      .update({ stato: 'LIQUIDATO', liquidated_at: new Date().toISOString(), liquidated_by: ADMIN_USER_ID })
      .eq('id', chainId);
    expect(error).toBeNull();

    const { data } = await svc.from('expense_reimbursements').select('stato').eq('id', chainId).single();
    expect(data!.stato).toBe('LIQUIDATO');
  }, 15000);

  it('history row persists after transition', async () => {
    const histId = createdIds[createdIds.length - 1]; // chainId

    const { error } = await svc.from('expense_history').insert({
      reimbursement_id: histId,
      stato_precedente: 'IN_ATTESA',
      stato_nuovo: 'APPROVATO',
      changed_by: ADMIN_USER_ID,
      role_label: 'Amministrazione',
    });
    expect(error).toBeNull();

    const { data: history } = await svc
      .from('expense_history')
      .select('stato_precedente, stato_nuovo')
      .eq('reimbursement_id', histId);

    expect(history!.length).toBeGreaterThan(0);
    expect(history![0].stato_precedente).toBe('IN_ATTESA');
  }, 15000);
});
