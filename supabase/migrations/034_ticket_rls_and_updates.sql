-- ROLLBACK:
-- ALTER TABLE tickets DROP COLUMN IF EXISTS updated_at;
-- ALTER TABLE tickets DROP COLUMN IF EXISTS last_message_at;
-- ALTER TABLE tickets DROP COLUMN IF EXISTS last_message_author_name;
-- ALTER TABLE tickets DROP COLUMN IF EXISTS last_message_author_role;
-- DROP POLICY IF EXISTS tickets_admin_read ON tickets;
-- DROP POLICY IF EXISTS tickets_manager_read ON tickets;
-- CREATE POLICY tickets_manager_read ON tickets FOR SELECT TO authenticated
--   USING (can_manage_community(community_id));

-- Add columns for last-reply denormalization and activity tracking
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_message_author_name TEXT,
  ADD COLUMN IF NOT EXISTS last_message_author_role TEXT;

-- Fix RLS: old tickets_manager_read used can_manage_community(community_id)
-- which returns FALSE when community_id is NULL (tickets do not set community_id).
-- New policy uses creator_user_id → collaborators → collaborator_communities → user_community_access.
DROP POLICY IF EXISTS tickets_manager_read ON tickets;
DROP POLICY IF EXISTS tickets_admin_read ON tickets;

-- Admin sees all tickets
CREATE POLICY tickets_admin_read ON tickets
  FOR SELECT TO authenticated
  USING (get_my_role() = 'amministrazione');

-- Responsabile sees tickets where the creator belongs to a managed community
CREATE POLICY tickets_manager_read ON tickets
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'responsabile_compensi'
    AND creator_user_id IN (
      SELECT c.user_id
      FROM collaborators c
      JOIN collaborator_communities cc ON cc.collaborator_id = c.id
      JOIN user_community_access uca ON uca.community_id = cc.community_id
      WHERE uca.user_id = auth.uid()
    )
  );
