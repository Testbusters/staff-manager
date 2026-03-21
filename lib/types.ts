// ── Roles ──────────────────────────────────────────────────
export type Role =
  | 'collaboratore'
  | 'responsabile_cittadino'
  | 'responsabile_compensi'
  | 'responsabile_servizi_individuali'
  | 'amministrazione';

export type MemberStatus = 'attivo' | 'uscente_con_compenso' | 'uscente_senza_compenso';

// ── Compensation ────────────────────────────────────────────
export type CompensationStatus =
  | 'IN_ATTESA'
  | 'APPROVATO'
  | 'RIFIUTATO'
  | 'LIQUIDATO';

// ── Expense ─────────────────────────────────────────────────
export type ExpenseStatus =
  | 'IN_ATTESA'
  | 'APPROVATO'
  | 'RIFIUTATO'
  | 'LIQUIDATO';

export const EXPENSE_CATEGORIES = [
  'Trasporti',
  'Vitto',
  'Alloggio',
  'Materiali',
  'Cancelleria',
  'Altro',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

// ── Document ─────────────────────────────────────────────────
export type DocumentType =
  | 'CONTRATTO_OCCASIONALE'
  | 'CU'
  | 'RICEVUTA_PAGAMENTO';
export type DocumentSignStatus = 'DA_FIRMARE' | 'FIRMATO' | 'NON_RICHIESTO';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  CONTRATTO_OCCASIONALE: 'Contratto prestazione occasionale',
  CU:                    'Certificazione Unica',
  RICEVUTA_PAGAMENTO:    'Ricevuta di pagamento',
};

// ── Contract template ─────────────────────────────────────────
export type ContractTemplateType =
  | 'OCCASIONALE'
  | 'RICEVUTA_PAGAMENTO'
  | 'OCCASIONALE_P4M'
  | 'RICEVUTA_PAGAMENTO_P4M';

export const CONTRACT_TEMPLATE_LABELS: Record<ContractTemplateType, string> = {
  OCCASIONALE:              'Contratto Testbusters',
  RICEVUTA_PAGAMENTO:       'Ricevuta Testbusters',
  OCCASIONALE_P4M:          'Contratto Peer4Med',
  RICEVUTA_PAGAMENTO_P4M:   'Ricevuta Peer4Med',
};

export const CONTRACT_TEMPLATE_DOCUMENT_TYPE: Record<ContractTemplateType, DocumentType> = {
  OCCASIONALE:             'CONTRATTO_OCCASIONALE',
  RICEVUTA_PAGAMENTO:      'RICEVUTA_PAGAMENTO',
  OCCASIONALE_P4M:         'CONTRATTO_OCCASIONALE',
  RICEVUTA_PAGAMENTO_P4M:  'RICEVUTA_PAGAMENTO',
};

export interface ContractTemplate {
  id: string;
  tipo: ContractTemplateType;
  file_url: string;
  file_name: string;
  uploaded_by: string | null;
  uploaded_at: string;
}

export type DocumentMacroType = 'CONTRATTO' | 'CU' | 'RICEVUTA';

export const DOCUMENT_MACRO_TYPE: Record<DocumentType, DocumentMacroType> = {
  CONTRATTO_OCCASIONALE: 'CONTRATTO',
  CU:                    'CU',
  RICEVUTA_PAGAMENTO:    'RICEVUTA',
};

export const DOCUMENT_MACRO_TYPE_LABELS: Record<DocumentMacroType, string> = {
  CONTRATTO: 'Contratto',
  CU:        'Certificazione Unica',
  RICEVUTA:  'Ricevute',
};

export const DOCUMENT_SIGN_STATUS_LABELS: Record<DocumentSignStatus, string> = {
  DA_FIRMARE:    'Da firmare',
  FIRMATO:       'Firmato',
  NON_RICHIESTO: 'Nessuna firma richiesta',
};

