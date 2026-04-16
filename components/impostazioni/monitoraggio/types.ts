export type Stats = {
  compensi_in_attesa: number;
  rimborsi_in_attesa: number;
  doc_da_firmare: number;
  ticket_aperti: number;
  onboarding_incompleti: number;
};

export type AccessEvent = {
  id: string;
  created_at: string;
  email: string;
  role: string;
  event_type: string;
  ip_address: string;
};

export type Operation = {
  id: string;
  tipo: string;
  executed_by_email: string;
  imported: number;
  skipped: number;
  errors: number;
  duration_ms: number | null;
  detail_json: unknown;
  created_at: string;
};

export type EmailEvent = {
  id: string;
  created_at: string;
  recipient: string;
  subject: string;
  event_type: string;
};

export type EmailDeliveryData = {
  summary: Record<string, number>;
  events: EmailEvent[];
  total: number;
  page: number;
  page_size: number;
};

export type SupabaseLogEntry = {
  id?: string;
  timestamp?: string;
  event_message?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type TopQuery = {
  query: string;
  calls: number;
  total_ms: number;
  mean_ms: number;
  rows_total: number;
};

export type TableStat = {
  table_name: string;
  seq_scan: number;
  idx_scan: number;
  n_live_tup: number;
  n_dead_tup: number;
};

export type AppError = {
  id: string;
  created_at: string;
  message: string;
  stack: string | null;
  url: string | null;
};

export type AccessDays = 1 | 7 | 30;
export type LogService = 'api' | 'auth' | 'database';
