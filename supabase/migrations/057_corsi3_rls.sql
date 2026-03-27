-- Migration 057: RLS policies for responsabile_cittadino — corsi-3
--
-- ROLLBACK:
--   DROP POLICY IF EXISTS "candidature_cittadino_insert" ON candidature;
--   DROP POLICY IF EXISTS "candidature_cittadino_withdraw" ON candidature;
--   DROP POLICY IF EXISTS "candidature_review" ON candidature;
--   DROP POLICY IF EXISTS "assegnazioni_valutazione_update" ON assegnazioni;

-- Allow responsabile_cittadino to submit citta_corso candidature
CREATE POLICY "candidature_cittadino_insert"
  ON candidature FOR INSERT
  WITH CHECK (
    get_my_role() = 'responsabile_cittadino'
    AND city_user_id = auth.uid()
    AND tipo = 'citta_corso'
    AND corso_id IS NOT NULL
    AND lezione_id IS NULL
  );

-- Allow responsabile_cittadino to withdraw their own citta_corso candidatura
CREATE POLICY "candidature_cittadino_withdraw"
  ON candidature FOR UPDATE
  USING (
    get_my_role() = 'responsabile_cittadino'
    AND city_user_id = auth.uid()
    AND tipo = 'citta_corso'
  )
  WITH CHECK (stato = 'ritirata');

-- Allow admin and responsabile_cittadino to accept/reject docente/qa candidature
-- Resp.cittadino: only for lezioni in corsi where citta = their citta_responsabile
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
          WHERE c.citta IS NOT NULL
            AND c.citta = up.citta_responsabile
        )
      )
    )
  )
  WITH CHECK (stato IN ('accettata', 'ritirata'));

-- Allow responsabile_cittadino to update valutazione on assegnazioni for their city's corsi
CREATE POLICY "assegnazioni_valutazione_update"
  ON assegnazioni FOR UPDATE
  USING (
    get_my_role() = 'responsabile_cittadino'
    AND lezione_id IN (
      SELECT l.id FROM lezioni l
      JOIN corsi c ON c.id = l.corso_id
      JOIN user_profiles up ON up.user_id = auth.uid()
      WHERE c.citta IS NOT NULL
        AND c.citta = up.citta_responsabile
    )
  )
  WITH CHECK (true);
