-- Migration 063 — DB audit fixes (skill-db output)
-- Applied to staging: 2026-03-27
-- Applied to production: (Phase 8)
--
-- ROLLBACK:
--   DB7: ALTER TABLE user_profiles ALTER COLUMN theme_preference TYPE character varying(5);
--   S4A-gap: DROP POLICY announcements_admin_write ON communications;
--            CREATE POLICY announcements_admin_write ON communications AS PERMISSIVE FOR ALL
--              USING (get_my_role() = ANY (ARRAY['amministrazione','responsabile_compensi']));
--   Indexes: DROP INDEX IF EXISTS candidature_collaborator_id_idx, candidature_corso_id_idx,
--             candidature_lezione_id_idx, candidature_city_user_id_idx, lezioni_corso_id_idx,
--             comp_attachments_compensation_id_idx, ticket_messages_ticket_id_idx;
--   DB3: drop each recreated policy and recreate with bare auth.uid() (reverse of each CREATE below)

BEGIN;

-- ============================================================
-- S4A-gap: Restrict communications write to amministrazione only
-- responsabile_compensi has read-only access to content (CLAUDE.md RBAC)
-- ============================================================
DROP POLICY IF EXISTS announcements_admin_write ON communications;
CREATE POLICY announcements_admin_write ON communications AS PERMISSIVE FOR ALL
  USING  (get_my_role() = 'amministrazione')
  WITH CHECK (get_my_role() = 'amministrazione');

-- ============================================================
-- DB1: FK indexes on candidature (all 4 FK columns missing)
-- ============================================================
CREATE INDEX IF NOT EXISTS candidature_collaborator_id_idx ON candidature (collaborator_id);
CREATE INDEX IF NOT EXISTS candidature_corso_id_idx        ON candidature (corso_id);
CREATE INDEX IF NOT EXISTS candidature_lezione_id_idx      ON candidature (lezione_id);
CREATE INDEX IF NOT EXISTS candidature_city_user_id_idx    ON candidature (city_user_id);

-- ============================================================
-- DB2: FK index on lezioni (corso_id FK — CASCADE target, used in every join)
-- ============================================================
CREATE INDEX IF NOT EXISTS lezioni_corso_id_idx ON lezioni (corso_id);

-- ============================================================
-- DB5: FK index on compensation_attachments
-- ============================================================
CREATE INDEX IF NOT EXISTS comp_attachments_compensation_id_idx ON compensation_attachments (compensation_id);

-- ============================================================
-- DB6: FK index on ticket_messages
-- ============================================================
CREATE INDEX IF NOT EXISTS ticket_messages_ticket_id_idx ON ticket_messages (ticket_id);

-- ============================================================
-- DB7: Widen theme_preference from varchar(5) to text
-- All valid values ('light','dark') fit; this removes the unnecessary length cap
-- ============================================================
ALTER TABLE user_profiles ALTER COLUMN theme_preference TYPE text;

-- ============================================================
-- DB3: Replace bare auth.uid() with (select auth.uid()) — per-statement evaluation
-- Per-row evaluation was causing unnecessary function calls on every row scan.
-- Functionally identical; no change to access semantics.
-- ============================================================

-- app_errors
DROP POLICY IF EXISTS app_errors_insert ON app_errors;
CREATE POLICY app_errors_insert ON app_errors FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

