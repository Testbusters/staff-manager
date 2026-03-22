-- ROLLBACK:
-- DROP TABLE IF EXISTS allegati_globali CASCADE;
-- DROP TABLE IF EXISTS blacklist CASCADE;
-- DROP TABLE IF EXISTS candidature CASCADE;
-- DROP TABLE IF EXISTS assegnazioni CASCADE;
-- DROP TABLE IF EXISTS lezioni CASCADE;
-- DROP TABLE IF EXISTS corsi CASCADE;
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS citta_responsabile;
-- DELETE FROM lookup_options WHERE type='materia' AND nome='Simulazione';

-- ── corsi ─────────────────────────────────────────────────────────────────────
CREATE TABLE corsi (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                      TEXT NOT NULL,
  codice_identificativo     TEXT NOT NULL,
  community_id              UUID NOT NULL REFERENCES communities(id),
  modalita                  TEXT NOT NULL CHECK (modalita IN ('online', 'in_aula')),
  citta                     TEXT,
  linea                     TEXT,
  responsabile_doc          TEXT,
  licenza_zoom              TEXT,
  data_inizio               DATE NOT NULL,
  data_fine                 DATE NOT NULL,
  max_docenti_per_lezione   INT NOT NULL DEFAULT 8,
  max_qa_per_lezione        INT NOT NULL DEFAULT 6,
  link_lw                   TEXT,
  link_zoom                 TEXT,
  link_telegram_corsisti    TEXT,
  link_qa_assignments       TEXT,
  link_questionari          TEXT,
  link_emergenza            TEXT,
  created_by                UUID NOT NULL REFERENCES auth.users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE corsi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "corsi_read_authenticated"
  ON corsi FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "corsi_admin_write"
  ON corsi FOR ALL
  USING (get_my_role() = 'amministrazione');

-- ── lezioni ───────────────────────────────────────────────────────────────────
CREATE TABLE lezioni (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corso_id       UUID NOT NULL REFERENCES corsi(id) ON DELETE CASCADE,
  data           DATE NOT NULL,
  orario_inizio  TIME NOT NULL,
  orario_fine    TIME NOT NULL,
  ore            NUMERIC(4,2) GENERATED ALWAYS AS (
    ROUND(CAST(EXTRACT(EPOCH FROM (orario_fine - orario_inizio)) AS NUMERIC) / 3600, 2)
  ) STORED,
  materia        TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lezioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lezioni_read_authenticated"
  ON lezioni FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "lezioni_admin_write"
  ON lezioni FOR ALL
  USING (get_my_role() = 'amministrazione');

-- ── assegnazioni ──────────────────────────────────────────────────────────────
CREATE TABLE assegnazioni (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lezione_id       UUID NOT NULL REFERENCES lezioni(id) ON DELETE CASCADE,
  collaborator_id  UUID NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  ruolo            TEXT NOT NULL CHECK (ruolo IN ('docente', 'cocoda', 'qa')),
  valutazione      NUMERIC(3,1) CHECK (valutazione BETWEEN 1.0 AND 10.0),
  created_by       UUID NOT NULL REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lezione_id, collaborator_id, ruolo)
);

ALTER TABLE assegnazioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assegnazioni_read_authenticated"
  ON assegnazioni FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "assegnazioni_admin_write"
  ON assegnazioni FOR ALL
  USING (get_my_role() = 'amministrazione');

-- ── candidature ───────────────────────────────────────────────────────────────
CREATE TABLE candidature (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo             TEXT NOT NULL CHECK (tipo IN ('docente_lezione', 'qa_lezione', 'citta_corso')),
  lezione_id       UUID REFERENCES lezioni(id) ON DELETE CASCADE,
  corso_id         UUID REFERENCES corsi(id) ON DELETE CASCADE,
  collaborator_id  UUID REFERENCES collaborators(id) ON DELETE CASCADE,
  city_user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stato            TEXT NOT NULL DEFAULT 'in_attesa'
                   CHECK (stato IN ('in_attesa', 'accettata', 'ritirata')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT candidatura_target_check CHECK (
    (lezione_id IS NOT NULL AND corso_id IS NULL) OR
    (lezione_id IS NULL AND corso_id IS NOT NULL)
  )
);

ALTER TABLE candidature ENABLE ROW LEVEL SECURITY;

CREATE POLICY "candidature_admin_all"
  ON candidature FOR ALL
  USING (get_my_role() = 'amministrazione');

CREATE POLICY "candidature_read_authenticated"
  ON candidature FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── blacklist ─────────────────────────────────────────────────────────────────
CREATE TABLE blacklist (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id  UUID NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  note             TEXT,
  created_by       UUID NOT NULL REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collaborator_id)
);

ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blacklist_read_authenticated"
  ON blacklist FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "blacklist_admin_write"
  ON blacklist FOR ALL
  USING (get_my_role() = 'amministrazione');

-- ── allegati_globali ──────────────────────────────────────────────────────────
CREATE TABLE allegati_globali (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo          TEXT NOT NULL CHECK (tipo IN ('docenza', 'cocoda')),
  community_id  UUID NOT NULL REFERENCES communities(id),
  file_url      TEXT NOT NULL,
  nome_file     TEXT NOT NULL,
  updated_by    UUID NOT NULL REFERENCES auth.users(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tipo, community_id)
);

ALTER TABLE allegati_globali ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allegati_globali_read_authenticated"
  ON allegati_globali FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "allegati_globali_admin_write"
  ON allegati_globali FOR ALL
  USING (get_my_role() = 'amministrazione');

-- ── user_profiles: citta_responsabile ─────────────────────────────────────────
ALTER TABLE user_profiles ADD COLUMN citta_responsabile TEXT;

-- ── lookup_options: Simulazione ───────────────────────────────────────────────
INSERT INTO lookup_options (type, community, nome, sort_order) VALUES
  ('materia', 'testbusters', 'Simulazione', 6),
  ('materia', 'peer4med',    'Simulazione', 6)
ON CONFLICT (type, community, nome) DO NOTHING;
