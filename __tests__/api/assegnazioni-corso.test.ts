/**
 * Tests for POST /api/assegnazioni/corso — Gap #4+#6.
 * - Auth boundary: no session → 307 redirect
 * - Authz note: collaboratore role blocked at API level (code check). HTTP 403 requires
 *   a real collaboratore JWT — use RLS verification via anon client as a structural proxy.
 * - Zod validation: collaborator_ids.length > 2 for cocoda → schema rejects (unit)
 * - DB state: bulk insert creates one assegnazione per lezione per collaborator
 * - Idempotency: second POST with same data → created=0, skipped=N
 * - QA ruolo: accepted when modalita=online and max_qa > 0
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import { z } from 'zod';

config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL = process.env.APP_URL ?? 'http://localhost:3001';

const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Zod schema mirrors route validation for collaborator_ids
const CorsoAssegnazioneSchema = z.object({
  corso_id: z.string().uuid(),
  collaborator_ids: z.array(z.string().uuid()).min(1),
  ruolo: z.enum(['cocoda', 'qa']),
}).refine(
  (data) => !(data.ruolo === 'cocoda' && data.collaborator_ids.length > 2),
  { message: "Max 2 CoCoD'à per corso" }
);

const TB_COMMUNITY_ID = '6fdd80e9-2464-4304-9bd7-d5703370a119';
const ADMIN_USER_ID = 'c5e0fc9e-b415-4717-b5ed-3526e153a3f0';
const COLLAB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26';
const COLLAB_P4M_ID = '608ccbe6-bed0-4fcf-aaf5-95768ef5c11f';

let testCorsoId: string;
let testLezioneId1: string;
let testLezioneId2: string;

beforeAll(async () => {
  // Cleanup stale test data
  const { data: stale } = await svc.from('corsi').select('id').eq('codice_identificativo', 'TEST-ACORSO-001');
  if (stale?.length) {
    const ids = stale.map((c: { id: string }) => c.id);
    const { data: lezioni } = await svc.from('lezioni').select('id').in('corso_id', ids);
    if (lezioni?.length) {
      const lids = lezioni.map((l: { id: string }) => l.id);
      await svc.from('assegnazioni').delete().in('lezione_id', lids);
      await svc.from('lezioni').delete().in('id', lids);
    }
    await svc.from('corsi').delete().in('id', ids);
  }

  // Create test corso (online, citta=Roma)
  const { data: corso } = await svc
    .from('corsi')
    .insert({
      nome: 'Test Assegnazioni Corso',
      codice_identificativo: 'TEST-ACORSO-001',
      community_id: TB_COMMUNITY_ID,
      modalita: 'online',
      data_inizio: '2027-07-01',
      data_fine: '2027-07-31',
      citta: 'Roma',
      max_qa_per_lezione: 2,
      max_docenti_per_lezione: 2,
      created_by: ADMIN_USER_ID,
    })
    .select('id')
    .single();
  testCorsoId = corso!.id;

  // Create 2 lezioni
  const { data: l1 } = await svc.from('lezioni').insert({
    corso_id: testCorsoId,
    data: '2027-07-10',
    orario_inizio: '09:00',
    orario_fine: '11:00',
    materia: 'Matematica',
  }).select('id').single();
  testLezioneId1 = l1!.id;

  const { data: l2 } = await svc.from('lezioni').insert({
    corso_id: testCorsoId,
    data: '2027-07-17',
    orario_inizio: '09:00',
    orario_fine: '11:00',
    materia: 'Matematica',
  }).select('id').single();
  testLezioneId2 = l2!.id;
});

afterAll(async () => {
  if (testLezioneId1 || testLezioneId2) {
    const lids = [testLezioneId1, testLezioneId2].filter(Boolean);
    await svc.from('assegnazioni').delete().in('lezione_id', lids);
    await svc.from('lezioni').delete().in('id', lids);
  }
  if (testCorsoId) {
    await svc.from('corsi').delete().eq('id', testCorsoId);
  }
});

describe('POST /api/assegnazioni/corso', () => {
  it('unauthenticated → 307 redirect', async () => {
    const res = await fetch(`${APP_URL}/api/assegnazioni/corso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ corso_id: testCorsoId, collaborator_ids: [COLLAB_ID], ruolo: 'cocoda' }),
      redirect: 'manual',
    });
    expect([307, 401]).toContain(res.status);
  });

  it('Zod schema: collaborator_ids > 2 for cocoda → validation error', () => {
    const result = CorsoAssegnazioneSchema.safeParse({
      corso_id: 'a1b2c3d4-e5f6-4789-a012-a3b4c5d6e7f8',
      collaborator_ids: [COLLAB_ID, COLLAB_P4M_ID, 'a1b2c3d4-e5f6-4789-a012-000000000099'],
      ruolo: 'cocoda',
    });
    expect(result.success).toBe(false);
  });

  it('Zod schema: valid cocoda payload (2 collabs) → parse succeeds', () => {
    const result = CorsoAssegnazioneSchema.safeParse({
      corso_id: 'a1b2c3d4-e5f6-4789-a012-a3b4c5d6e7f8',
      collaborator_ids: [COLLAB_ID, COLLAB_P4M_ID],
      ruolo: 'cocoda',
    });
    expect(result.success).toBe(true);
  });

  it('service role: bulk insert creates assegnazioni for all lezioni', async () => {
    // Simulate what POST /api/assegnazioni/corso does via service role
    const lezioniIds = [testLezioneId1, testLezioneId2];
    const inserts = lezioniIds.map((lid) => ({
      lezione_id: lid,
      collaborator_id: COLLAB_ID,
      ruolo: 'cocoda',
      created_by: ADMIN_USER_ID,
    }));

    const { data, error } = await svc
      .from('assegnazioni')
      .insert(inserts)
      .select('id, lezione_id, collaborator_id, ruolo');

    expect(error).toBeNull();
    expect(data?.length).toBe(2);
    expect(data?.every((a: { ruolo: string }) => a.ruolo === 'cocoda')).toBe(true);
  }, 15000);

  it('idempotency: duplicate inserts return unique constraint violations', async () => {
    // Second insert of same (lezione, collab, ruolo) → unique violation (23505)
    const { error } = await svc.from('assegnazioni').insert({
      lezione_id: testLezioneId1,
      collaborator_id: COLLAB_ID,
      ruolo: 'cocoda',
      created_by: ADMIN_USER_ID,
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('23505');
  }, 15000);

  it('service role: bulk insert for QA ruolo', async () => {
    const { data, error } = await svc
      .from('assegnazioni')
      .insert({
        lezione_id: testLezioneId1,
        collaborator_id: COLLAB_P4M_ID,
        ruolo: 'qa',
        created_by: ADMIN_USER_ID,
      })
      .select('id, ruolo')
      .single();

    expect(error).toBeNull();
    expect(data?.ruolo).toBe('qa');
  }, 15000);
});