export interface Document {
  id: string;
  collaborator_id: string;
  community_id: string | null;
  tipo: DocumentType;
  anno: number | null;
  titolo: string;
  file_original_url: string;       // storage path (not full URL)
  file_original_name: string;
  stato_firma: DocumentSignStatus;
  file_firmato_url: string | null; // storage path
  file_firmato_name: string | null;
  requested_at: string;
  signed_at: string | null;
  created_at: string;
}

// ── Ticket ──────────────────────────────────────────────────
export type TicketStatus = 'APERTO' | 'IN_LAVORAZIONE' | 'CHIUSO';
export type TicketPriority = 'BASSA' | 'NORMALE' | 'ALTA';

export const TICKET_CATEGORIES = [
  'Compenso',
  'Rimborso',
  'Altro',
] as const;

export type TicketCategory = typeof TICKET_CATEGORIES[number];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  APERTO:         'Aperto',
  IN_LAVORAZIONE: 'In lavorazione',
  CHIUSO:         'Chiuso',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  BASSA:   'Bassa',
  NORMALE: 'Normale',
  ALTA:    'Alta',
};

export interface Ticket {
  id: string;
  creator_user_id: string;
  community_id: string | null;
  categoria: TicketCategory;
  oggetto: string;
  stato: TicketStatus;
  priority: TicketPriority;
  created_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  author_user_id: string;
  message: string;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
}

// ── Content ──────────────────────────────────────────────────
export type ResourceCategoria = 'Guida' | 'Allegato' | 'Locandina' | 'Bando' | 'Decreto' | 'Altro';
export type EventTipo = 'Convention' | 'Attivita_interna' | 'Workshop' | 'Formazione' | 'Altro';
export type OpportunityTipo = 'Volontariato' | 'Formazione' | 'Lavoro' | 'Altro';

export interface Communication {
  id: string;
  community_ids: string[];
  titolo: string;
  contenuto: string;
  pinned: boolean;
  published_at: string;
  expires_at: string | null;
  file_urls: string[];
  created_at: string;
}

export interface Discount {
  id: string;
  community_ids: string[];
  titolo: string;
  descrizione: string | null;
  codice_sconto: string | null;
  link: string | null;
  valid_from: string | null;
  valid_to: string | null;
  fornitore: string;
  logo_url: string | null;
  file_url: string | null;
  brand: string;
  created_at: string;
}

export interface Resource {
  id: string;
  community_ids: string[];
  titolo: string;
  descrizione: string | null;
  link: string | null;
  file_url: string | null;
  tag: string[] | null;
  categoria: ResourceCategoria;
  created_at: string;
}

export interface ContentEvent {
  id: string;
  community_ids: string[];
  titolo: string;
  descrizione: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  location: string | null;
  luma_url: string | null;
  luma_embed_url: string | null;
  tipo: EventTipo | null;
  file_url: string | null;
  created_at: string;
}

export interface Opportunity {
  id: string;
  community_ids: string[];
  titolo: string;
  tipo: OpportunityTipo;
  descrizione: string;

  scadenza_candidatura: string | null;
  link_candidatura: string | null;
  file_url: string | null;
  created_at: string;
}

// ── Role labels (anonymous — shown in timeline) ─────────────
export const ROLE_LABELS: Record<Role, string> = {
  collaboratore:                    'Collaboratore',
  responsabile_cittadino:           'Responsabile Cittadino',
  responsabile_compensi:            'Responsabile Compensi',
  responsabile_servizi_individuali: 'Responsabile Servizi Individuali',
  amministrazione:                  'Amministrazione',
};

// ── Status display labels ────────────────────────────────────
export const COMPENSATION_STATUS_LABELS: Record<CompensationStatus, string> = {
  IN_ATTESA: 'In attesa',
  APPROVATO: 'Approvato',
  RIFIUTATO: 'Rifiutato',
  LIQUIDATO: 'Liquidato',
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  IN_ATTESA: 'In attesa',
  APPROVATO: 'Approvato',
  RIFIUTATO: 'Rifiutato',
  LIQUIDATO: 'Liquidato',
};

