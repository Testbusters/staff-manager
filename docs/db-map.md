# DB Map — Staff Manager

> **Authoritative schema reference** for `skill-db` and the dependency scanner.
> Updated in **Phase 8 step 2d** of `pipeline.md` whenever a migration adds/modifies tables, columns, FKs, indexes, or RLS policies.
> Last synced: migration `051_p4m_templates.sql` (2026-03-18).
> Column specs section is auto-generated — run `node scripts/refresh-db-map.mjs` after each migration block.

---

## Tables

### Core identity

| Table | Purpose | Key columns | Notes |
|---|---|---|---|
| `user_profiles` | Auth metadata per user | `user_id` (→ auth.users), `role`, `is_active`, `member_status`, `must_change_password`, `onboarding_completed`, `theme_preference`, `skip_contract_on_onboarding` | 1:1 with auth.users. `role` values: `collaboratore`, `responsabile_compensi`, `amministrazione` |
| `collaborators` | Profile data for collaborators and responsabili | `user_id`, `email`, `tipo_contratto`, `approved_lordo_ytd`, `approved_year`, `importo_lordo_massimale`, `codice_fiscale` (UNIQUE), `username` (UNIQUE), `intestatario_pagamento`, `citta` (NOT NULL), `materie_insegnate` (TEXT[], NOT NULL) | `sono_un_figlio_a_carico` = collaborator IS fiscally dependent (NOT "has children"). `approved_lordo_ytd` reset logic: compare `approved_year` to current year. `citta`/`materie_insegnate` values come from `lookup_options` table, community-specific |
| `communities` | Community entities | `id`, `name` (UNIQUE), `is_active`, `banner_content`, `banner_active`, `banner_link_url`, `banner_link_label`, `banner_link_new_tab`, `banner_updated_at` | Banner fields added in migrations 052+053. `banner_updated_at` used as dismiss-key version for localStorage. |
| `collaborator_communities` | Collaborator → Community membership (1:1 per migration 044) | `collaborator_id` (UNIQUE), `community_id` | UNIQUE on `collaborator_id` — each collaborator belongs to exactly 1 community |
| `user_community_access` | Responsabile → Community access | `user_id`, `community_id` | UNIQUE `(user_id, community_id)`. Used for RBAC joins in RLS policies |

### Compensations

| Table | Purpose | Key columns | Notes |
|---|---|---|---|
| `compensations` | Compensation records | `collaborator_id`, `community_id` (nullable — always null for new), `stato`, `nome_servizio_ruolo`, `importo_lordo`, `ritenuta_acconto`, `importo_netto`, `competenza` (FK→comp_competenze.key), `receipt_document_id`, `approved_lordo_ytd` | State machine: `IN_ATTESA → INVIATO → APPROVATO → LIQUIDATO` or `→ RIFIUTATO` or `→ INTEGRAZIONI_RICHIESTE`. Ownership via `collaborator_id` (NOT `user_id`) |
| `compensation_history` | Audit log of state changes | `compensation_id`, `stato_precedente`, `stato_nuovo`, `changed_by`, `role_label` | Append-only |
| `compensation_attachments` | Files attached to compensations | `compensation_id`, `file_url`, `file_name` | |
| `compensation_competenze` | Lookup table for competenza types | `key` (UNIQUE), `label`, `active`, `sort_order` | `compensations.competenza` FK→ this table's `key` |

### Expense Reimbursements

| Table | Purpose | Key columns | Notes |
|---|---|---|---|
| `expense_reimbursements` | Reimbursement requests | `collaborator_id`, `community_id` (NOT NULL), `categoria`, `importo`, `stato`, `receipt_document_id` | State machine: `INVIATO → APPROVATO → LIQUIDATO` or `→ RIFIUTATO` or `→ INTEGRAZIONI_RICHIESTE`. Ownership via `collaborator_id` |
| `expense_history` | Audit log of state changes | `reimbursement_id`, `stato_precedente`, `stato_nuovo`, `changed_by`, `role_label` | Append-only |
| `expense_attachments` | Files attached to reimbursements | `reimbursement_id`, `file_url`, `file_name` | At least 1 required by business rule |

