-- Migration 043: Monitoring tables + auth events function
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS get_recent_auth_events(int);
--   DROP TABLE IF EXISTS email_events;
--   DROP TABLE IF EXISTS import_runs;
--   ALTER TABLE export_runs DROP COLUMN IF EXISTS duration_ms;

-- ── import_runs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_runs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo         text        NOT NULL, -- 'collaboratori' | 'cu'
  executed_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  imported     int         NOT NULL DEFAULT 0,
  skipped      int         NOT NULL DEFAULT 0,
  errors       int         NOT NULL DEFAULT 0,
  detail_json  jsonb,
  duration_ms  int,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE import_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY import_runs_admin_read ON import_runs
  FOR SELECT TO authenticated
  USING (get_my_role() = 'amministrazione');

-- ── export_runs: add duration_ms ──────────────────────────────────────────────
ALTER TABLE export_runs ADD COLUMN IF NOT EXISTS duration_ms int;

-- ── email_events ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_email_id text,
  recipient       text        NOT NULL,
  subject         text,
  event_type      text        NOT NULL, -- 'delivered', 'bounced', 'opened', etc.
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_events_admin_read ON email_events
  FOR SELECT TO authenticated
  USING (get_my_role() = 'amministrazione');

-- ── get_recent_auth_events ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_recent_auth_events(days int DEFAULT 7)
RETURNS TABLE(
  id          uuid,
  created_at  timestamptz,
  email       text,
  event_type  text,
  ip_address  text
)
LANGUAGE sql SECURITY DEFINER SET search_path = auth, public AS $$
  SELECT
    ale.id,
    ale.created_at,
    (ale.payload->>'actor_username')::text  AS email,
    (ale.payload->>'action')::text          AS event_type,
    ale.ip_address::text
  FROM auth.audit_log_entries ale
  WHERE ale.created_at >= now() - (days || ' days')::interval
    AND ale.payload->>'action' IN (
      'login', 'logout', 'token_refreshed', 'user_recovery_requested'
    )
  ORDER BY ale.created_at DESC
  LIMIT 500;
$$;
