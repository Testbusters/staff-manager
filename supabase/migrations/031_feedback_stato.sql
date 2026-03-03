-- ROLLBACK: ALTER TABLE feedback DROP COLUMN stato;
-- DROP POLICY IF EXISTS feedback_admin_update ON feedback;

ALTER TABLE feedback
  ADD COLUMN stato TEXT NOT NULL DEFAULT 'nuovo'
    CHECK (stato IN ('nuovo', 'completato'));

CREATE POLICY feedback_admin_update ON feedback
  FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'amministrazione')
  WITH CHECK (get_my_role() = 'amministrazione');
