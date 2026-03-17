-- Migration 046: extend contract_templates.tipo CHECK constraint to include P4M variants
--
-- ROLLBACK:
--   ALTER TABLE contract_templates DROP CONSTRAINT contract_templates_tipo_check;
--   ALTER TABLE contract_templates ADD CONSTRAINT contract_templates_tipo_check
--     CHECK (tipo = ANY (ARRAY['OCCASIONALE'::text, 'RICEVUTA_PAGAMENTO'::text]));

ALTER TABLE contract_templates DROP CONSTRAINT contract_templates_tipo_check;

ALTER TABLE contract_templates ADD CONSTRAINT contract_templates_tipo_check
  CHECK (tipo = ANY (ARRAY[
    'OCCASIONALE'::text,
    'RICEVUTA_PAGAMENTO'::text,
    'OCCASIONALE_P4M'::text,
    'RICEVUTA_PAGAMENTO_P4M'::text
  ]));
