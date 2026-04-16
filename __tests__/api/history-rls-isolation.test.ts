/**
 * TC5 — RLS isolation tests for compensation_history and expense_history.
 * Verifies that collaborator B cannot read collaborator A's history entries
 * through the `comp_history_own_read` and `exp_history_own_read` policies.
 *
 * Strategy: insert history rows via service role, then authenticate as
 * each collaborator via anon client + signInWithPassword and verify
 * that only the owner's rows are returned.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Stable staging collaborator IDs
const COLLAB_TB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26'; // collaboratore_tb_test@test.com
const COLLAB_P4M_ID = '608ccbe6-bed0-4fcf-aaf5-95768ef5c11f'; // collaboratore_p4m_test@test.com
const TB_COMMUNITY_ID = '6fdd80e9-2464-4304-9bd7-d5703370a119';
const P4M_COMMUNITY_ID = '20ef2aac-7447-4576-b815-91d44560f00e';

const COLLAB_TB_EMAIL = 'collaboratore_tb_test@test.com';
const COLLAB_P4M_EMAIL = 'collaboratore_p4m_test@test.com';
const PASSWORD = 'Testbusters123';

let compTbId: string;
let compP4mId: string;
let expTbId: string;
let expP4mId: string;

async function createAuthClient(email: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return client;
}

beforeAll(async () => {
  // Cleanup leftover test data (prefix: TEST-RLS-HIST)
  await svc.from('compensation_history').delete().like('note', 'TEST-RLS-HIST%');
  await svc.from('expense_history').delete().like('note', 'TEST-RLS-HIST%');
  await svc.from('compensations').delete().eq('nome_servizio_ruolo', 'TEST-RLS-HIST');
  await svc.from('expense_reimbursements').delete().eq('categoria', 'TEST-RLS-HIST');

  // Insert test compensations (one per collaborator)
  const { data: compTb } = await svc.from('compensations').insert({
    collaborator_id: COLLAB_TB_ID,
    nome_servizio_ruolo: 'TEST-RLS-HIST',
    importo_lordo: 100,
    importo_netto: 80,
    ritenuta_acconto: 20,
    data_competenza: '2027-01-01',
    stato: 'IN_ATTESA',
    competenza: 'extra',
  }).select('id').single();
  compTbId = compTb!.id;

  const { data: compP4m } = await svc.from('compensations').insert({
    collaborator_id: COLLAB_P4M_ID,
    nome_servizio_ruolo: 'TEST-RLS-HIST',
    importo_lordo: 100,
    importo_netto: 80,
    ritenuta_acconto: 20,
    data_competenza: '2027-01-01',
    stato: 'IN_ATTESA',
    competenza: 'extra',
  }).select('id').single();
  compP4mId = compP4m!.id;

  // Insert test expense reimbursements (one per collaborator)
  const { data: expTb } = await svc.from('expense_reimbursements').insert({
    collaborator_id: COLLAB_TB_ID,
    community_id: TB_COMMUNITY_ID,
    categoria: 'TEST-RLS-HIST',
    importo: 50,
    stato: 'IN_ATTESA',
    data_spesa: '2027-01-01',
  }).select('id').single();
  expTbId = expTb!.id;

  const { data: expP4m } = await svc.from('expense_reimbursements').insert({
    collaborator_id: COLLAB_P4M_ID,
    community_id: P4M_COMMUNITY_ID,
    categoria: 'TEST-RLS-HIST',
    importo: 50,
    stato: 'IN_ATTESA',
    data_spesa: '2027-01-01',
  }).select('id').single();
  expP4mId = expP4m!.id;

  // Insert history rows for each compensation and expense
  await svc.from('compensation_history').insert([
    { compensation_id: compTbId, stato_precedente: null, stato_nuovo: 'IN_ATTESA', role_label: 'Collaboratore', note: 'TEST-RLS-HIST-TB' },
    { compensation_id: compP4mId, stato_precedente: null, stato_nuovo: 'IN_ATTESA', role_label: 'Collaboratore', note: 'TEST-RLS-HIST-P4M' },
  ]);

  await svc.from('expense_history').insert([
    { reimbursement_id: expTbId, stato_precedente: null, stato_nuovo: 'IN_ATTESA', role_label: 'Collaboratore', note: 'TEST-RLS-HIST-TB' },
    { reimbursement_id: expP4mId, stato_precedente: null, stato_nuovo: 'IN_ATTESA', role_label: 'Collaboratore', note: 'TEST-RLS-HIST-P4M' },
  ]);
}, 15000);

afterAll(async () => {
  await svc.from('compensation_history').delete().like('note', 'TEST-RLS-HIST%');
  await svc.from('expense_history').delete().like('note', 'TEST-RLS-HIST%');
  await svc.from('compensations').delete().eq('nome_servizio_ruolo', 'TEST-RLS-HIST');
  await svc.from('expense_reimbursements').delete().eq('categoria', 'TEST-RLS-HIST');
}, 15000);

describe('TC5 — compensation_history RLS isolation', () => {
  it('TB collaborator sees only own compensation history', async () => {
    const client = await createAuthClient(COLLAB_TB_EMAIL);
    const { data, error } = await client
      .from('compensation_history')
      .select('note')
      .like('note', 'TEST-RLS-HIST%');

    expect(error).toBeNull();
    const notes = (data ?? []).map((r: { note: string }) => r.note);
    expect(notes).toContain('TEST-RLS-HIST-TB');
    expect(notes).not.toContain('TEST-RLS-HIST-P4M');
  }, 15000);

  it('P4M collaborator sees only own compensation history', async () => {
    const client = await createAuthClient(COLLAB_P4M_EMAIL);
    const { data, error } = await client
      .from('compensation_history')
      .select('note')
      .like('note', 'TEST-RLS-HIST%');

    expect(error).toBeNull();
    const notes = (data ?? []).map((r: { note: string }) => r.note);
    expect(notes).toContain('TEST-RLS-HIST-P4M');
    expect(notes).not.toContain('TEST-RLS-HIST-TB');
  }, 15000);

  it('service role sees both compensation history entries', async () => {
    const { data, error } = await svc
      .from('compensation_history')
      .select('note')
      .like('note', 'TEST-RLS-HIST%');

    expect(error).toBeNull();
    const notes = (data ?? []).map((r: { note: string }) => r.note);
    expect(notes).toContain('TEST-RLS-HIST-TB');
    expect(notes).toContain('TEST-RLS-HIST-P4M');
  }, 15000);
});

describe('TC5 — expense_history RLS isolation', () => {
  it('TB collaborator sees only own expense history', async () => {
    const client = await createAuthClient(COLLAB_TB_EMAIL);
    const { data, error } = await client
      .from('expense_history')
      .select('note')
      .like('note', 'TEST-RLS-HIST%');

    expect(error).toBeNull();
    const notes = (data ?? []).map((r: { note: string }) => r.note);
    expect(notes).toContain('TEST-RLS-HIST-TB');
    expect(notes).not.toContain('TEST-RLS-HIST-P4M');
  }, 15000);

  it('P4M collaborator sees only own expense history', async () => {
    const client = await createAuthClient(COLLAB_P4M_EMAIL);
    const { data, error } = await client
      .from('expense_history')
      .select('note')
      .like('note', 'TEST-RLS-HIST%');

    expect(error).toBeNull();
    const notes = (data ?? []).map((r: { note: string }) => r.note);
    expect(notes).toContain('TEST-RLS-HIST-P4M');
    expect(notes).not.toContain('TEST-RLS-HIST-TB');
  }, 15000);

  it('service role sees both expense history entries', async () => {
    const { data, error } = await svc
      .from('expense_history')
      .select('note')
      .like('note', 'TEST-RLS-HIST%');

    expect(error).toBeNull();
    const notes = (data ?? []).map((r: { note: string }) => r.note);
    expect(notes).toContain('TEST-RLS-HIST-TB');
    expect(notes).toContain('TEST-RLS-HIST-P4M');
  }, 15000);
});