### Documents

| Table | Purpose | Key columns | Notes |
|---|---|---|---|
| `documents` | All documents for a collaborator | `collaborator_id`, `tipo`, `stato_firma`, `macro_type` (generated), `titolo`, `file_original_url`, `file_firmato_url` | `tipo` values include `CONTRATTO_OCCASIONALE`, `CONTRATTO_COCOCO`, `CU`, `RICEVUTA_PAGAMENTO`, etc. `macro_type`: `CONTRATTO` for contract types. UNIQUE partial index: 1 CONTRATTO per collaborator (`uq_one_contratto_per_collaborator WHERE macro_type='CONTRATTO'`). `stato_firma` values: `DA_FIRMARE`, `FIRMATO`, `NON_RICHIESTA` |
| `contract_templates` | Admin-uploaded contract templates | `tipo` (UNIQUE), `file_url`, `file_name`, `uploaded_by` | |

### Tickets

| Table | Purpose | Key columns | Notes |
|---|---|---|---|
| `tickets` | Support tickets | `creator_user_id` (→ auth.users directly), `community_id` (nullable), `categoria`, `oggetto`, `stato`, `priority`, `last_message_at` | Ownership via `creator_user_id` (NOT `collaborator_id`). State: `APERTO`, `IN_LAVORAZIONE`, `CHIUSO` |
| `ticket_messages` | Messages thread | `ticket_id`, `author_user_id`, `message`, `attachment_url` | |

### Content

All 5 content tables use `community_ids UUID[] DEFAULT '{}'` (array, NOT FK). Empty array = visible to all communities.

| Table | Purpose | Key columns | Notes |
|---|---|---|---|
| `communications` | News/announcements | `titolo`, `contenuto`, `pinned`, `published_at`, `expires_at`, `file_urls[]`, `community_ids[]` | |
| `events` | Events | `titolo`, `tipo`, `start_datetime`, `end_datetime`, `luma_url`, `community_ids[]` | |
| `opportunities` | Job/project opportunities | `titolo`, `tipo`, `descrizione`, `requisiti`, `scadenza_candidatura`, `community_ids[]` | |
| `resources` | Resources/guides | `titolo`, `categoria`, `tag[]`, `link`, `file_url`, `community_ids[]` | `tag` used for fiscal guides: `procedura-piva`, `detrazioni-figli` |
| `discounts` | Discounts/benefits | `titolo`, `fornitore`, `brand`, `codice_sconto`, `valid_from`, `valid_to`, `community_ids[]` | `brand` values: `testbusters`, `peer4med` |

### Notifications & Email

| Table | Purpose | Key columns | Notes |
|---|---|---|---|
| `notifications` | In-app notifications | `user_id`, `tipo`, `entity_type`, `entity_id`, `read` | `entity_type` values: `compensation`, `reimbursement`, `document`, `ticket`, `communication`, `event`, `opportunity`, `discount` |
| `notification_settings` | Toggle per event × role | `event_key`, `recipient_role` (UNIQUE pair), `inapp_enabled`, `email_enabled` | 19 rows total. Lookup: `event_key:recipient_role` |
| `email_templates` | Editable email templates | `key` (UNIQUE), `event_group`, `subject`, `body_before`, `highlight_rows` (jsonb), `body_after`, `available_markers[]` | 12 rows. `getRenderedEmail()` in `lib/email-template-service.ts` |
| `email_layout_config` | Singleton layout config | `brand_color`, `logo_url`, `header_title`, `footer_address` | Single row, cached 5min |
| `email_events` | Resend delivery log (webhook) | `resend_email_id`, `recipient`, `subject`, `event_type` | Written by `/api/webhooks/resend` (HMAC-SHA256) |

### Lookup Tables

| Table | Purpose | Key columns | Notes |
|---|---|---|---|
| `lookup_options` | Admin-managed lookup values for collaborator profile fields | `type` (`citta`\|`materia`), `community` (`testbusters`\|`peer4med`), `nome`, `sort_order` | UNIQUE `(type, community, nome)`. SELECT: all authenticated. ALL: `amministrazione` only. Used for città + materie_insegnate dropdowns — community-specific lists |

