-- Migration 041: Email template management
-- Stores editable content for all 12 transactional email templates and shared layout config.

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE email_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key              TEXT UNIQUE NOT NULL,
  label            TEXT NOT NULL,
  event_group      TEXT NOT NULL,
  has_highlight    BOOLEAN NOT NULL DEFAULT true,
  subject          TEXT NOT NULL DEFAULT '',
  body_before      TEXT NOT NULL DEFAULT '',
  highlight_rows   JSONB NOT NULL DEFAULT '[]',
  body_after       TEXT NOT NULL DEFAULT '',
  cta_label        TEXT NOT NULL DEFAULT 'Vai all''app',
  available_markers TEXT[] NOT NULL DEFAULT '{}',
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_layout_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_color     TEXT NOT NULL DEFAULT '#E8320A',
  logo_url        TEXT NOT NULL DEFAULT '',
  header_title    TEXT NOT NULL DEFAULT 'Staff Manager',
  footer_address  TEXT NOT NULL DEFAULT 'Via Marco Ulpio Traiano 17, 20149 Milano',
  footer_legal    TEXT NOT NULL DEFAULT '',
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_layout_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_templates_admin_read"
  ON email_templates FOR SELECT
  TO authenticated
  USING (get_my_role() = 'amministrazione');

CREATE POLICY "email_templates_admin_write"
  ON email_templates FOR ALL
  TO authenticated
  USING (get_my_role() = 'amministrazione')
  WITH CHECK (get_my_role() = 'amministrazione');

CREATE POLICY "email_layout_admin_read"
  ON email_layout_config FOR SELECT
  TO authenticated
  USING (get_my_role() = 'amministrazione');

CREATE POLICY "email_layout_admin_write"
  ON email_layout_config FOR ALL
  TO authenticated
  USING (get_my_role() = 'amministrazione')
  WITH CHECK (get_my_role() = 'amministrazione');

-- ── Seed: email_templates ────────────────────────────────────────────────────

INSERT INTO email_templates (key, label, event_group, has_highlight, subject, body_before, highlight_rows, body_after, cta_label, available_markers) VALUES

-- E1: Integrazioni richieste
('E1', 'Integrazioni richieste', 'compensi_rimborsi', true,
  'Hai un {{tipo}} che richiede integrazioni',
  'Il tuo <strong>{{tipo}}</strong> del <strong>{{data}}</strong> richiede integrazioni prima di poter essere elaborato.',
  '[{"label":"Tipo","value":"{{tipo}}"},{"label":"Importo","value":"{{importo}}"},{"label":"Stato","value":"Integrazioni richieste"}]',
  'Accedi all''app per completare le informazioni richieste.',
  'Vai all''app',
  ARRAY['nome','tipo','importo','data','nota']
),

-- E2: Approvato
('E2', 'Approvato', 'compensi_rimborsi', true,
  'Il tuo {{tipo}} è stato approvato ✓',
  'Il tuo <strong>{{tipo}}</strong> del <strong>{{data}}</strong> è stato <strong>approvato</strong> dall''amministrazione.',
  '[{"label":"Tipo","value":"{{tipo}}"},{"label":"Importo","value":"{{importo}}"},{"label":"Stato","value":"Approvato"}]',
  'Il pagamento verrà elaborato nei prossimi giorni.',
  'Vai all''app',
  ARRAY['nome','tipo','importo','data']
),

-- E3: Rifiutato
('E3', 'Rifiutato', 'compensi_rimborsi', true,
  'Il tuo {{tipo}} non è stato approvato',
  'Il tuo <strong>{{tipo}}</strong> del <strong>{{data}}</strong> non è stato approvato.',
  '[{"label":"Tipo","value":"{{tipo}}"},{"label":"Importo","value":"{{importo}}"},{"label":"Stato","value":"Rifiutato"}]',
  'Per chiarimenti contatta il tuo responsabile o apri un ticket di supporto.',
  'Vai all''app',
  ARRAY['nome','tipo','importo','data']
),

-- E4: Pagato
('E4', 'Pagato', 'compensi_rimborsi', true,
  'Pagamento effettuato — {{tipo}} {{data}}',
  'Il pagamento del tuo <strong>{{tipo}}</strong> è stato registrato.',
  '[{"label":"Tipo","value":"{{tipo}}"},{"label":"Importo pagato","value":"{{importo}}"},{"label":"Data","value":"{{data}}"}]',
  'Puoi consultare il dettaglio e il riepilogo dei pagamenti nell''app.',
  'Vai all''app',
  ARRAY['nome','tipo','importo','data']
),

-- E5: Documento da firmare
('E5', 'Documento da firmare', 'documenti', true,
  'Hai un nuovo documento da firmare',
  'È disponibile un nuovo documento che richiede la tua firma.',
  '[{"label":"Documento","value":"{{titoloDocumento}}"},{"label":"Caricato il","value":"{{data}}"}]',
  'Accedi all''app, visualizza il documento e apporvi la tua firma digitale o carica la versione firmata.',
  'Apri documento',
  ARRAY['nome','titoloDocumento','data','link']
),

