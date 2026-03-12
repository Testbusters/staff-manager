-- Update content tipo/categoria values to new definitions.
-- Old values not present in the new set are remapped to 'ALTRO'.
--
-- ROLLBACK:
--   No safe rollback possible without knowing original values.
--   Old values: resources(NORMATIVA,PROCEDURA,MODELLO), events(WEBINAR,INCONTRO,SOCIAL), opportunities(STAGE,PROGETTO)

-- Resources: map removed categories to ALTRO
UPDATE resources
SET categoria = 'ALTRO'
WHERE categoria IN ('NORMATIVA', 'PROCEDURA', 'MODELLO');

-- Events: map removed types to ALTRO (INCONTRO is closest to ATTIVITA_INTERNA but kept as ALTRO for safety)
UPDATE events
SET tipo = 'ALTRO'
WHERE tipo IN ('WEBINAR', 'INCONTRO', 'SOCIAL');

-- Opportunities: map removed types to ALTRO
UPDATE opportunities
SET tipo = 'ALTRO'
WHERE tipo IN ('STAGE', 'PROGETTO');
