-- Migration 046: extend contract_templates.tipo and collaborators.tipo_contratto CHECK
--               constraints to include P4M variants
--
-- ROLLBACK:
--   ALTER TABLE contract_templates DROP CONSTRAINT contract_templates_tipo_check;
--   ALTER TABLE contract_templates ADD CONSTRAINT contract_templates_tipo_check
--     CHECK (tipo = ANY (ARRAY['OCCASIONALE'::text, 'RICEVUTA_PAGAMENTO'::text]));
--   ALTER TABLE collaborators DROP CONSTRAINT collaborators_tipo_contratto_check;
--   ALTER TABLE collaborators ADD CONSTRAINT collaborators_tipo_contratto_check
--     CHECK (tipo_contratto = 'OCCASIONALE'::text);

ALTER TABLE contract_templates DROP CONSTRAINT contract_templates_tipo_check;

ALTER TABLE contract_templates ADD CONSTRAINT contract_templates_tipo_check
  CHECK (tipo = ANY (ARRAY[
    'OCCASIONALE'::text,
    'RICEVUTA_PAGAMENTO'::text,
    'OCCASIONALE_P4M'::text,
    'RICEVUTA_PAGAMENTO_P4M'::text
  ]));

ALTER TABLE collaborators DROP CONSTRAINT collaborators_tipo_contratto_check;

ALTER TABLE collaborators ADD CONSTRAINT collaborators_tipo_contratto_check
  CHECK (tipo_contratto = ANY (ARRAY[
    'OCCASIONALE'::text,
    'RICEVUTA_PAGAMENTO'::text,
    'OCCASIONALE_P4M'::text,
    'RICEVUTA_PAGAMENTO_P4M'::text
  ]));
