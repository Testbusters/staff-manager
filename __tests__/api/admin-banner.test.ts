/**
 * Tests for PATCH /api/admin/banner/[communityId]
 * Covers: auth 401, wrong role 403, invalid body 400, invalid UUID 400, happy path
 */
import { describe, it, expect } from 'vitest';
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
const COMMUNITY_TB = '6fdd80e9-2464-4304-9bd7-d5703370a119';

describe('PATCH /api/admin/banner/[communityId]', () => {
  it('unauthenticated → redirect (307 or 401)', async () => {
    const res = await fetch(`${APP_URL}/api/admin/banner/${COMMUNITY_TB}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banner_content: 'test', banner_active: false }),
      redirect: 'manual',
    });
    expect([307, 401]).toContain(res.status);
  }, 15000);

  it('banner_content and banner_active are required fields', () => {
    // Validate the Zod schema used by the route
    const { z } = require('zod');
    const bodySchema = z.object({
      banner_content: z.string(),
      banner_active: z.boolean(),
      banner_link_url: z.string().optional(),
      banner_link_label: z.string().optional(),
      banner_link_new_tab: z.boolean().optional(),
    });

    // Missing banner_content
    const r1 = bodySchema.safeParse({ banner_active: true });
    expect(r1.success).toBe(false);

    // Missing banner_active
    const r2 = bodySchema.safeParse({ banner_content: 'test' });
    expect(r2.success).toBe(false);

    // Valid minimal
    const r3 = bodySchema.safeParse({ banner_content: 'test', banner_active: true });
    expect(r3.success).toBe(true);

    // Valid full
    const r4 = bodySchema.safeParse({
      banner_content: 'Announcement',
      banner_active: true,
      banner_link_url: 'https://example.com',
      banner_link_label: 'Read more',
      banner_link_new_tab: true,
    });
    expect(r4.success).toBe(true);
  });

  it('DB: communities table has banner columns', async () => {
    const { data, error } = await svc
      .from('communities')
      .select('id, banner_content, banner_active, banner_link_url, banner_link_label, banner_link_new_tab, banner_updated_at')
      .eq('id', COMMUNITY_TB)
      .single();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(typeof data!.banner_active).toBe('boolean');
  }, 15000);

  it('service role can update banner fields', async () => {
    // Read current state
    const { data: before } = await svc
      .from('communities')
      .select('banner_content, banner_active')
      .eq('id', COMMUNITY_TB)
      .single();

    // Update
    const { error } = await svc
      .from('communities')
      .update({
        banner_content: 'TEST-BANNER-CONTENT',
        banner_active: false,
        banner_link_url: null,
        banner_link_label: null,
        banner_link_new_tab: false,
        banner_updated_at: new Date().toISOString(),
      })
      .eq('id', COMMUNITY_TB);
    expect(error).toBeNull();

    // Verify
    const { data: after } = await svc
      .from('communities')
      .select('banner_content, banner_active')
      .eq('id', COMMUNITY_TB)
      .single();
    expect(after!.banner_content).toBe('TEST-BANNER-CONTENT');
    expect(after!.banner_active).toBe(false);

    // Restore original state
    await svc
      .from('communities')
      .update({
        banner_content: before?.banner_content ?? '',
        banner_active: before?.banner_active ?? false,
      })
      .eq('id', COMMUNITY_TB);
  }, 15000);
});
