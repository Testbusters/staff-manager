-- 027_notifications_redesign.sql
-- Notification system overhaul:
-- 1. Remove stale integrazioni event_keys (states removed in Block 7)
-- 2. Add documento_firmato:amministrazione (settings-driven)
-- 3. Enable email for ticket_risposta:collaboratore (E9 template now available)
-- 4. Add content notification event_keys (comunicazione, evento, opportunità, sconto)

-- 1. Remove stale event_keys
DELETE FROM notification_settings
WHERE event_key IN ('comp_integrazioni', 'rimborso_integrazioni');

-- 2. Add documento_firmato:amministrazione
INSERT INTO notification_settings (event_key, recipient_role, label, inapp_enabled, email_enabled)
VALUES ('documento_firmato', 'amministrazione', 'Documento firmato ricevuto', true, false);

-- 3. Enable email for ticket_risposta:collaboratore
UPDATE notification_settings
SET email_enabled = true
WHERE event_key = 'ticket_risposta' AND recipient_role = 'collaboratore';

-- 4. Add content notification event_keys
INSERT INTO notification_settings (event_key, recipient_role, label, inapp_enabled, email_enabled)
VALUES
  ('comunicazione_pubblicata', 'collaboratore', 'Nuova comunicazione', true, true),
  ('evento_pubblicato',        'collaboratore', 'Nuovo evento',        true, true),
  ('opportunita_pubblicata',   'collaboratore', 'Nuova opportunità',   true, true),
  ('sconto_pubblicato',        'collaboratore', 'Nuovo sconto',        true, false);
