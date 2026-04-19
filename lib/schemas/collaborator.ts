import { z } from 'zod';
import { TSHIRT_SIZES } from '@/lib/types';

export const TIPO_DOCUMENTO_IDENTITA = ['CI', 'PASSAPORTO', 'PATENTE'] as const;
export const REGIME_ALIMENTARE = ['onnivoro', 'vegetariano', 'vegano'] as const;

export type TipoDocumentoIdentita = (typeof TIPO_DOCUMENTO_IDENTITA)[number];
export type RegimeAlimentare = (typeof REGIME_ALIMENTARE)[number];

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumentoIdentita, string> = {
  CI: 'Carta d\'identità',
  PASSAPORTO: 'Passaporto',
  PATENTE: 'Patente',
};

export const REGIME_ALIMENTARE_LABELS: Record<RegimeAlimentare, string> = {
  onnivoro: 'Onnivoro',
  vegetariano: 'Vegetariano',
  vegano: 'Vegano',
};

export const REGIME_ALIMENTARE_DEFAULT: RegimeAlimentare = REGIME_ALIMENTARE[0];

export function deriveConsensoDatiSaluteTimestamp(haAllergie: boolean | undefined): string | null {
  return haAllergie === true ? new Date().toISOString() : null;
}

/**
 * Base collaborator profile schema with ALL personal data fields.
 * All fields are optional — consumers use .pick()/.partial()/.required() as needed.
 * Used by: ProfileForm, OnboardingWizard, CreateUserForm, CollaboratoreDetail,
 *          app/api/profile, app/api/admin/collaboratori/[id]/profile
 */
export const collaboratorBaseSchema = z.object({
  email:                    z.string().email('Email non valida'),
  username:                 z.string().min(3, 'Minimo 3 caratteri').max(50).regex(/^[a-z0-9_]+$/, 'Solo lettere minuscole, numeri e _'),
  nome:                     z.string().min(1, 'Il nome è obbligatorio').max(100),
  cognome:                  z.string().min(1, 'Il cognome è obbligatorio').max(100),
  codice_fiscale:           z.string().regex(/^[A-Z0-9]{16}$/, 'Codice fiscale non valido (16 caratteri alfanumerici)').nullable(),
  data_nascita:             z.string().nullable(),
  luogo_nascita:            z.string().max(100).nullable(),
  provincia_nascita:        z.string().max(10).nullable(),
  comune:                   z.string().max(100).nullable(),
  provincia_residenza:      z.string().max(10).nullable(),
  telefono:                 z.string().max(20).nullable(),
  indirizzo:                z.string().max(200).nullable(),
  civico_residenza:         z.string().max(20).nullable(),
  iban:                     z.string().max(34).regex(/^[A-Z]{2}\d{2}[A-Z0-9]+$/, 'IBAN non valido').or(z.literal('')),
  intestatario_pagamento:   z.string().max(100).nullable(),
  tshirt_size:              z.enum(TSHIRT_SIZES).nullable(),
  sono_un_figlio_a_carico:  z.boolean(),
  importo_lordo_massimale:  z.number().min(1).max(5000).nullable(),
  citta:                    z.string().min(1, 'La città è obbligatoria'),
  materie_insegnate:        z.array(z.string().min(1)).min(1, 'Seleziona almeno una materia'),
  numero_documento_identita:   z.string().min(1).max(50).nullable(),
  tipo_documento_identita:     z.enum(TIPO_DOCUMENTO_IDENTITA).nullable(),
  scadenza_documento_identita: z.string().nullable(),
  ha_allergie_alimentari: z.boolean(),
  allergie_note:          z.string().max(500).nullable(),
  regime_alimentare:      z.enum(REGIME_ALIMENTARE),
  spedizione_usa_residenza: z.boolean(),
  spedizione_indirizzo:     z.string().max(200).nullable(),
  spedizione_civico:        z.string().max(20).nullable(),
  spedizione_cap:           z.string().max(10).nullable(),
  spedizione_citta:         z.string().max(100).nullable(),
  spedizione_provincia:     z.string().max(10).nullable(),
  spedizione_nazione:       z.string().max(2),
  // Server derives timestamp from this client-only checkbox
  consenso_dati_salute: z.boolean().optional(),
});

