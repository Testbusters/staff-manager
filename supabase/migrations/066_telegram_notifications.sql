-- Migration 066: Telegram opt-in notification channel
-- Adds telegram_chat_id to collaborators, telegram_tokens table,
-- and telegram_enabled column to notification_settings.
--
-- ROLLBACK:
--   ALTER TABLE collaborators DROP COLUMN IF EXISTS telegram_chat_id;
--   DROP TABLE IF EXISTS telegram_tokens;
--   ALTER TABLE notification_settings DROP COLUMN IF EXISTS telegram_enabled;

-- 1. Add telegram_chat_id to collaborators
ALTER TABLE collaborators
  ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT UNIQUE NULL;

CREATE UNIQUE INDEX IF NOT EXISTS collaborators_telegram_chat_id_idx
  ON collaborators (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

-- 2. Create telegram_tokens table (service-role only — no RLS policies)
CREATE TABLE IF NOT EXISTS telegram_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id UUID NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  used_at         TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One pending token per collaborator (before use)
CREATE UNIQUE INDEX IF NOT EXISTS telegram_tokens_collaborator_id_idx
  ON telegram_tokens (collaborator_id);

-- Fast expiry sweep index
CREATE INDEX IF NOT EXISTS telegram_tokens_expires_at_idx
  ON telegram_tokens (expires_at)
  WHERE used_at IS NULL;

-- RLS enabled but no policies: service-role bypasses RLS, anon/user are blocked
ALTER TABLE telegram_tokens ENABLE ROW LEVEL SECURITY;

-- 3. Add telegram_enabled to notification_settings
ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS telegram_enabled BOOLEAN NOT NULL DEFAULT false;

-- 4. Seed: enable Telegram for the 3 corsi notification events
-- These events already exist from migration 060 / earlier seeds.
-- We upsert to avoid duplicate-key errors on re-run.
UPDATE notification_settings
SET telegram_enabled = true
WHERE event_key IN (
  'assegnazione_corso',
  'nuovo_corso_citta',
  'reminder_lezione_24h'
);

-- If rows don't exist yet (clean DB), insert them
INSERT INTO notification_settings (event_key, recipient_role, label, inapp_enabled, email_enabled, telegram_enabled)
VALUES
  ('assegnazione_corso',   'collaboratore', 'Assegnazione corso',              true,  true,  true),
  ('nuovo_corso_citta',    'collaboratore', 'Nuovo corso nella tua città',     true,  true,  true),
  ('reminder_lezione_24h', 'collaboratore', 'Promemoria lezione 24h',          true,  true,  true)
ON CONFLICT (event_key, recipient_role) DO UPDATE
  SET telegram_enabled = true;
