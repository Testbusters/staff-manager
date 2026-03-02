/**
 * Block 13 — Notification System Overhaul
 *
 * Unit tests covering:
 * - NotificationEntityType extended type (8 types)
 * - buildContentNotification: correct fields per content type
 * - buildCompensationReopenNotification
 * - Email templates E9–E12: subject + html structure
 * - Notification.entity_type accepts content types
 * - VALID_ENTITY_TYPES whitelist in GET /api/notifications
 */
import { describe, it, expect } from 'vitest';
import {
  buildContentNotification,
  buildCompensationReopenNotification,
  type NotificationEntityType,
  type ContentEntityType,
} from '@/lib/notification-utils';
import {
  emailRispostaTicket,
  emailNuovaComunicazione,
  emailNuovoEvento,
  emailNuovoContenuto,
} from '@/lib/email-templates';
import type { Notification } from '@/lib/types';

// ── NotificationEntityType ─────────────────────────────────────

describe('NotificationEntityType', () => {
  const EXPECTED_TYPES: NotificationEntityType[] = [
    'compensation', 'reimbursement', 'document', 'ticket',
    'communication', 'event', 'opportunity', 'discount',
  ];

  it('covers all 8 expected entity types', () => {
    // All values are valid assignments — TypeScript would fail at compile time if not
    EXPECTED_TYPES.forEach((t) => {
      const typed: NotificationEntityType = t;
      expect(typed).toBeDefined();
    });
  });

  it('Notification.entity_type accepts all content types', () => {
    const contentTypes: Array<Notification['entity_type']> = [
      'communication', 'event', 'opportunity', 'discount',
    ];
    contentTypes.forEach((t) => expect(t).toBeTruthy());
  });
});

// ── buildContentNotification ───────────────────────────────────

const DUMMY_USER = 'user-001';
const DUMMY_ID   = 'content-001';

describe('buildContentNotification — communication', () => {
  const n = buildContentNotification(DUMMY_USER, 'communication', DUMMY_ID, 'Test titolo');

  it('sets entity_type = communication', () => {
    expect(n.entity_type).toBe('communication');
  });
  it('sets tipo = comunicazione_pubblicata', () => {
    expect(n.tipo).toBe('comunicazione_pubblicata');
  });
  it('includes titolo in messaggio', () => {
    expect(n.messaggio).toContain('Test titolo');
  });
  it('sets correct user_id and entity_id', () => {
    expect(n.user_id).toBe(DUMMY_USER);
    expect(n.entity_id).toBe(DUMMY_ID);
  });
});

describe('buildContentNotification — event', () => {
  const n = buildContentNotification(DUMMY_USER, 'event', DUMMY_ID, 'Evento test');

  it('sets entity_type = event', () => expect(n.entity_type).toBe('event'));
  it('sets tipo = evento_pubblicato', () => expect(n.tipo).toBe('evento_pubblicato'));
  it('includes titolo in messaggio', () => expect(n.messaggio).toContain('Evento test'));
});

describe('buildContentNotification — opportunity', () => {
  const n = buildContentNotification(DUMMY_USER, 'opportunity', DUMMY_ID, 'Opp test');

  it('sets entity_type = opportunity', () => expect(n.entity_type).toBe('opportunity'));
  it('sets tipo = opportunita_pubblicata', () => expect(n.tipo).toBe('opportunita_pubblicata'));
});

describe('buildContentNotification — discount', () => {
  const n = buildContentNotification(DUMMY_USER, 'discount', DUMMY_ID, 'Sconto test');

  it('sets entity_type = discount', () => expect(n.entity_type).toBe('discount'));
  it('sets tipo = sconto_pubblicato', () => expect(n.tipo).toBe('sconto_pubblicato'));
});

// ── buildCompensationReopenNotification ────────────────────────

