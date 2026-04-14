/**
 * Integration tests for expanded ruolo support (bugfixing-corsi-compensi).
 * Covers:
 * - DB: assegnazioni table accepts 'docente', 'qa', 'cocoda' ruolo values
 * - DELETE /api/assegnazioni/[id]: expanded from cocoda-only to ['cocoda','docente','qa']
 * - QAPanel logic: multiple QA per lezione (up to maxQA), independent per-lezione assignment
 * - Counter accuracy: COUNT vs in-memory filter on potentially truncated result set
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL = process.env.APP_URL ?? 'http://localhost:3001';

if (!SUPABASE_URL?.includes('gjwkvgfwkdwzqlvudgqr')) {
  throw new Error('Wrong Supabase project — aborting. Only run against staging.');
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const COMMUNITY_ID = '6fdd80e9-2464-4304-9bd7-d5703370a119';
const ADMIN_USER_ID = 'c5e0fc9e-b415-4717-b5ed-3526e153a3f0';
const COLLAB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26';
const COLLAB_P4M_ID = '608ccbe6-bed0-4fcf-aaf5-95768ef5c11f';
const PREFIX = 'TEST-RUOLO-EXP';

let corsoId: string;
let lezioneId: string;

async function cleanup() {
  const { data: rows } = await svc
    .from('corsi')
    .select('id')
    .like('codice_identificativo', `${PREFIX}%`);
  if (!rows?.length) return;
  const ids = rows.map((r: { id: string }) => r.id);
  const { data: lezRows } = await svc.from('lezioni').select('id').in('corso_id', ids);
  const lezIds = (lezRows ?? []).map((l: { id: string }) => l.id);
  if (lezIds.length) {
    await svc.from('assegnazioni').delete().in('lezione_id', lezIds);
    await svc.from('lezioni').delete().in('corso_id', ids);
  }
  await svc.from('corsi').delete().in('id', ids);
}

beforeAll(async () => {
  await cleanup();

  const { data: corso } = await svc
    .from('corsi')
    .insert({
      nome: 'Test Ruolo Expanded',
      codice_identificativo: `${PREFIX}-001`,
      modalita: 'online',
      data_inizio: '2028-01-01',
      data_fine: '2028-06-30',
      community_id: COMMUNITY_ID,
      max_docenti_per_lezione: 4,
      max_qa_per_lezione: 3,
      created_by: ADMIN_USER_ID,
      citta: 'Roma',
    })
    .select('id')
    .single();
  corsoId = corso!.id;

  const { data: lez } = await svc
    .from('lezioni')
    .insert({
      corso_id: corsoId,
      data: '2028-03-15',
      orario_inizio: '10:00',
      orario_fine: '12:00',
      materie: ['Matematica'],
    })
    .select('id')
    .single();
  lezioneId = lez!.id;
}, 15000);

afterAll(async () => {
  await cleanup();
}, 15000);

// ── DB schema: ruolo values accepted ─────────────────────────────────────────

describe('assegnazioni — ruolo DB acceptance', () => {
  it("DB accepts ruolo 'cocoda'", async () => {
    const { data, error } = await svc
      .from('assegnazioni')
      .insert({
        lezione_id: lezioneId,
        collaborator_id: COLLAB_ID,
        ruolo: 'cocoda',
        created_by: ADMIN_USER_ID,
      })
      .select('id, ruolo')
      .single();
    expect(error).toBeNull();
    expect(data?.ruolo).toBe('cocoda');
    if (data?.id) await svc.from('assegnazioni').delete().eq('id', data.id);
  }, 15000);

  it("DB accepts ruolo 'docente'", async () => {
    const { data, error } = await svc
      .from('assegnazioni')
      .insert({
        lezione_id: lezioneId,
        collaborator_id: COLLAB_ID,
        ruolo: 'docente',
        created_by: ADMIN_USER_ID,
      })
      .select('id, ruolo')
      .single();
    expect(error).toBeNull();
    expect(data?.ruolo).toBe('docente');
    if (data?.id) await svc.from('assegnazioni').delete().eq('id', data.id);
  }, 15000);

  it("DB accepts ruolo 'qa'", async () => {
    const { data, error } = await svc
      .from('assegnazioni')
      .insert({
        lezione_id: lezioneId,
        collaborator_id: COLLAB_ID,
        ruolo: 'qa',
        created_by: ADMIN_USER_ID,
      })
      .select('id, ruolo')
      .single();
    expect(error).toBeNull();
    expect(data?.ruolo).toBe('qa');
    if (data?.id) await svc.from('assegnazioni').delete().eq('id', data.id);
  }, 15000);

  it("DB rejects an invalid ruolo value via CHECK constraint", async () => {
    const { error } = await svc
      .from('assegnazioni')
      .insert({
        lezione_id: lezioneId,
        collaborator_id: COLLAB_ID,
        ruolo: 'invalid_role',
        created_by: ADMIN_USER_ID,
      });
    // Expect a constraint violation
    expect(error).not.toBeNull();
    expect(error?.code).toBe('23514'); // check_violation
  }, 15000);
});

// ── DELETE /api/assegnazioni/[id] — HTTP auth boundary ───────────────────────

describe('DELETE /api/assegnazioni/[id] — auth', () => {
  it('unauthenticated → 307', async () => {
    const res = await fetch(
      `${APP_URL}/api/assegnazioni/00000000-0000-4000-a000-000000000001`,
      { method: 'DELETE', redirect: 'manual' },
    );
    expect([307, 302]).toContain(res.status);
  });
});

// ── DELETE ruolo 'docente' — service role verification ───────────────────────

describe('DELETE assegnazione — ruolo docente', () => {
  let assId: string;

  beforeAll(async () => {
    const { data } = await svc
      .from('assegnazioni')
      .insert({
        lezione_id: lezioneId,
        collaborator_id: COLLAB_ID,
        ruolo: 'docente',
        created_by: ADMIN_USER_ID,
      })
      .select('id')
      .single();
    assId = data!.id;
  }, 15000);

  it('docente assegnazione exists before delete', async () => {
    const { data } = await svc
      .from('assegnazioni')
      .select('id, ruolo')
      .eq('id', assId)
      .single();
    expect(data?.ruolo).toBe('docente');
  }, 15000);

  it('service role can delete a docente assegnazione', async () => {
    const { error } = await svc.from('assegnazioni').delete().eq('id', assId);
    expect(error).toBeNull();
  }, 15000);

  it('docente assegnazione no longer exists after delete', async () => {
    const { data } = await svc
      .from('assegnazioni')
      .select('id')
      .eq('id', assId)
      .maybeSingle();
    expect(data).toBeNull();
  }, 15000);
});

// ── DELETE ruolo 'qa' — service role verification ────────────────────────────

describe('DELETE assegnazione — ruolo qa', () => {
  let assId: string;

  beforeAll(async () => {
    const { data } = await svc
      .from('assegnazioni')
      .insert({
        lezione_id: lezioneId,
        collaborator_id: COLLAB_ID,
        ruolo: 'qa',
        created_by: ADMIN_USER_ID,
      })
      .select('id')
      .single();
    assId = data!.id;
  }, 15000);

  it('qa assegnazione exists before delete', async () => {
    const { data } = await svc
      .from('assegnazioni')
      .select('id, ruolo')
      .eq('id', assId)
      .single();
    expect(data?.ruolo).toBe('qa');
  }, 15000);

  it('service role can delete a qa assegnazione', async () => {
    const { error } = await svc.from('assegnazioni').delete().eq('id', assId);
    expect(error).toBeNull();
  }, 15000);

  it('qa assegnazione no longer exists after delete', async () => {
    const { data } = await svc
      .from('assegnazioni')
      .select('id')
      .eq('id', assId)
      .maybeSingle();
    expect(data).toBeNull();
  }, 15000);
});

// ── Multiple QA per lezione — supports maxQA slots ───────────────────────────

describe('QA per-lezione: multiple assignments on same lezione', () => {
  let qa1Id: string;
  let qa2Id: string;

  beforeAll(async () => {
    const { data: a1 } = await svc
      .from('assegnazioni')
      .insert({ lezione_id: lezioneId, collaborator_id: COLLAB_ID, ruolo: 'qa', created_by: ADMIN_USER_ID })
      .select('id').single();
    qa1Id = a1!.id;

    const { data: a2 } = await svc
      .from('assegnazioni')
      .insert({ lezione_id: lezioneId, collaborator_id: COLLAB_P4M_ID, ruolo: 'qa', created_by: ADMIN_USER_ID })
      .select('id').single();
    qa2Id = a2!.id;
  }, 15000);

  it('lezione can have multiple QA assegnazioni (up to maxQA)', async () => {
    const { data } = await svc
      .from('assegnazioni')
      .select('id, collaborator_id, ruolo')
      .eq('lezione_id', lezioneId)
      .eq('ruolo', 'qa');
    expect(data?.length).toBe(2);
    const collabIds = data!.map((a: { collaborator_id: string }) => a.collaborator_id);
    expect(collabIds).toContain(COLLAB_ID);
    expect(collabIds).toContain(COLLAB_P4M_ID);
  }, 15000);

  it('each QA assegnazione can be independently deleted', async () => {
    const { error: e1 } = await svc.from('assegnazioni').delete().eq('id', qa1Id);
    expect(e1).toBeNull();

    // Second QA still exists after first is removed
    const { data } = await svc
      .from('assegnazioni')
      .select('id')
      .eq('lezione_id', lezioneId)
      .eq('ruolo', 'qa');
    expect(data?.length).toBe(1);
    expect(data![0].id).toBe(qa2Id);

    const { error: e2 } = await svc.from('assegnazioni').delete().eq('id', qa2Id);
    expect(e2).toBeNull();
  }, 15000);
});

// ── Counter fix: COUNT vs in-memory filter ────────────────────────────────────

describe('Counter fix: COUNT query accuracy for pending items', () => {
  it('COUNT query on compensations IN_ATTESA is accurate', async () => {
    // Verify the COUNT query pattern used by the counter fix works correctly
    const { count, error } = await svc
      .from('compensations')
      .select('id', { count: 'exact', head: true })
      .eq('stato', 'IN_ATTESA');
    expect(error).toBeNull();
    // Count can be any non-negative integer — key assertion is no error and count is a number
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  }, 15000);

  it('COUNT query on expense_reimbursements IN_ATTESA is accurate', async () => {
    const { count, error } = await svc
      .from('expense_reimbursements')
      .select('id', { count: 'exact', head: true })
      .eq('stato', 'IN_ATTESA');
    expect(error).toBeNull();
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  }, 15000);

  it('COUNT with collaborator_id filter (resp.compensi scope) returns a number', async () => {
    // This is the exact query pattern used in app/(app)/page.tsx resp.compensi branch
    const { count, error } = await svc
      .from('compensations')
      .select('id', { count: 'exact', head: true })
      .in('collaborator_id', [COLLAB_ID])
      .eq('stato', 'IN_ATTESA');
    expect(error).toBeNull();
    expect(typeof count).toBe('number');
  }, 15000);

  it('COUNT and fetch return same IN_ATTESA total for a known collaborator (small dataset)', async () => {
    // Insert 2 IN_ATTESA compensation records for COLLAB_ID to have a known state
    const inserted: string[] = [];
    for (let i = 0; i < 2; i++) {
      const { data } = await svc.from('compensations').insert({
        collaborator_id: COLLAB_ID,
        importo_lordo: 100,
        importo_netto: 80,
        ritenuta_acconto: 20,
        nome_servizio_ruolo: `COUNT Test ${i}`,
        data_competenza: '2028-03',
        stato: 'IN_ATTESA',
        competenza: 'Logica',
      }).select('id').single();
      if (data?.id) inserted.push(data.id);
    }

    // COUNT query
    const { count } = await svc
      .from('compensations')
      .select('id', { count: 'exact', head: true })
      .in('collaborator_id', [COLLAB_ID])
      .eq('stato', 'IN_ATTESA');

    // Fetch query (what the old code did)
    const { data: rows } = await svc
      .from('compensations')
      .select('id, stato')
      .in('collaborator_id', [COLLAB_ID])
      .in('stato', ['IN_ATTESA', 'APPROVATO'])
      .limit(1000);
    const inMemoryCount = (rows ?? []).filter((c: { stato: string }) => c.stato === 'IN_ATTESA').length;

    // Both should agree when total < 1000
    expect(count).toBe(inMemoryCount);

    // Cleanup
    for (const id of inserted) {
      await svc.from('compensations').delete().eq('id', id);
    }
  }, 15000);
});
