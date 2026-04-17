import { z } from 'zod';

export const createOpportunitySchema = z.object({
  titolo: z.string().min(1, 'Il titolo è obbligatorio'),
  tipo: z.enum(['Volontariato', 'Formazione', 'Lavoro', 'Altro']).optional(),
  descrizione: z.string().min(1, 'La descrizione è obbligatoria'),
  scadenza_candidatura: z.string().optional(),
  link_candidatura: z.string().optional(),
  file_url: z.string().optional(),
  community_ids: z.array(z.string()).optional(),
});

export type CreateOpportunityFormValues = z.infer<typeof createOpportunitySchema>;
