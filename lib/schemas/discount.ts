import { z } from 'zod';

export const createDiscountSchema = z.object({
  titolo: z.string().min(1, 'Il titolo è obbligatorio'),
  descrizione: z.string().optional(),
  codice_sconto: z.string().optional(),
  link: z.string().optional(),
  valid_from: z.string().optional(),
  valid_to: z.string().optional(),
  community_ids: z.array(z.string()).optional(),
  fornitore: z.string().optional(),
  logo_url: z.string().optional(),
  file_url: z.string().optional(),
  brand: z.string().optional(),
});

export type CreateDiscountFormValues = z.infer<typeof createDiscountSchema>;
