/**
 * Unit tests for all Zod schemas in lib/schemas/.
 * Pure validation — no DB, no server, no network.
 * Covers: valid payloads, missing required fields, type mismatches, edge cases.
 */
import { describe, it, expect, beforeAll } from 'vitest';

// ── compensation schemas ────────────────────────────────────────────────────

describe('lib/schemas/compensation.ts', () => {
  let createCompensationSchema: any;
  let compensationWizardSchema: any;

  beforeAll(async () => {
    const mod = await import('@/lib/schemas/compensation');
    createCompensationSchema = mod.createCompensationSchema;
    compensationWizardSchema = mod.compensationWizardSchema;
  });

  it('createCompensationSchema accepts valid payload', () => {
    const result = createCompensationSchema.safeParse({
      collaborator_id: 'a1b2c3d4-e5f6-4789-a012-a3b4c5d6e7f8',
      data_competenza: '2026-03-01',
      nome_servizio_ruolo: 'Docenza Logica',
      competenza: 'corsi',
      importo_lordo: 100,
      ritenuta_acconto: 20,
      importo_netto: 80,
    });
    expect(result.success).toBe(true);
  });

  it('createCompensationSchema rejects missing collaborator_id', () => {
    const result = createCompensationSchema.safeParse({
      data_competenza: '2026-03-01',
      nome_servizio_ruolo: 'Docenza',
      competenza: 'corsi',
      importo_lordo: 100,
      ritenuta_acconto: 20,
      importo_netto: 80,
    });
    expect(result.success).toBe(false);
  });

  it('createCompensationSchema rejects invalid UUID', () => {
    const result = createCompensationSchema.safeParse({
      collaborator_id: 'not-a-uuid',
      data_competenza: '2026-03-01',
      nome_servizio_ruolo: 'Docenza',
      competenza: 'corsi',
      importo_lordo: 100,
      ritenuta_acconto: 20,
      importo_netto: 80,
    });
    expect(result.success).toBe(false);
  });

  it('createCompensationSchema rejects zero importo_lordo', () => {
    const result = createCompensationSchema.safeParse({
      collaborator_id: 'a1b2c3d4-e5f6-4789-a012-a3b4c5d6e7f8',
      data_competenza: '2026-03-01',
      nome_servizio_ruolo: 'Docenza',
      competenza: 'corsi',
      importo_lordo: 0,
      ritenuta_acconto: 0,
      importo_netto: 0,
    });
    expect(result.success).toBe(false);
  });

  it('compensationWizardSchema accepts valid string importo', () => {
    const result = compensationWizardSchema.safeParse({
      data_competenza: '2026-03-01',
      nome_servizio_ruolo: 'Docenza',
      competenza: 'corsi',
      importo_lordo: '150.50',
    });
    expect(result.success).toBe(true);
  });

  it('compensationWizardSchema rejects non-numeric importo', () => {
    const result = compensationWizardSchema.safeParse({
      data_competenza: '2026-03-01',
      nome_servizio_ruolo: 'Docenza',
      competenza: 'corsi',
      importo_lordo: 'abc',
    });
    expect(result.success).toBe(false);
  });

  it('compensationWizardSchema rejects negative importo', () => {
    const result = compensationWizardSchema.safeParse({
      data_competenza: '2026-03-01',
      nome_servizio_ruolo: 'Docenza',
      competenza: 'corsi',
      importo_lordo: '-10',
    });
    expect(result.success).toBe(false);
  });
});

// ── expense schema ──────────────────────────────────────────────────────────

describe('lib/schemas/expense.ts', () => {
  let expenseSchema: any;

  beforeAll(async () => {
    const mod = await import('@/lib/schemas/expense');
    expenseSchema = mod.expenseSchema;
  });

  it('accepts valid expense', () => {
    expect(expenseSchema.safeParse({
      categoria: 'Trasporti',
      data_spesa: '2026-04-15',
      importo: '45.00',
    }).success).toBe(true);
  });

  it('rejects empty categoria', () => {
    expect(expenseSchema.safeParse({
      categoria: '',
      data_spesa: '2026-04-15',
      importo: '45',
    }).success).toBe(false);
  });

  it('rejects zero importo', () => {
    expect(expenseSchema.safeParse({
      categoria: 'Trasporti',
      data_spesa: '2026-04-15',
      importo: '0',
    }).success).toBe(false);
  });

  it('descrizione is optional', () => {
    const r1 = expenseSchema.safeParse({
      categoria: 'Materiale',
      data_spesa: '2026-04-15',
      importo: '10',
    });
    expect(r1.success).toBe(true);

    const r2 = expenseSchema.safeParse({
      categoria: 'Materiale',
      data_spesa: '2026-04-15',
      importo: '10',
      descrizione: 'Carta A4',
    });
    expect(r2.success).toBe(true);
  });
});

