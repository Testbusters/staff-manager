-- Migration 031: fix compensation_history RLS for nullable community_id
--
-- Problem: comp_history_manager_read uses can_manage_community(community_id)
-- which returns false when community_id IS NULL (all GSheet-imported compensations).
-- Same root cause as migration 030 fixed for the compensations table itself.
--
-- Also adds missing admin read policy on compensation_history.
--
-- ROLLBACK:
--   DROP POLICY IF EXISTS "comp_history_manager_read" ON compensation_history;
--   CREATE POLICY "comp_history_manager_read" ON compensation_history
--     FOR SELECT USING (
--       EXISTS (
--         SELECT 1 FROM compensations c
--         WHERE c.id = compensation_id
--           AND can_manage_community(c.community_id)
--       )
--     );
--   DROP POLICY IF EXISTS "comp_history_admin_read" ON compensation_history;

-- 1. Fix manager read policy
DROP POLICY IF EXISTS "comp_history_manager_read" ON compensation_history;

CREATE POLICY "comp_history_manager_read" ON compensation_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM compensations c
      JOIN collaborator_communities cc ON cc.collaborator_id = c.collaborator_id
      JOIN user_community_access uca ON uca.community_id = cc.community_id
      WHERE c.id = compensation_history.compensation_id
        AND uca.user_id = auth.uid()
    )
  );

-- 2. Add admin read policy (previously missing)
DROP POLICY IF EXISTS "comp_history_admin_read" ON compensation_history;

CREATE POLICY "comp_history_admin_read" ON compensation_history
  FOR SELECT USING (
    get_my_role() = 'amministrazione'
  );
