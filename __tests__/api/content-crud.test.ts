/**
 * Tests for content tables (communications, opportunities, discounts, resources).
 * DB integration via service role — HTTP routes require session auth.
 * Auth boundary (401) covered by auth-boundary-sweep-2.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL?.includes('gjwkvgfwkdwzqlvudgqr')) {
  throw new Error('Wrong Supabase project — only run against staging.');
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const TEST_PREFIX = 'UAT-CONTENT-CRUD';
const COMMUNITY_TB = '6fdd80e9-2464-4304-9bd7-d5703370a119';

const insertedIds: Record<string, string[]> = {
  communications: [],
  opportunities: [],
  discounts: [],
  resources: [],
};

beforeAll(async () => {
  // Cleanup stale test content
  for (const table of Object.keys(insertedIds)) {
    await svc.from(table).delete().like('titolo', `${TEST_PREFIX}%`);
  }
}, 15000);

afterAll(async () => {
  for (const [table, ids] of Object.entries(insertedIds)) {
    if (ids.length) await svc.from(table).delete().in('id', ids);
  }
}, 15000);

describe('communications CRUD', () => {
  it('inserts a communication', async () => {
    const { data, error } = await svc
      .from('communications')
      .insert({
        titolo: `${TEST_PREFIX}-COMM-001`,
        contenuto: 'Test communication body',
        pinned: false,
        community_ids: [COMMUNITY_TB],
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.titolo).toBe(`${TEST_PREFIX}-COMM-001`);
    expect(data!.community_ids).toContain(COMMUNITY_TB);
    insertedIds.communications.push(data!.id);
  }, 15000);

  it('reads the communication back', async () => {
    const { data, error } = await svc
      .from('communications')
      .select('id, titolo, contenuto, pinned, community_ids')
      .eq('id', insertedIds.communications[0])
      .single();

    expect(error).toBeNull();
    expect(data!.contenuto).toBe('Test communication body');
    expect(data!.pinned).toBe(false);
  }, 15000);

  it('updates pinned status', async () => {
    const { error } = await svc
      .from('communications')
      .update({ pinned: true })
      .eq('id', insertedIds.communications[0]);

    expect(error).toBeNull();

    const { data } = await svc
      .from('communications')
      .select('pinned')
      .eq('id', insertedIds.communications[0])
      .single();

    expect(data!.pinned).toBe(true);
  }, 15000);
});

describe('opportunities CRUD', () => {
  it('inserts an opportunity', async () => {
    const { data, error } = await svc
      .from('opportunities')
      .insert({
        titolo: `${TEST_PREFIX}-OPP-001`,
        descrizione: 'Test opportunity',
        tipo: 'Volontariato',
        community_ids: [],
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.tipo).toBe('Volontariato');
    insertedIds.opportunities.push(data!.id);
  }, 15000);

  it('community_ids empty = visible to all communities', async () => {
    const { data } = await svc
      .from('opportunities')
      .select('community_ids')
      .eq('id', insertedIds.opportunities[0])
      .single();

    expect(data!.community_ids).toEqual([]);
  }, 15000);
});

describe('discounts CRUD', () => {
  it('inserts a discount', async () => {
    const { data, error } = await svc
      .from('discounts')
      .insert({
        titolo: `${TEST_PREFIX}-DISC-001`,
        descrizione: 'Test discount',
        community_ids: [COMMUNITY_TB],
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.titolo).toBe(`${TEST_PREFIX}-DISC-001`);
    insertedIds.discounts.push(data!.id);
  }, 15000);
});

describe('resources CRUD', () => {
  it('inserts a resource', async () => {
    const { data, error } = await svc
      .from('resources')
      .insert({
        titolo: `${TEST_PREFIX}-RES-001`,
        descrizione: 'Resource description text',
        community_ids: [],
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.titolo).toBe(`${TEST_PREFIX}-RES-001`);
    insertedIds.resources.push(data!.id);
  }, 15000);

  it('deletes a resource', async () => {
    const { error } = await svc
      .from('resources')
      .delete()
      .eq('id', insertedIds.resources[0]);

    expect(error).toBeNull();

    const { data } = await svc
      .from('resources')
      .select('id')
      .eq('id', insertedIds.resources[0])
      .maybeSingle();

    expect(data).toBeNull();
    insertedIds.resources = [];
  }, 15000);
});

describe('Zod schemas for content', () => {
  it('createCommunicationSchema validates correctly', async () => {
    const { createCommunicationSchema } = await import('@/lib/schemas/communication');

    const valid = createCommunicationSchema.safeParse({
      titolo: 'Test',
      contenuto: 'Body',
    });
    expect(valid.success).toBe(true);

    const invalid = createCommunicationSchema.safeParse({
      contenuto: 'Body only',
    });
    expect(invalid.success).toBe(false);
  });
});