// ── document schemas ────────────────────────────────────────────────────────

describe('lib/schemas/document.ts', () => {
  let documentUploadSchema: any;
  let cuBatchUploadSchema: any;

  beforeAll(async () => {
    const mod = await import('@/lib/schemas/document');
    documentUploadSchema = mod.documentUploadSchema;
    cuBatchUploadSchema = mod.cuBatchUploadSchema;
  });

  it('documentUploadSchema accepts valid payload', () => {
    expect(documentUploadSchema.safeParse({
      tipo: 'CU',
      anno: 2026,
      titolo: 'CU 2026',
    }).success).toBe(true);
  });

  it('documentUploadSchema accepts DA_FIRMARE stato_firma', () => {
    expect(documentUploadSchema.safeParse({
      tipo: 'CONTRATTO',
      anno: 2026,
      titolo: 'Contratto',
      stato_firma: 'DA_FIRMARE',
    }).success).toBe(true);
  });

  it('documentUploadSchema rejects invalid stato_firma', () => {
    expect(documentUploadSchema.safeParse({
      tipo: 'CU',
      anno: 2026,
      titolo: 'CU',
      stato_firma: 'FIRMATO',
    }).success).toBe(false);
  });

  it('documentUploadSchema rejects anno out of range', () => {
    expect(documentUploadSchema.safeParse({
      tipo: 'CU',
      anno: 1999,
      titolo: 'CU',
    }).success).toBe(false);
  });

  it('cuBatchUploadSchema accepts valid year string', () => {
    expect(cuBatchUploadSchema.safeParse({ anno: '2026' }).success).toBe(true);
  });

  it('cuBatchUploadSchema rejects non-numeric string', () => {
    expect(cuBatchUploadSchema.safeParse({ anno: 'abc' }).success).toBe(false);
  });

  it('cuBatchUploadSchema rejects year below 2000', () => {
    expect(cuBatchUploadSchema.safeParse({ anno: '1999' }).success).toBe(false);
  });
});

// ── password schemas ────────────────────────────────────────────────────────

describe('lib/schemas/password.ts', () => {
  let changePasswordSchema: any;
  let profilePasswordSchema: any;

  beforeAll(async () => {
    const mod = await import('@/lib/schemas/password');
    changePasswordSchema = mod.changePasswordSchema;
    profilePasswordSchema = mod.profilePasswordSchema;
  });

  it('changePasswordSchema accepts valid password', () => {
    expect(changePasswordSchema.safeParse({
      password: 'Testbusters1!',
      confirm: 'Testbusters1!',
    }).success).toBe(true);
  });

  it('changePasswordSchema rejects short password', () => {
    expect(changePasswordSchema.safeParse({
      password: 'Ab1!',
      confirm: 'Ab1!',
    }).success).toBe(false);
  });

  it('changePasswordSchema rejects missing uppercase', () => {
    expect(changePasswordSchema.safeParse({
      password: 'testbusters1!',
      confirm: 'testbusters1!',
    }).success).toBe(false);
  });

  it('changePasswordSchema rejects missing number/symbol', () => {
    expect(changePasswordSchema.safeParse({
      password: 'Testbusters',
      confirm: 'Testbusters',
    }).success).toBe(false);
  });

  it('changePasswordSchema rejects mismatch', () => {
    expect(changePasswordSchema.safeParse({
      password: 'Testbusters1!',
      confirm: 'Testbusters2!',
    }).success).toBe(false);
  });

  it('profilePasswordSchema requires current password', () => {
    expect(profilePasswordSchema.safeParse({
      current: '',
      password: 'Newpass1!',
      confirm: 'Newpass1!',
    }).success).toBe(false);
  });

  it('profilePasswordSchema accepts valid input', () => {
    expect(profilePasswordSchema.safeParse({
      current: 'OldPass1!',
      password: 'NewPass1!',
      confirm: 'NewPass1!',
    }).success).toBe(true);
  });
});

// ── ticket schemas ──────────────────────────────────────────────────────────

