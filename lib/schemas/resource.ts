import { z } from 'zod';

export const createResourceSchema = z.object({
  titolo: z.string().min(1, 'Il titolo è obbligatorio'),
  descrizione: z.string().optional(),
  link: z.string().optional(),
  file_url: z.string().optional(),
  tag: z.array(z.string()).optional(),
  community_ids: z.array(z.string()).optional(),
  categoria: z.string().optional(),
});

export type CreateResourceFormValues = z.infer<typeof createResourceSchema>;
