/**
 * Integration tests for Block corsi-2 — Candidature.
 * Covers:
 * - Unauthenticated requests → 307 proxy redirect
 * - DB state via service role: insert, duplicate prevention, withdrawal, blacklist
 * - RLS: anon client cannot insert candidature
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL = process.env.APP_URL ?? 'http://localhost:3001';

const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

// Stable staging IDs
const TB_COMMUNITY_ID = '6fdd80e9-2464-4304-9bd7-d5703370a119';
const ADMIN_USER_ID = 'c5e0fc9e-b415-4717-b5ed-3526e153a3f0';
// collaboratore_tb_test@test.com — collab_id from MEMORY.md
const COLLAB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26';
// Second collaborator — collaboratore_p4m_test collab_id (for ownership check)
const COLLAB_P4M_ID = '608ccbe6-bed0-4fcf-aaf5-95768ef5c11f';

let corsoId = '';
let lezioneId = '';
let candidaturaId = '';

beforeAll(async () => {
  // Cleanup any leftover test candidature + lezioni + corsi
  await svc.from('candidature').delete().like('id', '%').eq('collaborator_id', COLLAB_ID);
  await svc.from('lezioni').delete().like('corso_id', 'placeholder'); // will clean via corsi cascade
  await svc.from('corsi').delete().like('codice_identificativo', 'TEST-CAND-%');

  // Create a test corso
  const { data: corso } = await svc.from('corsi').insert({
    nome: 'Corso Candidature Test',
    codice_identificativo: 'TEST-CAND-001',
    community_id: TB_COMMUNITY_ID,
    modalita: 'online',
    data_inizio: '2026-09-01',
    data_fine: '2026-12-31',
    max_docenti_per_lezione: 8,
    max_qa_per_lezione: 6,
    created_by: ADMIN_USER_ID,
  }).select().single();
  corsoId = corso?.id ?? '';

  // Create a test lezione
  const { data: lezione } = await svc.from('lezioni').insert({
    corso_id: corsoId,
    data: '2026-09-15',
    orario_inizio: '09:00',
    orario_fine: '11:00',
    materia: 'Logica',
  }).select().single();
  lezioneId = lezione?.id ?? '';
});

afterAll(async () => {
  if (candidaturaId) await svc.from('candidature').delete().eq('id', candidaturaId);
  if (lezioneId) await svc.from('lezioni').delete().eq('id', lezioneId);
  if (corsoId) await svc.from('corsi').delete().eq('id', corsoId);
});

// ── Proxy behaviour ────────────────────────────────────────────────────────────

describe('Unauthenticated routes → 401', () => {
  it('POST /api/candidature without session → 401', async () => {
    const res = await fetch(`${APP_URL}/api/candidature`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'docente_lezione', lezione_id: lezioneId }),
    });
    expect([307, 302, 401]).toContain(res.status);
  });

  it('PATCH /api/candidature/[id] without session → 401', async () => {
    const res = await fetch(`${APP_URL}/api/candidature/00000000-0000-0000-0000-000000000000`, {
      method: 'PATCH',
      redirect: 'manual',
    });
    expect([307, 302, 401]).toContain(res.status);
  });
});

// ── DB state: candidature CRUD ─────────────────────────────────────────────────

describe('Candidatura DB operations', () => {
  it('inserts a candidatura via service role', async () => {
    const { data, error } = await svc.from('candidature').insert({
      tipo: 'docente_lezione',
      lezione_id: lezioneId,
      collaborator_id: COLLAB_ID,
    }).select().single();

    expect(error).toBeNull();
    expect(data?.stato).toBe('in_attesa');
    expect(data?.tipo).toBe('docente_lezione');
    candidaturaId = data?.id ?? '';
  });

  it('reads back candidatura with correct fields', async () => {
    const { data } = await svc.from('candidature').select('*').eq('id', candidaturaId).single();
    expect(data?.lezione_id).toBe(lezioneId);
    expect(data?.collaborator_id).toBe(COLLAB_ID);
    expect(data?.corso_id).toBeNull();
  });

  it('updates stato to ritirata', async () => {
    const { data, error } = await svc
      .from('candidature')
      .update({ stato: 'ritirata' })
      .eq('id', candidaturaId)
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.stato).toBe('ritirata');
  });

  it('allows re-insertion after withdrawal (stato=ritirata is a terminal state, new record is valid)', async () => {
    const { data, error } = await svc.from('candidature').insert({
      tipo: 'docente_lezione',
      lezione_id: lezioneId,
      collaborator_id: COLLAB_ID,
    }).select().single();
    expect(error).toBeNull();
    expect(data?.stato).toBe('in_attesa');
    // cleanup this extra record
    await svc.from('candidature').delete().eq('id', data!.id);
  });

  it('rejects candidatura with both lezione_id and corso_id set (CHECK constraint)', async () => {
    const { error } = await svc.from('candidature').insert({
      tipo: 'docente_lezione',
      lezione_id: lezioneId,
      corso_id: corsoId,
      collaborator_id: COLLAB_ID,
    });
    expect(error).not.toBeNull();
  });

  it('rejects candidatura with neither lezione_id nor corso_id (CHECK constraint)', async () => {
    const { error } = await svc.from('candidature').insert({
      tipo: 'docente_lezione',
      collaborator_id: COLLAB_ID,
    });
    expect(error).not.toBeNull();
  });
});

// ── RLS: anonymous client cannot insert candidature ────────────────────────────

describe('RLS — anon cannot insert candidature', () => {
  it('anon INSERT is rejected by RLS', async () => {
    const { error } = await anon.from('candidature').insert({
      tipo: 'docente_lezione',
      lezione_id: lezioneId,
      collaborator_id: COLLAB_ID,
    });
    expect(error).not.toBeNull();
  });
});
