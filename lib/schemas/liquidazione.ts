import { z } from 'zod';

export const liquidazioneRequestSchema = z
  .object({
    compensation_ids: z.array(z.string().uuid()).default([]),
    expense_ids: z.array(z.string().uuid()).default([]),
    ha_partita_iva: z.boolean(),
  })
  .refine((d) => d.compensation_ids.length + d.expense_ids.length > 0, {
    message: 'Seleziona almeno un compenso o rimborso.',
  });

export type LiquidazioneRequestFormValues = z.infer<typeof liquidazioneRequestSchema>;
