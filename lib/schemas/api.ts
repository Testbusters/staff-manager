// API-side validation schemas — shared between route handlers and tests.
// Single source of truth: if a schema changes here, both the route and its
// tests see the update. Distinct from form schemas (lib/schemas/*.ts) which
// handle client-side validation with string coercion and Italian messages.

import { z } from 'zod';
import { EXPENSE_CATEGORIES, TSHIRT_SIZES } from '@/lib/types';
import { TIPO_DOCUMENTO_IDENTITA, REGIME_ALIMENTARE } from '@/lib/schemas/collaborator';

// ── POST /api/admin/create-user ─────────────────────────────────────────────
export const createUserApiSchema = z.object({
  email: z.string().email(),
  community_id: z.string().uuid(),
  tipo_contratto: z.enum(['OCCASIONALE', 'OCCASIONALE_P4M']),
  citta: z.string().min(1),
  salta_firma: z.boolean().optional(),
  username:            z.string().min(3).max(50).regex(/^[a-z0-9_]+$/, 'Solo lettere minuscole, numeri e _').optional(),
  nome:                z.string().min(1).max(100).optional(),
  cognome:             z.string().min(1).max(100).optional(),
  codice_fiscale:      z.string().max(16).nullable().optional(),
  data_nascita:        z.string().nullable().optional(),
  luogo_nascita:       z.string().max(100).nullable().optional(),
  provincia_nascita:   z.string().max(10).nullable().optional(),
  comune:              z.string().max(100).nullable().optional(),
  provincia_residenza: z.string().max(10).nullable().optional(),
  indirizzo:           z.string().max(200).nullable().optional(),
  civico_residenza:    z.string().max(20).nullable().optional(),
  telefono:            z.string().max(20).nullable().optional(),
  intestatario_pagamento: z.string().max(100).nullable().optional(),
  data_ingresso:            z.string().min(1, 'Obbligatoria').optional(),
  data_fine_contratto:      z.string().nullable().optional(),
  sono_un_figlio_a_carico:  z.boolean().optional(),
  importo_lordo_massimale:  z.number().min(0).max(5000).nullable().optional(),
  numero_documento_identita:   z.string().max(50).nullable().optional(),
  tipo_documento_identita:     z.enum(TIPO_DOCUMENTO_IDENTITA).nullable().optional(),
  scadenza_documento_identita: z.string().nullable().optional(),
});

// ── POST /api/expenses ──────────────────────────────────────────────────────
export const expenseCreateApiSchema = z.object({
  categoria: z.enum(EXPENSE_CATEGORIES),
  data_spesa: z.string().min(1, 'Data spesa obbligatoria'),
  importo: z.number().positive('Importo deve essere positivo'),
  descrizione: z.string().optional(),
});

// ── PATCH /api/admin/collaboratori/[id]/profile ─────────────────────────────
export const adminProfilePatchApiSchema = z.object({
  username:            z.string().min(3).max(50).regex(/^[a-z0-9_]+$/, 'Solo lettere minuscole, numeri e _').optional(),
  nome:                z.string().min(1).max(100).optional(),
  cognome:             z.string().min(1).max(100).optional(),
  codice_fiscale:      z.string().regex(/^[A-Z0-9]{16}$/, 'Codice fiscale non valido (16 caratteri alfanumerici)').nullable().optional(),
  data_nascita:        z.string().nullable().optional(),
  luogo_nascita:       z.string().max(100).nullable().optional(),
  provincia_nascita:   z.string().regex(/^[A-Z]{2}$/, 'Sigla provincia non valida').nullable().optional(),
  comune:              z.string().max(100).nullable().optional(),
  provincia_residenza: z.string().regex(/^[A-Z]{2}$/, 'Sigla provincia non valida').nullable().optional(),
  telefono:            z.string().max(20).nullable().optional(),
  indirizzo:           z.string().max(200).nullable().optional(),
  civico_residenza:    z.string().max(20).nullable().optional(),
  tshirt_size:         z.enum(TSHIRT_SIZES).nullable().optional(),
  sono_un_figlio_a_carico: z.boolean().optional(),
  importo_lordo_massimale: z.number().min(1).max(5000).nullable().optional(),
  intestatario_pagamento: z.string().max(100).nullable().optional(),
  citta:             z.string().min(1).optional(),
  materie_insegnate: z.array(z.string().min(1)).min(1).optional(),
  numero_documento_identita:   z.string().max(50).nullable().optional(),
  tipo_documento_identita:     z.enum(TIPO_DOCUMENTO_IDENTITA).nullable().optional(),
  scadenza_documento_identita: z.string().nullable().optional(),
  ha_allergie_alimentari:      z.boolean().optional(),
  allergie_note:               z.string().max(500).nullable().optional(),
  regime_alimentare:           z.enum(REGIME_ALIMENTARE).optional(),
  spedizione_usa_residenza:    z.boolean().optional(),
  spedizione_indirizzo:        z.string().max(200).nullable().optional(),
  spedizione_civico:           z.string().max(20).nullable().optional(),
  spedizione_cap:              z.string().max(10).nullable().optional(),
  spedizione_citta:            z.string().max(100).nullable().optional(),
  spedizione_provincia:        z.string().max(10).nullable().optional(),
  spedizione_nazione:          z.string().max(2).optional(),
});

// ── POST /api/compensations/[id]/transition ─────────────────────────────────
export const compensationTransitionApiSchema = z.object({
  action: z.enum([
    'reopen',
    'approve',
    'reject',
    'mark_liquidated',
    'revert_to_pending',
  ]),
  note: z.string().optional(),
  payment_reference: z.string().optional(),
});

// ── POST /api/expenses/[id]/transition ──────────────────────────────────────
export const expenseTransitionApiSchema = z.object({
  action: z.enum([
    'approve',
    'reject',
    'mark_liquidated',
    'revert_to_pending',
  ]),
  note: z.string().optional(),
  payment_reference: z.string().optional(),
});

// ── POST /api/export/mark-paid ──────────────────────────────────────────────
export const markPaidApiSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  payment_reference: z.string().min(1),
  table: z.enum(['compensations', 'expenses']),
});

// ── POST /api/compensations/approve-all & /api/expenses/approve-all ─────────
export const approveAllApiSchema = z.object({
  community_id: z.string().uuid(),
});

// ── PATCH /api/tickets/[id]/status ──────────────────────────────────────────
export { type TicketStatus } from '@/lib/types';
import type { TicketStatus } from '@/lib/types';
export const VALID_TICKET_STATI: TicketStatus[] = ['APERTO', 'IN_LAVORAZIONE', 'CHIUSO'];
