import { z } from 'zod';

export const communitySchema = z.object({
  type: z.enum(['citta', 'materia']),
  community: z.enum(['testbusters', 'peer4med']),
  nome: z.string().min(1, 'Il nome non può essere vuoto').max(100),
});

export type CommunityFormValues = z.infer<typeof communitySchema>;
