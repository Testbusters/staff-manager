-- Migration 056: RLS policies for collaboratore candidature
--
-- ROLLBACK:
--   DROP POLICY IF EXISTS "candidature_collab_insert" ON candidature;
--   DROP POLICY IF EXISTS "candidature_collab_update_own" ON candidature;

-- Allow collaboratore to submit candidature for docente/qa roles (not citta_corso)
CREATE POLICY "candidature_collab_insert"
  ON candidature FOR INSERT
  WITH CHECK (
    get_my_role() = 'collaboratore'
    AND collaborator_id = get_my_collaborator_id()
    AND tipo IN ('docente_lezione', 'qa_lezione')
  );

-- Allow collaboratore to withdraw own candidatura (can only set stato = 'ritirata')
CREATE POLICY "candidature_collab_update_own"
  ON candidature FOR UPDATE
  USING (
    get_my_role() = 'collaboratore'
    AND collaborator_id = get_my_collaborator_id()
  )
  WITH CHECK (stato = 'ritirata');
