-- Migration 044: app_errors + db stat helper functions
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS reset_query_stats();
--   DROP FUNCTION IF EXISTS get_table_stats();
--   DROP FUNCTION IF EXISTS get_top_queries();
--   DROP TABLE IF EXISTS app_errors;

-- ── app_errors ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_errors (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message    text        NOT NULL,
  stack      text,
  url        text,
  user_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_errors_admin_read ON app_errors
  FOR SELECT TO authenticated
  USING (get_my_role() = 'amministrazione');

-- ── pg_stat_statements helper functions ───────────────────────────────────────
-- pg_stat_statements lives in the 'extensions' schema on Supabase

CREATE OR REPLACE FUNCTION get_top_queries()
RETURNS TABLE(
  query        text,
  calls        bigint,
  total_ms     numeric,
  mean_ms      numeric,
  rows_total   bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = extensions, public AS $$
  SELECT
    LEFT(pss.query, 200)                        AS query,
    pss.calls                                   AS calls,
    ROUND(pss.total_exec_time::numeric, 2)      AS total_ms,
    ROUND(pss.mean_exec_time::numeric, 2)       AS mean_ms,
    pss.rows                                    AS rows_total
  FROM extensions.pg_stat_statements pss
  ORDER BY pss.total_exec_time DESC
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE(
  table_name   text,
  seq_scan     bigint,
  idx_scan     bigint,
  n_live_tup   bigint,
  n_dead_tup   bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    relname::text  AS table_name,
    seq_scan,
    idx_scan,
    n_live_tup,
    n_dead_tup
  FROM pg_stat_user_tables
  ORDER BY (seq_scan + COALESCE(idx_scan, 0)) DESC
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION reset_query_stats()
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = extensions, public AS $$
  SELECT extensions.pg_stat_statements_reset();
$$;
