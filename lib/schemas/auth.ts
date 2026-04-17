import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Inserisci l\'email').email('Email non valida'),
  password: z.string().min(1, 'Inserisci la password'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
