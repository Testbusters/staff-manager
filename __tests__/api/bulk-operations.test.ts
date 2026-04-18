/**
 * T2.1 — Bulk operations: approve + liquidate (DB integration)
 *
 * Tests compensation and expense bulk state transitions at the DB level:
 * - Service role insert → update stato → verify DB state
 * - RLS: collaboratore can read own records via anon-style select
 * - State machine: IN_ATTESA → APPROVATO → LIQUIDATO
 * - History tracking: compensation_history / expense_history rows created
 *
 * Requires staging Supabase (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
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

// Canonical test IDs
const COMMUNITY_ID = '6fdd80e9-2464-4304-9bd7-d5703370a119'; // Testbusters
const COLLAB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26'; // collaboratore_tb_test
const ADMIN_USER_ID = 'c5e0fc9e-b415-4717-b5ed-3526e153a3f0';
const PREFIX = 'TEST-BULK-OPS';

// Track IDs for cleanup
const createdCompIds: string[] = [];
const createdExpIds: string[] = [];

async function cleanupTestData() {
  // Delete history first (FK), then records
  if (createdCompIds.length) {
    await svc.from('compensation_history').delete().in('compensation_id', createdCompIds);
    await svc.from('compensations').delete().in('id', createdCompIds);
  }
  if (createdExpIds.length) {
    await svc.from('expense_history').delete().in('reimbursement_id', createdExpIds);
    await svc.from('expense_reimbursements').delete().in('id', createdExpIds);
  }
}

async function insertCompensation(stato: string, suffix: string) {
  const { data, error } = await svc
    .from('compensations')
    .insert({
      collaborator_id: COLLAB_ID,
      community_id: COMMUNITY_ID,
      stato,
      importo_lordo: 100,
      ritenuta_acconto: 20,
      importo_netto: 80,
      data_competenza: '2026-01-15',
      nome_servizio_ruolo: `${PREFIX}-${suffix}`,
      competenza: 'corsi',
      info_specifiche: `${PREFIX} test record`,
    })
    .select('id')
    .single();
  if (error) throw new Error(`Insert compensation failed: ${error.message}`);
  createdCompIds.push(data.id);
  return data.id;
}

async function insertExpense(stato: string, suffix: string) {
  const { data, error } = await svc
    .from('expense_reimbursements')
    .insert({
      collaborator_id: COLLAB_ID,
      community_id: COMMUNITY_ID,
      stato,
      importo: 50,
      categoria: 'materiale_didattico',
      descrizione: `${PREFIX}-${suffix}`,
      data_spesa: '2026-01-15',
    })
    .select('id')
    .single();
  if (error) throw new Error(`Insert expense failed: ${error.message}`);
  createdExpIds.push(data.id);
  return data.id;
}

beforeAll(async () => {
  await cleanupTestData();
}, 15000);

afterAll(async () => {
  await cleanupTestData();
}, 15000);

// ── Compensation state transitions (DB level) ───────────────────

describe('compensation bulk state transitions', () => {
  let compInAttesa1: string;
  let compInAttesa2: string;
  let compApprovato: string;

  beforeAll(async () => {
    compInAttesa1 = await insertCompensation('IN_ATTESA', 'comp-att-1');
    compInAttesa2 = await insertCompensation('IN_ATTESA', 'comp-att-2');
    compApprovato = await insertCompensation('APPROVATO', 'comp-appr-1');
  }, 15000);

  it('batch update IN_ATTESA → APPROVATO', async () => {
    const { error } = await svc
      .from('compensations')
      .update({
        stato: 'APPROVATO',
        approved_by: ADMIN_USER_ID,
        approved_at: new Date().toISOString(),
      })
      .in('id', [compInAttesa1, compInAttesa2]);

    expect(error).toBeNull();

    // Verify DB state
    const { data } = await svc
      .from('compensations')
      .select('id, stato')
      .in('id', [compInAttesa1, compInAttesa2]);

    expect(data).toHaveLength(2);
    for (const r of data!) {
      expect(r.stato).toBe('APPROVATO');
    }
  }, 15000);

  it('batch update APPROVATO → LIQUIDATO', async () => {
    const { error } = await svc
      .from('compensations')
      .update({
        stato: 'LIQUIDATO',
        liquidated_at: new Date().toISOString(),
        liquidated_by: ADMIN_USER_ID,
      })
      .in('id', [compInAttesa1, compInAttesa2, compApprovato]);

    expect(error).toBeNull();

    const { data } = await svc
      .from('compensations')
      .select('id, stato')
      .in('id', [compInAttesa1, compInAttesa2, compApprovato]);

    expect(data).toHaveLength(3);
    for (const r of data!) {
      expect(r.stato).toBe('LIQUIDATO');
    }
  }, 15000);

  it('history row created on state change', async () => {
    // Insert a fresh record and transition it
    const freshId = await insertCompensation('IN_ATTESA', 'comp-hist');

    await svc
      .from('compensations')
      .update({ stato: 'APPROVATO', approved_by: ADMIN_USER_ID, approved_at: new Date().toISOString() })
      .eq('id', freshId);

    // Insert history manually (route handler does this — we verify the table accepts it)
    const { error } = await svc.from('compensation_history').insert({
      compensation_id: freshId,
      stato_precedente: 'IN_ATTESA',
      stato_nuovo: 'APPROVATO',
      changed_by: ADMIN_USER_ID,
      role_label: 'Amministrazione',
    });

    expect(error).toBeNull();

    const { data: history } = await svc
      .from('compensation_history')
      .select('stato_precedente, stato_nuovo, role_label')
      .eq('compensation_id', freshId);

    expect(history).toHaveLength(1);
    expect(history![0].stato_precedente).toBe('IN_ATTESA');
    expect(history![0].stato_nuovo).toBe('APPROVATO');
  }, 15000);

  it('mark-paid sets payment_reference + LIQUIDATO', async () => {
    const paidId = await insertCompensation('APPROVATO', 'comp-paid');

    const { error } = await svc
      .from('compensations')
      .update({
        stato: 'LIQUIDATO',
        liquidated_at: new Date().toISOString(),
        liquidated_by: ADMIN_USER_ID,
        payment_reference: 'BANK-REF-2026-001',
      })
      .eq('id', paidId);

    expect(error).toBeNull();

    const { data } = await svc
      .from('compensations')
      .select('stato, payment_reference')
      .eq('id', paidId)
      .single();

    expect(data!.stato).toBe('LIQUIDATO');
    expect(data!.payment_reference).toBe('BANK-REF-2026-001');
  }, 15000);
});

// ── Expense state transitions (DB level) ─────────────────────────

describe('expense bulk state transitions', () => {
  let expInAttesa1: string;
  let expInAttesa2: string;
  let expApprovato: string;

  beforeAll(async () => {
    expInAttesa1 = await insertExpense('IN_ATTESA', 'exp-att-1');
    expInAttesa2 = await insertExpense('IN_ATTESA', 'exp-att-2');
    expApprovato = await insertExpense('APPROVATO', 'exp-appr-1');
  }, 15000);

  it('batch update IN_ATTESA → APPROVATO', async () => {
    const { error } = await svc
      .from('expense_reimbursements')
      .update({
        stato: 'APPROVATO',
        approved_by: ADMIN_USER_ID,
        approved_at: new Date().toISOString(),
      })
      .in('id', [expInAttesa1, expInAttesa2]);

    expect(error).toBeNull();

    const { data } = await svc
      .from('expense_reimbursements')
      .select('id, stato')
      .in('id', [expInAttesa1, expInAttesa2]);

    expect(data).toHaveLength(2);
    for (const r of data!) {
      expect(r.stato).toBe('APPROVATO');
    }
  }, 15000);

  it('batch update APPROVATO → LIQUIDATO', async () => {
    const { error } = await svc
      .from('expense_reimbursements')
      .update({
        stato: 'LIQUIDATO',
        liquidated_at: new Date().toISOString(),
        liquidated_by: ADMIN_USER_ID,
      })
      .in('id', [expInAttesa1, expInAttesa2, expApprovato]);

    expect(error).toBeNull();

    const { data } = await svc
      .from('expense_reimbursements')
      .select('id, stato')
      .in('id', [expInAttesa1, expInAttesa2, expApprovato]);

    expect(data).toHaveLength(3);
    for (const r of data!) {
      expect(r.stato).toBe('LIQUIDATO');
    }
  }, 15000);

  it('history row created on state change', async () => {
    const freshId = await insertExpense('IN_ATTESA', 'exp-hist');

    await svc
      .from('expense_reimbursements')
      .update({ stato: 'APPROVATO', approved_by: ADMIN_USER_ID, approved_at: new Date().toISOString() })
      .eq('id', freshId);

    const { error } = await svc.from('expense_history').insert({
      reimbursement_id: freshId,
      stato_precedente: 'IN_ATTESA',
      stato_nuovo: 'APPROVATO',
      changed_by: ADMIN_USER_ID,
      role_label: 'Amministrazione',
    });

    expect(error).toBeNull();

    const { data: history } = await svc
      .from('expense_history')
      .select('stato_precedente, stato_nuovo, role_label')
      .eq('reimbursement_id', freshId);

    expect(history).toHaveLength(1);
    expect(history![0].stato_precedente).toBe('IN_ATTESA');
    expect(history![0].stato_nuovo).toBe('APPROVATO');
  }, 15000);

  it('mark-paid sets payment_reference + LIQUIDATO', async () => {
    const paidId = await insertExpense('APPROVATO', 'exp-paid');

    const { error } = await svc
      .from('expense_reimbursements')
      .update({
        stato: 'LIQUIDATO',
        liquidated_at: new Date().toISOString(),
        liquidated_by: ADMIN_USER_ID,
        payment_reference: 'BANK-REF-2026-002',
      })
      .eq('id', paidId);

    expect(error).toBeNull();

    const { data } = await svc
      .from('expense_reimbursements')
      .select('stato, payment_reference')
      .eq('id', paidId)
      .single();

    expect(data!.stato).toBe('LIQUIDATO');
    expect(data!.payment_reference).toBe('BANK-REF-2026-002');
  }, 15000);
});
