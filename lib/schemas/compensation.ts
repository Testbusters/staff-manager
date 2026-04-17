import { z } from 'zod';

export const createCompensationSchema = z.object({
  collaborator_id: z.string().uuid(),
  community_id: z.string().uuid().optional(),
  data_competenza: z.string().min(1, 'Data competenza obbligatoria'),
  nome_servizio_ruolo: z.string().min(1, 'Nome servizio/ruolo obbligatorio'),
  competenza: z.string().min(1, 'Competenza obbligatoria'),
  info_specifiche: z.string().optional(),
  importo_lordo: z.number().positive('Importo lordo deve essere positivo'),
  ritenuta_acconto: z.number().min(0),
  importo_netto: z.number().positive(),
});

export type CreateCompensationFormValues = z.infer<typeof createCompensationSchema>;

/** Form-side schema for the wizard (no collaborator_id / computed fields) */
export const compensationWizardSchema = z.object({
  data_competenza: z.string().min(1, 'Data competenza obbligatoria'),
  nome_servizio_ruolo: z.string().min(1, 'Nome servizio/ruolo obbligatorio'),
  competenza: z.string().min(1, 'Competenza obbligatoria'),
  info_specifiche: z.string().optional(),
  importo_lordo: z.string()
    .min(1, 'Importo obbligatorio')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
      message: 'Importo deve essere maggiore di 0',
    }),
});

export type CompensationWizardFormValues = z.infer<typeof compensationWizardSchema>;
