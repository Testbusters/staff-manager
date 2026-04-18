/**
 * Unit test: Zod schema validation for POST /api/admin/create-user
 * Imports the ACTUAL schema from lib/schemas/api.ts (single source of truth).
 */
import { describe, it, expect } from 'vitest';
import { createUserApiSchema as schema } from '@/lib/schemas/api';

const VALID_UUID = 'a1b2c3d4-e5f6-4789-a012-a3b4c5d6e7f8';

const BASE = {
  email: 'a@b.com',
  community_id: VALID_UUID,
  tipo_contratto: 'OCCASIONALE' as const,
  citta: 'Roma',
};

describe('create-user schema (admin-invite-gaps)', () => {
  it('accepts valid payload with OCCASIONALE', () => {
    expect(schema.safeParse(BASE).success).toBe(true);
  });

  it('accepts OCCASIONALE_P4M', () => {
    expect(schema.safeParse({ ...BASE, tipo_contratto: 'OCCASIONALE_P4M' }).success).toBe(true);
  });

  it('accepts salta_firma true', () => {
    expect(schema.safeParse({ ...BASE, salta_firma: true }).success).toBe(true);
  });

  it('accepts salta_firma false', () => {
    expect(schema.safeParse({ ...BASE, salta_firma: false }).success).toBe(true);
  });

  it('accepts when salta_firma is omitted', () => {
    expect(schema.safeParse(BASE).success).toBe(true);
  });

  it('rejects invalid community_id (not a UUID)', () => {
    expect(schema.safeParse({ ...BASE, community_id: 'not-a-uuid' }).success).toBe(false);
  });

  it('rejects missing community_id', () => {
    const { community_id: _, ...rest } = BASE;
    expect(schema.safeParse(rest).success).toBe(false);
  });

  it('rejects invalid tipo_contratto value', () => {
    expect(schema.safeParse({ ...BASE, tipo_contratto: 'COCOCO' }).success).toBe(false);
  });

  it('rejects missing tipo_contratto', () => {
    const { tipo_contratto: _, ...rest } = BASE;
    expect(schema.safeParse(rest).success).toBe(false);
  });

  it('rejects empty citta', () => {
    expect(schema.safeParse({ ...BASE, citta: '' }).success).toBe(false);
  });

  it('rejects missing citta', () => {
    const { citta: _, ...rest } = BASE;
    expect(schema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing email', () => {
    const { email: _, ...rest } = BASE;
    expect(schema.safeParse(rest).success).toBe(false);
  });

  it('rejects invalid email format', () => {
    expect(schema.safeParse({ ...BASE, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects non-boolean salta_firma', () => {
    expect(schema.safeParse({ ...BASE, salta_firma: 'yes' }).success).toBe(false);
  });
});
