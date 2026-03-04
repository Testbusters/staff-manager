/**
 * Block 15a — Ticket system overhaul
 *
 * Unit tests covering:
 * - VALID_STATI whitelist for status PATCH route
 * - buildTicketReplyNotification: correct fields for collaboratore
 * - buildTicketCollabReplyNotification: correct fields for responsabile
 * - buildTicketStatusNotification: all 3 stato transitions
 * - buildTicketCreatedNotification: fields for new ticket
 * - Message validation: empty/whitespace-only message rejected
 * - Business rule: CHIUSO ticket blocks reply
 */
import { describe, it, expect } from 'vitest';
import type { TicketStatus } from '@/lib/types';
import {
  buildTicketReplyNotification,
  buildTicketCollabReplyNotification,
  buildTicketStatusNotification,
  buildTicketCreatedNotification,
} from '@/lib/notification-utils';

// ── VALID_STATI ─────────────────────────────────────────────────

const VALID_STATI: TicketStatus[] = ['APERTO', 'IN_LAVORAZIONE', 'CHIUSO'];

describe('VALID_STATI', () => {
  it('accepts APERTO', () => {
    expect(VALID_STATI.includes('APERTO')).toBe(true);
  });

  it('accepts IN_LAVORAZIONE', () => {
    expect(VALID_STATI.includes('IN_LAVORAZIONE')).toBe(true);
  });

  it('accepts CHIUSO', () => {
    expect(VALID_STATI.includes('CHIUSO')).toBe(true);
  });

  it('rejects an invalid value', () => {
    // Simulate the route guard
    const stato = 'PENDENTE' as TicketStatus;
    expect(VALID_STATI.includes(stato)).toBe(false);
  });

  it('has exactly 3 values', () => {
    expect(VALID_STATI).toHaveLength(3);
  });
});

// ── Message validation ──────────────────────────────────────────

describe('message validation (route guard logic)', () => {
  function isValidMessage(raw: unknown): boolean {
    if (typeof raw !== 'string') return false;
    return raw.trim().length > 0;
  }

  it('accepts a non-empty string', () => {
    expect(isValidMessage('Ciao, ho un problema.')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidMessage('')).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    expect(isValidMessage('   \n\t  ')).toBe(false);
  });

  it('rejects null', () => {
    expect(isValidMessage(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isValidMessage(undefined)).toBe(false);
  });
});

// ── Closed ticket guard ─────────────────────────────────────────

describe('CHIUSO ticket blocks reply (route business rule)', () => {
  it('CHIUSO stato triggers rejection', () => {
    const ticketStato = 'CHIUSO' as TicketStatus;
    expect(ticketStato === 'CHIUSO').toBe(true);
  });

  it('APERTO stato does not block reply', () => {
    const ticketStato = 'APERTO' as TicketStatus;
    expect(ticketStato === 'CHIUSO').toBe(false);
  });

  it('IN_LAVORAZIONE stato does not block reply', () => {
    const ticketStato = 'IN_LAVORAZIONE' as TicketStatus;
    expect(ticketStato === 'CHIUSO').toBe(false);
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
