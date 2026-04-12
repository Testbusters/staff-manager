-- Migration 068: RLS policies for resp.citt QA + docente assignments + notification settings
-- ROLLBACK:
--   DROP POLICY IF EXISTS assegnazioni_qa_insert ON assegnazioni;
--   DROP POLICY IF EXISTS assegnazioni_docente_insert ON assegnazioni;
--   DROP POLICY IF EXISTS assegnazioni_resp_citt_delete ON assegnazioni;
--   CREATE POLICY assegnazioni_resp_citt_delete ON assegnazioni FOR DELETE
--     USING (get_my_role() = 'responsabile_cittadino' AND ruolo = 'cocoda'
--       AND lezione_id IN (SELECT l.id FROM lezioni l JOIN corsi c ON c.id = l.corso_id
--         JOIN user_profiles up ON up.user_id = (select auth.uid())
--         WHERE c.citta IS NOT NULL AND c.citta = up.citta_responsabile));
--   DELETE FROM notification_settings WHERE event_key = 'valutazione_corso';

-- 1. RLS: allow resp.citt to INSERT assegnazioni for qa
CREATE POLICY assegnazioni_qa_insert ON assegnazioni FOR INSERT
  WITH CHECK (
    get_my_role() = 'responsabile_cittadino' AND
    ruolo = 'qa' AND
    lezione_id IN (
      SELECT l.id FROM lezioni l
        JOIN corsi c ON c.id = l.corso_id
        JOIN user_profiles up ON up.user_id = (select auth.uid())
      WHERE c.citta IS NOT NULL AND c.citta = up.citta_responsabile
    )
  );

-- 2. RLS: allow resp.citt to INSERT assegnazioni for docente
CREATE POLICY assegnazioni_docente_insert ON assegnazioni FOR INSERT
  WITH CHECK (
    get_my_role() = 'responsabile_cittadino' AND
    ruolo = 'docente' AND
    lezione_id IN (
      SELECT l.id FROM lezioni l
        JOIN corsi c ON c.id = l.corso_id
        JOIN user_profiles up ON up.user_id = (select auth.uid())
      WHERE c.citta IS NOT NULL AND c.citta = up.citta_responsabile
    )
  );

-- 3. Extend DELETE policy to cover all roles (was cocoda only in migration 063)
DROP POLICY IF EXISTS assegnazioni_resp_citt_delete ON assegnazioni;
CREATE POLICY assegnazioni_resp_citt_delete ON assegnazioni FOR DELETE
  USING (
    get_my_role() = 'responsabile_cittadino' AND
    lezione_id IN (
      SELECT l.id FROM lezioni l
        JOIN corsi c ON c.id = l.corso_id
        JOIN user_profiles up ON up.user_id = (select auth.uid())
      WHERE c.citta IS NOT NULL AND c.citta = up.citta_responsabile
    )
  );

-- 4. Notification settings for valutazione
INSERT INTO notification_settings (event_key, recipient_role, label, email_enabled, telegram_enabled)
VALUES ('valutazione_corso', 'collaboratore', 'Valutazione corso', true, true)
ON CONFLICT DO NOTHING;