### Operations & Monitoring

| Table | Purpose | Key columns | Notes |
|---|---|---|---|
| `export_runs` | GSheet export history | `exported_by`, `collaborator_count`, `compensation_count`, `expense_count`, `storage_path`, `duration_ms` | |
| `import_runs` | Import run history | `tipo`, `executed_by`, `imported`, `skipped`, `errors`, `detail_json`, `duration_ms`, `storage_path` | `tipo` values: `collaboratori`, `contratti`, `cu` |
| `feedback` | User feedback submissions | `user_id`, `role`, `categoria`, `pagina`, `messaggio`, `stato` | `stato` values: `nuovo`, `letto`, `chiuso` |
| `app_errors` | Client-side errors (fire-and-forget) | `message`, `stack`, `url`, `user_id` | Written by `app/(app)/error.tsx` |

---

## FK Graph

```
auth.users
  ├── user_profiles.user_id
  ├── collaborators.user_id (UNIQUE)
  ├── export_runs.exported_by
  ├── import_runs.executed_by
  ├── feedback.user_id
  ├── tickets.creator_user_id
  ├── ticket_messages.author_user_id
  ├── notifications.user_id
  └── user_community_access.user_id

collaborators
  ├── collaborator_communities.collaborator_id (UNIQUE — 1:1)
  ├── compensations.collaborator_id
  ├── expense_reimbursements.collaborator_id
  └── documents.collaborator_id

communities
  ├── collaborator_communities.community_id
  ├── user_community_access.community_id
  ├── compensations.community_id (nullable)
  ├── expense_reimbursements.community_id
  ├── documents.community_id (nullable)
  └── tickets.community_id (nullable)

compensations
  ├── compensation_history.compensation_id
  ├── compensation_attachments.compensation_id
  └── documents.id ← compensations.receipt_document_id

expense_reimbursements
  ├── expense_history.reimbursement_id
  ├── expense_attachments.reimbursement_id
  └── documents.id ← expense_reimbursements.receipt_document_id

compensation_competenze.key ← compensations.competenza

tickets
  └── ticket_messages.ticket_id
```

> **No FK** on content tables (`community_ids UUID[]` is an array column — filtered in-memory, not via PostgREST join). Never use PostgREST embedded join syntax on these tables.

---

## Indexes (non-PK)

| Table | Index | Type | Note |
|---|---|---|---|
| `collaborators` | `collaborators_user_id_key` | UNIQUE | |
| `collaborators` | `collaborators_codice_fiscale_key` | UNIQUE | |
| `collaborators` | `collaborators_username_key` | UNIQUE | nullable — UNIQUE only on non-null |
| `collaborator_communities` | `cc_collaborator_id_key` | UNIQUE | enforces 1 community per collab |
| `collaborator_communities` | `cc_collaborator_id_community_id_key` | UNIQUE | composite |
| `communities` | `communities_name_key` | UNIQUE | |
| `compensation_competenze` | `competenze_key_key` | UNIQUE | |
| `compensations` | `compensations_collaborator_id_idx` | btree | high-cardinality FK |
| `compensations` | `compensations_community_id_idx` | btree | |
| `compensations` | `compensations_stato_idx` | btree | filter by state |
| `compensation_history` | `comp_history_compensation_id_idx` | btree | |
| `documents` | `documents_collaborator_id_idx` | btree | |
| `documents` | `documents_stato_firma_idx` | btree | |
| `documents` | `uq_one_contratto_per_collaborator` | UNIQUE partial | `WHERE macro_type='CONTRATTO'` |
| `email_templates` | `email_templates_key_key` | UNIQUE | |
| `expense_reimbursements` | `er_collaborator_id_idx` | btree | |
| `expense_reimbursements` | `er_community_id_idx` | btree | |
| `expense_reimbursements` | `er_stato_idx` | btree | |
| `expense_history` | `exp_history_reimbursement_id_idx` | btree | |
| `notification_settings` | `notif_settings_event_key_role_key` | UNIQUE | composite |
| `notifications` | `notifications_user_id_read_idx` | btree | `(user_id, read)` — bell query |
| `tickets` | `tickets_creator_user_id_idx` | btree | |
| `tickets` | `tickets_stato_idx` | btree | |
| `user_community_access` | `uca_user_id_community_id_key` | UNIQUE | composite |
| `user_profiles` | `user_profiles_user_id_key` | UNIQUE | |
| `contract_templates` | `contract_templates_tipo_key` | UNIQUE | |

