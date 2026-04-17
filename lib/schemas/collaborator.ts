import { z } from 'zod';
import { TSHIRT_SIZES } from '@/lib/types';

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
});

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
export const onboardingSchema = collaboratorBaseSchema.pick({
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
});

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
});

export type CreateUserFullFormValues = z.infer<typeof createUserFullSchema>;

/** Self-edit profile form schema (handles empty strings, string numbers for form inputs) */
export const profileFormSchema = z.object({
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
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
