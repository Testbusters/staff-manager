-- Migration 061: liquidazione_requests table
-- Allows collaboratori to request liquidation of APPROVATO compensations and expenses.
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS liquidazione_requests;

CREATE TABLE liquidazione_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id      UUID NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  compensation_ids     UUID[] NOT NULL DEFAULT '{}',
  expense_ids          UUID[] NOT NULL DEFAULT '{}',
  importo_netto_totale NUMERIC NOT NULL,
  iban                 TEXT NOT NULL,
  ha_partita_iva       BOOLEAN NOT NULL DEFAULT false,
  stato                TEXT NOT NULL CHECK (stato IN ('in_attesa', 'accettata', 'annullata')),
  note_admin           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at         TIMESTAMPTZ,
  processed_by         UUID REFERENCES auth.users(id)
);

-- Only one active (in_attesa) request per collaborator at a time
CREATE UNIQUE INDEX liquidazione_requests_one_active
  ON liquidazione_requests (collaborator_id) WHERE stato = 'in_attesa';

ALTER TABLE liquidazione_requests ENABLE ROW LEVEL SECURITY;

-- Collab: read own requests
CREATE POLICY "liq_req_collab_read"
  ON liquidazione_requests FOR SELECT
  USING (collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid()));

-- Collab: create new request
CREATE POLICY "liq_req_collab_insert"
  ON liquidazione_requests FOR INSERT
  WITH CHECK (collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid()));

-- Collab: revoke own in_attesa request (only allowed transition: in_attesa → annullata)
CREATE POLICY "liq_req_collab_update"
  ON liquidazione_requests FOR UPDATE
  USING (
    stato = 'in_attesa'
    AND collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid())
  )
  WITH CHECK (stato = 'annullata');

-- Admin: full access
CREATE POLICY "liq_req_admin_all"
  ON liquidazione_requests FOR ALL
  USING (get_my_role() = 'amministrazione');