**Missing indexes (potential gaps for skill-db to flag):**
- `compensations.data_competenza` — used in date-range filters in export
- `expense_reimbursements.data_spesa` — used in filters
- `notifications.created_at` — used for ordering in bell + page
- `tickets.updated_at` / `last_message_at` — used for recency sort

---

## RLS Summary

| Table | Roles with access | Pattern |
|---|---|---|
| `user_profiles` | own (SELECT/UPDATE), admin (ALL), responsabile (SELECT via community join) | Standard 3-policy pattern |
| `collaborators` | own (SELECT/UPDATE), admin (ALL), responsabile (SELECT via cc→uca join) | Standard |
| `collaborator_communities` | own (SELECT), admin (ALL), responsabile (SELECT via uca) | |
| `communities` | all active users (SELECT), admin (ALL) | `is_active_user()` |
| `compensations` | own (SELECT), responsabile (SELECT+limited UPDATE), admin (ALL), own insert | Responsabile UPDATE limited to INVIATO/INTEGRAZIONI_RICHIESTE states |
| `expense_reimbursements` | own (SELECT+UPDATE if INVIATO), responsabile (SELECT+limited UPDATE), admin (ALL) | |
| `documents` | own (SELECT), responsabile (SELECT via `can_manage_community`), admin (ALL), own UPDATE if DA_FIRMARE | |
| `tickets` | own (SELECT/INSERT), responsabile (SELECT via cc→uca chain), admin (ALL+UPDATE), resp UPDATE | |
| `ticket_messages` | read if ticket accessible, insert for all authenticated | |
| `notifications` | own only (ALL) | Simple ownership |
| `notification_settings` | all authenticated (SELECT), admin (UPDATE) | |
| `communications/events/opportunities/resources/discounts` | active users (SELECT), admin (ALL) | Content tables — community filtering is in-memory in API, NOT in RLS |
| `email_templates/email_layout_config` | admin only | Configuration tables |
| `export_runs/import_runs` | admin only | |
| `feedback` | any authenticated (INSERT), admin (SELECT/UPDATE/DELETE) | |
| `app_errors` | any authenticated (INSERT), admin (SELECT) | |
| `compensation_history/expense_history` | any authenticated (INSERT — append-only), role-filtered SELECT | |

**⚠️ RLS gaps to note:**
- `communications`: `announcements_admin_write` grants ALL to `responsabile_compensi` too — check if intentional
- `compensation_attachments`: `comp_attachments_own_insert` has no `WITH CHECK` clause — any authenticated user can insert
- `expense_attachments`: `exp_attachments_own_insert` same — no WITH CHECK
- `ticket_messages`: `ticket_messages_insert` has no WITH CHECK — any authenticated user can post to any ticket

---

## DB Functions / RPCs

| Function | Purpose | Used by |
|---|---|---|
| `get_my_role()` | Returns `user_profiles.role` for current user | All RLS policies |
| `get_my_collaborator_id()` | Returns `collaborators.id` for current user | Ownership RLS policies |
| `is_active_user()` | Returns true if `is_active=true AND member_status='attivo'` | Content read policies |
| `can_manage_community(community_id)` | Returns true if current user is responsabile for given community | Some document/compensation RLS |

---

## Ownership lookup cheatsheet

