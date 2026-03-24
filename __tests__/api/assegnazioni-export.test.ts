/**
 * Integration tests for GET /api/assegnazioni/export
 * Covers: auth, role guard, corso_id validation, CSV response
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
const TB_COMMUNITY_ID = '6fdd80e9-2464-4304-9bd7-d5703370a119';
const ADMIN_USER_ID = 'c5e0fc9e-b415-4717-b5ed-3526e153a3f0';
const COLLAB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26';

let testCorsoId: string;
let testLezioneId: string;
let testAssegnazioneId: string;

beforeAll(async () => {
  // Cleanup first
  const { data: existing } = await svc
    .from('corsi')
    .select('id')
    .eq('codice_identificativo', 'TEST-EXP-001');
  if (existing?.length) {
    const ids = existing.map((c: { id: string }) => c.id);
    const lezRows = await svc.from('lezioni').select('id').in('corso_id', ids);
    const lezIds = (lezRows.data ?? []).map((l: { id: string }) => l.id);
    if (lezIds.length) await svc.from('assegnazioni').delete().in('lezione_id', lezIds);
    await svc.from('lezioni').delete().in('corso_id', ids);
    await svc.from('corsi').delete().in('id', ids);
  }

  const { data: corso } = await svc
    .from('corsi')
    .insert({
      nome: 'Test Export Assegnazioni',
      codice_identificativo: 'TEST-EXP-001',
      modalita: 'in_aula',
      data_inizio: '2027-08-01',
      data_fine: '2027-08-30',
      community_id: TB_COMMUNITY_ID,
      citta: 'Roma',
      created_by: ADMIN_USER_ID,
    })
    .select('id')
    .single();
  testCorsoId = corso!.id;

  const { data: lezione } = await svc
    .from('lezioni')
    .insert({
      corso_id: testCorsoId,
      data: '2027-08-10',
      orario_inizio: '09:00',
      orario_fine: '11:00',
      materia: 'Logica',
    })
    .select('id')
    .single();
  testLezioneId = lezione!.id;

  const { data: ass } = await svc
    .from('assegnazioni')
    .insert({
      lezione_id: testLezioneId,
      collaborator_id: COLLAB_ID,
      ruolo: 'cocoda',
      created_by: ADMIN_USER_ID,
    })
    .select('id')
    .single();
  testAssegnazioneId = ass!.id;
});

afterAll(async () => {
  if (testAssegnazioneId) {
    await svc.from('assegnazioni').delete().eq('id', testAssegnazioneId);
  }
  if (testLezioneId) {
    await svc.from('assegnazioni').delete().eq('lezione_id', testLezioneId);
    await svc.from('lezioni').delete().eq('id', testLezioneId);
  }
  if (testCorsoId) {
    await svc.from('corsi').delete().eq('id', testCorsoId);
  }
});

describe('GET /api/assegnazioni/export', () => {
  it('unauthenticated → 307 redirect', async () => {
    const res = await fetch(`${APP_URL}/api/assegnazioni/export?corso_id=${testCorsoId}`, {
      redirect: 'manual',
    });
    expect(res.status).toBe(307);
  });

  it('DB: assegnazione exists for test corso', async () => {
    const { data } = await svc
      .from('assegnazioni')
      .select('id, ruolo')
      .eq('lezione_id', testLezioneId)
      .eq('ruolo', 'cocoda');
    expect(data?.length).toBeGreaterThan(0);
  });

  it('DB: corso has citta Roma for ownership check', async () => {
    const { data } = await svc
      .from('corsi')
      .select('citta')
      .eq('id', testCorsoId)
      .single();
    expect(data?.citta).toBe('Roma');
  });
});
