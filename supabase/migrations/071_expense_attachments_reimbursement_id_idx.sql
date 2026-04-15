-- Migration 071: index FK expense_attachments.reimbursement_id
-- Backlog: DB-NEW-8
-- Rationale: the FK `expense_attachments.reimbursement_id -> expense_reimbursements.id`
-- has no index. Every reimbursement detail page join + cascade delete operation
-- requires a full sequential scan of expense_attachments.
-- Fix: standard btree index on the FK column.
--
-- ROLLBACK: DROP INDEX CONCURRENTLY IF EXISTS idx_expense_attachments_reimbursement_id;

CREATE INDEX IF NOT EXISTS idx_expense_attachments_reimbursement_id
  ON public.expense_attachments (reimbursement_id);
