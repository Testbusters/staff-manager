/**
 * Block profilo-dati-integrativi — schema + DB coverage
 *
 * Verifies:
 * - 13 new fields accepted by adminProfilePatchApiSchema and (3) by createUserApiSchema
 * - GDPR Art.9 cross-field refine in onboardingSchema + profileFormSchema
 * - deriveConsensoDatiSaluteTimestamp helper semantics
 * - collaborators + user_profiles DB columns exist and accept values
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

import { adminProfilePatchApiSchema, createUserApiSchema } from '@/lib/schemas/api';
import {
  onboardingSchema,
  profileFormSchema,
  deriveConsensoDatiSaluteTimestamp,
  TIPO_DOCUMENTO_IDENTITA,
  REGIME_ALIMENTARE,
  REGIME_ALIMENTARE_DEFAULT,
} from '@/lib/schemas/collaborator';

config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const VALID_UUID = 'a1b2c3d4-e5f6-4789-a012-a3b4c5d6e7f8';
const COLLAB_ID = 'f6d75100-c43c-4e90-afe5-a720082d0c26';
const COLLAB_USER_ID = '80238f5b-78d1-48a3-ac5a-4cf65126a111';

// ── adminProfilePatchApiSchema — 13 new fields ───────────────────────────

describe('adminProfilePatchApiSchema — dati integrativi', () => {
  it('accepts valid documento identità triplet', () => {
    const r = adminProfilePatchApiSchema.safeParse({
      numero_documento_identita: 'AX1234567',
      tipo_documento_identita: 'CI',
      scadenza_documento_identita: '2030-06-15',
    });
    expect(r.success).toBe(true);
  });

  it('accepts all tipo_documento_identita enum values', () => {
    for (const tipo of TIPO_DOCUMENTO_IDENTITA) {
      expect(adminProfilePatchApiSchema.safeParse({ tipo_documento_identita: tipo }).success).toBe(true);
    }
  });

  it('rejects invalid tipo_documento_identita', () => {
    expect(adminProfilePatchApiSchema.safeParse({ tipo_documento_identita: 'BADGE' }).success).toBe(false);
  });

  it('accepts null clearing on documento fields', () => {
    const r = adminProfilePatchApiSchema.safeParse({
      numero_documento_identita: null,
      tipo_documento_identita: null,
      scadenza_documento_identita: null,
    });
    expect(r.success).toBe(true);
  });

  it('accepts alimentazione block', () => {
    const r = adminProfilePatchApiSchema.safeParse({
      ha_allergie_alimentari: true,
      allergie_note: 'Lattosio, glutine',
      regime_alimentare: 'vegetariano',
    });
    expect(r.success).toBe(true);
  });

  it('rejects invalid regime_alimentare', () => {
    expect(adminProfilePatchApiSchema.safeParse({ regime_alimentare: 'carnivoro' }).success).toBe(false);
  });

  it('rejects allergie_note > 500 chars', () => {
    expect(adminProfilePatchApiSchema.safeParse({ allergie_note: 'x'.repeat(501) }).success).toBe(false);
  });

  it('accepts spedizione alternativa completa', () => {
    const r = adminProfilePatchApiSchema.safeParse({
      spedizione_usa_residenza: false,
      spedizione_indirizzo: 'Via Torino',
      spedizione_civico: '12',
      spedizione_cap: '20123',
      spedizione_citta: 'Milano',
      spedizione_provincia: 'MI',
      spedizione_nazione: 'IT',
    });
    expect(r.success).toBe(true);
  });

  it('rejects spedizione_nazione > 2 chars', () => {
    expect(adminProfilePatchApiSchema.safeParse({ spedizione_nazione: 'ITA' }).success).toBe(false);
  });
});

// ── createUserApiSchema — 3 documento fields only (R9 minimization) ──────

describe('createUserApiSchema — dati integrativi (R9)', () => {
  const BASE = {
    email: 'a@b.com',
    community_id: VALID_UUID,
    tipo_contratto: 'OCCASIONALE' as const,
    citta: 'Roma',
  };

  it('accepts 3 documento fields (prefill admin)', () => {
    const r = createUserApiSchema.safeParse({
      ...BASE,
      numero_documento_identita: 'AX1234567',
      tipo_documento_identita: 'PASSAPORTO',
      scadenza_documento_identita: '2030-06-15',
    });
    expect(r.success).toBe(true);
  });

  it('does NOT expose alimentazione / spedizione keys (R9 minimization)', () => {
    const shapeKeys = Object.keys(createUserApiSchema.shape);
    const forbidden = [
      'ha_allergie_alimentari',
      'allergie_note',
      'regime_alimentare',
      'spedizione_usa_residenza',
      'spedizione_indirizzo',
      'spedizione_nazione',
    ];
    for (const k of forbidden) {
      expect(shapeKeys).not.toContain(k);
    }
  });
});

// ── GDPR Art.9 cross-field refine (onboardingSchema + profileFormSchema) ──

function buildOnboardingBase() {
  return {
    nome: 'Mario',
    cognome: 'Rossi',
    codice_fiscale: 'RSSMRA80A01H501U',
    data_nascita: '1980-01-01',
    luogo_nascita: 'Roma',
    provincia_nascita: 'RM',
    comune: 'Milano',
    provincia_residenza: 'MI',
    indirizzo: 'Via Roma',
    civico_residenza: '1',
    telefono: '+39 333 0000000',
    iban: 'IT60X0542811101000000123456',
    intestatario_pagamento: 'Mario Rossi',
    tshirt_size: 'M' as const,
    sono_un_figlio_a_carico: false,
    importo_lordo_massimale: 3000,
    citta: 'Roma',
    materie_insegnate: ['Matematica'],
    numero_documento_identita: 'AX1234567',
    tipo_documento_identita: 'CI' as const,
    scadenza_documento_identita: '2030-06-15',
    ha_allergie_alimentari: false,
    allergie_note: null,
    regime_alimentare: REGIME_ALIMENTARE_DEFAULT,
    spedizione_usa_residenza: true,
    spedizione_indirizzo: null,
    spedizione_civico: null,
    spedizione_cap: null,
    spedizione_citta: null,
    spedizione_provincia: null,
    spedizione_nazione: 'IT',
    consenso_dati_salute: false,
  };
}

describe('onboardingSchema — GDPR Art.9 refine', () => {
  it('accepts valid payload without allergie', () => {
    expect(onboardingSchema.safeParse(buildOnboardingBase()).success).toBe(true);
  });

  it('rejects allergie=true without consenso_dati_salute', () => {
    const r = onboardingSchema.safeParse({
      ...buildOnboardingBase(),
      ha_allergie_alimentari: true,
      allergie_note: 'Lattosio',
      consenso_dati_salute: false,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes('consenso_dati_salute'))).toBe(true);
    }
  });

  it('rejects allergie=true without allergie_note', () => {
    const r = onboardingSchema.safeParse({
      ...buildOnboardingBase(),
      ha_allergie_alimentari: true,
      allergie_note: '',
      consenso_dati_salute: true,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes('allergie_note'))).toBe(true);
    }
  });

  it('accepts allergie=true with consenso + note', () => {
    const r = onboardingSchema.safeParse({
      ...buildOnboardingBase(),
      ha_allergie_alimentari: true,
      allergie_note: 'Lattosio, glutine',
      consenso_dati_salute: true,
    });
    expect(r.success).toBe(true);
  });

  it('rejects spedizione_usa_residenza=false without all alt address fields', () => {
    const r = onboardingSchema.safeParse({
      ...buildOnboardingBase(),
      spedizione_usa_residenza: false,
      spedizione_indirizzo: 'Via Torino',
      // missing civico, cap, città, provincia
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toContain('spedizione_civico');
      expect(paths).toContain('spedizione_cap');
      expect(paths).toContain('spedizione_citta');
      expect(paths).toContain('spedizione_provincia');
    }
  });
});

// ── profileFormSchema — GDPR refine parity ────────────────────────────

describe('profileFormSchema — GDPR Art.9 refine', () => {
  const BASE_FORM = {
    email: 'mario@test.com',
    nome: 'Mario',
    cognome: 'Rossi',
    codice_fiscale: 'RSSMRA80A01H501U',
    data_nascita: '1980-01-01',
    luogo_nascita: 'Roma',
    provincia_nascita: 'RM',
    comune: 'Milano',
    provincia_residenza: 'MI',
    telefono: '333',
    indirizzo: 'Via Roma',
    civico_residenza: '1',
    iban: 'IT60X0542811101000000123456',
    intestatario_pagamento: 'Mario Rossi',
    tshirt_size: 'M',
    sono_un_figlio_a_carico: false,
    importo_lordo_massimale: '3000',
    citta: 'Roma',
    materie_insegnate: ['Matematica'],
    numero_documento_identita: '',
    tipo_documento_identita: '',
    scadenza_documento_identita: '',
    ha_allergie_alimentari: false,
    allergie_note: '',
    regime_alimentare: REGIME_ALIMENTARE_DEFAULT,
    spedizione_usa_residenza: true,
    spedizione_indirizzo: '',
    spedizione_civico: '',
    spedizione_cap: '',
    spedizione_citta: '',
    spedizione_provincia: '',
    spedizione_nazione: 'IT',
    consenso_dati_salute: false,
  };

  it('rejects allergie=true without consenso (form side)', () => {
    const r = profileFormSchema.safeParse({
      ...BASE_FORM,
      ha_allergie_alimentari: true,
      allergie_note: 'Lattosio',
      consenso_dati_salute: false,
    });
    expect(r.success).toBe(false);
  });

  it('accepts allergie=false regardless of consenso', () => {
    expect(profileFormSchema.safeParse(BASE_FORM).success).toBe(true);
  });
});

// ── deriveConsensoDatiSaluteTimestamp helper ─────────────────────────

describe('deriveConsensoDatiSaluteTimestamp', () => {
  it('returns ISO timestamp when haAllergie is true', () => {
    const v = deriveConsensoDatiSaluteTimestamp(true);
    expect(v).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/);
  });

  it('returns null when haAllergie is false', () => {
    expect(deriveConsensoDatiSaluteTimestamp(false)).toBeNull();
  });

  it('returns null when haAllergie is undefined', () => {
    expect(deriveConsensoDatiSaluteTimestamp(undefined)).toBeNull();
  });
});

// ── enum completeness ────────────────────────────────────────────────

describe('enum shapes', () => {
  it('TIPO_DOCUMENTO_IDENTITA has 3 values', () => {
    expect(TIPO_DOCUMENTO_IDENTITA).toEqual(['CI', 'PASSAPORTO', 'PATENTE']);
  });

  it('REGIME_ALIMENTARE has 3 values with default onnivoro', () => {
    expect(REGIME_ALIMENTARE).toEqual(['onnivoro', 'vegetariano', 'vegano']);
    expect(REGIME_ALIMENTARE_DEFAULT).toBe('onnivoro');
  });
});

// ── DB integration — columns exist and accept values (reversible) ──────

const shouldRunDb = SUPABASE_URL?.includes('gjwkvgfwkdwzqlvudgqr') && !!SERVICE_KEY;

describe.skipIf(!shouldRunDb)('DB integration — migration 078 columns', () => {
  const svc = createClient(SUPABASE_URL!, SERVICE_KEY!, { auth: { persistSession: false } });

  it('collaborators row returns 13 new fields', async () => {
    const { data, error } = await svc
      .from('collaborators')
      .select(
        'numero_documento_identita, tipo_documento_identita, scadenza_documento_identita, ha_allergie_alimentari, allergie_note, regime_alimentare, spedizione_usa_residenza, spedizione_indirizzo, spedizione_civico, spedizione_cap, spedizione_citta, spedizione_provincia, spedizione_nazione',
      )
      .eq('id', COLLAB_ID)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(typeof data!.ha_allergie_alimentari).toBe('boolean');
    expect(typeof data!.spedizione_usa_residenza).toBe('boolean');
    expect(['onnivoro', 'vegetariano', 'vegano']).toContain(data!.regime_alimentare);
    expect(data!.spedizione_nazione).toBeTruthy();
  }, 15000);

  it('user_profiles row includes data_consenso_dati_salute', async () => {
    const { data, error } = await svc
      .from('user_profiles')
      .select('data_consenso_dati_salute')
      .eq('user_id', COLLAB_USER_ID)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
  }, 15000);

  it('accepts write + reversible restore of new fields', async () => {
    const { data: before } = await svc
      .from('collaborators')
      .select('regime_alimentare, spedizione_nazione, ha_allergie_alimentari')
      .eq('id', COLLAB_ID)
      .single();

    const { error: updateErr } = await svc
      .from('collaborators')
      .update({
        regime_alimentare: 'vegano',
        spedizione_nazione: 'FR',
        ha_allergie_alimentari: true,
      })
      .eq('id', COLLAB_ID);
    expect(updateErr).toBeNull();

    const { data: after } = await svc
      .from('collaborators')
      .select('regime_alimentare, spedizione_nazione, ha_allergie_alimentari')
      .eq('id', COLLAB_ID)
      .single();
    expect(after!.regime_alimentare).toBe('vegano');
    expect(after!.spedizione_nazione).toBe('FR');
    expect(after!.ha_allergie_alimentari).toBe(true);

    // Restore
    await svc
      .from('collaborators')
      .update({
        regime_alimentare: before!.regime_alimentare,
        spedizione_nazione: before!.spedizione_nazione,
        ha_allergie_alimentari: before!.ha_allergie_alimentari,
      })
      .eq('id', COLLAB_ID);
  }, 15000);

  it('rejects invalid regime_alimentare at DB level (CHECK constraint)', async () => {
    const { error } = await svc
      .from('collaborators')
      .update({ regime_alimentare: 'carnivoro' })
      .eq('id', COLLAB_ID);
    expect(error).not.toBeNull();
  }, 15000);

  it('rejects invalid tipo_documento_identita at DB level (CHECK constraint)', async () => {
    const { error } = await svc
      .from('collaborators')
      .update({ tipo_documento_identita: 'BADGE' })
      .eq('id', COLLAB_ID);
    expect(error).not.toBeNull();
  }, 15000);
});
