-- Create private 'expenses' bucket for expense reimbursement attachments.
-- All access via service role signed URLs (no public access).
INSERT INTO storage.buckets (id, name, public)
VALUES ('expenses', 'expenses', false)
ON CONFLICT (id) DO NOTHING;
