import { describe, it, expect } from 'vitest';
import {
  buildCompensationNotification,
  buildExpenseNotification,
  buildTicketReplyNotification,
  buildCompensationSubmitNotification,
  buildExpenseSubmitNotification,
  buildTicketCreatedNotification,
  buildTicketCollabReplyNotification,
  buildCompensationReopenNotification,
  buildContentNotification,
  buildTicketStatusNotification,
  buildLiquidazioneRequestNotification,
  COMPENSATION_NOTIFIED_ACTIONS,
  EXPENSE_NOTIFIED_ACTIONS,
} from '@/lib/notification-utils';

const USER_ID = 'user-abc';
const ENTITY_ID = 'entity-123';

describe('buildCompensationNotification', () => {
  it('approve — correct titolo and tipo', () => {
    const n = buildCompensationNotification('approve', USER_ID, ENTITY_ID);
    expect(n.user_id).toBe(USER_ID);
    expect(n.entity_type).toBe('compensation');
    expect(n.entity_id).toBe(ENTITY_ID);
    expect(n.tipo).toBe('approvato');
    expect(n.titolo).toBe('Compenso approvato');
    expect(n.messaggio).toBe('Il tuo compenso è stato approvato.');
  });

  it('reject — default message when no note', () => {
    const n = buildCompensationNotification('reject', USER_ID, ENTITY_ID);
    expect(n.tipo).toBe('rifiutato');
    expect(n.titolo).toBe('Compenso rifiutato');
    expect(n.messaggio).toBe('Il tuo compenso è stato rifiutato.');
  });

  it('reject — note included in messaggio', () => {
    const n = buildCompensationNotification('reject', USER_ID, ENTITY_ID, 'Allegato mancante');
    expect(n.messaggio).toBe('Motivazione: Allegato mancante');
  });

  it('mark_liquidated — correct titolo', () => {
    const n = buildCompensationNotification('mark_liquidated', USER_ID, ENTITY_ID);
    expect(n.tipo).toBe('liquidato');
    expect(n.titolo).toBe('Compenso liquidato');
  });
});

describe('buildExpenseNotification', () => {
  it('approve — correct titolo', () => {
    const n = buildExpenseNotification('approve', USER_ID, ENTITY_ID);
    expect(n.entity_type).toBe('reimbursement');
    expect(n.tipo).toBe('approvato');
    expect(n.titolo).toBe('Rimborso approvato');
  });

  it('reject — default message when no note', () => {
    const n = buildExpenseNotification('reject', USER_ID, ENTITY_ID);
    expect(n.tipo).toBe('rifiutato');
    expect(n.titolo).toBe('Rimborso rifiutato');
    expect(n.messaggio).toBe('Il tuo rimborso è stato rifiutato.');
  });

  it('reject — note included in messaggio', () => {
    const n = buildExpenseNotification('reject', USER_ID, ENTITY_ID, 'Scontrino illeggibile');
    expect(n.messaggio).toBe('Motivazione: Scontrino illeggibile');
  });

  it('mark_liquidated — correct titolo', () => {
    const n = buildExpenseNotification('mark_liquidated', USER_ID, ENTITY_ID);
    expect(n.tipo).toBe('liquidato');
    expect(n.titolo).toBe('Rimborso liquidato');
  });
});

describe('NOTIFIED_ACTIONS constants', () => {
  it('COMPENSATION_NOTIFIED_ACTIONS includes all expected actions', () => {
    expect(COMPENSATION_NOTIFIED_ACTIONS).toContain('approve');
    expect(COMPENSATION_NOTIFIED_ACTIONS).toContain('reject');
    expect(COMPENSATION_NOTIFIED_ACTIONS).toContain('mark_liquidated');
    expect(COMPENSATION_NOTIFIED_ACTIONS).toContain('revert_to_pending');
    expect(COMPENSATION_NOTIFIED_ACTIONS).toHaveLength(4);
  });

  it('EXPENSE_NOTIFIED_ACTIONS includes all expected actions', () => {
    expect(EXPENSE_NOTIFIED_ACTIONS).toContain('approve');
    expect(EXPENSE_NOTIFIED_ACTIONS).toContain('reject');
    expect(EXPENSE_NOTIFIED_ACTIONS).toContain('mark_liquidated');
    expect(EXPENSE_NOTIFIED_ACTIONS).toContain('revert_to_pending');
    expect(EXPENSE_NOTIFIED_ACTIONS).toHaveLength(4);
  });
});

