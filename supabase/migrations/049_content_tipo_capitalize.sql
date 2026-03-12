-- Normalize tipo/categoria values from UPPER_SNAKE_CASE to Capitalized.
-- Applied after migration 048 which already mapped removed values to ALTRO/Altro.
--
-- ROLLBACK: UPDATE resources SET categoria = UPPER(categoria); etc. (lossy for multi-word)

-- Resources
UPDATE resources SET categoria = 'Guida'     WHERE categoria = 'GUIDA';
UPDATE resources SET categoria = 'Allegato'  WHERE categoria = 'ALLEGATO';
UPDATE resources SET categoria = 'Locandina' WHERE categoria = 'LOCANDINA';
UPDATE resources SET categoria = 'Bando'     WHERE categoria = 'BANDO';
UPDATE resources SET categoria = 'Decreto'   WHERE categoria = 'DECRETO';
UPDATE resources SET categoria = 'Altro'     WHERE categoria = 'ALTRO';

-- Events
UPDATE events SET tipo = 'Convention'       WHERE tipo = 'CONVENTION';
UPDATE events SET tipo = 'Attivita_interna' WHERE tipo = 'ATTIVITA_INTERNA';
UPDATE events SET tipo = 'Workshop'         WHERE tipo = 'WORKSHOP';
UPDATE events SET tipo = 'Formazione'       WHERE tipo = 'FORMAZIONE';
UPDATE events SET tipo = 'Altro'            WHERE tipo = 'ALTRO';

-- Opportunities
UPDATE opportunities SET tipo = 'Volontariato' WHERE tipo = 'VOLONTARIATO';
UPDATE opportunities SET tipo = 'Formazione'   WHERE tipo = 'FORMAZIONE';
UPDATE opportunities SET tipo = 'Lavoro'       WHERE tipo = 'LAVORO';
UPDATE opportunities SET tipo = 'Altro'        WHERE tipo = 'ALTRO';