describe('lib/schemas/ticket.ts', () => {
  let createTicketSchema: any;
  let ticketMessageSchema: any;
  let ticketStatusSchema: any;

  beforeAll(async () => {
    const mod = await import('@/lib/schemas/ticket');
    createTicketSchema = mod.createTicketSchema;
    ticketMessageSchema = mod.ticketMessageSchema;
    ticketStatusSchema = mod.ticketStatusSchema;
  });

  it('createTicketSchema accepts valid ticket', () => {
    expect(createTicketSchema.safeParse({
      categoria: 'Compenso',
      oggetto: 'Problema pagamento',
    }).success).toBe(true);
  });

  it('createTicketSchema rejects empty oggetto', () => {
    expect(createTicketSchema.safeParse({
      categoria: 'Compenso',
      oggetto: '',
    }).success).toBe(false);
  });

  it('createTicketSchema accepts priority', () => {
    expect(createTicketSchema.safeParse({
      categoria: 'Altro',
      oggetto: 'Test',
      priority: 'ALTA',
    }).success).toBe(true);
  });

  it('createTicketSchema rejects invalid priority', () => {
    expect(createTicketSchema.safeParse({
      categoria: 'Altro',
      oggetto: 'Test',
      priority: 'URGENTE',
    }).success).toBe(false);
  });

  it('ticketMessageSchema rejects empty message', () => {
    expect(ticketMessageSchema.safeParse({ message: '' }).success).toBe(false);
  });

  it('ticketMessageSchema accepts valid message', () => {
    expect(ticketMessageSchema.safeParse({ message: 'Risposta admin' }).success).toBe(true);
  });

  it('ticketStatusSchema accepts valid stati', () => {
    for (const stato of ['APERTO', 'IN_LAVORAZIONE', 'CHIUSO']) {
      expect(ticketStatusSchema.safeParse({ stato }).success).toBe(true);
    }
  });

  it('ticketStatusSchema rejects invalid stato', () => {
    expect(ticketStatusSchema.safeParse({ stato: 'SOSPESO' }).success).toBe(false);
  });
});

// ── liquidazione schema ─────────────────────────────────────────────────────

describe('lib/schemas/liquidazione.ts', () => {
  let liquidazioneRequestSchema: any;

  beforeAll(async () => {
    const mod = await import('@/lib/schemas/liquidazione');
    liquidazioneRequestSchema = mod.liquidazioneRequestSchema;
  });

  it('accepts with compensation_ids only', () => {
    expect(liquidazioneRequestSchema.safeParse({
      compensation_ids: ['a1b2c3d4-e5f6-4789-a012-a3b4c5d6e7f8'],
      expense_ids: [],
      ha_partita_iva: false,
    }).success).toBe(true);
  });

  it('accepts with expense_ids only', () => {
    expect(liquidazioneRequestSchema.safeParse({
      compensation_ids: [],
      expense_ids: ['a1b2c3d4-e5f6-4789-a012-a3b4c5d6e7f8'],
      ha_partita_iva: true,
    }).success).toBe(true);
  });

  it('rejects when both arrays are empty', () => {
    expect(liquidazioneRequestSchema.safeParse({
      compensation_ids: [],
      expense_ids: [],
      ha_partita_iva: false,
    }).success).toBe(false);
  });

  it('rejects invalid UUIDs in arrays', () => {
    expect(liquidazioneRequestSchema.safeParse({
      compensation_ids: ['not-a-uuid'],
      expense_ids: [],
      ha_partita_iva: false,
    }).success).toBe(false);
  });
});

// ── API schemas ─────────────────────────────────────────────────────────────

