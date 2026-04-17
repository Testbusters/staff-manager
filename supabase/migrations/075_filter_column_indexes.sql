-- Migration 075: add indexes on frequently filtered/sorted columns
-- Backlog: DB8
-- Rationale: these columns are used in date-range filters, ordering, and
-- recency sorts but have no dedicated index.
--
-- ROLLBACK:
--   DROP INDEX CONCURRENTLY IF EXISTS compensations_data_competenza_idx;
--   DROP INDEX CONCURRENTLY IF EXISTS er_data_spesa_idx;
--   DROP INDEX CONCURRENTLY IF EXISTS tickets_last_message_at_idx;

CREATE INDEX IF NOT EXISTS compensations_data_competenza_idx
  ON public.compensations (data_competenza);

CREATE INDEX IF NOT EXISTS er_data_spesa_idx
  ON public.expense_reimbursements (data_spesa);

CREATE INDEX IF NOT EXISTS tickets_last_message_at_idx
  ON public.tickets (last_message_at DESC NULLS LAST);
