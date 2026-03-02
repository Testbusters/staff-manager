-- Block 10: Remove RICEVUTA_PAGAMENTO document type
-- Receipts belong to expense attachments, not general documents.

-- 1. Delete all existing RICEVUTA_PAGAMENTO documents
DELETE FROM documents WHERE tipo = 'RICEVUTA_PAGAMENTO';

-- 2. Drop unique index (filters on macro_type generated column)
DROP INDEX IF EXISTS uq_one_contratto_per_collaborator;

-- 3. Drop generated column macro_type
ALTER TABLE documents DROP COLUMN IF EXISTS macro_type;

-- 4. Update CHECK constraint on tipo (drop old, add new with only 2 values)
DO $$
DECLARE v_con text;
BEGIN
  SELECT conname INTO v_con FROM pg_constraint
  WHERE conrelid = 'documents'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%tipo%';
  IF v_con IS NOT NULL THEN
    EXECUTE format('ALTER TABLE documents DROP CONSTRAINT %I', v_con);
  END IF;
END $$;
ALTER TABLE documents ADD CONSTRAINT documents_tipo_check
  CHECK (tipo IN ('CONTRATTO_OCCASIONALE', 'CU'));

-- 5. Re-add macro_type without RICEVUTA_PAGAMENTO case
ALTER TABLE documents ADD COLUMN macro_type TEXT GENERATED ALWAYS AS (
  CASE
    WHEN tipo LIKE 'CONTRATTO_%' THEN 'CONTRATTO'
    WHEN tipo = 'CU' THEN 'CU'
    ELSE NULL
  END
) STORED;

-- 6. Recreate unique index
CREATE UNIQUE INDEX uq_one_contratto_per_collaborator
  ON documents(collaborator_id)
  WHERE macro_type = 'CONTRATTO';
