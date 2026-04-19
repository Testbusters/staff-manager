/**
 * Tests for tickets table operations (DB integration).
 * HTTP routes require session auth — tested here via service role DB operations.
 * Auth boundary (401) covered by auth-boundary-sweep-2.
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
  throw new Error('Wrong Supabase project — only run against staging.');
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Known staging user_id for collaboratore_tb_test@test.com
const TEST_USER_ID = '80238f5b-78d1-48a3-ac5a-4cf65126a111';
const TEST_PREFIX = 'UAT-TICKETS-CRUD';

beforeAll(async () => {
  // Cleanup stale test tickets
  const { data: staleTickets } = await svc
    .from('tickets')
    .select('id')
    .eq('creator_user_id', TEST_USER_ID)
    .like('oggetto', `${TEST_PREFIX}%`);

  if (staleTickets?.length) {
    const ids = staleTickets.map((t) => t.id);
    await svc.from('ticket_messages').delete().in('ticket_id', ids);
    await svc.from('tickets').delete().in('id', ids);
  }
}, 15000);

afterAll(async () => {
  const { data: tickets } = await svc
    .from('tickets')
    .select('id')
    .eq('creator_user_id', TEST_USER_ID)
    .like('oggetto', `${TEST_PREFIX}%`);

  if (tickets?.length) {
    const ids = tickets.map((t) => t.id);
    await svc.from('ticket_messages').delete().in('ticket_id', ids);
    await svc.from('tickets').delete().in('id', ids);
  }
}, 15000);

describe('tickets CRUD via service role', () => {
  let ticketId: string;

  it('inserts a ticket', async () => {
    const { data, error } = await svc
      .from('tickets')
      .insert({
        creator_user_id: TEST_USER_ID,
        categoria: 'Compenso',
        oggetto: `${TEST_PREFIX}-001`,
        stato: 'APERTO',
        priority: 'NORMALE',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.stato).toBe('APERTO');
    expect(data!.priority).toBe('NORMALE');
    ticketId = data!.id;
  }, 15000);

  it('reads the ticket back', async () => {
    const { data, error } = await svc
      .from('tickets')
      .select('id, creator_user_id, categoria, oggetto, stato, priority')
      .eq('id', ticketId)
      .single();

    expect(error).toBeNull();
    expect(data!.oggetto).toBe(`${TEST_PREFIX}-001`);
    expect(data!.creator_user_id).toBe(TEST_USER_ID);
  }, 15000);

  it('inserts a ticket message', async () => {
    const { data, error } = await svc
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        author_user_id: TEST_USER_ID,
        message: 'Test message body',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.message).toBe('Test message body');
  }, 15000);

  it('updates ticket status', async () => {
    const { error } = await svc
      .from('tickets')
      .update({ stato: 'IN_LAVORAZIONE' })
      .eq('id', ticketId);

    expect(error).toBeNull();

    const { data } = await svc
      .from('tickets')
      .select('stato')
      .eq('id', ticketId)
      .single();

    expect(data!.stato).toBe('IN_LAVORAZIONE');
  }, 15000);
});

describe('ticket Zod schema', () => {
  it('rejects missing required fields', async () => {
    const { createTicketSchema } = await import('@/lib/schemas/ticket');

    const r1 = createTicketSchema.safeParse({ categoria: 'Compenso' });
    expect(r1.success).toBe(false);

    const r2 = createTicketSchema.safeParse({ oggetto: 'Test' });
    expect(r2.success).toBe(false);
  });

  it('accepts valid minimal payload', async () => {
    const { createTicketSchema } = await import('@/lib/schemas/ticket');

    const r = createTicketSchema.safeParse({ categoria: 'Compenso', oggetto: 'Test ticket' });
    expect(r.success).toBe(true);
  });

  it('accepts payload with optional fields', async () => {
    const { createTicketSchema } = await import('@/lib/schemas/ticket');

    const r = createTicketSchema.safeParse({
      categoria: 'Altro',
      oggetto: 'Help',
      messaggio: 'Details here',
    });
    expect(r.success).toBe(true);
  });
});

describe('unauthenticated access', () => {
  it('GET /api/tickets → redirect or 401', async () => {
    const res = await fetch(`${APP_URL}/api/tickets`, { redirect: 'manual' });
    expect([307, 401]).toContain(res.status);
  }, 15000);

  it('POST /api/tickets → redirect or 401', async () => {
    const res = await fetch(`${APP_URL}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoria: 'Test', oggetto: 'Test' }),
      redirect: 'manual',
    });
    expect([307, 401]).toContain(res.status);
  }, 15000);
});
