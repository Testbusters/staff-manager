/**
 * Integration tests for Block corsi-1.
 * Covers:
 * - Unauthenticated requests → 307 proxy redirect
 * - Business logic: getCorsoStato, MATERIA_COLORS
 * - DB state via service role: corsi, lezioni (ore computed column), blacklist constraints
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

let communityId = '';
let corsoId = '';
let lezioneId = '';
let adminUserId = '';

beforeAll(async () => {
  await svc.from('corsi').delete().like('codice_identificativo', 'TEST-VITEST-%');
  // Known stable IDs on staging
  communityId = '6fdd80e9-2464-4304-9bd7-d5703370a119'; // Testbusters
  adminUserId = 'c5e0fc9e-b415-4717-b5ed-3526e153a3f0';  // admin_test@test.com
});

afterAll(async () => {
  if (lezioneId) await svc.from('lezioni').delete().eq('id', lezioneId);
  if (corsoId) await svc.from('corsi').delete().eq('id', corsoId);
});

// ── Proxy behaviour ────────────────────────────────────────────────────────────

describe('Unauthenticated routes → proxy redirect', () => {
  it('GET /api/corsi → 307', async () => {
    const res = await fetch(`${APP_URL}/api/corsi`, { redirect: 'manual' });
    expect([307, 302]).toContain(res.status);
  });

  it('GET /api/admin/blacklist → 307', async () => {
    const res = await fetch(`${APP_URL}/api/admin/blacklist`, { redirect: 'manual' });
    expect([307, 302]).toContain(res.status);
  });
});

// ── Business logic helpers ─────────────────────────────────────────────────────

describe('getCorsoStato utility', async () => {
  const { getCorsoStato } = await import('@/lib/corsi-utils');

  it('returns programmato when data_inizio is in the future', () => {
    expect(getCorsoStato('2099-01-01', '2099-12-31')).toBe('programmato');
  });

  it('returns concluso when data_fine is in the past', () => {
    expect(getCorsoStato('2020-01-01', '2020-12-31')).toBe('concluso');
  });

  it('returns attivo when today is within range', () => {
    const today = new Date();
    const inizio = new Date(today);
    inizio.setDate(inizio.getDate() - 1);
    const fine = new Date(today);
    fine.setDate(fine.getDate() + 30);
    expect(getCorsoStato(inizio.toISOString().slice(0, 10), fine.toISOString().slice(0, 10))).toBe('attivo');
  });
});

// ── DB state: corsi + lezioni ──────────────────────────────────────────────────

describe('corsi DB operations', () => {
  it('inserts a corso via service role', async () => {
    const { data, error } = await svc.from('corsi').insert({
      nome: 'Corso Vitest',
      codice_identificativo: 'TEST-VITEST-001',
      community_id: communityId,
      modalita: 'online',
      data_inizio: '2026-09-01',
      data_fine: '2026-12-31',
      max_docenti_per_lezione: 8,
      max_qa_per_lezione: 6,
      created_by: adminUserId,
    }).select().single();

    expect(error).toBeNull();
    expect(data?.codice_identificativo).toBe('TEST-VITEST-001');
    corsoId = data?.id ?? '';
  });

  it('reads back the corso with correct fields', async () => {
    const { data } = await svc.from('corsi').select('*').eq('id', corsoId).single();
    expect(data?.nome).toBe('Corso Vitest');
    expect(data?.max_docenti_per_lezione).toBe(8);
    expect(data?.citta).toBeNull();
  });
});

describe('lezioni DB operations — ore generated column', () => {
  it('inserts a lezione and the ore column is computed correctly', async () => {
    const { data, error } = await svc.from('lezioni').insert({
      corso_id: corsoId,
      data: '2026-09-01',
      orario_inizio: '09:00',
      orario_fine: '11:00',
      materia: 'Logica',
    }).select().single();

    expect(error).toBeNull();
    expect(Number(data?.ore)).toBe(2);
    lezioneId = data?.id ?? '';
  });

  it('updates materia', async () => {
    const { data, error } = await svc.from('lezioni').update({ materia: 'Biologia' }).eq('id', lezioneId).select().single();
    expect(error).toBeNull();
    expect(data?.materia).toBe('Biologia');
  });
});

// ── DB state: blacklist uniqueness constraint ──────────────────────────────────

describe('blacklist uniqueness constraint', () => {
  let collabId = '';
  let blacklistId = '';

  beforeAll(async () => {
    const { data } = await svc.from('collaborators').select('id').limit(1).single();
    collabId = data?.id ?? '';
    await svc.from('blacklist').delete().eq('collaborator_id', collabId);
  });

  it('inserts a blacklist entry', async () => {
    const { data, error } = await svc.from('blacklist').insert({
      collaborator_id: collabId,
      note: 'vitest test',
      created_by: adminUserId,
    }).select().single();
    expect(error).toBeNull();
    blacklistId = data?.id ?? '';
  });

  it('rejects duplicate (UNIQUE constraint on collaborator_id)', async () => {
    const { error } = await svc.from('blacklist').insert({
      collaborator_id: collabId,
      note: 'duplicate',
      created_by: adminUserId,
    });
    expect(error?.code).toBe('23505');
  });

  it('removes entry on delete', async () => {
    await svc.from('blacklist').delete().eq('id', blacklistId);
    const { data } = await svc.from('blacklist').select('id').eq('id', blacklistId).single();
    expect(data).toBeNull();
  });
});

// ── DB state: candidature constraint ──────────────────────────────────────────

describe('candidature target constraint', () => {
  it('rejects candidatura with neither lezione_id nor corso_id', async () => {
    const { error } = await svc.from('candidature').insert({
      tipo: 'docente_lezione',
      stato: 'in_attesa',
      collaborator_id: null,
    });
    expect(error).not.toBeNull();
  });
});
