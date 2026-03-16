# DB Map — Staff Manager

> **Authoritative schema reference** for `skill-db` and the dependency scanner.
> Updated in **Phase 8 step 2d** of `pipeline.md` whenever a migration adds/modifies tables, columns, FKs, indexes, or RLS policies.
> Last synced: migration `049_content_tipo_capitalize.sql` (2026-03-16).

---

## Tables

### Core identity

| Table | Purpose | Key columns | Notes |
|---|---|---|---|
| `user_profiles` | Auth metadata per user | `user_id` (→ auth.users), `role`, `is_active`, `member_status`, `must_change_password`, `onboarding_completed`, `theme_preference`, `skip_contract_on_onboarding` | 1:1 with auth.users. `role` values: `collaboratore`, `responsabile_compensi`, `amministrazione` |
| `collaborators` | Profile data for collaborators and responsabili | `user_id`, `email`, `tipo_contratto`, `approved_lordo_ytd`, `approved_year`, `importo_lordo_massimale`, `codice_fiscale` (UNIQUE), `username` (UNIQUE), `intestatario_pagamento` | `sono_un_figlio_a_carico` = collaborator IS fiscally dependent (NOT "has children"). `approved_lordo_ytd` reset logic: compare `approved_year` to current year |
| `communities` | Community entities | `id`, `name` (UNIQUE), `is_active` | Reference table — small, static |
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
