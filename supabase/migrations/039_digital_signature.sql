-- ROLLBACK:
--   ALTER TABLE documents DROP CONSTRAINT documents_tipo_check;
--   ALTER TABLE documents ADD CONSTRAINT documents_tipo_check CHECK (tipo IN ('CONTRATTO_OCCASIONALE','CU'));
--   ALTER TABLE documents DROP COLUMN IF EXISTS macro_type;
--   ALTER TABLE documents ADD COLUMN macro_type TEXT GENERATED ALWAYS AS (
--     CASE
--       WHEN tipo LIKE 'CONTRATTO_%' THEN 'CONTRATTO'
--       WHEN tipo = 'CU' THEN 'CU'
--       ELSE tipo
--     END
--   ) STORED;
--   CREATE UNIQUE INDEX uq_one_contratto_per_collaborator ON documents (collaborator_id) WHERE macro_type = 'CONTRATTO';
--   ALTER TABLE compensations DROP COLUMN IF EXISTS receipt_document_id;
--   ALTER TABLE expense_reimbursements DROP COLUMN IF EXISTS receipt_document_id;
--   ALTER TABLE collaborators DROP COLUMN IF EXISTS data_fine_contratto;

-- 1. documents.tipo: add RICEVUTA_PAGAMENTO
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_tipo_check;
ALTER TABLE documents ADD CONSTRAINT documents_tipo_check
  CHECK (tipo IN ('CONTRATTO_OCCASIONALE', 'CU', 'RICEVUTA_PAGAMENTO'));

-- 2. Regenerate macro_type computed column (add RICEVUTA case)
ALTER TABLE documents DROP COLUMN IF EXISTS macro_type;
ALTER TABLE documents ADD COLUMN macro_type TEXT GENERATED ALWAYS AS (
  CASE
    WHEN tipo LIKE 'CONTRATTO_%' THEN 'CONTRATTO'
    WHEN tipo = 'CU' THEN 'CU'
    WHEN tipo = 'RICEVUTA_PAGAMENTO' THEN 'RICEVUTA'
    ELSE tipo
  END
) STORED;

-- 3. Recreate unique index for contracts (unchanged logic)
DROP INDEX IF EXISTS uq_one_contratto_per_collaborator;
CREATE UNIQUE INDEX uq_one_contratto_per_collaborator
  ON documents (collaborator_id)
  WHERE macro_type = 'CONTRATTO';

-- 4. compensations: track which receipt covers this record
ALTER TABLE compensations
  ADD COLUMN IF NOT EXISTS receipt_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

-- 5. expense_reimbursements: same
ALTER TABLE expense_reimbursements
  ADD COLUMN IF NOT EXISTS receipt_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

-- 6. collaborators: contract end date (admin-only field)
ALTER TABLE collaborators
  ADD COLUMN IF NOT EXISTS data_fine_contratto DATE;
