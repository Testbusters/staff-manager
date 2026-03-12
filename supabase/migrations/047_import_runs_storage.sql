-- Migration 047: add storage_path to import_runs + create imports bucket
--
-- ROLLBACK:
--   ALTER TABLE import_runs DROP COLUMN IF EXISTS storage_path;
--   DELETE FROM storage.buckets WHERE id = 'imports';

ALTER TABLE import_runs ADD COLUMN IF NOT EXISTS storage_path text;

-- Private imports bucket (XLSX detail files, 10 MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imports',
  'imports',
  false,
  10485760,
  ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- Admin-only read/write policies
CREATE POLICY imports_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'imports' AND get_my_role() = 'amministrazione');

CREATE POLICY imports_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'imports' AND get_my_role() = 'amministrazione');
