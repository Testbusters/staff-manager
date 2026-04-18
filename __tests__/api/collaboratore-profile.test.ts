/**
 * Unit tests: admin profile patch schema
 * Imports the ACTUAL schema from lib/schemas/api.ts (single source of truth).
 */
import { describe, it, expect } from 'vitest';
import { adminProfilePatchApiSchema as patchSchema } from '@/lib/schemas/api';

describe('patchProfileSchema', () => {
  it('accepts a valid partial update', () => {
    const result = patchSchema.safeParse({ nome: 'Mario', cognome: 'Rossi' });
    expect(result.success).toBe(true);
  });

  it('accepts full valid payload', () => {
    const result = patchSchema.safeParse({
      username: 'mario_rossi',
      nome: 'Mario',
      cognome: 'Rossi',
      codice_fiscale: 'RSSMRA80A01H501U',
      data_nascita: '1980-01-01',
      luogo_nascita: 'Roma',
      provincia_nascita: 'RM',
      comune: 'Milano',
      provincia_residenza: 'MI',
      telefono: '+39 333 0000000',
      indirizzo: 'Via Roma',
      civico_residenza: '1',
      tshirt_size: 'M',
      sono_un_figlio_a_carico: false,
      importo_lordo_massimale: 5000,
      intestatario_pagamento: 'Mario Rossi',
      citta: 'Roma',
      materie_insegnate: ['Matematica'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid CF (lowercase)', () => {
    expect(patchSchema.safeParse({ codice_fiscale: 'rssmra80a01h501u' }).success).toBe(false);
  });

  it('rejects invalid CF (15 chars)', () => {
    expect(patchSchema.safeParse({ codice_fiscale: 'RSSMRA80A01H501' }).success).toBe(false);
  });

  it('accepts null CF (clearing)', () => {
    expect(patchSchema.safeParse({ codice_fiscale: null }).success).toBe(true);
  });

  it('rejects invalid provincia (3 chars)', () => {
    expect(patchSchema.safeParse({ provincia_nascita: 'ROM' }).success).toBe(false);
  });

  it('rejects invalid provincia (lowercase)', () => {
    expect(patchSchema.safeParse({ provincia_residenza: 'mi' }).success).toBe(false);
  });

  it('accepts valid provincia', () => {
    expect(patchSchema.safeParse({ provincia_nascita: 'RM' }).success).toBe(true);
  });

  it('rejects massimale > 5000', () => {
    expect(patchSchema.safeParse({ importo_lordo_massimale: 6000 }).success).toBe(false);
  });

  it('accepts null massimale (clearing)', () => {
    expect(patchSchema.safeParse({ importo_lordo_massimale: null }).success).toBe(true);
  });

  it('rejects invalid tshirt_size', () => {
    expect(patchSchema.safeParse({ tshirt_size: 'MEGA' }).success).toBe(false);
  });

  it('IBAN is NOT part of the schema (excluded field)', () => {
    const schemaKeys = Object.keys(patchSchema.shape);
    expect(schemaKeys).not.toContain('iban');
  });
});
