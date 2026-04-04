-- 064_prod_schema_sync.sql
-- Applied directly to production 2026-04-02 — schema alignment prod/staging
-- Fixes: 3 obsolete RLS policies removed, 1 missing policy added, 1 NOT NULL constraint

-- Fix 1: Remove obsolete policies on collaborator_communities
-- These were the original names before being renamed to user_community_access_* in staging.
-- collab_communities_own_read was the policy flagged in CLAUDE.md for RLS infinite recursion
-- (it used a direct subquery on collaborators instead of get_my_collaborator_id()).
DROP POLICY IF EXISTS collab_communities_admin_all ON collaborator_communities;
DROP POLICY IF EXISTS collab_communities_own_read ON collaborator_communities;
DROP POLICY IF EXISTS collab_communities_responsabile_read ON collaborator_communities;

-- Fix 2: Add missing policy (uses get_my_collaborator_id — SECURITY DEFINER, no recursion)
CREATE POLICY user_community_access_own_read ON collaborator_communities
  FOR SELECT USING (collaborator_id = get_my_collaborator_id());

-- Fix 3: Add NOT NULL constraint (verified 0 NULL rows before applying)
ALTER TABLE expense_reimbursements
  ALTER COLUMN community_id SET NOT NULL;
