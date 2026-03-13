-- Migration 050: Revert to pending (APPROVATO → IN_ATTESA)
-- Adds notification_settings rows and E13 email template for the revert_to_pending action.

-- ── notification_settings ─────────────────────────────────────────────────────

INSERT INTO notification_settings (event_key, recipient_role, label, inapp_enabled, email_enabled)
VALUES
  ('comp_rimessa_attesa',    'collaboratore', 'Compenso rimesso in attesa', true, true),
  ('rimborso_rimessa_attesa','collaboratore', 'Rimborso rimesso in attesa', true, true);

-- ── E13 email template ────────────────────────────────────────────────────────

INSERT INTO email_templates (key, label, event_group, has_highlight, subject, body_before, highlight_rows, body_after, cta_label, available_markers)
VALUES (
  'E13',
  'Rimesso in attesa',
  'compensi_rimborsi',
  true,
  'Il tuo {{tipo}} è stato rimesso in attesa',
  'Il tuo <strong>{{tipo}}</strong> del <strong>{{data}}</strong> è stato rimesso in attesa di approvazione.',
  '[{"label":"Tipo","value":"{{tipo}}"},{"label":"Importo","value":"{{importo}}"},{"label":"Stato","value":"In attesa"}]',
  'Per chiarimenti contatta il tuo responsabile o apri un ticket di supporto.',
  'Vai all''app',
  ARRAY['nome','tipo','importo','data','nota']
);
