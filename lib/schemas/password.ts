import { z } from 'zod';

export const changePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'La password deve avere almeno 8 caratteri')
      .regex(/[A-Z]/, 'Deve contenere almeno una lettera maiuscola')
      .regex(/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'Deve contenere almeno un numero o simbolo'),
    confirm: z.string().min(1, 'Conferma la password'),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Le password non corrispondono',
    path: ['confirm'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const profilePasswordSchema = z
  .object({
    current: z.string().min(1, 'Inserisci la password attuale'),
    password: z.string().min(8, 'La password deve avere almeno 8 caratteri'),
    confirm: z.string().min(1, 'Conferma la nuova password'),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Le password non corrispondono',
    path: ['confirm'],
  });

export type ProfilePasswordFormValues = z.infer<typeof profilePasswordSchema>;