describe('lib/schemas/api.ts', () => {
  let createUserApiSchema: any;
  let expenseCreateApiSchema: any;
  let compensationTransitionApiSchema: any;
  let expenseTransitionApiSchema: any;
  let markPaidApiSchema: any;
  let approveAllApiSchema: any;

  beforeAll(async () => {
    const mod = await import('@/lib/schemas/api');
    createUserApiSchema = mod.createUserApiSchema;
    expenseCreateApiSchema = mod.expenseCreateApiSchema;
    compensationTransitionApiSchema = mod.compensationTransitionApiSchema;
    expenseTransitionApiSchema = mod.expenseTransitionApiSchema;
    markPaidApiSchema = mod.markPaidApiSchema;
    approveAllApiSchema = mod.approveAllApiSchema;
  });

  describe('createUserApiSchema', () => {
    const validUser = {
      email: 'test@test.com',
      community_id: 'a1b2c3d4-e5f6-4789-a012-a3b4c5d6e7f8',
      tipo_contratto: 'OCCASIONALE' as const,
      citta: 'Roma',
    };

    it('accepts minimal valid payload', () => {
      expect(createUserApiSchema.safeParse(validUser).success).toBe(true);
    });

    it('rejects invalid email', () => {
      expect(createUserApiSchema.safeParse({ ...validUser, email: 'not-email' }).success).toBe(false);
    });

    it('rejects invalid tipo_contratto', () => {
      expect(createUserApiSchema.safeParse({ ...validUser, tipo_contratto: 'FULL_TIME' }).success).toBe(false);
    });

    it('accepts optional anagrafica fields', () => {
      expect(createUserApiSchema.safeParse({
        ...validUser,
        nome: 'Mario',
        cognome: 'Rossi',
        username: 'mario_rossi',
      }).success).toBe(true);
    });

    it('rejects username with uppercase', () => {
      expect(createUserApiSchema.safeParse({ ...validUser, username: 'Mario' }).success).toBe(false);
    });

    it('rejects username too short', () => {
      expect(createUserApiSchema.safeParse({ ...validUser, username: 'ab' }).success).toBe(false);
    });
  });

  describe('expenseCreateApiSchema', () => {
    it('accepts valid expense', () => {
      expect(expenseCreateApiSchema.safeParse({
        categoria: 'Trasporti',
        data_spesa: '2026-04-15',
        importo: 45.50,
      }).success).toBe(true);
    });

    it('rejects negative importo', () => {
      expect(expenseCreateApiSchema.safeParse({
        categoria: 'Trasporti',
        data_spesa: '2026-04-15',
        importo: -10,
      }).success).toBe(false);
    });
  });

  describe('compensationTransitionApiSchema', () => {
    it('accepts valid actions', () => {
      for (const action of ['approve', 'reject', 'mark_liquidated', 'reopen', 'revert_to_pending']) {
        expect(compensationTransitionApiSchema.safeParse({ action }).success).toBe(true);
      }
    });

    it('rejects invalid action', () => {
      expect(compensationTransitionApiSchema.safeParse({ action: 'cancel' }).success).toBe(false);
    });

    it('accepts optional note', () => {
      expect(compensationTransitionApiSchema.safeParse({
        action: 'reject',
        note: 'Dati incompleti',
      }).success).toBe(true);
    });
  });

  describe('expenseTransitionApiSchema', () => {
    it('accepts valid actions', () => {
      for (const action of ['approve', 'reject', 'mark_liquidated', 'revert_to_pending']) {
        expect(expenseTransitionApiSchema.safeParse({ action }).success).toBe(true);
      }
    });

    it('does not accept reopen (comp-only)', () => {
      expect(expenseTransitionApiSchema.safeParse({ action: 'reopen' }).success).toBe(false);
    });
  });

  describe('markPaidApiSchema', () => {
    it('accepts valid payload', () => {
      expect(markPaidApiSchema.safeParse({
        ids: ['a1b2c3d4-e5f6-4789-a012-a3b4c5d6e7f8'],
        payment_reference: 'BANK-REF-001',
        table: 'compensations',
      }).success).toBe(true);
    });

    it('rejects empty ids', () => {
      expect(markPaidApiSchema.safeParse({
        ids: [],
        payment_reference: 'REF',
        table: 'compensations',
      }).success).toBe(false);
    });

    it('rejects invalid table', () => {
      expect(markPaidApiSchema.safeParse({
        ids: ['a1b2c3d4-e5f6-4789-a012-a3b4c5d6e7f8'],
        payment_reference: 'REF',
        table: 'users',
      }).success).toBe(false);
    });
  });

  describe('approveAllApiSchema', () => {
    it('accepts valid community UUID', () => {
      expect(approveAllApiSchema.safeParse({
        community_id: 'a1b2c3d4-e5f6-4789-a012-a3b4c5d6e7f8',
      }).success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      expect(approveAllApiSchema.safeParse({
        community_id: 'not-uuid',
      }).success).toBe(false);
    });
  });
});

// ── collaborator schema ─────────────────────────────────────────────────────

describe('lib/schemas/collaborator.ts', () => {
  let collaboratorBaseSchema: any;

  beforeAll(async () => {
    const mod = await import('@/lib/schemas/collaborator');
    collaboratorBaseSchema = mod.collaboratorBaseSchema;
  });

  it('accepts valid full profile', () => {
    const result = collaboratorBaseSchema.safeParse({
      email: 'mario@test.com',
      username: 'mario_rossi',
      nome: 'Mario',
      cognome: 'Rossi',
      codice_fiscale: 'RSSMRA80A01H501U',
      data_nascita: '1980-01-01',
      luogo_nascita: 'Roma',
      provincia_nascita: 'RM',
      comune: 'Milano',
      provincia_residenza: 'MI',
      telefono: '+39 333 1234567',
      indirizzo: 'Via Roma',
      civico_residenza: '1',
      iban: 'IT60X0542811101000000123456',
      intestatario_pagamento: 'Mario Rossi',
      tshirt_size: 'M',
      sono_un_figlio_a_carico: false,
      importo_lordo_massimale: 3000,
      citta: 'Roma',
      materie_insegnate: ['Logica'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = collaboratorBaseSchema.safeParse({
      email: 'not-email',
      username: 'test',
      nome: 'A',
      cognome: 'B',
      codice_fiscale: null,
      data_nascita: null,
      luogo_nascita: null,
      provincia_nascita: null,
      comune: null,
      provincia_residenza: null,
      telefono: null,
      indirizzo: null,
      civico_residenza: null,
      iban: '',
      intestatario_pagamento: null,
      tshirt_size: null,
      sono_un_figlio_a_carico: false,
      importo_lordo_massimale: null,
      citta: 'Roma',
      materie_insegnate: ['Logica'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty materie_insegnate', () => {
    const result = collaboratorBaseSchema.safeParse({
      email: 'test@test.com',
      username: 'test',
      nome: 'A',
      cognome: 'B',
      codice_fiscale: null,
      data_nascita: null,
      luogo_nascita: null,
      provincia_nascita: null,
      comune: null,
      provincia_residenza: null,
      telefono: null,
      indirizzo: null,
      civico_residenza: null,
      iban: '',
      intestatario_pagamento: null,
      tshirt_size: null,
      sono_un_figlio_a_carico: false,
      importo_lordo_massimale: null,
      citta: 'Roma',
      materie_insegnate: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects username with special characters', () => {
    const result = collaboratorBaseSchema.safeParse({
      email: 'test@test.com',
      username: 'Mario Rossi',
      nome: 'A',
      cognome: 'B',
      codice_fiscale: null,
      data_nascita: null,
      luogo_nascita: null,
      provincia_nascita: null,
      comune: null,
      provincia_residenza: null,
      telefono: null,
      indirizzo: null,
      civico_residenza: null,
      iban: '',
      intestatario_pagamento: null,
      tshirt_size: null,
      sono_un_figlio_a_carico: false,
      importo_lordo_massimale: null,
      citta: 'Roma',
      materie_insegnate: ['Logica'],
    });
    expect(result.success).toBe(false);
  });

  it('iban accepts empty string', () => {
    const result = collaboratorBaseSchema.safeParse({
      email: 'test@test.com',
      username: 'test',
      nome: 'A',
      cognome: 'B',
      codice_fiscale: null,
      data_nascita: null,
      luogo_nascita: null,
      provincia_nascita: null,
      comune: null,
      provincia_residenza: null,
      telefono: null,
      indirizzo: null,
      civico_residenza: null,
      iban: '',
      intestatario_pagamento: null,
      tshirt_size: null,
      sono_un_figlio_a_carico: false,
      importo_lordo_massimale: null,
      citta: 'Roma',
      materie_insegnate: ['Logica'],
    });
    expect(result.success).toBe(true);
  });

  it('importo_lordo_massimale rejects values over 5000', () => {
    const result = collaboratorBaseSchema.safeParse({
      email: 'test@test.com',
      username: 'test',
      nome: 'A',
      cognome: 'B',
      codice_fiscale: null,
      data_nascita: null,
      luogo_nascita: null,
      provincia_nascita: null,
      comune: null,
      provincia_residenza: null,
      telefono: null,
      indirizzo: null,
      civico_residenza: null,
      iban: '',
      intestatario_pagamento: null,
      tshirt_size: null,
      sono_un_figlio_a_carico: false,
      importo_lordo_massimale: 6000,
      citta: 'Roma',
      materie_insegnate: ['Logica'],
    });
    expect(result.success).toBe(false);
  });
});