| Entity | Ownership column | Filter pattern |
|---|---|---|
| `compensations` | `collaborator_id` | `.eq('collaborator_id', collabId)` — never `.eq('user_id', ...)` |
| `expense_reimbursements` | `collaborator_id` | same |
| `documents` | `collaborator_id` | same |
| `tickets` | `creator_user_id` | `.eq('creator_user_id', userId)` — direct auth.users FK |
| `notifications` | `user_id` | `.eq('user_id', userId)` |

---



## Column specs

> Auto-generated from `information_schema` on staging DB (`gjwkvgfwkdwzqlvudgqr`).
> Last refreshed: 2026-03-22.
> Run `node scripts/refresh-db-map.mjs` after each migration block.

### `user_profiles`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `user_id` | uuid | NO | — | → auth.users.id |
| `role` | text | NO | — | — |
| `is_active` | boolean | NO | `true` | — |
| `member_status` | text | NO | `'attivo'` | — |
| `created_at` | timestamp with time zone | YES | `now()` | — |
| `must_change_password` | boolean | NO | `false` | — |
| `onboarding_completed` | boolean | NO | `false` | — |
| `can_publish_announcements` | boolean | YES | `true` | — |
| `theme_preference` | character varying | YES | `'dark'` | — |
| `skip_contract_on_onboarding` | boolean | NO | `false` | — |

### `collaborators`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `user_id` | uuid | NO | — | → auth.users.id |
| `nome` | text | YES | — | — |
| `cognome` | text | YES | — | — |
| `codice_fiscale` | text | YES | — | — |
| `partita_iva` | text | YES | — | — |
| `data_nascita` | date | YES | — | — |
| `indirizzo` | text | YES | — | — |
| `telefono` | text | YES | — | — |
| `email` | text | NO | — | — |
| `iban` | text | YES | — | — |
| `note` | text | YES | — | — |
| `tshirt_size` | text | YES | — | — |
| `foto_profilo_url` | text | YES | — | — |
| `data_ingresso` | date | YES | — | — |
| `sono_un_figlio_a_carico` | boolean | YES | `false` | — |
| `figli_dettaglio` | jsonb | YES | — | — |
| `created_at` | timestamp with time zone | YES | `now()` | — |
| `luogo_nascita` | text | YES | — | — |
| `comune` | text | YES | — | — |
| `tipo_contratto` | text | YES | — | — |
| `provincia_nascita` | text | YES | — | — |
| `provincia_residenza` | text | YES | — | — |
| `civico_residenza` | text | YES | — | — |
| `importo_lordo_massimale` | numeric | YES | — | — |
| `username` | text | YES | — | — |
| `intestatario_pagamento` | text | YES | — | — |
| `data_fine_contratto` | date | YES | — | — |
| `approved_lordo_ytd` | numeric | NO | `0` | — |
| `approved_year` | integer | NO | `EXTRACT(year FROM CURRENT_DATE)` | — |
| `citta` | text | NO | — | — |
| `materie_insegnate` | text[] | NO | `'{}'[]` | — |

### `communities`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `name` | text | NO | — | — |
| `created_at` | timestamp with time zone | YES | `now()` | — |
| `is_active` | boolean | NO | `true` | — |
| `banner_content` | text | YES | — | — |
| `banner_active` | boolean | NO | `false` | — |
| `banner_link_url` | text | YES | — | — |
| `banner_link_label` | text | YES | — | — |
| `banner_updated_at` | timestamp with time zone | NO | `now()` | — |
| `banner_link_new_tab` | boolean | NO | `false` | — |

### `collaborator_communities`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `collaborator_id` | uuid | NO | — | → collaborators.id |
| `community_id` | uuid | NO | — | → communities.id |

### `user_community_access`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `user_id` | uuid | NO | — | → auth.users.id |
| `community_id` | uuid | NO | — | → communities.id |

