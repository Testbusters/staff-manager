-- ROLLBACK:
--   ALTER TABLE events DROP COLUMN IF EXISTS citta;
--   DROP POLICY IF EXISTS "events_respcitt_insert" ON events;
--   DROP POLICY IF EXISTS "events_respcitt_update" ON events;
--   DROP POLICY IF EXISTS "events_respcitt_delete" ON events;

-- Add city scoping to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS citta text NULL;

-- Allow responsabile_cittadino to insert city-scoped events
CREATE POLICY "events_respcitt_insert"
  ON events FOR INSERT
  WITH CHECK (
    get_my_role() = 'responsabile_cittadino'
    AND citta IS NOT NULL
    AND citta = (
      SELECT up.citta_responsabile
      FROM user_profiles up
      WHERE up.user_id = auth.uid()
    )
  );

-- Allow responsabile_cittadino to update their own city events
CREATE POLICY "events_respcitt_update"
  ON events FOR UPDATE
  USING (
    get_my_role() = 'responsabile_cittadino'
    AND citta IS NOT NULL
    AND citta = (
      SELECT up.citta_responsabile
      FROM user_profiles up
      WHERE up.user_id = auth.uid()
    )
  );

-- Allow responsabile_cittadino to delete their own city events
CREATE POLICY "events_respcitt_delete"
  ON events FOR DELETE
  USING (
    get_my_role() = 'responsabile_cittadino'
    AND citta IS NOT NULL
    AND citta = (
      SELECT up.citta_responsabile
      FROM user_profiles up
      WHERE up.user_id = auth.uid()
    )
  );
