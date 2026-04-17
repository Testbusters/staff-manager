import { z } from 'zod';

export const createEventSchema = z.object({
  titolo: z.string().min(1, 'Il titolo è obbligatorio'),
  descrizione: z.string().optional(),
  start_datetime: z.string().optional(),
  end_datetime: z.string().optional(),
  location: z.string().optional(),
  luma_url: z.string().optional(),
  luma_embed_url: z.string().optional(),
  community_ids: z.array(z.string()).optional(),
  tipo: z.string().optional(),
  file_url: z.string().optional(),
});

export type CreateEventFormValues = z.infer<typeof createEventSchema>;
