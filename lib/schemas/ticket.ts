import { z } from 'zod';

export const createTicketSchema = z.object({
  categoria: z.string().min(1, 'Seleziona una categoria'),
  oggetto: z.string().min(1, 'Inserisci un oggetto'),
  messaggio: z.string().optional(),
  priority: z.enum(['BASSA', 'NORMALE', 'ALTA']).optional(),
});

export type CreateTicketFormValues = z.infer<typeof createTicketSchema>;

export const ticketMessageSchema = z.object({
  message: z.string().min(1, 'Il messaggio non può essere vuoto'),
});

export type TicketMessageFormValues = z.infer<typeof ticketMessageSchema>;

export const ticketStatusSchema = z.object({
  stato: z.enum(['APERTO', 'IN_LAVORAZIONE', 'CHIUSO']),
});

export type TicketStatusFormValues = z.infer<typeof ticketStatusSchema>;
