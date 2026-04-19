-- Migration 078 — Dati integrativi profilo collaboratore
-- Block: profilo-dati-integrativi
-- Adds: 13 columns on collaborators + 1 column on user_profiles (GDPR Art.9 consent timestamp)
--
-- ROLLBACK:
--   ALTER TABLE user_profiles DROP COLUMN data_consenso_dati_salute;
--   ALTER TABLE collaborators
--     DROP CONSTRAINT collaborators_spedizione_address_complete,
--     DROP COLUMN spedizione_nazione,
--     DROP COLUMN spedizione_provincia,
--     DROP COLUMN spedizione_citta,
--     DROP COLUMN spedizione_cap,
--     DROP COLUMN spedizione_civico,
--     DROP COLUMN spedizione_indirizzo,
--     DROP COLUMN spedizione_usa_residenza,
--     DROP COLUMN regime_alimentare,
--     DROP COLUMN allergie_note,
--     DROP COLUMN ha_allergie_alimentari,
--     DROP COLUMN scadenza_documento_identita,
--     DROP COLUMN tipo_documento_identita,
--     DROP COLUMN numero_documento_identita;

-- === Documento identità (3 campi, tutti nullable per backfill soft) ===
ALTER TABLE collaborators
  ADD COLUMN numero_documento_identita TEXT NULL,
  ADD COLUMN tipo_documento_identita TEXT NULL
    CHECK (tipo_documento_identita IS NULL OR tipo_documento_identita IN ('CI','PASSAPORTO','PATENTE')),
  ADD COLUMN scadenza_documento_identita DATE NULL;

-- === Alimentazione (3 campi) ===
ALTER TABLE collaborators
  ADD COLUMN ha_allergie_alimentari BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN allergie_note TEXT NULL,
  ADD COLUMN regime_alimentare TEXT NOT NULL DEFAULT 'onnivoro'
    CHECK (regime_alimentare IN ('onnivoro','vegetariano','vegano'));

-- === Spedizione materiale (7 campi + conditional CHECK) ===
ALTER TABLE collaborators
  ADD COLUMN spedizione_usa_residenza BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN spedizione_indirizzo TEXT NULL,
  ADD COLUMN spedizione_civico TEXT NULL,
  ADD COLUMN spedizione_cap TEXT NULL,
  ADD COLUMN spedizione_citta TEXT NULL,
  ADD COLUMN spedizione_provincia TEXT NULL,
  ADD COLUMN spedizione_nazione TEXT NOT NULL DEFAULT 'IT';

-- Conditional CHECK: if spedizione_usa_residenza = false, tutti i campi address sono obbligatori (non null e non stringa vuota)
ALTER TABLE collaborators
  ADD CONSTRAINT collaborators_spedizione_address_complete
  CHECK (
    spedizione_usa_residenza = true
    OR (
      spedizione_indirizzo IS NOT NULL AND spedizione_indirizzo <> ''
      AND spedizione_civico IS NOT NULL AND spedizione_civico <> ''
      AND spedizione_cap IS NOT NULL AND spedizione_cap <> ''
      AND spedizione_citta IS NOT NULL AND spedizione_citta <> ''
      AND spedizione_provincia IS NOT NULL AND spedizione_provincia <> ''
    )
  );

-- === GDPR Art.9 consent timestamp ===
ALTER TABLE user_profiles
  ADD COLUMN data_consenso_dati_salute TIMESTAMPTZ NULL;

-- Comments for audit
COMMENT ON COLUMN collaborators.numero_documento_identita IS 'Numero documento identità (CI/Passaporto/Patente) — self+admin, not in PDF';
COMMENT ON COLUMN collaborators.tipo_documento_identita IS 'Tipo documento: CI | PASSAPORTO | PATENTE';
COMMENT ON COLUMN collaborators.scadenza_documento_identita IS 'Scadenza documento (DATE)';
COMMENT ON COLUMN collaborators.ha_allergie_alimentari IS 'GDPR Art.9 health data flag — se true richiede data_consenso_dati_salute';
COMMENT ON COLUMN collaborators.allergie_note IS 'GDPR Art.9 health data — free text allergies/intolerances (collab+admin only)';
COMMENT ON COLUMN collaborators.regime_alimentare IS 'Regime: onnivoro | vegetariano | vegano (no Art.9, pura preferenza)';
COMMENT ON COLUMN collaborators.spedizione_usa_residenza IS 'Flag: se true, spedizione usa indirizzo+civico residenza (altri campi spedizione ignorati)';
COMMENT ON COLUMN user_profiles.data_consenso_dati_salute IS 'GDPR Art.9 consent timestamp — popolata server-side solo se ha_allergie_alimentari=true E checkbox consenso spuntato';
