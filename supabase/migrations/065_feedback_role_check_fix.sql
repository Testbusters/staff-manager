-- 065_feedback_role_check_fix.sql
-- Regression fix: feedback.role CHECK constraint blocked insert for all non-legacy roles.
-- Original constraint: CHECK (role IN ('collaboratore', 'responsabile', 'amministrazione'))
-- Actual roles in user_profiles: responsabile_compensi, responsabile_cittadino,
--   responsabile_servizi_individuali — all rejected by the old constraint.
--
-- Fix: drop the CHECK entirely. The role value is always sourced from user_profiles.role
-- which is validated at the application layer. Re-constraining it here only breaks on
-- every new role addition.
--
-- ROLLBACK: ALTER TABLE feedback ADD CONSTRAINT feedback_role_check
--   CHECK (role IN ('collaboratore', 'responsabile', 'amministrazione'));

ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_role_check;