### `compensations`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `collaborator_id` | uuid | NO | — | → collaborators.id |
| `community_id` | uuid | YES | — | → communities.id |
| `nome_servizio_ruolo` | text | NO | — | — |
| `data_competenza` | date | YES | — | — |
| `importo_lordo` | numeric | YES | — | — |
| `ritenuta_acconto` | numeric | YES | — | — |
| `importo_netto` | numeric | YES | — | — |
| `stato` | text | NO | `'IN_ATTESA'` | — |
| `payment_reference` | text | YES | — | — |
| `info_specifiche` | text | YES | — | — |
| `created_at` | timestamp with time zone | YES | `now()` | — |
| `updated_at` | timestamp with time zone | YES | `now()` | — |
| `competenza` | text | YES | — | → compensation_competenze.key |
| `exported_at` | timestamp with time zone | YES | — | — |
| `receipt_document_id` | uuid | YES | — | → documents.id |
| `approved_by` | uuid | YES | — | → auth.users.id |
| `approved_at` | timestamp with time zone | YES | — | — |
| `rejection_note` | text | YES | — | — |
| `liquidated_at` | timestamp with time zone | YES | — | — |
| `liquidated_by` | uuid | YES | — | → auth.users.id |

### `compensation_history`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `compensation_id` | uuid | NO | — | → compensations.id |
| `stato_precedente` | text | YES | — | — |
| `stato_nuovo` | text | NO | — | — |
| `changed_by` | uuid | YES | — | → auth.users.id |
| `role_label` | text | NO | — | — |
| `note` | text | YES | — | — |
| `created_at` | timestamp with time zone | YES | `now()` | — |

### `compensation_attachments`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `compensation_id` | uuid | NO | — | → compensations.id |
| `file_url` | text | NO | — | — |
| `file_name` | text | NO | — | — |
| `created_at` | timestamp with time zone | YES | `now()` | — |

### `compensation_competenze`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `key` | text | NO | — | — |
| `label` | text | NO | — | — |
| `active` | boolean | NO | `true` | — |
| `sort_order` | integer | NO | `0` | — |
| `created_at` | timestamp with time zone | NO | `now()` | — |

### `expense_reimbursements`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `collaborator_id` | uuid | NO | — | → collaborators.id |
| `community_id` | uuid | NO | — | → communities.id |
| `categoria` | text | NO | — | — |
| `descrizione` | text | YES | — | — |
| `data_spesa` | date | NO | — | — |
| `importo` | numeric | NO | — | — |
| `stato` | text | NO | `'INVIATO'` | — |
| `payment_reference` | text | YES | — | — |
| `note_interne` | text | YES | — | — |
| `created_at` | timestamp with time zone | YES | `now()` | — |
| `updated_at` | timestamp with time zone | YES | `now()` | — |
| `exported_at` | timestamp with time zone | YES | — | — |
| `receipt_document_id` | uuid | YES | — | → documents.id |
| `approved_by` | uuid | YES | — | → auth.users.id |
| `approved_at` | timestamp with time zone | YES | — | — |
| `rejection_note` | text | YES | — | — |
| `liquidated_at` | timestamp with time zone | YES | — | — |
| `liquidated_by` | uuid | YES | — | → auth.users.id |

### `expense_history`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `reimbursement_id` | uuid | NO | — | → expense_reimbursements.id |
| `stato_precedente` | text | YES | — | — |
| `stato_nuovo` | text | NO | — | — |
| `changed_by` | uuid | YES | — | → auth.users.id |
| `role_label` | text | NO | — | — |
| `note` | text | YES | — | — |
| `created_at` | timestamp with time zone | YES | `now()` | — |

### `expense_attachments`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `reimbursement_id` | uuid | NO | — | → expense_reimbursements.id |
| `file_url` | text | NO | — | — |
| `file_name` | text | NO | — | — |
| `created_at` | timestamp with time zone | YES | `now()` | — |

### `documents`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `collaborator_id` | uuid | NO | — | → collaborators.id |
| `community_id` | uuid | YES | — | → communities.id |
| `tipo` | text | NO | — | — |
| `anno` | integer | YES | — | — |
| `file_original_url` | text | NO | — | — |
| `file_original_name` | text | NO | — | — |
| `stato_firma` | text | NO | `'DA_FIRMARE'` | — |
| `file_firmato_url` | text | YES | — | — |
| `file_firmato_name` | text | YES | — | — |
| `requested_at` | timestamp with time zone | YES | `now()` | — |
| `signed_at` | timestamp with time zone | YES | — | — |
| `created_at` | timestamp with time zone | YES | `now()` | — |
| `titolo` | text | NO | `''` | — |
| `macro_type` | text | YES | — | — |

