/**
 * Block 15a — Ticket system overhaul
 *
 * Unit tests covering:
 * - VALID_TICKET_STATI: imported from lib/schemas/api.ts (single source of truth)
 * - buildTicketReplyNotification: correct fields for collaboratore
 * - buildTicketCollabReplyNotification: correct fields for responsabile
 * - buildTicketStatusNotification: all 3 stato transitions
 * - buildTicketCreatedNotification: fields for new ticket
 * - Message validation: behavior contract (route validates inline via ?.trim())
 */
import { describe, it, expect } from 'vitest';
import { VALID_TICKET_STATI } from '@/lib/schemas/api';
import {
  buildTicketReplyNotification,
  buildTicketCollabReplyNotification,
  buildTicketStatusNotification,
  buildTicketCreatedNotification,
} from '@/lib/notification-utils';

// ── VALID_TICKET_STATI (imported — not a local copy) ──────────────

describe('VALID_TICKET_STATI', () => {
  it('includes APERTO', () => {
    expect(VALID_TICKET_STATI).toContain('APERTO');
  });

  it('includes IN_LAVORAZIONE', () => {
    expect(VALID_TICKET_STATI).toContain('IN_LAVORAZIONE');
  });

  it('includes CHIUSO', () => {
    expect(VALID_TICKET_STATI).toContain('CHIUSO');
  });

  it('rejects an invalid value', () => {
    expect(VALID_TICKET_STATI).not.toContain('PENDENTE');
  });

  it('has exactly 3 values', () => {
    expect(VALID_TICKET_STATI).toHaveLength(3);
  });
});

// ── Message validation (behavior contract — route uses inline ?.trim()) ───

describe('message validation (behavior contract)', () => {
  // The ticket messages route validates with: (formData.get('message') as string | null)?.trim()
  // Then checks if (!rawMessage) return 400. These tests document the expected behavior.
  it('non-empty trimmed string is valid', () => {
    const raw = 'Ciao, ho un problema.';
    expect(raw.trim().length > 0).toBe(true);
  });

  it('empty string is invalid', () => {
    const raw = '';
    expect(raw.trim().length > 0).toBe(false);
  });

  it('whitespace-only string is invalid', () => {
    const raw = '   \n\t  ';
    expect(raw.trim().length > 0).toBe(false);
  });
});

// ── buildTicketReplyNotification ────────────────────────────────

const COLLAB_ID  = 'user-collab-001';
const TICKET_ID  = 'ticket-abc-123';
const OGGETTO    = 'Problema con il compenso di febbraio';

describe('buildTicketReplyNotification', () => {
  const n = buildTicketReplyNotification(COLLAB_ID, TICKET_ID, OGGETTO);

  it('targets the collaboratore', () => {
    expect(n.user_id).toBe(COLLAB_ID);
  });

  it('sets entity_type = ticket', () => {
    expect(n.entity_type).toBe('ticket');
  });

  it('sets entity_id = ticketId', () => {
    expect(n.entity_id).toBe(TICKET_ID);
  });

  it('sets tipo = risposta_ticket', () => {
    expect(n.tipo).toBe('risposta_ticket');
  });

  it('includes oggetto in messaggio', () => {
    expect(n.messaggio).toContain(OGGETTO);
  });

  it('has a non-empty titolo', () => {
    expect(n.titolo.length).toBeGreaterThan(0);
  });
});

// ── buildTicketCollabReplyNotification ──────────────────────────

const RESP_ID = 'user-resp-002';

describe('buildTicketCollabReplyNotification', () => {
  const n = buildTicketCollabReplyNotification(RESP_ID, TICKET_ID, OGGETTO);

  it('targets the responsabile', () => {
    expect(n.user_id).toBe(RESP_ID);
  });

  it('sets entity_type = ticket', () => {
    expect(n.entity_type).toBe('ticket');
  });

  it('sets entity_id = ticketId', () => {
    expect(n.entity_id).toBe(TICKET_ID);
  });

  it('sets tipo = risposta_ticket_collab', () => {
    expect(n.tipo).toBe('risposta_ticket_collab');
  });

  it('includes oggetto in messaggio', () => {
    expect(n.messaggio).toContain(OGGETTO);
  });
});

// ── buildTicketStatusNotification ──────────────────────────────

describe('buildTicketStatusNotification — APERTO', () => {
  const n = buildTicketStatusNotification(COLLAB_ID, TICKET_ID, 'APERTO');

  it('targets the collaboratore', () => {
    expect(n.user_id).toBe(COLLAB_ID);
  });

  it('sets entity_type = ticket', () => {
    expect(n.entity_type).toBe('ticket');
  });

  it('sets tipo = ticket_stato', () => {
    expect(n.tipo).toBe('ticket_stato');
  });

  it('includes human-readable label "Aperto"', () => {
    expect(n.messaggio).toContain('Aperto');
  });
});

describe('buildTicketStatusNotification — IN_LAVORAZIONE', () => {
  const n = buildTicketStatusNotification(COLLAB_ID, TICKET_ID, 'IN_LAVORAZIONE');

  it('includes human-readable label "In lavorazione"', () => {
    expect(n.messaggio).toContain('In lavorazione');
  });
});

describe('buildTicketStatusNotification — CHIUSO', () => {
  const n = buildTicketStatusNotification(COLLAB_ID, TICKET_ID, 'CHIUSO');

  it('includes human-readable label "Chiuso"', () => {
    expect(n.messaggio).toContain('Chiuso');
  });
});

// ── buildTicketCreatedNotification ──────────────────────────────

describe('buildTicketCreatedNotification', () => {
  const n = buildTicketCreatedNotification(RESP_ID, TICKET_ID, OGGETTO);

  it('targets the responsabile', () => {
    expect(n.user_id).toBe(RESP_ID);
  });

  it('sets entity_type = ticket', () => {
    expect(n.entity_type).toBe('ticket');
  });

  it('sets entity_id = ticketId', () => {
    expect(n.entity_id).toBe(TICKET_ID);
  });

  it('sets tipo = ticket_creato', () => {
    expect(n.tipo).toBe('ticket_creato');
  });

  it('includes oggetto in messaggio', () => {
    expect(n.messaggio).toContain(OGGETTO);
  });
});
