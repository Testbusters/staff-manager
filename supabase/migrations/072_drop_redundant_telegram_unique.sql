-- Migration 072: drop redundant full UNIQUE on collaborators.telegram_chat_id
-- Backlog: DB-NEW-9
-- Rationale: migration 066 created both a full UNIQUE constraint
-- (collaborators_telegram_chat_id_key) and a partial UNIQUE index
-- (collaborators_telegram_chat_id_idx WHERE telegram_chat_id IS NOT NULL).
-- The full constraint is redundant — the partial index already guarantees
-- uniqueness on all non-null values, which is the only case that matters.
-- The full constraint wastes space indexing NULL rows (most collaborators).
--
-- ROLLBACK: ALTER TABLE collaborators ADD CONSTRAINT collaborators_telegram_chat_id_key UNIQUE (telegram_chat_id);

ALTER TABLE public.collaborators
  DROP CONSTRAINT IF EXISTS collaborators_telegram_chat_id_key;