// ── Additional build* functions ─────────────────────────────────────────────

describe('buildTicketReplyNotification', () => {
  it('returns correct payload', () => {
    const n = buildTicketReplyNotification(USER_ID, ENTITY_ID, 'Problema compenso');
    expect(n.user_id).toBe(USER_ID);
    expect(n.entity_type).toBe('ticket');
    expect(n.entity_id).toBe(ENTITY_ID);
    expect(n.titolo).toBeTruthy();
  });
});

describe('buildCompensationSubmitNotification', () => {
  it('returns correct payload for responsabile', () => {
    const n = buildCompensationSubmitNotification(USER_ID, ENTITY_ID);
    expect(n.user_id).toBe(USER_ID);
    expect(n.entity_type).toBe('compensation');
    expect(n.entity_id).toBe(ENTITY_ID);
  });
});

describe('buildExpenseSubmitNotification', () => {
  it('returns correct payload for responsabile', () => {
    const n = buildExpenseSubmitNotification(USER_ID, ENTITY_ID);
    expect(n.user_id).toBe(USER_ID);
    expect(n.entity_type).toBe('reimbursement');
  });
});

describe('buildTicketCreatedNotification', () => {
  it('returns correct payload', () => {
    const n = buildTicketCreatedNotification(USER_ID, ENTITY_ID, 'Problema accesso');
    expect(n.entity_type).toBe('ticket');
    expect(n.titolo).toBeTruthy();
  });
});

describe('buildTicketCollabReplyNotification', () => {
  it('returns correct payload', () => {
    const n = buildTicketCollabReplyNotification(USER_ID, ENTITY_ID, 'Oggetto test');
    expect(n.entity_type).toBe('ticket');
  });
});

describe('buildCompensationReopenNotification', () => {
  it('returns correct payload', () => {
    const n = buildCompensationReopenNotification(USER_ID, ENTITY_ID);
    expect(n.entity_type).toBe('compensation');
    expect(n.user_id).toBe(USER_ID);
  });
});

describe('buildContentNotification', () => {
  const types = ['communication', 'event', 'opportunity', 'discount'] as const;
  for (const t of types) {
    it(`returns correct payload for ${t}`, () => {
      const n = buildContentNotification(USER_ID, t, ENTITY_ID, 'Titolo contenuto');
      expect(n.user_id).toBe(USER_ID);
      expect(n.entity_type).toBe(t);
      expect(n.entity_id).toBe(ENTITY_ID);
      expect(n.titolo).toBeTruthy();
    });
  }
});

describe('buildTicketStatusNotification', () => {
  it('returns correct payload with stato in message', () => {
    const n = buildTicketStatusNotification(USER_ID, ENTITY_ID, 'CHIUSO');
    expect(n.entity_type).toBe('ticket');
    expect(n.messaggio.toLowerCase()).toContain('chiuso');
  });
});

describe('buildLiquidazioneRequestNotification', () => {
  it('handles created action', () => {
    const n = buildLiquidazioneRequestNotification('created', USER_ID, ENTITY_ID, 500);
    expect(n.entity_type).toBe('liquidazione_request');
    expect(n.user_id).toBe(USER_ID);
  });

  it('handles accettata action', () => {
    const n = buildLiquidazioneRequestNotification('accettata', USER_ID, ENTITY_ID, 500);
    expect(n.entity_type).toBe('liquidazione_request');
  });

  it('handles annullata action with nota', () => {
    const n = buildLiquidazioneRequestNotification('annullata', USER_ID, ENTITY_ID, 500, 'Motivo');
    expect(n.entity_type).toBe('liquidazione_request');
  });
});

describe('compensation revert_to_pending', () => {
  it('returns correct payload', () => {
    const n = buildCompensationNotification('revert_to_pending', USER_ID, ENTITY_ID);
    expect(n.entity_type).toBe('compensation');
    expect(n.tipo).toBeTruthy();
  });

  it('includes note when provided', () => {
    const n = buildCompensationNotification('revert_to_pending', USER_ID, ENTITY_ID, 'Da rivedere');
    expect(n.messaggio).toContain('Da rivedere');
  });
});
