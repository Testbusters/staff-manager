-- Migration 058: RLS INSERT policy for responsabile_cittadino on assegnazioni (ruolo=cocoda)
-- ROLLBACK: DROP POLICY IF EXISTS "assegnazioni_cocoda_insert" ON assegnazioni;

-- Allow responsabile_cittadino to assign collaborators as CoCoDà for their city's lezioni
CREATE POLICY "assegnazioni_cocoda_insert"
  ON assegnazioni FOR INSERT
  WITH CHECK (
    get_my_role() = 'responsabile_cittadino'
    AND ruolo = 'cocoda'
    AND lezione_id IN (
      SELECT l.id
      FROM lezioni l
      JOIN corsi c ON c.id = l.corso_id
      WHERE c.citta = (
        SELECT up.citta_responsabile
        FROM user_profiles up
        WHERE up.user_id = auth.uid()
      )
    )
  );