-- assegnazioni
DROP POLICY IF EXISTS assegnazioni_cocoda_insert ON assegnazioni;
CREATE POLICY assegnazioni_cocoda_insert ON assegnazioni FOR INSERT
  WITH CHECK (
    get_my_role() = 'responsabile_cittadino' AND
    ruolo = 'cocoda' AND
    lezione_id IN (
      SELECT l.id FROM lezioni l
        JOIN corsi c ON c.id = l.corso_id
      WHERE c.citta = (
        SELECT up.citta_responsabile FROM user_profiles up
        WHERE up.user_id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS assegnazioni_resp_citt_delete ON assegnazioni;
CREATE POLICY assegnazioni_resp_citt_delete ON assegnazioni FOR DELETE
  USING (
    get_my_role() = 'responsabile_cittadino' AND
    ruolo = 'cocoda' AND
    lezione_id IN (
      SELECT l.id FROM lezioni l
        JOIN corsi c ON c.id = l.corso_id
        JOIN user_profiles up ON up.user_id = (select auth.uid())
      WHERE c.citta IS NOT NULL AND c.citta = up.citta_responsabile
    )
  );

DROP POLICY IF EXISTS assegnazioni_valutazione_update ON assegnazioni;
CREATE POLICY assegnazioni_valutazione_update ON assegnazioni FOR UPDATE
  USING (
    get_my_role() = 'responsabile_cittadino' AND
    lezione_id IN (
      SELECT l.id FROM lezioni l
        JOIN corsi c ON c.id = l.corso_id
        JOIN user_profiles up ON up.user_id = (select auth.uid())
      WHERE c.citta IS NOT NULL AND c.citta = up.citta_responsabile
    )
  )
  WITH CHECK (
    get_my_role() = 'responsabile_cittadino' AND
    lezione_id IN (
      SELECT l.id FROM lezioni l
        JOIN corsi c ON c.id = l.corso_id
        JOIN user_profiles up ON up.user_id = (select auth.uid())
      WHERE c.citta IS NOT NULL AND c.citta = up.citta_responsabile
    )
  );

-- candidature
DROP POLICY IF EXISTS candidature_cittadino_insert ON candidature;
CREATE POLICY candidature_cittadino_insert ON candidature FOR INSERT
  WITH CHECK (
    get_my_role() = 'responsabile_cittadino' AND
    city_user_id = (select auth.uid()) AND
    tipo = 'citta_corso' AND
    corso_id IS NOT NULL AND
    lezione_id IS NULL
  );

DROP POLICY IF EXISTS candidature_cittadino_withdraw ON candidature;
CREATE POLICY candidature_cittadino_withdraw ON candidature FOR UPDATE
  USING (
    get_my_role() = 'responsabile_cittadino' AND
    city_user_id = (select auth.uid()) AND
    tipo = 'citta_corso'
  )
  WITH CHECK (stato = 'ritirata');

DROP POLICY IF EXISTS candidature_review ON candidature;
CREATE POLICY candidature_review ON candidature FOR UPDATE
  USING (
    tipo = ANY (ARRAY['docente_lezione', 'qa_lezione']) AND (
      get_my_role() = 'amministrazione' OR (
        get_my_role() = 'responsabile_cittadino' AND
        lezione_id IN (
          SELECT l.id FROM lezioni l
            JOIN corsi c ON c.id = l.corso_id
            JOIN user_profiles up ON up.user_id = (select auth.uid())
          WHERE c.citta IS NOT NULL AND c.citta = up.citta_responsabile
        )
      )
    )
  )
  WITH CHECK (stato = ANY (ARRAY['accettata', 'ritirata', 'in_attesa']));

-- collaborator_communities
DROP POLICY IF EXISTS user_community_access_responsabile_read ON collaborator_communities;
CREATE POLICY user_community_access_responsabile_read ON collaborator_communities FOR SELECT
  USING (
    get_my_role() = 'responsabile_compensi' AND
    EXISTS (
      SELECT 1 FROM user_community_access uca
      WHERE uca.community_id = collaborator_communities.community_id
        AND uca.user_id = (select auth.uid())
    )
  );

-- collaborators
DROP POLICY IF EXISTS collaborators_own_read ON collaborators;
CREATE POLICY collaborators_own_read ON collaborators FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS collaborators_own_update ON collaborators;
CREATE POLICY collaborators_own_update ON collaborators FOR UPDATE
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS collaborators_responsabile_read ON collaborators;
CREATE POLICY collaborators_responsabile_read ON collaborators FOR SELECT
  USING (
    get_my_role() = 'responsabile_compensi' AND
    EXISTS (
      SELECT 1 FROM collaborator_communities cc
        JOIN user_community_access uca ON uca.community_id = cc.community_id
      WHERE cc.collaborator_id = collaborators.id AND uca.user_id = (select auth.uid())
    )
  );

-- compensation_history
DROP POLICY IF EXISTS comp_history_manager_read ON compensation_history;
CREATE POLICY comp_history_manager_read ON compensation_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM compensations c
        JOIN collaborator_communities cc ON cc.collaborator_id = c.collaborator_id
        JOIN user_community_access uca ON uca.community_id = cc.community_id
      WHERE c.id = compensation_history.compensation_id AND uca.user_id = (select auth.uid())
    )
  );

-- compensations
DROP POLICY IF EXISTS compensations_responsabile_read ON compensations;
CREATE POLICY compensations_responsabile_read ON compensations FOR SELECT
  USING (
    get_my_role() = 'responsabile_compensi' AND
    is_active_user() AND
    collaborator_id IN (
      SELECT DISTINCT cc.collaborator_id FROM collaborator_communities cc
        JOIN user_community_access uca ON uca.community_id = cc.community_id
      WHERE uca.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS compensations_responsabile_update ON compensations;
CREATE POLICY compensations_responsabile_update ON compensations FOR UPDATE
  USING (
    get_my_role() = 'responsabile_compensi' AND
    is_active_user() AND
    stato = ANY (ARRAY['INVIATO', 'INTEGRAZIONI_RICHIESTE']) AND
    collaborator_id IN (
      SELECT DISTINCT cc.collaborator_id FROM collaborator_communities cc
        JOIN user_community_access uca ON uca.community_id = cc.community_id
      WHERE uca.user_id = (select auth.uid())
    )
  );

-- contract_templates
DROP POLICY IF EXISTS contract_templates_admin_read ON contract_templates;
CREATE POLICY contract_templates_admin_read ON contract_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (select auth.uid())
        AND user_profiles.role = 'amministrazione'
        AND user_profiles.is_active = true
    )
  );

-- events
DROP POLICY IF EXISTS events_respcitt_delete ON events;
CREATE POLICY events_respcitt_delete ON events FOR DELETE
  USING (
    get_my_role() = 'responsabile_cittadino' AND
    citta IS NOT NULL AND
    citta = (SELECT up.citta_responsabile FROM user_profiles up WHERE up.user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS events_respcitt_insert ON events;
CREATE POLICY events_respcitt_insert ON events FOR INSERT
  WITH CHECK (
    get_my_role() = 'responsabile_cittadino' AND
    citta IS NOT NULL AND
    citta = (SELECT up.citta_responsabile FROM user_profiles up WHERE up.user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS events_respcitt_update ON events;
CREATE POLICY events_respcitt_update ON events FOR UPDATE
  USING (
    get_my_role() = 'responsabile_cittadino' AND
    citta IS NOT NULL AND
    citta = (SELECT up.citta_responsabile FROM user_profiles up WHERE up.user_id = (select auth.uid()))
  );

-- expense_attachments
DROP POLICY IF EXISTS exp_attachments_manager_read ON expense_attachments;
CREATE POLICY exp_attachments_manager_read ON expense_attachments FOR SELECT
  USING (
    get_my_role() = 'responsabile_compensi' AND
    EXISTS (
      SELECT 1 FROM expense_reimbursements e
        JOIN collaborator_communities cc ON cc.collaborator_id = e.collaborator_id
        JOIN user_community_access uca ON uca.community_id = cc.community_id
      WHERE e.id = expense_attachments.reimbursement_id AND uca.user_id = (select auth.uid())
    )
  );

-- expense_history
DROP POLICY IF EXISTS exp_history_manager_read ON expense_history;
CREATE POLICY exp_history_manager_read ON expense_history FOR SELECT
  USING (
    get_my_role() = 'responsabile_compensi' AND
    EXISTS (
      SELECT 1 FROM expense_reimbursements e
        JOIN collaborator_communities cc ON cc.collaborator_id = e.collaborator_id
        JOIN user_community_access uca ON uca.community_id = cc.community_id
      WHERE e.id = expense_history.reimbursement_id AND uca.user_id = (select auth.uid())
    )
  );

-- expense_reimbursements
DROP POLICY IF EXISTS expenses_responsabile_read ON expense_reimbursements;
CREATE POLICY expenses_responsabile_read ON expense_reimbursements FOR SELECT
  USING (
    get_my_role() = 'responsabile_compensi' AND
    EXISTS (
      SELECT 1 FROM collaborator_communities cc
        JOIN user_community_access uca ON uca.community_id = cc.community_id
      WHERE cc.collaborator_id = expense_reimbursements.collaborator_id AND uca.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS expenses_responsabile_update ON expense_reimbursements;
CREATE POLICY expenses_responsabile_update ON expense_reimbursements FOR UPDATE
  USING (
    get_my_role() = 'responsabile_compensi' AND
    EXISTS (
      SELECT 1 FROM collaborator_communities cc
        JOIN user_community_access uca ON uca.community_id = cc.community_id
      WHERE cc.collaborator_id = expense_reimbursements.collaborator_id AND uca.user_id = (select auth.uid())
    ) AND
    stato = ANY (ARRAY['INVIATO', 'INTEGRAZIONI_RICHIESTE'])
  );

-- feedback
DROP POLICY IF EXISTS feedback_admin_delete ON feedback;
CREATE POLICY feedback_admin_delete ON feedback FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (select auth.uid()) AND user_profiles.role = 'amministrazione'
    )
  );

DROP POLICY IF EXISTS feedback_admin_read ON feedback;
CREATE POLICY feedback_admin_read ON feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (select auth.uid()) AND user_profiles.role = 'amministrazione'
    )
  );

DROP POLICY IF EXISTS feedback_insert ON feedback;
CREATE POLICY feedback_insert ON feedback FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

-- liquidazione_requests
DROP POLICY IF EXISTS liq_req_collab_insert ON liquidazione_requests;
CREATE POLICY liq_req_collab_insert ON liquidazione_requests FOR INSERT
  WITH CHECK (
    collaborator_id IN (
      SELECT collaborators.id FROM collaborators WHERE collaborators.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS liq_req_collab_read ON liquidazione_requests;
CREATE POLICY liq_req_collab_read ON liquidazione_requests FOR SELECT
  USING (
    collaborator_id IN (
      SELECT collaborators.id FROM collaborators WHERE collaborators.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS liq_req_collab_update ON liquidazione_requests;
CREATE POLICY liq_req_collab_update ON liquidazione_requests FOR UPDATE
  USING (
    stato = 'in_attesa' AND
    collaborator_id IN (
      SELECT collaborators.id FROM collaborators WHERE collaborators.user_id = (select auth.uid())
    )
  )
  WITH CHECK (stato = 'annullata');

-- notifications
DROP POLICY IF EXISTS notifications_own ON notifications;
CREATE POLICY notifications_own ON notifications FOR ALL
  USING (user_id = (select auth.uid()));

-- opportunities
DROP POLICY IF EXISTS opportunities_admin_write ON opportunities;
CREATE POLICY opportunities_admin_write ON opportunities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (select auth.uid())
        AND user_profiles.role = 'amministrazione'
        AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (select auth.uid())
        AND user_profiles.role = 'amministrazione'
        AND user_profiles.is_active = true
    )
  );

-- ticket_messages
DROP POLICY IF EXISTS ticket_messages_insert ON ticket_messages;
CREATE POLICY ticket_messages_insert ON ticket_messages FOR INSERT
  WITH CHECK (
    author_user_id = (select auth.uid()) AND
    is_active_user() AND
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_messages.ticket_id AND (
        t.creator_user_id = (select auth.uid()) OR
        can_manage_community(t.community_id) OR
        get_my_role() = 'amministrazione'
      )
    )
  );

DROP POLICY IF EXISTS ticket_messages_read ON ticket_messages;
CREATE POLICY ticket_messages_read ON ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_messages.ticket_id AND (
        t.creator_user_id = (select auth.uid()) OR
        can_manage_community(t.community_id) OR
        get_my_role() = 'amministrazione'
      )
    )
  );

-- tickets
DROP POLICY IF EXISTS tickets_manager_read ON tickets;
CREATE POLICY tickets_manager_read ON tickets FOR SELECT
  USING (
    get_my_role() = 'responsabile_compensi' AND
    creator_user_id IN (
      SELECT c.user_id FROM collaborators c
        JOIN collaborator_communities cc ON cc.collaborator_id = c.id
        JOIN user_community_access uca ON uca.community_id = cc.community_id
      WHERE uca.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS tickets_own_insert ON tickets;
CREATE POLICY tickets_own_insert ON tickets FOR INSERT
  WITH CHECK (
    creator_user_id = (select auth.uid()) AND
    is_active_user()
  );

DROP POLICY IF EXISTS tickets_own_read ON tickets;
CREATE POLICY tickets_own_read ON tickets FOR SELECT
  USING (creator_user_id = (select auth.uid()));

-- user_community_access
DROP POLICY IF EXISTS uca_own_read ON user_community_access;
CREATE POLICY uca_own_read ON user_community_access FOR SELECT
  USING (user_id = (select auth.uid()));

-- user_profiles
DROP POLICY IF EXISTS user_profiles_own_read ON user_profiles;
CREATE POLICY user_profiles_own_read ON user_profiles FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS user_profiles_own_theme_update ON user_profiles;
CREATE POLICY user_profiles_own_theme_update ON user_profiles FOR UPDATE
  USING     ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS user_profiles_responsabile_read ON user_profiles;
CREATE POLICY user_profiles_responsabile_read ON user_profiles FOR SELECT
  USING (
    get_my_role() = 'responsabile_compensi' AND
    EXISTS (
      SELECT 1 FROM collaborators c
        JOIN collaborator_communities cc ON cc.collaborator_id = c.id
        JOIN user_community_access uca ON uca.community_id = cc.community_id
      WHERE c.user_id = user_profiles.user_id AND uca.user_id = (select auth.uid())
    )
  );

COMMIT;
