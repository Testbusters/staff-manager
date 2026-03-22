-- 054_materie_citta.sql
-- Adds lookup_options table (cities + materie), then citta/materie_insegnate columns on collaborators.
--
-- ROLLBACK:
--   ALTER TABLE collaborators DROP COLUMN IF EXISTS materie_insegnate;
--   ALTER TABLE collaborators DROP COLUMN IF EXISTS citta;
--   DROP TABLE IF EXISTS lookup_options;

-- 1. lookup_options table
CREATE TABLE lookup_options (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT NOT NULL CHECK (type IN ('citta', 'materia')),
  community  TEXT NOT NULL CHECK (community IN ('testbusters', 'peer4med')),
  nome       TEXT NOT NULL,
  sort_order INT  NOT NULL DEFAULT 0,
  UNIQUE (type, community, nome)
);

ALTER TABLE lookup_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lookup_options_read_authenticated" ON lookup_options
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "lookup_options_admin_write" ON lookup_options
  FOR ALL TO authenticated
  USING (get_my_role() = 'amministrazione')
  WITH CHECK (get_my_role() = 'amministrazione');

-- 2. Seed: 22 città × 2 community
INSERT INTO lookup_options (type, community, nome, sort_order) VALUES
  ('citta','testbusters','Ancona',1),
  ('citta','testbusters','Aosta',2),
  ('citta','testbusters','Bari',3),
  ('citta','testbusters','Bologna',4),
  ('citta','testbusters','Cagliari',5),
  ('citta','testbusters','Campobasso',6),
  ('citta','testbusters','Catania',7),
  ('citta','testbusters','Catanzaro',8),
  ('citta','testbusters','Firenze',9),
  ('citta','testbusters','Genova',10),
  ('citta','testbusters','L''Aquila',11),
  ('citta','testbusters','Milano',12),
  ('citta','testbusters','Napoli',13),
  ('citta','testbusters','Palermo',14),
  ('citta','testbusters','Perugia',15),
  ('citta','testbusters','Potenza',16),
  ('citta','testbusters','Roma',17),
  ('citta','testbusters','Torino',18),
  ('citta','testbusters','Trento',19),
  ('citta','testbusters','Trieste',20),
  ('citta','testbusters','Venezia',21),
  ('citta','testbusters','Verona',22),
  ('citta','peer4med','Ancona',1),
  ('citta','peer4med','Aosta',2),
  ('citta','peer4med','Bari',3),
  ('citta','peer4med','Bologna',4),
  ('citta','peer4med','Cagliari',5),
  ('citta','peer4med','Campobasso',6),
  ('citta','peer4med','Catania',7),
  ('citta','peer4med','Catanzaro',8),
  ('citta','peer4med','Firenze',9),
  ('citta','peer4med','Genova',10),
  ('citta','peer4med','L''Aquila',11),
  ('citta','peer4med','Milano',12),
  ('citta','peer4med','Napoli',13),
  ('citta','peer4med','Palermo',14),
  ('citta','peer4med','Perugia',15),
  ('citta','peer4med','Potenza',16),
  ('citta','peer4med','Roma',17),
  ('citta','peer4med','Torino',18),
  ('citta','peer4med','Trento',19),
  ('citta','peer4med','Trieste',20),
  ('citta','peer4med','Venezia',21),
  ('citta','peer4med','Verona',22);

-- 3. Seed: 5 materie × 2 community
INSERT INTO lookup_options (type, community, nome, sort_order) VALUES
  ('materia','testbusters','Biologia',1),
  ('materia','testbusters','Chimica',2),
  ('materia','testbusters','Fisica',3),
  ('materia','testbusters','Logica',4),
  ('materia','testbusters','Matematica',5),
  ('materia','peer4med','Biologia',1),
  ('materia','peer4med','Chimica',2),
  ('materia','peer4med','Fisica',3),
  ('materia','peer4med','Logica',4),
  ('materia','peer4med','Matematica',5);

-- 4. Add columns to collaborators
ALTER TABLE collaborators ADD COLUMN citta TEXT;
ALTER TABLE collaborators ADD COLUMN materie_insegnate TEXT[] DEFAULT '{}';

-- 5. Backfill existing records
UPDATE collaborators SET citta = 'Roma', materie_insegnate = ARRAY['Logica'];

-- 6. Enforce NOT NULL
ALTER TABLE collaborators ALTER COLUMN citta SET NOT NULL;
ALTER TABLE collaborators ALTER COLUMN materie_insegnate SET NOT NULL;
