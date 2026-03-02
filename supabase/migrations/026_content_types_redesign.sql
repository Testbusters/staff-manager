-- Block 12: Content types redesign
-- 1. Rename tables
ALTER TABLE announcements RENAME TO communications;
ALTER TABLE benefits RENAME TO discounts;

-- 2. Extend communications (ex-announcements)
ALTER TABLE communications ADD COLUMN expires_at timestamptz;
ALTER TABLE communications ADD COLUMN file_urls text[] NOT NULL DEFAULT '{}';

-- 3. Extend discounts (ex-benefits)
ALTER TABLE discounts ADD COLUMN fornitore text NOT NULL DEFAULT '';
ALTER TABLE discounts ADD COLUMN logo_url text;
ALTER TABLE discounts ADD COLUMN file_url text;

-- 4. Extend resources
ALTER TABLE resources ADD COLUMN categoria text NOT NULL DEFAULT 'ALTRO';

-- 5. Extend events
ALTER TABLE events ADD COLUMN tipo text;
ALTER TABLE events ADD COLUMN file_url text;

-- 6. New opportunities table
CREATE TABLE opportunities (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id          uuid REFERENCES communities(id) ON DELETE SET NULL,
  titolo                text NOT NULL,
  tipo                  text NOT NULL DEFAULT 'ALTRO',
  descrizione           text NOT NULL,
  requisiti             text,
  scadenza_candidatura  date,
  link_candidatura      text,
  file_url              text,
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- Opportunities: all authenticated users can read
CREATE POLICY "opportunities_read_all"
  ON opportunities FOR SELECT
  TO authenticated
  USING (true);

-- Opportunities: only admin can write
CREATE POLICY "opportunities_admin_write"
  ON opportunities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'amministrazione' AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'amministrazione' AND is_active = true
    )
  );
