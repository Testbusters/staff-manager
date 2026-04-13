-- Migration 069 — lezioni.materie TEXT[] + corsi.codice_identificativo UNIQUE
-- Block: corsi-gsheet-import
-- Purpose:
--   (1) Replace lezioni.materia (single TEXT) with lezioni.materie (TEXT[]) to support composite
--       lessons (e.g. "Matematica e Fisica" → ['Matematica', 'Fisica']).
--   (2) Add UNIQUE constraint on corsi.codice_identificativo to enforce idempotency during
--       GSheet imports (duplicate codice = insert error).
--
-- ROLLBACK:
--   ALTER TABLE corsi DROP CONSTRAINT corsi_codice_identificativo_unique;
--   ALTER TABLE lezioni DROP CONSTRAINT lezioni_materie_nonempty;
--   ALTER TABLE lezioni ADD COLUMN materia TEXT NOT NULL DEFAULT '';
--   ALTER TABLE lezioni DROP COLUMN materie;

ALTER TABLE lezioni DROP COLUMN materia;
ALTER TABLE lezioni ADD COLUMN materie TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE lezioni ADD CONSTRAINT lezioni_materie_nonempty
  CHECK (array_length(materie, 1) >= 1);
ALTER TABLE lezioni ALTER COLUMN materie DROP DEFAULT;

ALTER TABLE corsi ADD CONSTRAINT corsi_codice_identificativo_unique
  UNIQUE (codice_identificativo);