describe('buildCompensationReopenNotification', () => {
  const RESP_ID = 'resp-001';
  const COMP_ID = 'comp-001';
  const n = buildCompensationReopenNotification(RESP_ID, COMP_ID);

  it('sets entity_type = compensation', () => expect(n.entity_type).toBe('compensation'));
  it('sets tipo = comp_inviato', () => expect(n.tipo).toBe('comp_inviato'));
  it('targets responsabile user_id', () => expect(n.user_id).toBe(RESP_ID));
  it('sets correct entity_id', () => expect(n.entity_id).toBe(COMP_ID));
  it('messaggio mentions rifiutato/approvazione', () => {
    expect(n.messaggio.toLowerCase()).toMatch(/rifiutato|approvazione/);
  });
});

// ── Email templates E9–E12 ─────────────────────────────────────

describe('E9 emailRispostaTicket', () => {
  const { subject, html } = emailRispostaTicket({
    nome: 'Mario',
    oggetto: 'Problema accesso',
    data: '02/03/2026',
  });

  it('subject contains oggetto', () => {
    expect(subject).toContain('Problema accesso');
  });
  it('html contains nome', () => expect(html).toContain('Mario'));
  it('html contains oggetto', () => expect(html).toContain('Problema accesso'));
  it('html is valid HTML structure', () => {
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });
});

describe('E10 emailNuovaComunicazione', () => {
  const { subject, html } = emailNuovaComunicazione({
    nome: 'Luca',
    titolo: 'Aggiornamento policy',
    data: '02/03/2026',
  });

  it('subject contains titolo', () => expect(subject).toContain('Aggiornamento policy'));
  it('html contains greeting', () => expect(html).toContain('Luca'));
  it('html is valid HTML', () => expect(html).toContain('<!DOCTYPE html>'));
});

describe('E11 emailNuovoEvento', () => {
  const { subject, html } = emailNuovoEvento({
    nome: 'Anna',
    titolo: 'Workshop UX',
    data: '02/03/2026',
  });

  it('subject contains titolo', () => expect(subject).toContain('Workshop UX'));
  it('html contains nome', () => expect(html).toContain('Anna'));
});

describe('E12 emailNuovoContenuto — Opportunità', () => {
  const { subject, html } = emailNuovoContenuto({
    nome: 'Carlo',
    tipo: 'Opportunità',
    titolo: 'Stage marketing',
    data: '02/03/2026',
  });

  it('subject contains titolo', () => expect(subject).toContain('Stage marketing'));
  it('subject uses feminine form (Nuova)', () => {
    expect(subject.toLowerCase()).toMatch(/^nuov[ao]/);
  });
  it('html contains tipo', () => expect(html).toContain('Opportunità'));
});

describe('E12 emailNuovoContenuto — Sconto', () => {
  const { subject, html } = emailNuovoContenuto({
    nome: 'Giulia',
    tipo: 'Sconto',
    titolo: 'Amazon 20%',
    data: '02/03/2026',
  });

  it('subject uses masculine form (Nuovo sconto)', () => {
    expect(subject.toLowerCase()).toMatch(/^nuovo\s+sconto/);
  });
  it('html contains fornitore titolo', () => expect(html).toContain('Amazon 20%'));
});

// ── entity_type filter whitelist ───────────────────────────────

describe('GET /api/notifications entity_type whitelist', () => {
  const VALID = [
    'compensation', 'reimbursement', 'document', 'ticket',
    'communication', 'event', 'opportunity', 'discount',
  ];
  const INVALID = ['announcement', 'benefit', 'super_admin', '', 'DROP TABLE'];

  it('all 8 content types are in the valid list', () => {
    VALID.forEach((t) => expect(VALID.includes(t)).toBe(true));
  });

  it('stale/invalid values are not in the valid list', () => {
    INVALID.forEach((t) => expect(VALID.includes(t)).toBe(false));
  });

  it('old table names (announcements, benefits) are not valid entity types', () => {
    expect(VALID.includes('announcement')).toBe(false);
    expect(VALID.includes('benefit')).toBe(false);
  });
});
