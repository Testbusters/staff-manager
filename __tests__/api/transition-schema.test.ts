/**
 * Unit tests: transition, mark-paid, approve-all schemas
 * Imports the ACTUAL schemas from lib/schemas/api.ts (single source of truth).
 */
import { describe, it, expect } from 'vitest';
import {
  compensationTransitionApiSchema,
  expenseTransitionApiSchema,
  markPaidApiSchema,
  approveAllApiSchema,
} from '@/lib/schemas/api';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

// ── Compensation transition ────────────────────────────────────────────────────

describe('compensation transition schema', () => {
  it('accetta tutte le 5 azioni valide', () => {
    const valid = ['reopen', 'approve', 'reject', 'mark_liquidated', 'revert_to_pending'];
    for (const action of valid) {
      expect(compensationTransitionApiSchema.safeParse({ action }).success).toBe(true);
    }
  });

  it('rifiuta le azioni legacy rimosse in Block 7', () => {
    const legacy = [
      'submit',
      'withdraw',
      'mark_paid',
      'approve_manager',
      'reject_manager',
      'request_integration',
      'approve_admin',
      'resubmit',
    ];
    for (const action of legacy) {
      expect(compensationTransitionApiSchema.safeParse({ action }).success).toBe(false);
    }
  });

  it('rifiuta payload senza action', () => {
    expect(compensationTransitionApiSchema.safeParse({}).success).toBe(false);
    expect(compensationTransitionApiSchema.safeParse({ note: 'testo' }).success).toBe(false);
  });

  it('note è opzionale e viene preservata', () => {
    const result = compensationTransitionApiSchema.safeParse({
      action: 'reject',
      note: 'Documentazione insufficiente',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.note).toBe('Documentazione insufficiente');
  });

  it('payment_reference è opzionale e viene preservata', () => {
    const result = compensationTransitionApiSchema.safeParse({
      action: 'mark_liquidated',
      payment_reference: 'BONIF-2026-042',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.payment_reference).toBe('BONIF-2026-042');
  });

  it('note e payment_reference sono undefined se non forniti', () => {
    const result = compensationTransitionApiSchema.safeParse({ action: 'approve' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toBeUndefined();
      expect(result.data.payment_reference).toBeUndefined();
    }
  });

  it('revert_to_pending accettato con note', () => {
    const result = compensationTransitionApiSchema.safeParse({
      action: 'revert_to_pending',
      note: 'Importo lordo errato',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.note).toBe('Importo lordo errato');
  });
});

// ── Expense transition ─────────────────────────────────────────────────────────

describe('expense transition schema', () => {
  it('accetta le 4 azioni valide per rimborsi', () => {
    const valid = ['approve', 'reject', 'mark_liquidated', 'revert_to_pending'];
    for (const action of valid) {
      expect(expenseTransitionApiSchema.safeParse({ action }).success).toBe(true);
    }
  });

  it('rifiuta submit, withdraw, reopen (non previsti per rimborsi)', () => {
    const disallowed = ['submit', 'withdraw', 'reopen'];
    for (const action of disallowed) {
      expect(expenseTransitionApiSchema.safeParse({ action }).success).toBe(false);
    }
  });

  it('rifiuta le azioni legacy rimosse in Block 7', () => {
    const legacy = ['mark_paid', 'approve_manager', 'reject_manager', 'request_integration'];
    for (const action of legacy) {
      expect(expenseTransitionApiSchema.safeParse({ action }).success).toBe(false);
    }
  });

  it('rifiuta payload senza action', () => {
    expect(expenseTransitionApiSchema.safeParse({}).success).toBe(false);
  });

  it('note opzionale per reject', () => {
    const result = expenseTransitionApiSchema.safeParse({
      action: 'reject',
      note: 'Scontrino illeggibile',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.note).toBe('Scontrino illeggibile');
  });

  it('revert_to_pending accettato con note', () => {
    const result = expenseTransitionApiSchema.safeParse({
      action: 'revert_to_pending',
      note: 'Importo da verificare',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.note).toBe('Importo da verificare');
  });

  it('revert_to_pending accettato anche senza note (validazione note nel route handler)', () => {
    const result = expenseTransitionApiSchema.safeParse({ action: 'revert_to_pending' });
    expect(result.success).toBe(true);
  });
});

// ── Mark-paid (liquidazione bulk) schema ──────────────────────────────────────

describe('mark-paid schema', () => {
  it('accetta payload valido per compensations', () => {
    const result = markPaidApiSchema.safeParse({
      ids: [VALID_UUID],
      payment_reference: 'BONIF-2026-001',
      table: 'compensations',
    });
    expect(result.success).toBe(true);
  });

  it('accetta payload valido per expenses', () => {
    const result = markPaidApiSchema.safeParse({
      ids: [VALID_UUID, '223e4567-e89b-12d3-a456-426614174001'],
      payment_reference: 'RIM-2026-001',
      table: 'expenses',
    });
    expect(result.success).toBe(true);
  });

  it('rifiuta ids vuoto (min 1)', () => {
    const result = markPaidApiSchema.safeParse({
      ids: [],
      payment_reference: 'BONIF',
      table: 'compensations',
    });
    expect(result.success).toBe(false);
  });

  it('rifiuta id non-UUID', () => {
    const result = markPaidApiSchema.safeParse({
      ids: ['not-a-valid-uuid'],
      payment_reference: 'BONIF',
      table: 'compensations',
    });
    expect(result.success).toBe(false);
  });

  it('rifiuta payment_reference vuoto', () => {
    const result = markPaidApiSchema.safeParse({
      ids: [VALID_UUID],
      payment_reference: '',
      table: 'compensations',
    });
    expect(result.success).toBe(false);
  });

  it('rifiuta table non valida', () => {
    const result = markPaidApiSchema.safeParse({
      ids: [VALID_UUID],
      payment_reference: 'BONIF',
      table: 'invalid_table',
    });
    expect(result.success).toBe(false);
  });

  it('rifiuta expense_reimbursements (nome interno — il campo pubblico è "expenses")', () => {
    const result = markPaidApiSchema.safeParse({
      ids: [VALID_UUID],
      payment_reference: 'BONIF',
      table: 'expense_reimbursements',
    });
    expect(result.success).toBe(false);
  });

  it('rifiuta payload senza payment_reference', () => {
    const result = markPaidApiSchema.safeParse({
      ids: [VALID_UUID],
      table: 'compensations',
    });
    expect(result.success).toBe(false);
  });
});

// ── Approve-all schema ────────────────────────────────────────────────────────

describe('approve-all schema', () => {
  it('accetta UUID valido', () => {
    const result = approveAllApiSchema.safeParse({ community_id: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it('rifiuta stringa non-UUID', () => {
    expect(approveAllApiSchema.safeParse({ community_id: 'not-a-uuid' }).success).toBe(false);
    expect(approveAllApiSchema.safeParse({ community_id: '123' }).success).toBe(false);
  });

  it('rifiuta payload senza community_id', () => {
    expect(approveAllApiSchema.safeParse({}).success).toBe(false);
  });
});
