-- Migration 077: Fix 3 dead expense RLS policies referencing stale states
-- Closes: DB-RLS-1 (refactoring-backlog.md)
--
-- Context: migration 023 removed INVIATO and INTEGRAZIONI_RICHIESTE states,
-- but 3 RLS policies still reference them. These policies are effectively dead
-- (no rows ever match), breaking the defense-in-depth safety net.
--
-- ROLLBACK:
-- DROP POLICY IF EXISTS expenses_own_update ON expense_reimbursements;
-- CREATE POLICY expenses_own_update_inviato ON expense_reimbursements
--   FOR UPDATE TO authenticated
--   USING (collaborator_id = get_my_collaborator_id() AND stato = 'INVIATO' AND get_my_role() = 'collaboratore');
-- CREATE POLICY expenses_responsabile_update ON expense_reimbursements
--   FOR UPDATE TO authenticated
--   USING (get_my_role() = 'responsabile_compensi' AND EXISTS (
--     SELECT 1 FROM collaborator_communities cc
--     JOIN user_community_access uca ON uca.community_id = cc.community_id
--     WHERE cc.collaborator_id = expense_reimbursements.collaborator_id
--     AND uca.user_id = (SELECT auth.uid())
--   ) AND stato = ANY(ARRAY['INVIATO', 'INTEGRAZIONI_RICHIESTE']));
-- DROP POLICY IF EXISTS exp_attachments_own_insert ON expense_attachments;
-- CREATE POLICY exp_attachments_own_insert ON expense_attachments
--   FOR INSERT TO authenticated
--   WITH CHECK (EXISTS (
--     SELECT 1 FROM expense_reimbursements e
--     WHERE e.id = expense_attachments.reimbursement_id
--     AND e.collaborator_id = get_my_collaborator_id()
--     AND e.stato = ANY(ARRAY['INVIATO', 'INTEGRAZIONI_RICHIESTE'])
--   ));

-- 1. Fix collaborator self-update: INVIATO → IN_ATTESA, add WITH CHECK
DROP POLICY IF EXISTS expenses_own_update_inviato ON expense_reimbursements;
CREATE POLICY expenses_own_update ON expense_reimbursements
  FOR UPDATE TO authenticated
  USING (
    collaborator_id = get_my_collaborator_id()
    AND stato = 'IN_ATTESA'
    AND get_my_role() = 'collaboratore'
  )
  WITH CHECK (
    collaborator_id = get_my_collaborator_id()
    AND stato = 'IN_ATTESA'
    AND get_my_role() = 'collaboratore'
  );

-- 2. Drop responsabile UPDATE policy entirely (resp is read-only per RBAC matrix)
DROP POLICY IF EXISTS expenses_responsabile_update ON expense_reimbursements;

-- 3. Fix collaborator attachment insert: stale states → IN_ATTESA
DROP POLICY IF EXISTS exp_attachments_own_insert ON expense_attachments;
CREATE POLICY exp_attachments_own_insert ON expense_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expense_reimbursements e
      WHERE e.id = expense_attachments.reimbursement_id
        AND e.collaborator_id = get_my_collaborator_id()
        AND e.stato = 'IN_ATTESA'
    )
  );
