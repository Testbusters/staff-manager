import { z } from 'zod';

export const documentUploadSchema = z.object({
  tipo: z.string().min(1, 'Seleziona un tipo documento'),
  anno: z.number().min(2000).max(2100),
  titolo: z.string().min(1, 'Il titolo è obbligatorio'),
  stato_firma: z.enum(['DA_FIRMARE', 'NON_RICHIESTO']).optional(),
});

export type DocumentUploadFormValues = z.infer<typeof documentUploadSchema>;

export const cuBatchUploadSchema = z.object({
  anno: z.string().refine((v) => {
    const n = parseInt(v, 10);
    return !isNaN(n) && n >= 2000 && n <= 2100;
  }, { message: 'Anno non valido (2000-2100)' }),
});

export type CUBatchUploadFormValues = z.infer<typeof cuBatchUploadSchema>;
