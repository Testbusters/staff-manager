-- Migration 030: compensation schema alignment
-- Renames descrizione→nome_servizio_ruolo, note_interne→info_specifiche,
-- drops corso_appartenenza, makes community_id nullable, adds competenza FK,
-- creates compensation_competenze table, rewrites responsabile RLS policies.
--
-- ROLLBACK:
-- ALTER TABLE compensations RENAME COLUMN nome_servizio_ruolo TO descrizione;
-- ALTER TABLE compensations RENAME COLUMN info_specifiche TO note_interne;
-- ALTER TABLE compensations ALTER COLUMN community_id SET NOT NULL;
-- ALTER TABLE compensations DROP COLUMN IF EXISTS competenza;
-- ALTER TABLE compensations ADD COLUMN IF NOT EXISTS corso_appartenenza TEXT;
-- DROP TABLE IF EXISTS compensation_competenze;
-- DROP POLICY IF EXISTS "compensations_responsabile_read" ON compensations;
-- CREATE POLICY "compensations_responsabile_read" ON compensations FOR SELECT USING (can_manage_community(community_id));
-- DROP POLICY IF EXISTS "compensations_responsabile_update" ON compensations;
-- CREATE POLICY "compensations_responsabile_update" ON compensations FOR UPDATE USING (get_my_role() = 'responsabile_compensi' AND can_manage_community(community_id) AND stato IN ('INVIATO','INTEGRAZIONI_RICHIESTE'));
-- CREATE POLICY "compensations_own_update_bozza" ON compensations FOR UPDATE USING (collaborator_id = get_my_collaborator_id() AND stato = 'BOZZA' AND get_my_role() = 'collaboratore');

-- ── Step 1: rename columns ──────────────────────────────────────────────────
ALTER TABLE compensations RENAME COLUMN descrizione TO nome_servizio_ruolo;
ALTER TABLE compensations RENAME COLUMN note_interne TO info_specifiche;

-- ── Step 2: drop corso_appartenenza (superseded by nome_servizio_ruolo) ─────
ALTER TABLE compensations DROP COLUMN IF EXISTS corso_appartenenza;

-- ── Step 3: make community_id nullable ─────────────────────────────────────
-- Compensi are not scoped to a single community (collaborators can belong to
-- multiple communities). Linking to one would require duplication.
ALTER TABLE compensations ALTER COLUMN community_id DROP NOT NULL;

-- ── Step 4: create compensation_competenze lookup table ─────────────────────
CREATE TABLE IF NOT EXISTS compensation_competenze (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text        UNIQUE NOT NULL,
  label      text        NOT NULL,
  active     boolean     NOT NULL DEFAULT true,
  sort_order int         NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE compensation_competenze ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competenze_read_all" ON compensation_competenze
  FOR SELECT USING (is_active_user());

CREATE POLICY "competenze_admin_write" ON compensation_competenze
  FOR ALL USING (get_my_role() = 'amministrazione');

-- Seed default competenze
INSERT INTO compensation_competenze (key, label, sort_order) VALUES
  ('corsi',               'Corsi',                1),
  ('produzione_materiale','Produzione Materiale',  2),
  ('sb',                  'Schoolbusters',         3),
  ('extra',               'Extra',                 4)
ON CONFLICT (key) DO NOTHING;

-- ── Step 5: add competenza column with FK ───────────────────────────────────
ALTER TABLE compensations
  ADD COLUMN IF NOT EXISTS competenza TEXT REFERENCES compensation_competenze(key);

-- ── Step 6: drop stale BOZZA policy (stato BOZZA removed from workflow) ─────
DROP POLICY IF EXISTS "compensations_own_update_bozza" ON compensations;

-- ── Step 7: rewrite responsabile RLS to be community_id-independent ─────────
-- Old policies filtered by can_manage_community(community_id), which returns
-- false when community_id IS NULL. New policies use collaborator_id membership.

DROP POLICY IF EXISTS "compensations_responsabile_read" ON compensations;
CREATE POLICY "compensations_responsabile_read" ON compensations
  FOR SELECT USING (
    get_my_role() = 'responsabile_compensi'
    AND is_active_user()
    AND collaborator_id IN (
      SELECT DISTINCT cc.collaborator_id
      FROM collaborator_communities cc
      JOIN user_community_access uca ON uca.community_id = cc.community_id
      WHERE uca.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "compensations_responsabile_update" ON compensations;
CREATE POLICY "compensations_responsabile_update" ON compensations
  FOR UPDATE USING (
    get_my_role() = 'responsabile_compensi'
    AND is_active_user()
    AND stato IN ('INVIATO', 'INTEGRAZIONI_RICHIESTE')
    AND collaborator_id IN (
      SELECT DISTINCT cc.collaborator_id
      FROM collaborator_communities cc
      JOIN user_community_access uca ON uca.community_id = cc.community_id
      WHERE uca.user_id = auth.uid()
    )
  );
