-- Migration 060: resp.citt gap fixes
-- Extends candidature_review to allow in_attesa (revoke accepted candidatura)
-- Adds assegnazioni_resp_citt_delete to allow resp.citt to remove cocoda assegnazioni

-- ROLLBACK:
--   DROP POLICY IF EXISTS "candidature_review" ON candidature;
--   CREATE POLICY "candidature_review" ON candidature FOR UPDATE
--     USING (tipo IN ('docente_lezione','qa_lezione') AND (
--       get_my_role() = 'amministrazione'
--       OR (get_my_role() = 'responsabile_cittadino' AND lezione_id IN (
--         SELECT l.id FROM lezioni l JOIN corsi c ON c.id = l.corso_id
--         JOIN user_profiles up ON up.user_id = auth.uid()
--         WHERE c.citta IS NOT NULL AND c.citta = up.citta_responsabile
--       ))
--     ))
--     WITH CHECK (stato IN ('accettata', 'ritirata'));
--   DROP POLICY IF EXISTS "assegnazioni_resp_citt_delete" ON assegnazioni;

-- 1. Extend candidature_review to allow reverting to in_attesa (revoke by resp.citt)
DROP POLICY IF EXISTS "candidature_review" ON candidature;
CREATE POLICY "candidature_review"
  ON candidature FOR UPDATE
  USING (
    tipo IN ('docente_lezione', 'qa_lezione')
    AND (
      get_my_role() = 'amministrazione'
      OR (
        get_my_role() = 'responsabile_cittadino'
        AND lezione_id IN (
          SELECT l.id FROM lezioni l
          JOIN corsi c ON c.id = l.corso_id
          JOIN user_profiles up ON up.user_id = auth.uid()
          WHERE c.citta IS NOT NULL AND c.citta = up.citta_responsabile
        )
      )
    )
  )
  WITH CHECK (stato IN ('accettata', 'ritirata', 'in_attesa'));

-- 2. Allow resp.citt to delete cocoda assegnazioni for their city's lezioni
CREATE POLICY "assegnazioni_resp_citt_delete"
  ON assegnazioni FOR DELETE
  USING (
    get_my_role() = 'responsabile_cittadino'
    AND ruolo = 'cocoda'
    AND lezione_id IN (
      SELECT l.id FROM lezioni l
      JOIN corsi c ON c.id = l.corso_id
      JOIN user_profiles up ON up.user_id = auth.uid()
      WHERE c.citta IS NOT NULL AND c.citta = up.citta_responsabile
    )
  );
