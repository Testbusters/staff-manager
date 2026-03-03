-- 028_ticket_categories.sql
-- Simplify ticket categories: keep only 'Compenso' and 'Rimborso'.
-- Deletes all tickets (and cascaded ticket_messages) with non-conforming categories.
-- Renames 'Compensi' → 'Compenso' for existing records.
-- Adds a CHECK constraint to enforce the two allowed values going forward.
--
-- ROLLBACK:
--   ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_categoria_check;
--   UPDATE tickets SET categoria = 'Compensi' WHERE categoria = 'Compenso';
--   (Deleted tickets cannot be recovered without a prior backup)

-- 1. Delete non-conforming tickets (cascade removes ticket_messages)
DELETE FROM tickets
WHERE categoria NOT IN ('Compensi', 'Rimborso');

-- 2. Rename 'Compensi' → 'Compenso' for any existing conforming records
UPDATE tickets SET categoria = 'Compenso' WHERE categoria = 'Compensi';

-- 3. Add CHECK constraint to enforce the two allowed values
ALTER TABLE tickets
  ADD CONSTRAINT tickets_categoria_check
  CHECK (categoria IN ('Compenso', 'Rimborso'));
