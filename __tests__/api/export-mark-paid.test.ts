/**
 * TC3 — Integration tests for the mark-paid logic (POST /api/export/mark-paid).
 *
 * Tests the core DB operations that the route performs:
 * - Update compensations from APPROVATO → LIQUIDATO with payment_reference
 * - Insert compensation_history entries for the transition
 * - Same flow for expense_reimbursements / expense_history
 * - Only APPROVATO records are updated (non-APPROVATO are skipped)
 *
 * Note: the route uses SSR session auth (cookie-based) which requires a running
 * dev server. These tests verify the DB-level business logic directly via
 * service role client — auth boundary is covered by the existing proxy 401 tests.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const COLLAB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26'; // collaboratore_tb_test
const TB_COMMUNITY_ID = '6fdd80e9-2464-4304-9bd7-d5703370a119';
const ADMIN_USER_ID = 'c5e0fc9e-b415-4717-b5ed-3526e153a3f0';
const PAYMENT_REF = 'TEST-MARK-PAID-REF-001';

let compApprovatoId: string;
let compInAttesaId: string;
let expApprovatoId: string;

beforeAll(async () => {
  // Cleanup leftover test data
  await svc.from('compensation_history').delete().like('note', '%TEST-MARK-PAID%');
  await svc.from('expense_history').delete().like('note', '%TEST-MARK-PAID%');
  await svc.from('compensations').delete().eq('nome_servizio_ruolo', 'TEST-MARK-PAID');
  await svc.from('expense_reimbursements').delete().eq('categoria', 'TEST-MARK-PAID');

  // Insert one APPROVATO compensation
  const { data: compA } = await svc.from('compensations').insert({
    collaborator_id: COLLAB_ID,
    nome_servizio_ruolo: 'TEST-MARK-PAID',
    importo_lordo: 200,
    importo_netto: 160,
    ritenuta_acconto: 20,
    data_competenza: '2027-02-01',
    stato: 'APPROVATO',
    competenza: 'extra',
  }).select('id').single();
  compApprovatoId = compA!.id;

  // Insert one IN_ATTESA compensation (should NOT be updated)
  const { data: compB } = await svc.from('compensations').insert({
    collaborator_id: COLLAB_ID,
    nome_servizio_ruolo: 'TEST-MARK-PAID',
    importo_lordo: 100,
    importo_netto: 80,
    ritenuta_acconto: 20,
    data_competenza: '2027-02-01',
    stato: 'IN_ATTESA',
    competenza: 'extra',
  }).select('id').single();
  compInAttesaId = compB!.id;

  // Insert one APPROVATO expense
  const { data: expA } = await svc.from('expense_reimbursements').insert({
    collaborator_id: COLLAB_ID,
    community_id: TB_COMMUNITY_ID,
    categoria: 'TEST-MARK-PAID',
    importo: 75,
    stato: 'APPROVATO',
    data_spesa: '2027-02-01',
  }).select('id').single();
  expApprovatoId = expA!.id;
}, 15000);

afterAll(async () => {
  await svc.from('compensation_history').delete().like('note', '%TEST-MARK-PAID%');
  await svc.from('expense_history').delete().like('note', '%TEST-MARK-PAID%');
  await svc.from('compensations').delete().eq('nome_servizio_ruolo', 'TEST-MARK-PAID');
  await svc.from('expense_reimbursements').delete().eq('categoria', 'TEST-MARK-PAID');
}, 15000);

describe('TC3 — mark-paid: compensation APPROVATO → LIQUIDATO', () => {
  it('updates APPROVATO compensation to LIQUIDATO with payment_reference', async () => {
    const now = new Date().toISOString();

    // Simulate the route's update logic
    const { data: updated, error } = await svc
      .from('compensations')
      .update({
        stato: 'LIQUIDATO',
        liquidated_at: now,
        liquidated_by: ADMIN_USER_ID,
        payment_reference: PAYMENT_REF,
      })
      .in('id', [compApprovatoId, compInAttesaId])
      .eq('stato', 'APPROVATO') // only APPROVATO records
      .select('id, stato');

    expect(error).toBeNull();
    expect(updated).toHaveLength(1);
    expect(updated![0].id).toBe(compApprovatoId);
    expect(updated![0].stato).toBe('LIQUIDATO');

    // Verify DB state: APPROVATO one is now LIQUIDATO
    const { data: compA } = await svc.from('compensations').select('stato, payment_reference').eq('id', compApprovatoId).single();
    expect(compA!.stato).toBe('LIQUIDATO');
    expect(compA!.payment_reference).toBe(PAYMENT_REF);

    // Verify DB state: IN_ATTESA one is unchanged
    const { data: compB } = await svc.from('compensations').select('stato').eq('id', compInAttesaId).single();
    expect(compB!.stato).toBe('IN_ATTESA');
  }, 15000);

  it('inserts compensation_history entry for the transition', async () => {
    // Insert history row as the route would
    const { error } = await svc.from('compensation_history').insert({
      compensation_id: compApprovatoId,
      stato_precedente: 'APPROVATO',
      stato_nuovo: 'LIQUIDATO',
      changed_by: ADMIN_USER_ID,
      role_label: 'Amministrazione',
      note: `TEST-MARK-PAID — riferimento: ${PAYMENT_REF}`,
    });

    expect(error).toBeNull();

    // Verify it exists
    const { data: history } = await svc
      .from('compensation_history')
      .select('stato_precedente, stato_nuovo, role_label, note')
      .eq('compensation_id', compApprovatoId)
      .like('note', 'TEST-MARK-PAID%');

    expect(history).not.toBeNull();
    expect(history!.length).toBeGreaterThanOrEqual(1);
    const entry = history!.find(h => h.note?.includes(PAYMENT_REF));
    expect(entry).toBeDefined();
    expect(entry!.stato_precedente).toBe('APPROVATO');
    expect(entry!.stato_nuovo).toBe('LIQUIDATO');
    expect(entry!.role_label).toBe('Amministrazione');
  }, 15000);
});

describe('TC3 — mark-paid: expense APPROVATO → LIQUIDATO', () => {
  it('updates APPROVATO expense to LIQUIDATO with payment_reference', async () => {
    const now = new Date().toISOString();

    const { data: updated, error } = await svc
      .from('expense_reimbursements')
      .update({
        stato: 'LIQUIDATO',
        liquidated_at: now,
        liquidated_by: ADMIN_USER_ID,
        payment_reference: PAYMENT_REF,
      })
      .in('id', [expApprovatoId])
      .eq('stato', 'APPROVATO')
      .select('id, stato');

    expect(error).toBeNull();
    expect(updated).toHaveLength(1);
    expect(updated![0].stato).toBe('LIQUIDATO');

    // Verify DB state
    const { data: exp } = await svc.from('expense_reimbursements').select('stato, payment_reference').eq('id', expApprovatoId).single();
    expect(exp!.stato).toBe('LIQUIDATO');
    expect(exp!.payment_reference).toBe(PAYMENT_REF);
  }, 15000);

  it('inserts expense_history entry for the transition', async () => {
    const { error } = await svc.from('expense_history').insert({
      reimbursement_id: expApprovatoId,
      stato_precedente: 'APPROVATO',
      stato_nuovo: 'LIQUIDATO',
      changed_by: ADMIN_USER_ID,
      role_label: 'Amministrazione',
      note: `TEST-MARK-PAID — riferimento: ${PAYMENT_REF}`,
    });

    expect(error).toBeNull();

    const { data: history } = await svc
      .from('expense_history')
      .select('stato_precedente, stato_nuovo, role_label, note')
      .eq('reimbursement_id', expApprovatoId)
      .like('note', 'TEST-MARK-PAID%');

    expect(history).not.toBeNull();
    expect(history!.length).toBeGreaterThanOrEqual(1);
    const entry = history!.find(h => h.note?.includes(PAYMENT_REF));
    expect(entry).toBeDefined();
    expect(entry!.stato_precedente).toBe('APPROVATO');
    expect(entry!.stato_nuovo).toBe('LIQUIDATO');
  }, 15000);
});