type IntegrativiRefinementData = {
  ha_allergie_alimentari?: boolean;
  consenso_dati_salute?: boolean;
  allergie_note?: string | null;
  spedizione_usa_residenza?: boolean;
  spedizione_indirizzo?: string | null;
  spedizione_civico?: string | null;
  spedizione_cap?: string | null;
  spedizione_citta?: string | null;
  spedizione_provincia?: string | null;
};

export function applyIntegrativiRefinements(data: IntegrativiRefinementData, ctx: z.RefinementCtx) {
  if (data.ha_allergie_alimentari === true) {
    if (data.consenso_dati_salute !== true) {
      ctx.addIssue({
        code: 'custom',
        path: ['consenso_dati_salute'],
        message: 'Devi acconsentire al trattamento dei dati sanitari (Art.9 GDPR)',
      });
    }
    if (!data.allergie_note || data.allergie_note.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['allergie_note'],
        message: 'Descrivi le tue allergie o intolleranze',
      });
    }
  }
  if (data.spedizione_usa_residenza === false) {
    const required = ['spedizione_indirizzo', 'spedizione_civico', 'spedizione_cap', 'spedizione_citta', 'spedizione_provincia'] as const;
    for (const f of required) {
      const v = data[f];
      if (!v || (typeof v === 'string' && v.trim().length === 0)) {
        ctx.addIssue({
          code: 'custom',
          path: [f],
          message: 'Campo obbligatorio quando la spedizione non usa la residenza',
        });
      }
    }
  }
}

/** Self-edit profile schema (used by ProfileForm + /api/profile PATCH) */
export const profilePatchSchema = collaboratorBaseSchema
  .omit({ username: true })
  .partial();

export type ProfilePatchFormValues = z.infer<typeof profilePatchSchema>;

/** Admin/responsabile profile edit schema (used by CollaboratoreDetail + admin profile API) */
export const adminProfilePatchSchema = collaboratorBaseSchema
  .omit({ email: true, iban: true })
  .partial();

export type AdminProfilePatchFormValues = z.infer<typeof adminProfilePatchSchema>;

/** Onboarding wizard schema (required fields for first-time setup) */
export const onboardingSchema = collaboratorBaseSchema
  .pick({
    nome: true,
    cognome: true,
    codice_fiscale: true,
    data_nascita: true,
    luogo_nascita: true,
    provincia_nascita: true,
    comune: true,
    provincia_residenza: true,
    indirizzo: true,
    civico_residenza: true,
    telefono: true,
    iban: true,
    intestatario_pagamento: true,
    tshirt_size: true,
    sono_un_figlio_a_carico: true,
    importo_lordo_massimale: true,
    citta: true,
    materie_insegnate: true,
    numero_documento_identita: true,
    tipo_documento_identita: true,
    scadenza_documento_identita: true,
    ha_allergie_alimentari: true,
    allergie_note: true,
    regime_alimentare: true,
    spedizione_usa_residenza: true,
    spedizione_indirizzo: true,
    spedizione_civico: true,
    spedizione_cap: true,
    spedizione_citta: true,
    spedizione_provincia: true,
    spedizione_nazione: true,
    consenso_dati_salute: true,
  })
  .superRefine(applyIntegrativiRefinements);

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;

/** Create user quick mode schema */
export const createUserQuickSchema = z.object({
  email: z.string().email('Email non valida'),
  nome: z.string().min(1, 'Il nome è obbligatorio'),
  cognome: z.string().min(1, 'Il cognome è obbligatorio'),
  username: z.string().min(3, 'Minimo 3 caratteri').max(50).regex(/^[a-z0-9_]+$/, 'Solo lettere minuscole, numeri e _'),
  community_id: z.string().uuid('Seleziona una community'),
  tipo_contratto: z.string().min(1, 'Seleziona un tipo contratto'),
  data_ingresso: z.string().min(1, 'La data di ingresso è obbligatoria'),
  citta: z.string().min(1, 'La città è obbligatoria'),
  skip_contract_on_onboarding: z.boolean().optional(),
  data_fine_contratto: z.string().optional(),
});

