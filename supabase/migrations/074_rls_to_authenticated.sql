-- Migration 074: restrict all public-schema RLS policies to authenticated role
-- Backlog: DB4
-- Rationale: all 98 RLS policies with roles={public} apply to both authenticated
-- AND anon roles. The app requires login for all access (proxy.ts enforces session).
-- Restricting to authenticated is defense-in-depth: if a misconfigured route
-- bypasses session checks, the DB itself blocks anonymous data access.
--
-- ROLLBACK (revert all to public):
-- DO $$ DECLARE r RECORD; BEGIN
--   FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies
--     WHERE schemaname = 'public' AND roles = '{authenticated}'
--   LOOP EXECUTE format('ALTER POLICY %I ON %I.%I TO public', r.policyname, r.schemaname, r.tablename);
--   END LOOP; END $$;

DO $$
DECLARE
  r RECORD;
  cnt INT := 0;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND roles = '{public}'
    ORDER BY tablename, policyname
  LOOP
    EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated',
                   r.policyname, r.schemaname, r.tablename);
    cnt := cnt + 1;
  END LOOP;
  RAISE NOTICE 'Altered % policies to authenticated', cnt;
END $$;
