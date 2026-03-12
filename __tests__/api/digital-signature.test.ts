/**
 * Unit tests for Digital Signature + Receipt Generation block
 * - Schema validation for generate-receipts route
 * - buildContractVars / buildReceiptVars output shape
 * - CONTRATTO_MARKERS / RICEVUTA_MARKERS constants
 * - ReceiptPreviewItem type shape
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { buildContractVars, buildReceiptVars } from '@/lib/document-generation';
import { CONTRATTO_MARKERS, RICEVUTA_MARKERS } from '@/lib/pdf-utils';

// Mirror the generate-receipts schema
const generateReceiptsSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('bulk') }),
  z.object({
    mode: z.literal('single'),
    compensation_id: z.string().uuid().optional(),
    expense_id: z.string().uuid().optional(),
  }),
]);

describe('generate-receipts schema', () => {
  it('accepts bulk mode', () => {
    expect(generateReceiptsSchema.safeParse({ mode: 'bulk' }).success).toBe(true);
  });

  it('accepts single mode with compensation_id', () => {
    expect(generateReceiptsSchema.safeParse({
      mode: 'single',
      compensation_id: '550e8400-e29b-41d4-a716-446655440000',
    }).success).toBe(true);
  });

  it('accepts single mode with expense_id', () => {
    expect(generateReceiptsSchema.safeParse({
      mode: 'single',
      expense_id: '550e8400-e29b-41d4-a716-446655440000',
    }).success).toBe(true);
  });

  it('accepts single mode with neither id (validation is done in handler)', () => {
    expect(generateReceiptsSchema.safeParse({ mode: 'single' }).success).toBe(true);
  });

  it('rejects unknown mode', () => {
    expect(generateReceiptsSchema.safeParse({ mode: 'unknown' }).success).toBe(false);
  });

  it('rejects invalid uuid in compensation_id', () => {
    expect(generateReceiptsSchema.safeParse({
      mode: 'single',
      compensation_id: 'not-a-uuid',
    }).success).toBe(false);
  });
});

describe('buildContractVars', () => {
  const collab = {
    nome: 'Mario',
    cognome: 'Rossi',
    codice_fiscale: 'RSSMRA80A01H501Z',
    data_nascita: '1980-01-01',
    luogo_nascita: 'Roma',
    comune: 'Milano',
    indirizzo: 'Via Roma',
    civico_residenza: '10',
    data_fine_contratto: '2025-12-31',
  };

  it('maps nome and cognome', () => {
    const vars = buildContractVars(collab);
    expect(vars['{nome}']).toBe('Mario');
    expect(vars['{cognome}']).toBe('Rossi');
  });

  it('maps luogo_nascita to citta_nascita', () => {
    const vars = buildContractVars(collab);
    expect(vars['{citta_nascita}']).toBe('Roma');
  });

  it('maps comune to city_residenza with accent', () => {
    const vars = buildContractVars(collab);
    expect(vars['{città_residenza}']).toBe('Milano');
  });

  it('maps indirizzo to indirizzo_residenza', () => {
    const vars = buildContractVars(collab);
    expect(vars['{indirizzo_residenza}']).toBe('Via Roma');
  });

  it('maps civico_residenza', () => {
    const vars = buildContractVars(collab);
    expect(vars['{civico_residenza}']).toBe('10');
  });

  it('formats data_fine_contratto as DD/MM/YYYY', () => {
    const vars = buildContractVars(collab);
    expect(vars['{data_fine_contratto}']).toBe('31/12/2025');
  });

  it('includes data_corrente (today)', () => {
    const vars = buildContractVars(collab);
    expect(vars['{data_corrente}']).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('handles null data_fine_contratto gracefully', () => {
    const vars = buildContractVars({ ...collab, data_fine_contratto: null });
    expect(vars['{data_fine_contratto}']).toBe('');
  });
});

describe('buildReceiptVars', () => {
  const collab = {
    nome: 'Maria',
    cognome: 'Bianchi',
    codice_fiscale: 'BNCMRA85B41F205Y',
    data_nascita: '1985-02-01',
    luogo_nascita: 'Roma',
    comune: 'Torino',
  };

  const totals = {
    lordo_compensi: 1000,
    lordo_rimborsi: 200,
    totale_lordo: 1200,
    ritenuta: 200,
    netto: 1000,
  };

  it('maps nome and cognome', () => {
    const vars = buildReceiptVars(collab, totals);
    expect(vars['{nome}']).toBe('Maria');
    expect(vars['{cognome}']).toBe('Bianchi');
  });

  it('formats totale_lordo_liquidato', () => {
    const vars = buildReceiptVars(collab, totals);
    expect(vars['{totale_lordo_liquidato}']).toContain('1200');
  });

  it('formats totale_ritenuta_acconto_liquidato', () => {
    const vars = buildReceiptVars(collab, totals);
    expect(vars['{totale_ritenuta_acconto_liquidato}']).toContain('200');
  });

  it('formats totale_netto_liquidato', () => {
    const vars = buildReceiptVars(collab, totals);
    expect(vars['{totale_netto_liquidato}']).toContain('1000');
  });

  it('maps luogo_nascita to citta_nascita', () => {
    const vars = buildReceiptVars(collab, totals);
    expect(vars['{citta_nascita}']).toBe('Roma');
  });

  it('maps comune to citta_residenza', () => {
    const vars = buildReceiptVars(collab, totals);
    expect(vars['{citta_residenza}']).toBe('Torino');
  });
});

describe('PDF marker constants', () => {
  it('CONTRATTO_MARKERS includes {nome}, {cognome}, {firma}', () => {
    expect(CONTRATTO_MARKERS).toContain('{nome}');
    expect(CONTRATTO_MARKERS).toContain('{cognome}');
    expect(CONTRATTO_MARKERS).toContain('{firma}');
  });

  it('CONTRATTO_MARKERS includes {data_fine_contratto}', () => {
    expect(CONTRATTO_MARKERS).toContain('{data_fine_contratto}');
  });

  it('RICEVUTA_MARKERS includes receipt-specific markers', () => {
    expect(RICEVUTA_MARKERS).toContain('{totale_lordo_liquidato}');
    expect(RICEVUTA_MARKERS).toContain('{totale_ritenuta_acconto_liquidato}');
    expect(RICEVUTA_MARKERS).toContain('{totale_netto_liquidato}');
    expect(RICEVUTA_MARKERS).toContain('{citta_nascita}');
    expect(RICEVUTA_MARKERS).toContain('{firma}');
  });
});