export type CreateUserQuickFormValues = z.infer<typeof createUserQuickSchema>;

/** Create user full mode schema (extends quick with required personal data) */
export const createUserFullSchema = createUserQuickSchema.extend({
  codice_fiscale: z.string().regex(/^[A-Z0-9]{16}$/, 'Codice fiscale non valido'),
  data_nascita: z.string().min(1, 'Data di nascita obbligatoria'),
  luogo_nascita: z.string().min(1, 'Luogo di nascita obbligatorio'),
  provincia_nascita: z.string().min(1, 'Provincia obbligatoria').max(10),
  indirizzo: z.string().min(1, 'Indirizzo obbligatorio'),
  civico_residenza: z.string().min(1, 'Civico obbligatorio'),
  comune: z.string().min(1, 'Comune obbligatorio'),
  provincia_residenza: z.string().min(1, 'Provincia obbligatoria').max(10),
  telefono: z.string().min(1, 'Telefono obbligatorio'),
  intestatario_pagamento: z.string().min(1, 'Intestatario obbligatorio'),
  sono_un_figlio_a_carico: z.boolean().optional(),
  importo_lordo_massimale: z.number().min(1).max(5000).optional(),
  numero_documento_identita:   z.string().max(50).optional(),
  tipo_documento_identita:     z.enum(TIPO_DOCUMENTO_IDENTITA).optional(),
  scadenza_documento_identita: z.string().optional(),
});

export type CreateUserFullFormValues = z.infer<typeof createUserFullSchema>;

/** Self-edit profile form schema (handles empty strings, string numbers for form inputs) */
export const profileFormSchema = z
  .object({
    email:                    z.string().email('Email non valida'),
    nome:                     z.string().min(1, 'Il nome è obbligatorio'),
    cognome:                  z.string().min(1, 'Il cognome è obbligatorio'),
    codice_fiscale:           z.string().regex(/^[A-Z0-9]{16}$/, 'Codice fiscale non valido (16 caratteri alfanumerici)').or(z.literal('')),
    data_nascita:             z.string(),
    luogo_nascita:            z.string(),
    provincia_nascita:        z.string(),
    comune:                   z.string(),
    provincia_residenza:      z.string(),
    telefono:                 z.string(),
    indirizzo:                z.string(),
    civico_residenza:         z.string(),
    iban:                     z.string().max(34).regex(/^[A-Z]{2}\d{2}[A-Z0-9]+$/, 'IBAN non valido').or(z.literal('')),
    intestatario_pagamento:   z.string(),
    tshirt_size:              z.string(),
    sono_un_figlio_a_carico:  z.boolean(),
    importo_lordo_massimale:  z.string(),
    citta:                    z.string().min(1, 'La città è obbligatoria'),
    materie_insegnate:        z.array(z.string()).min(1, 'Seleziona almeno una materia'),
    numero_documento_identita:   z.string(),
    tipo_documento_identita:     z.string(),
    scadenza_documento_identita: z.string(),
    ha_allergie_alimentari:      z.boolean(),
    allergie_note:               z.string(),
    regime_alimentare:           z.enum(REGIME_ALIMENTARE),
    spedizione_usa_residenza:    z.boolean(),
    spedizione_indirizzo:        z.string(),
    spedizione_civico:           z.string(),
    spedizione_cap:              z.string(),
    spedizione_citta:            z.string(),
    spedizione_provincia:        z.string(),
    spedizione_nazione:          z.string(),
    consenso_dati_salute:        z.boolean().optional(),
  })
  .superRefine(applyIntegrativiRefinements);

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
