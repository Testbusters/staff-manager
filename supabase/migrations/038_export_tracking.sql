-- Add exported_at to compensations and expenses
ALTER TABLE compensations ADD COLUMN exported_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE expense_reimbursements ADD COLUMN exported_at TIMESTAMPTZ DEFAULT NULL;

-- Export run history
CREATE TABLE export_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exported_by UUID NOT NULL REFERENCES auth.users(id),
  collaborator_count INTEGER NOT NULL DEFAULT 0,
  compensation_count INTEGER NOT NULL DEFAULT 0,
  expense_count INTEGER NOT NULL DEFAULT 0,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE export_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "export_runs_admin_all" ON export_runs
  FOR ALL TO authenticated USING (get_my_role() = 'amministrazione');
