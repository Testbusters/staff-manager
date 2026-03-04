-- Migration 033: drop periodo_riferimento from compensations
-- This field is no longer part of the compensation entity.
--
-- ROLLBACK:
--   ALTER TABLE compensations ADD COLUMN periodo_riferimento TEXT;

ALTER TABLE compensations DROP COLUMN IF EXISTS periodo_riferimento;