### `contract_templates`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `tipo` | text | NO | — | — |
| `file_url` | text | NO | — | — |
| `file_name` | text | NO | — | — |
| `uploaded_by` | uuid | YES | — | → auth.users.id |
| `uploaded_at` | timestamp with time zone | YES | `now()` | — |

### `tickets`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `creator_user_id` | uuid | NO | — | → auth.users.id |
| `community_id` | uuid | YES | — | → communities.id |
| `categoria` | text | NO | — | — |
| `oggetto` | text | NO | — | — |
| `stato` | text | NO | `'APERTO'` | — |
| `priority` | text | NO | `'NORMALE'` | — |
| `created_at` | timestamp with time zone | YES | `now()` | — |
| `updated_at` | timestamp with time zone | YES | `now()` | — |
| `last_message_at` | timestamp with time zone | YES | — | — |
| `last_message_author_name` | text | YES | — | — |
| `last_message_author_role` | text | YES | — | — |

### `ticket_messages`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `ticket_id` | uuid | NO | — | → tickets.id |
| `author_user_id` | uuid | NO | — | → auth.users.id |
| `message` | text | NO | — | — |
| `attachment_url` | text | YES | — | — |
| `attachment_name` | text | YES | — | — |
| `created_at` | timestamp with time zone | YES | `now()` | — |

### `communications`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `titolo` | text | NO | — | — |
| `contenuto` | text | NO | — | — |
| `pinned` | boolean | YES | `false` | — |
| `published_at` | timestamp with time zone | YES | `now()` | — |
| `created_at` | timestamp with time zone | YES | `now()` | — |
| `expires_at` | timestamp with time zone | YES | — | — |
| `file_urls` | text[] | NO | `'{}'[]` | — |
| `community_ids` | uuid[] | NO | `'{}'[]` | — |

### `events`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `titolo` | text | NO | — | — |
| `descrizione` | text | YES | — | — |
| `start_datetime` | timestamp with time zone | YES | — | — |
| `end_datetime` | timestamp with time zone | YES | — | — |
| `location` | text | YES | — | — |
| `luma_url` | text | YES | — | — |
| `luma_embed_url` | text | YES | — | — |
| `created_at` | timestamp with time zone | YES | `now()` | — |
| `tipo` | text | YES | — | — |
| `file_url` | text | YES | — | — |
| `community_ids` | uuid[] | NO | `'{}'[]` | — |

### `opportunities`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `titolo` | text | NO | — | — |
| `tipo` | text | NO | `'ALTRO'` | — |
| `descrizione` | text | NO | — | — |
| `requisiti` | text | YES | — | — |
| `scadenza_candidatura` | date | YES | — | — |
| `link_candidatura` | text | YES | — | — |
| `file_url` | text | YES | — | — |
| `created_at` | timestamp with time zone | YES | `now()` | — |
| `community_ids` | uuid[] | NO | `'{}'[]` | — |

### `resources`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `titolo` | text | NO | — | — |
| `descrizione` | text | YES | — | — |
| `link` | text | YES | — | — |
| `file_url` | text | YES | — | — |
| `tag` | text[] | YES | — | — |
| `created_at` | timestamp with time zone | YES | `now()` | — |
| `categoria` | text | NO | `'ALTRO'` | — |
| `community_ids` | uuid[] | NO | `'{}'[]` | — |

### `discounts`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `titolo` | text | NO | — | — |
| `descrizione` | text | YES | — | — |
| `codice_sconto` | text | YES | — | — |
| `link` | text | YES | — | — |
| `valid_from` | date | YES | — | — |
| `valid_to` | date | YES | — | — |
| `created_at` | timestamp with time zone | YES | `now()` | — |
| `fornitore` | text | NO | `''` | — |
| `logo_url` | text | YES | — | — |
| `file_url` | text | YES | — | — |
| `community_ids` | uuid[] | NO | `'{}'[]` | — |
| `brand` | text | NO | `'testbusters'` | — |

