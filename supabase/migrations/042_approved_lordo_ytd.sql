ALTER TABLE collaborators
  ADD COLUMN IF NOT EXISTS approved_lordo_ytd  DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_year        INT           NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);

-- Backfill: sum APPROVATO compensi + rimborsi for current year
UPDATE collaborators c SET
  approved_lordo_ytd = COALESCE(
    (SELECT SUM(comp.importo_lordo) FROM compensations comp
     WHERE comp.collaborator_id = c.id AND comp.stato = 'APPROVATO'
       AND EXTRACT(YEAR FROM comp.data_competenza) = EXTRACT(YEAR FROM CURRENT_DATE)), 0
  ) + COALESCE(
    (SELECT SUM(exp.importo) FROM expense_reimbursements exp
     WHERE exp.collaborator_id = c.id AND exp.stato = 'APPROVATO'
       AND EXTRACT(YEAR FROM exp.data_spesa) = EXTRACT(YEAR FROM CURRENT_DATE)), 0
  ),
  approved_year = EXTRACT(YEAR FROM CURRENT_DATE);
