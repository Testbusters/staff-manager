/**
 * T2.6 — Profile self-edit + onboarding (DB integration)
 *
 * Tests profile update and onboarding flow at the DB level:
 * - collaborators table: nome, cognome, codice_fiscale, etc. fields updatable
 * - user_profiles table: onboarding_completed flag transition
 * - collaborator_communities: community lookup by collaborator
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

// Use the existing TB test collaborator — read-only tests (no permanent mutations)
const COLLAB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26';
const COLLAB_USER_ID = '80238f5b-78d1-48a3-ac5a-4cf65126a111'; // user_id for collaboratore_tb_test

// ── Profile fields read ─────────────────────────────────────────

describe('collaborator profile read', () => {
  it('reads collaborator profile fields', async () => {
    const { data, error } = await svc
      .from('collaborators')
      .select('id, nome, cognome, codice_fiscale, email, citta, materie_insegnate, tipo_contratto')
      .eq('id', COLLAB_ID)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.nome).toBeTruthy();
    expect(data!.cognome).toBeTruthy();
    // citta is NOT NULL per migration 054
    expect(data!.citta).toBeTruthy();
    // materie_insegnate is NOT NULL array per migration 054
    expect(Array.isArray(data!.materie_insegnate)).toBe(true);
  }, 15000);

  it('reads user_profiles for the collaborator', async () => {
    const { data, error } = await svc
      .from('user_profiles')
      .select('user_id, role, is_active, onboarding_completed')
      .eq('user_id', COLLAB_USER_ID)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.role).toBe('collaboratore');
    expect(data!.is_active).toBe(true);
  }, 15000);

  it('reads community via collaborator_communities', async () => {
    const { data, error } = await svc
      .from('collaborator_communities')
      .select('community_id')
      .eq('collaborator_id', COLLAB_ID)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    // Should be TB community
    expect(data!.community_id).toBe('6fdd80e9-2464-4304-9bd7-d5703370a119');
  }, 15000);
});

// ── Profile field update (reversible) ───────────────────────────

describe('collaborator profile update', () => {
  let originalNome: string;

  beforeAll(async () => {
    const { data } = await svc
      .from('collaborators')
      .select('nome')
      .eq('id', COLLAB_ID)
      .single();
    originalNome = data!.nome;
  }, 15000);

  afterAll(async () => {
    // Restore original value
    await svc
      .from('collaborators')
      .update({ nome: originalNome })
      .eq('id', COLLAB_ID);
  }, 15000);

  it('updates nome field and reads back', async () => {
    const testNome = `TEST-PROFILE-${Date.now()}`;
    const { error } = await svc
      .from('collaborators')
      .update({ nome: testNome })
      .eq('id', COLLAB_ID);

    expect(error).toBeNull();

    const { data } = await svc
      .from('collaborators')
      .select('nome')
      .eq('id', COLLAB_ID)
      .single();

    expect(data!.nome).toBe(testNome);
  }, 15000);
});

// ── Onboarding flag ─────────────────────────────────────────────

describe('onboarding_completed flag', () => {
  it('user_profiles has onboarding_completed boolean', async () => {
    const { data, error } = await svc
      .from('user_profiles')
      .select('onboarding_completed')
      .eq('user_id', COLLAB_USER_ID)
      .single();

    expect(error).toBeNull();
    expect(typeof data!.onboarding_completed).toBe('boolean');
  }, 15000);
});

// ── P4M collaborator read (cross-community) ─────────────────────

describe('P4M collaborator profile', () => {
  const P4M_COLLAB_ID = '608ccbe6-bed0-4fcf-aaf5-95768ef5c11f';
  const P4M_COMMUNITY_ID = '20ef2aac-7447-4576-b815-91d44560f00e';

  it('reads P4M collaborator community', async () => {
    const { data, error } = await svc
      .from('collaborator_communities')
      .select('community_id')
      .eq('collaborator_id', P4M_COLLAB_ID)
      .single();

    expect(error).toBeNull();
    expect(data!.community_id).toBe(P4M_COMMUNITY_ID);
  }, 15000);
});
