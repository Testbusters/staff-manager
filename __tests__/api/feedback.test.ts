/**
 * Tests for /api/feedback — Bug #1 + basic coverage.
 * - Auth boundary: no session → 307 redirect (HTTP test via fetch)
 * - Zod validation: missing messaggio → schema rejection (unit)
 * - DB state: service role insert → feedback record created
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

// Zod schema mirrors the route validation
const FeedbackSchema = z.object({
  categoria: z.enum(['Bug', 'Suggerimento', 'Domanda', 'Altro']),
  pagina: z.string().max(500).default(''),
  messaggio: z.string().min(1, 'Messaggio obbligatorio').max(5000),
});

// Use the admin test user ID (has a valid user_profiles row)
const ADMIN_USER_ID = 'c5e0fc9e-b415-4717-b5ed-3526e153a3f0';

let testFeedbackId: string | null = null;

beforeAll(async () => {
  // Cleanup stale test records
  await svc.from('feedback').delete().eq('messaggio', 'TEST-FEEDBACK-v2-bugfixing');
});

afterAll(async () => {
  if (testFeedbackId) {
    await svc.from('feedback').delete().eq('id', testFeedbackId);
  }
  await svc.from('feedback').delete().eq('messaggio', 'TEST-FEEDBACK-v2-bugfixing');
});

describe('POST /api/feedback', () => {
  it('unauthenticated → 307 redirect', async () => {
    const fd = new FormData();
    fd.append('categoria', 'Bug');
    fd.append('messaggio', 'test');
    const res = await fetch(`${APP_URL}/api/feedback`, {
      method: 'POST',
      body: fd,
      redirect: 'manual',
    });
    expect([307, 401]).toContain(res.status);
  });

  it('Zod schema: missing messaggio → parse fails', () => {
    const result = FeedbackSchema.safeParse({ categoria: 'Bug', pagina: '/test' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'messaggio')).toBe(true);
    }
  });

  it('Zod schema: invalid categoria → parse fails', () => {
    const result = FeedbackSchema.safeParse({ categoria: 'invalid', messaggio: 'hello' });
    expect(result.success).toBe(false);
  });

  it('Zod schema: valid payload → parse succeeds', () => {
    const result = FeedbackSchema.safeParse({ categoria: 'Bug', messaggio: 'test message' });
    expect(result.success).toBe(true);
  });

  it('service role insert creates feedback record in DB', async () => {
    // Service role bypasses RLS — simulates what the API route does after auth
    const { data, error } = await svc
      .from('feedback')
      .insert({
        user_id: ADMIN_USER_ID,
        role: 'amministrazione',
        categoria: 'Bug',
        pagina: '/test',
        messaggio: 'TEST-FEEDBACK-v2-bugfixing',
      })
      .select('id, categoria, messaggio')
      .single();

    expect(error).toBeNull();
    expect(data?.categoria).toBe('Bug');
    expect(data?.messaggio).toBe('TEST-FEEDBACK-v2-bugfixing');
    testFeedbackId = data?.id ?? null;
  }, 15000);
});
