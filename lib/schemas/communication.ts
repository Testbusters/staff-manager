import { z } from 'zod';

export const createCommunicationSchema = z.object({
  titolo: z.string().min(1, 'Il titolo è obbligatorio'),
  contenuto: z.string().min(1, 'Il contenuto è obbligatorio'),
  pinned: z.boolean().optional(),
  community_ids: z.array(z.string()).optional(),
  expires_at: z.string().nullable().optional(),
  file_urls: z.array(z.string()).optional(),
});

export type CreateCommunicationFormValues = z.infer<typeof createCommunicationSchema>;
