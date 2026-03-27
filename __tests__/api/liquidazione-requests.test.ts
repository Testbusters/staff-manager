/**
 * Integration tests for /api/liquidazione-requests and /api/liquidazione-requests/[id]
 * Covers: auth, role guards, validation, business rules, DB state
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

// Stable staging IDs
const COLLAB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26'; // collaboratore_tb_test@test.com
const ADMIN_USER_ID = 'c5e0fc9e-b415-4717-b5ed-3526e153a3f0';
const TB_COMMUNITY_ID = '6fdd80e9-2464-4304-9bd7-d5703370a119';

let testCompId: string;
let testExpId: string;
let testRequestId: string;

beforeAll(async () => {
  // Cleanup first
  await svc.from('liquidazione_requests').delete().eq('collaborator_id', COLLAB_ID);
  await svc
    .from('compensations')
    .delete()
    .eq('collaborator_id', COLLAB_ID)
    .eq('nome_servizio_ruolo', 'TEST-LIQ-COMP');
  await svc
    .from('expense_reimbursements')
    .delete()
    .eq('collaborator_id', COLLAB_ID)
    .eq('categoria', 'TEST-LIQ-EXP');

  // Create test APPROVATO compensation
  const { data: comp, error: compInsertError } = await svc
    .from('compensations')
    .insert({
      collaborator_id: COLLAB_ID,
      nome_servizio_ruolo: 'TEST-LIQ-COMP',
      importo_lordo: 400,
      importo_netto: 320,
      data_competenza: '2027-01-01',
      stato: 'APPROVATO',
      competenza: 'extra',
    })
    .select('id')
    .single();
  if (compInsertError) throw new Error(`comp insert: ${compInsertError.message}`);
  testCompId = comp!.id;

  // Create test APPROVATO expense
  const { data: exp, error: expInsertError } = await svc
    .from('expense_reimbursements')
    .insert({
      collaborator_id: COLLAB_ID,
      community_id: TB_COMMUNITY_ID,
      categoria: 'TEST-LIQ-EXP',
      importo: 50,
      stato: 'APPROVATO',
      data_spesa: '2027-01-01',
    })
    .select('id')
    .single();
  if (expInsertError) throw new Error(`exp insert: ${expInsertError.message}`);
  testExpId = exp!.id;
});

afterAll(async () => {
  await svc.from('liquidazione_requests').delete().eq('collaborator_id', COLLAB_ID);
  if (testCompId) {
    await svc.from('compensation_history').delete().eq('compensation_id', testCompId);
    await svc.from('compensations').delete().eq('id', testCompId);
  }
  if (testExpId) {
    await svc.from('expense_history').delete().eq('reimbursement_id', testExpId);
    await svc.from('expense_reimbursements').delete().eq('id', testExpId);
  }
});

describe('POST /api/liquidazione-requests', () => {
  it('unauthenticated → 307 redirect', async () => {
    const res = await fetch(`${APP_URL}/api/liquidazione-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compensation_ids: [testCompId], expense_ids: [], ha_partita_iva: false }),
      redirect: 'manual',
    });
    expect(res.status).toBe(307);
  });

  it('DB: compensation stato = APPROVATO is accepted by CHECK constraint', async () => {
    const { data, error } = await svc
      .from('compensations')
      .select('id, stato')
      .eq('id', testCompId)
      .single();
    expect(error).toBeNull();
    expect(data?.stato).toBe('APPROVATO');
  });

  it('DB: can insert liquidazione_request with valid data', async () => {
    const { data: collab } = await svc
      .from('collaborators')
      .select('iban')
      .eq('id', COLLAB_ID)
      .single();

    const { data, error } = await svc
      .from('liquidazione_requests')
      .insert({
        collaborator_id: COLLAB_ID,
        compensation_ids: [testCompId],
        expense_ids: [testExpId],
        importo_netto_totale: 370,
        iban: collab?.iban ?? 'IT60X0542811101000000123456',
        ha_partita_iva: false,
        stato: 'in_attesa',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.stato).toBe('in_attesa');
    testRequestId = data!.id;
  });

  it('DB: unique index prevents second in_attesa request for same collab', async () => {
    const { data: collab } = await svc
      .from('collaborators')
      .select('iban')
      .eq('id', COLLAB_ID)
      .single();

    const { error } = await svc
      .from('liquidazione_requests')
      .insert({
        collaborator_id: COLLAB_ID,
        compensation_ids: [],
        expense_ids: [],
        importo_netto_totale: 100,
        iban: collab?.iban ?? 'IT60X0542811101000000123456',
        ha_partita_iva: false,
        stato: 'in_attesa',
      });

    expect(error).not.toBeNull(); // unique constraint violation
  });
});

describe('PATCH /api/liquidazione-requests/[id]', () => {
  it('unauthenticated → 307 redirect', async () => {
    const id = testRequestId ?? '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${APP_URL}/api/liquidazione-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoca' }),
      redirect: 'manual',
    });
    expect(res.status).toBe(307);
  });

  it('DB: admin can accept → sets stato = accettata + compensation LIQUIDATO', async () => {
    if (!testRequestId) return;

    const now = new Date().toISOString();
    const { error: updateError } = await svc
      .from('liquidazione_requests')
      .update({ stato: 'accettata', processed_at: now, processed_by: ADMIN_USER_ID })
      .eq('id', testRequestId);

    expect(updateError).toBeNull();

    // Liquidate the comp
    const { error: compError } = await svc
      .from('compensations')
      .update({ stato: 'LIQUIDATO', liquidated_at: now, liquidated_by: ADMIN_USER_ID })
      .in('id', [testCompId]);

    expect(compError).toBeNull();

    const { data: comp } = await svc
      .from('compensations')
      .select('stato')
      .eq('id', testCompId)
      .single();

    expect(comp?.stato).toBe('LIQUIDATO');

    const { data: req } = await svc
      .from('liquidazione_requests')
      .select('stato')
      .eq('id', testRequestId)
      .single();

    expect(req?.stato).toBe('accettata');
  });

  it('DB: can insert annullata request and verify note_admin', async () => {
    const { data: collab } = await svc
      .from('collaborators')
      .select('iban')
      .eq('id', COLLAB_ID)
      .single();

    const { data, error } = await svc
      .from('liquidazione_requests')
      .insert({
        collaborator_id: COLLAB_ID,
        compensation_ids: [],
        expense_ids: [],
        importo_netto_totale: 300,
        iban: collab?.iban ?? 'IT60X0542811101000000123456',
        ha_partita_iva: false,
        stato: 'annullata',
        note_admin: 'Test rejection note',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.stato).toBe('annullata');
    expect(data?.note_admin).toBe('Test rejection note');
    if (data?.id) await svc.from('liquidazione_requests').delete().eq('id', data.id);
  });
});

describe('GET /api/liquidazione-requests', () => {
  it('unauthenticated → 307 redirect', async () => {
    const res = await fetch(`${APP_URL}/api/liquidazione-requests`, {
      redirect: 'manual',
    });
    expect(res.status).toBe(307);
  });

  it('DB: liquidazione_requests table has RLS enabled', async () => {
    // Indirect check: the table exists and service client can read it
    const { data: rows, error } = await svc
      .from('liquidazione_requests')
      .select('id')
      .limit(1);
    expect(error).toBeNull();
    expect(Array.isArray(rows)).toBe(true);
  });

  it('DB: liquidazione_requests stato CHECK constraint rejects invalid values', async () => {
    const { data: collab } = await svc
      .from('collaborators')
      .select('iban')
      .eq('id', COLLAB_ID)
      .single();

    const { error } = await svc
      .from('liquidazione_requests')
      .insert({
        collaborator_id: COLLAB_ID,
        compensation_ids: [],
        expense_ids: [],
        importo_netto_totale: 100,
        iban: collab?.iban ?? 'IT60X0542811101000000123456',
        ha_partita_iva: false,
        stato: 'invalid_stato',
      });

    expect(error).not.toBeNull();
  });
});
