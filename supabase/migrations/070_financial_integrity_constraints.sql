-- Migration 070: Financial integrity constraints
-- Block: refactor-g2a-financial-integrity
-- Closes refactoring backlog items DB-NEW-1 through DB-NEW-7.
--
-- Purpose: prevent silent NaN propagation and invalid-value rows in financial data.
-- The application layer (Zod schemas, .positive() / .min(0)) already enforces these
-- rules; this migration adds DB-level protection as a safety net against future
-- code regressions or direct SQL access.
--
-- Backfill: `compensations.ritenuta_acconto` may be NULL on historical rows.
-- Strategy: derive the rate from (lordo - netto) / lordo * 100 where both are
-- present and lordo > 0; fallback to 20 (Testbusters standard rate).
--
-- ROLLBACK:
--   BEGIN;
--   ALTER TABLE compensations DROP CONSTRAINT IF EXISTS compensations_importo_lordo_positive;
--   ALTER TABLE compensations DROP CONSTRAINT IF EXISTS compensations_ritenuta_acconto_range;
--   ALTER TABLE expense_reimbursements DROP CONSTRAINT IF EXISTS expense_reimbursements_importo_positive;
--   ALTER TABLE compensations ALTER COLUMN importo_lordo DROP NOT NULL;
--   ALTER TABLE compensations ALTER COLUMN importo_netto DROP NOT NULL;
--   ALTER TABLE compensations ALTER COLUMN ritenuta_acconto DROP NOT NULL;
--   ALTER TABLE compensations ALTER COLUMN data_competenza DROP NOT NULL;
--   COMMIT;

BEGIN;

-- Step 1: Backfill ritenuta_acconto where NULL.
-- Derive from existing lordo/netto pair (exact reconstruction of applied rate).
-- Fallback 20 covers any row where derivation is impossible (should not occur
-- given existing data, but guards against edge cases).
UPDATE compensations
SET ritenuta_acconto = CASE
  WHEN importo_lordo IS NOT NULL AND importo_lordo > 0 AND importo_netto IS NOT NULL
    THEN ROUND(((importo_lordo - importo_netto) / importo_lordo * 100)::numeric, 2)
  ELSE 20
END
WHERE ritenuta_acconto IS NULL;

-- Step 2: NOT NULL on compensations financial columns (DB-NEW-1..4).
ALTER TABLE compensations ALTER COLUMN importo_lordo SET NOT NULL;
ALTER TABLE compensations ALTER COLUMN importo_netto SET NOT NULL;
ALTER TABLE compensations ALTER COLUMN ritenuta_acconto SET NOT NULL;
ALTER TABLE compensations ALTER COLUMN data_competenza SET NOT NULL;

-- Step 3: CHECK constraints (DB-NEW-5..7).
ALTER TABLE compensations
  ADD CONSTRAINT compensations_importo_lordo_positive
  CHECK (importo_lordo > 0);

ALTER TABLE compensations
  ADD CONSTRAINT compensations_ritenuta_acconto_range
  CHECK (ritenuta_acconto >= 0 AND ritenuta_acconto <= 100);

ALTER TABLE expense_reimbursements
  ADD CONSTRAINT expense_reimbursements_importo_positive
  CHECK (importo > 0);

COMMIT;