### `notifications`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `user_id` | uuid | NO | — | → auth.users.id |
| `tipo` | text | NO | — | — |
| `titolo` | text | NO | — | — |
| `messaggio` | text | YES | — | — |
| `entity_type` | text | YES | — | — |
| `entity_id` | uuid | YES | — | — |
| `read` | boolean | YES | `false` | — |
| `created_at` | timestamp with time zone | YES | `now()` | — |

### `notification_settings`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `event_key` | text | NO | — | — |
| `recipient_role` | text | NO | — | — |
| `label` | text | NO | — | — |
| `inapp_enabled` | boolean | NO | `true` | — |
| `email_enabled` | boolean | NO | `false` | — |

### `email_templates`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `key` | text | NO | — | — |
| `label` | text | NO | — | — |
| `event_group` | text | NO | — | — |
| `has_highlight` | boolean | NO | `true` | — |
| `subject` | text | NO | `''` | — |
| `body_before` | text | NO | `''` | — |
| `highlight_rows` | jsonb | NO | `'[]'` | — |
| `body_after` | text | NO | `''` | — |
| `cta_label` | text | NO | `'Vai all''app'` | — |
| `available_markers` | text[] | NO | `'{}'[]` | — |
| `updated_at` | timestamp with time zone | YES | `now()` | — |

### `email_layout_config`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `brand_color` | text | NO | `'#E8320A'` | — |
| `logo_url` | text | NO | `''` | — |
| `header_title` | text | NO | `'Staff Manager'` | — |
| `footer_address` | text | NO | `'Via Marco Ulpio Traiano 17, 20149 Milano'` | — |
| `footer_legal` | text | NO | `''` | — |
| `updated_at` | timestamp with time zone | YES | `now()` | — |

### `email_events`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `resend_email_id` | text | YES | — | — |
| `recipient` | text | NO | — | — |
| `subject` | text | YES | — | — |
| `event_type` | text | NO | — | — |
| `created_at` | timestamp with time zone | NO | `now()` | — |

### `export_runs`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `exported_at` | timestamp with time zone | NO | `now()` | — |
| `exported_by` | uuid | NO | — | → auth.users.id |
| `collaborator_count` | integer | NO | `0` | — |
| `compensation_count` | integer | NO | `0` | — |
| `expense_count` | integer | NO | `0` | — |
| `storage_path` | text | YES | — | — |
| `created_at` | timestamp with time zone | NO | `now()` | — |
| `duration_ms` | integer | YES | — | — |

### `import_runs`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `tipo` | text | NO | — | — |
| `executed_by` | uuid | YES | — | → auth.users.id |
| `imported` | integer | NO | `0` | — |
| `skipped` | integer | NO | `0` | — |
| `errors` | integer | NO | `0` | — |
| `detail_json` | jsonb | YES | — | — |
| `duration_ms` | integer | YES | — | — |
| `created_at` | timestamp with time zone | NO | `now()` | — |
| `storage_path` | text | YES | — | — |

### `feedback`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `user_id` | uuid | NO | — | → auth.users.id |
| `role` | text | NO | — | — |
| `categoria` | text | NO | — | — |
| `pagina` | text | NO | `''` | — |
| `messaggio` | text | NO | — | — |
| `screenshot_path` | text | YES | — | — |
| `created_at` | timestamp with time zone | NO | `now()` | — |
| `stato` | text | NO | `'nuovo'` | — |

### `app_errors`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `message` | text | NO | — | — |
| `stack` | text | YES | — | — |
| `url` | text | YES | — | — |
| `user_id` | uuid | YES | — | → auth.users.id |
| `created_at` | timestamp with time zone | NO | `now()` | — |

### `lookup_options`

| Column | Type | Null | Default | FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | — |
| `type` | text | NO | — | — |
| `community` | text | NO | — | — |
| `nome` | text | NO | — | — |
| `sort_order` | integer | NO | `0` | — |