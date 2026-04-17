import { z } from 'zod';

export const createCorsoSchema = z.object({
  nome: z.string().min(1, 'Il nome è obbligatorio'),
  codice_identificativo: z.string().min(1, 'Il codice è obbligatorio'),
  community_id: z.string().uuid('Seleziona una community'),
  modalita: z.enum(['online', 'in_aula']),
  citta: z.string().nullable().optional(),
  linea: z.string().nullable().optional(),
  responsabile_doc: z.string().nullable().optional(),
  licenza_zoom: z.string().nullable().optional(),
  data_inizio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido'),
  data_fine: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido'),
  max_docenti_per_lezione: z.number().int().min(1).optional(),
  max_qa_per_lezione: z.number().int().min(0).optional(),
  link_lw: z.string().nullable().optional(),
  link_zoom: z.string().nullable().optional(),
  link_telegram_corsisti: z.string().nullable().optional(),
  link_qa_assignments: z.string().nullable().optional(),
  link_questionari: z.string().nullable().optional(),
  link_emergenza: z.string().nullable().optional(),
});

export type CreateCorsoFormValues = z.infer<typeof createCorsoSchema>;
