import { z } from 'zod';

export const expenseSchema = z.object({
  categoria: z.string().min(1, 'Seleziona una categoria'),
  data_spesa: z.string().min(1, 'Data obbligatoria'),
  importo: z.string()
    .min(1, 'Importo obbligatorio')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
      message: 'Importo deve essere maggiore di 0',
    }),
  descrizione: z.string().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