-- E6: Nuovo inviato (→ responsabile)
('E6', 'Nuovo compenso/rimborso (→ responsabile)', 'compensi_rimborsi', true,
  'Nuovo {{tipo}} da approvare — {{nomeCollaboratore}}',
  '<strong>{{nomeCollaboratore}}</strong> ha inviato un nuovo <strong>{{tipo}}</strong> in attesa di pre-approvazione.',
  '[{"label":"Collaboratore","value":"{{nomeCollaboratore}}"},{"label":"Community","value":"{{community}}"},{"label":"Importo","value":"{{importo}}"},{"label":"Data invio","value":"{{data}}"}]',
  'Accedi all''app per esaminarlo e pre-approvarlo o richiedere integrazioni.',
  'Vai all''app',
  ARRAY['nomeResponsabile','nomeCollaboratore','tipo','importo','community','data']
),

-- E7: Nuovo ticket (→ responsabile)
('E7', 'Nuovo ticket (→ responsabile)', 'ticket', true,
  'Nuovo ticket di supporto — {{oggetto}}',
  '<strong>{{nomeCollaboratore}}</strong> ha aperto un nuovo ticket di supporto.',
  '[{"label":"Collaboratore","value":"{{nomeCollaboratore}}"},{"label":"Riferimento","value":"{{categoria}}"},{"label":"Oggetto","value":"{{oggetto}}"},{"label":"Data","value":"{{data}}"}]',
  'Accedi all''app per leggere il messaggio e rispondere.',
  'Vai al ticket',
  ARRAY['nomeResponsabile','nomeCollaboratore','oggetto','categoria','data']
),

-- E8: Invito utente
('E8', 'Invito utente', 'invito', true,
  'Sei stato invitato a Staff Manager — Testbusters',
  'Sei stato invitato ad accedere a <strong>Staff Manager</strong>, la piattaforma di gestione collaboratori di Testbusters.',
  '[{"label":"Email","value":"{{email}}"},{"label":"Password temporanea","value":"{{password}}"},{"label":"Ruolo","value":"{{ruolo}}"}]',
  'Al primo accesso ti verrà chiesto di impostare una nuova password personale.',
  'Accedi a Staff Manager',
  ARRAY['email','password','ruolo']
),

-- E9: Risposta al ticket (→ collaboratore)
('E9', 'Risposta al ticket', 'ticket', true,
  'Risposta al tuo ticket — {{oggetto}}',
  'Hai ricevuto una risposta al tuo ticket <strong>{{oggetto}}</strong>.',
  '[{"label":"Oggetto","value":"{{oggetto}}"},{"label":"Data risposta","value":"{{data}}"}]',
  'Accedi all''app per leggere la risposta e continuare la conversazione.',
  'Vai al ticket',
  ARRAY['nome','oggetto','data']
),

-- E10: Nuova comunicazione
('E10', 'Nuova comunicazione', 'contenuti', true,
  'Nuova comunicazione: {{titolo}}',
  'È disponibile una nuova comunicazione dalla tua community.',
  '[{"label":"Titolo","value":"{{titolo}}"},{"label":"Pubblicata il","value":"{{data}}"}]',
  '',
  'Leggi la comunicazione',
  ARRAY['nome','titolo','data']
),

-- E11: Nuovo evento
('E11', 'Nuovo evento', 'contenuti', true,
  'Nuovo evento in programma — {{titolo}}',
  'È stato pubblicato un nuovo evento.',
  '[{"label":"Evento","value":"{{titolo}}"},{"label":"Pubblicato il","value":"{{data}}"}]',
  '',
  'Vedi i dettagli',
  ARRAY['nome','titolo','data']
),

-- E12: Nuovo contenuto generico (opportunità/sconti)
('E12', 'Nuovo contenuto (opportunità/sconti)', 'contenuti', true,
  'Nuov{{genere}} {{tipo}}: {{titolo}}',
  'È disponibile un nuovo contenuto nella sezione <strong>{{tipo}}</strong>.',
  '[{"label":"{{tipo}}","value":"{{titolo}}"},{"label":"Pubblicato il","value":"{{data}}"}]',
  '',
  'Vai all''app',
  ARRAY['nome','tipo','titolo','data','genere']
);

-- ── Seed: email_layout_config ────────────────────────────────────────────────

INSERT INTO email_layout_config (brand_color, logo_url, header_title, footer_address, footer_legal) VALUES (
  '#E8320A',
  'https://nyajqcjqmgxctlqighql.supabase.co/storage/v1/object/public/avatars/brand/testbusters_logo.png',
  'Staff Manager',
  'Via Marco Ulpio Traiano 17, 20149 Milano',
  'Testbusters S.r.l. Società Benefit | P.Iva / CF 08459930965 | Cod. Dest. M5UXCR1 | Cap. Soc. 50.000€'
);