// ── Supabase DB row types (minimal, extend as needed) ────────
export interface UserProfile {
  id: string;
  user_id: string;
  role: Role;
  is_active: boolean;
  member_status: MemberStatus;
  onboarding_completed: boolean;
  created_at: string;
}

export interface Community {
  id: string;
  name: string;
  created_at: string;
}

export interface Collaborator {
  id: string;
  user_id: string;
  username: string | null;
  nome: string | null;
  cognome: string | null;
  tipo_contratto: ContractTemplateType | null;
  codice_fiscale: string | null;
  partita_iva: string | null;
  data_nascita: string | null;
  luogo_nascita: string | null;
  provincia_nascita: string | null;
  comune: string | null;
  provincia_residenza: string | null;
  indirizzo: string | null;
  civico_residenza: string | null;
  telefono: string | null;
  email: string;
  iban: string | null;
  note: string | null;
  tshirt_size: string | null;
  foto_profilo_url: string | null;
  data_ingresso: string | null;
  data_fine_contratto: string | null;
  sono_un_figlio_a_carico: boolean;
  importo_lordo_massimale: number | null;
  figli_dettaglio: Record<string, unknown> | null;
  created_at: string;
}

// ── Compensation DB row types ────────────────────────────────
export interface Compensation {
  id: string;
  collaborator_id: string;
  community_id: string | null;
  nome_servizio_ruolo: string | null;
  competenza: string | null;
  data_competenza: string | null;
  importo_lordo: number | null;
  ritenuta_acconto: number | null;
  importo_netto: number | null;
  stato: CompensationStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_note: string | null;
  liquidated_at: string | null;
  liquidated_by: string | null;
  payment_reference: string | null;
  info_specifiche: string | null;
  receipt_document_id?: string | null;
  created_at: string;
  updated_at: string;
}


export interface CompensationHistory {
  id: string;
  compensation_id: string;
  stato_precedente: string | null;
  stato_nuovo: string;
  changed_by: string | null;
  role_label: string;
  note: string | null;
  created_at: string;
}

// ── Shared timeline event shape ───────────────────────────
export interface HistoryEvent {
  id: string;
  stato_precedente: string | null;
  stato_nuovo: string;
  role_label: string;
  note: string | null;
  created_at: string;
  changed_by_name?: string | null;
}

export const EXPENSE_CATEGORIA_BADGE: Record<ExpenseCategory, string> = {
  Trasporti:   'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700/50',
  Vitto:       'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50',
  Alloggio:    'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700/50',
  Materiali:   'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50',
  Cancelleria: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-700/50',
  Altro:       'bg-muted text-muted-foreground border-border',
};

// ── Notification ─────────────────────────────────────────
export interface Notification {
  id: string;
  user_id: string;
  tipo: string;
  titolo: string;
  messaggio: string | null;
  entity_type: 'compensation' | 'reimbursement' | 'document' | 'ticket' | 'communication' | 'event' | 'opportunity' | 'discount' | null;
  entity_id: string | null;
  read: boolean;
  created_at: string;
}

// ── Expense DB row types ──────────────────────────────────
export interface Expense {
  id: string;
  collaborator_id: string;
  community_id: string | null;
  categoria: ExpenseCategory;
  data_spesa: string;
  importo: number;
  descrizione: string;
  stato: ExpenseStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_note: string | null;
  liquidated_at: string | null;
  liquidated_by: string | null;
  payment_reference: string | null;
  receipt_document_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReceiptPreviewItem {
  collaborator_id: string;
  nome: string;
  cognome: string;
  lordo_compensi: number;
  lordo_rimborsi: number;
  totale_lordo: number;
  ritenuta: number;
  netto: number;
}

export interface ExpenseAttachment {
  id: string;
  reimbursement_id: string;
  file_url: string;
  file_name: string;
  created_at: string;
}

export interface ExpenseHistory {
  id: string;
  reimbursement_id: string;
  stato_precedente: string | null;
  stato_nuovo: string;
  changed_by: string | null;
  role_label: string;
  note: string | null;
  created_at: string;
}
