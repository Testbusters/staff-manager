# Staff Manager — Product Specification

> Reference document for implementation. Read the sections relevant to the current block before starting Phase 2 (Implementation).
> Update this file if requirements change during development.

---

## 1. Project brief

**Context.** Single admin portal for collaborators across COMMUNITY (Testbusters and Peer4Med). Data currently scattered; flows (approvals, payments, documents, tickets) not clearly tracked.

**Goal.** Reduce friction and errors: standardised requests, clean payment export, archived and signed documents, communications and resources in one place.

**Problems to solve:**
- Collaborators modify their own data independently, bypassing administration
- Declaration of fiscal dependence (with visible age/income thresholds) and VAT number (with procedure explanation)
- Standardise the compensation file upload mechanism (currently different between Corsi and Extra)
- Collaborators see in the front-end how much has been paid out and how much is still pending
- Integrated reimbursement slot (not a separate Google Form)

**Users.** Collaborators (non-technical), Responsabile Cittadino, Responsabile Compensi, Responsabile Servizi Individuali, Administration (Finance/HR).

**UX acceptance criteria:**
- Collaborator submits a compensation request in < 60 seconds (3-step wizard)
- Responsabile pre-approves 20 requests in 5 minutes (inline actions + filters)
- Admin exports "to pay" in 2 clicks and marks payment for single or bulk records

---

## 2. Roles and permissions (RBAC)

| Role | UI Label | Visibility | Notes |
|---|---|---|---|
| `collaboratore` | Collaboratore | Own records | As-is |
| `responsabile_cittadino` | Responsabile Cittadino | To be defined | Permissions TBD |
| `responsabile_compensi` | Responsabile Compensi | Admin-assigned communities | Formerly `responsabile` |
| `responsabile_servizi_individuali` | Responsabile Servizi Individuali | To be defined | Permissions TBD |
| `amministrazione` | Admin | All communities | As-is |

**Key rules:**
- Real RLS on every table — no access to other users' records via URL
- Collaborator sees only their own records; IBAN and documents visible only to the owning collaborator + admin
- Responsabile Compensi sees only their assigned communities and performs mandatory pre-approval
- Status timeline without names: show only the role label (e.g. "Responsabile Compensi" / "Amministrazione")
- The community manages attachments and role assignments autonomously — no technical intervention required for new roles

**Departing members (member_status):**
- `uscente_con_compenso` — still has pending compensations; cannot see documents for the new year; limited access to their in-progress records
- `uscente_senza_compenso` — no pending compensations; account disabled except read-only access to the historical documents page
- `attivo` — full access per role

**New members:** in practice they join sporadically throughout the year (not 1–2 times as theoretically planned). The community must be able to manage onboarding autonomously: profile registration, contract generation, role assignment.

### Test users

| Email | Type | Role | Status |
|---|---|---|---|
| `collaboratore@test.com` | Playwright (production only) | collaboratore | not present on staging |
| `collaboratore_tb_test@test.com` | Playwright (staging) | collaboratore | replaces collaboratore@test.com on staging |
| `responsabile_cittadino@test.com` | Playwright | responsabile_cittadino | to create |
| `responsabile_compensi@test.com` | Playwright | responsabile_compensi | renamed from `responsabile@test.com` |
| `responsabile_servizi_individuali@test.com` | Playwright | responsabile_servizi_individuali | to create |
| `admin@test.com` | Playwright | amministrazione | renamed from `admin-test@example.com` |
| `collaboratore_test@test.com` | Manual | collaboratore | as-is |
| `responsabile_cittadino_test@test.com` | Manual | responsabile_cittadino | to create |
| `responsabile_compensi_test@test.com` | Manual | responsabile_compensi | renamed from `responsabile_test@test.com` |
| `responsabile_servizi_individuali_test@test.com` | Manual | responsabile_servizi_individuali | to create |
| `admin_test@test.com` | Manual | amministrazione | as-is |

### Open points
- `responsabile_cittadino`: permissions and visibility TBD
- `responsabile_servizi_individuali`: permissions and visibility TBD

---

## 3. Data model

> **Historical reference only.** The pseudocode below reflects the schema as of Block 8 (migrations 001–024). For the current schema see `docs/migrations-log.md` (migrations 001–037) and `supabase/migrations/`. Key post-Block-8 changes: migration 026 (announcements→communications, benefits→discounts), 027 (notifications), 029 (community_ids UUID[]), 030 (compensation schema alignment: nome_servizio_ruolo, info_specifiche, competenza FK, community_id nullable), 033 (drop periodo_riferimento), 034 (ticket columns + RLS), 035 (theme_preference), 036 (intestatario_pagamento), 037 (discount brand).

```sql
Community(id, name)
UserProfile(id, user_id, role, is_active, member_status, must_change_password, created_at)
UserCommunityAccess(id, user_id, community_id)   -- per Responsabili/Admin
Collaborator(id, user_id, nome, cognome, codice_fiscale, partita_iva?, data_nascita?,
             indirizzo, telefono, email, iban, note, tshirt_size, foto_profilo_url,
             data_ingresso, sono_un_figlio_a_carico, figli_dettaglio jsonb?,
             importo_lordo_massimale decimal?, tipo_contratto[OCCASIONALE], created_at)
CollaboratorCommunity(id, collaborator_id, community_id)

Compensation(id, collaborator_id, community_id,
             descrizione, periodo_riferimento, data_competenza,
             importo_lordo, ritenuta_acconto, importo_netto,
             stato[BOZZA|IN_ATTESA|APPROVATO|RIFIUTATO|LIQUIDATO],
             approved_by?, approved_at?,
             rejection_note?,
             liquidated_at?, liquidated_by?, payment_reference?, note_interne?, created_at)
             -- Block 7: tipo rimosso (solo OCCASIONALE); campi PIVA rimossi (numero_fattura,
             -- data_fattura, imponibile, iva_percentuale, totale_fattura); integration_note/reasons
             -- rimossi; manager/admin_approved_* → approved_by/at; paid_* → liquidated_*
CompensationAttachment(id, compensation_id, file_url, file_name, created_at)
CompensationHistory(id, compensation_id, stato_precedente, stato_nuovo,
                    changed_by, role_label, note?, created_at)

ExpenseReimbursement(id, collaborator_id, categoria, descrizione, data_spesa, importo,
                     stato[IN_ATTESA|APPROVATO|RIFIUTATO|LIQUIDATO],
                     approved_by?, approved_at?,
                     rejection_note?,
                     liquidated_at?, liquidated_by?, payment_reference?, created_at)
                     -- Block 7: integration_note rimosso; manager/admin_approved_* → approved_by/at;
                     -- paid_* → liquidated_*
ExpenseAttachment(id, reimbursement_id, file_url, file_name, created_at)
ExpenseHistory(id, reimbursement_id, stato_precedente, stato_nuovo,
               changed_by, role_label, note?, created_at)

Document(id, collaborator_id, community_id, tipo[CONTRATTO_OCCASIONALE|CU],  -- COCOCO/PIVA rimossi (Block 3); RICEVUTA_PAGAMENTO rimossa (Block 10)
         anno?, titolo, file_original_url, stato_firma[DA_FIRMARE|FIRMATO|NON_RICHIESTO],
         file_firmato_url?, requested_at, signed_at?, note?, created_at)

Ticket(id, creator_user_id, community_id, categoria, oggetto,
       stato[APERTO|IN_LAVORAZIONE|CHIUSO], priority[BASSA|NORMALE|ALTA], created_at)
TicketMessage(id, ticket_id, author_user_id, message, attachment_url?, created_at)

Announcement(id, community_id nullable, titolo, contenuto, pinned bool, published_at, created_at)
Benefit(id, community_id nullable, titolo, descrizione, codice_sconto?, link?,
        valid_from?, valid_to?, created_at)
Resource(id, community_id nullable, titolo, descrizione, link?, file_url?, tag?, created_at)
Event(id, community_id nullable, titolo, descrizione, start_datetime?, end_datetime?,
      location?, luma_url?, luma_embed_url?, created_at)
```

---

## 4. Operational workflows

### 4.1 Compensations

```
IN_ATTESA → APPROVATO → LIQUIDATO
          ↘ RIFIUTATO (rejection_note obbligatoria)
Da RIFIUTATO: il collaboratore può riaprire → torna a IN_ATTESA
```

| Action | From state | To state | Role |
|---|---|---|---|
| create | — | IN_ATTESA | responsabile_compensi / amministrazione |
| reopen | RIFIUTATO | IN_ATTESA | collaboratore |
| approve | IN_ATTESA | APPROVATO | responsabile_compensi / amministrazione |
| approve_all | IN_ATTESA (all community) | APPROVATO | responsabile_compensi |
| reject | IN_ATTESA | RIFIUTATO | responsabile_compensi / amministrazione |
| mark_liquidated | APPROVATO | LIQUIDATO | responsabile_compensi / amministrazione |

Rejection: `rejection_note` free text, required. Visible to the collaborator in the detail view.
Responsabile approval is final (no admin double-confirm).

**Compensation loading** (responsabile_compensi / amministrazione):
- Single mode: 3-step wizard (select collaborator → compensation data → summary) — created as IN_ATTESA
- Batch mode: import from XLS/CSV file (future dedicated block — UI placeholder)
- Field `corso_appartenenza` (optional): free text identifying the reference course
- Compensation community: intersection of responsabile communities ∩ collaborator communities (if unique: auto; if multiple: dropdown in Step 2)

### 4.2 Reimbursements

```
IN_ATTESA → APPROVATO → LIQUIDATO
         ↘ RIFIUTATO (rejection_note obbligatoria)
```

Same action table as compensations without submit/withdraw/reopen (created directly as IN_ATTESA — no BOZZA). Receipt attachments. Dedicated "Da pagare" export.

### 4.3 Documents

- **Admin** uploads PDF (`file_original_url`) and sets `DA_FIRMARE`
- **Collaborator** downloads original PDF, signs offline, re-uploads signed PDF → state `FIRMATO` (`signed_at` set automatically)
- **In-app notification** to Admin when document is signed
- **NON_RICHIESTO**: informational documents (payment receipts, CU) that do not require signature

**CU batch (Certificazione Unica):**
- Accounting sends a ZIP folder with all PDFs + a CSV file mapping `pdf_name → first_last_name_user`
- The system must allow ZIP + CSV upload and automatically associate each PDF with the correct collaborator (match on `nome_cognome`)
- Dedup: if a CU for the same collaborator and year already exists, do not overwrite (flag as duplicate)
- **Operational note:** align with accounting on the exact CSV format before implementing the batch import. Current file name format is `nome_cognome` (portal username).

**Contract attachments:**
- Attachment logic instead of 100 different contract templates: admin uploads the specific contract PDF and assigns it to the collaborator
- Resource filter by role: each document/resource is visible only to enabled roles
- The community manages attachment creation, upload, and role assignment autonomously — no technical intervention required

### 4.4 Tickets

Message thread + attachments, states APERTO / IN_LAVORAZIONE / CHIUSO, minimal in-app notifications.

#### Block 15a — Ticket system overhaul

**DB schema additions (migration 034):**
- `tickets.updated_at TIMESTAMPTZ DEFAULT NOW()` — set on status change and new message
- `tickets.last_message_at TIMESTAMPTZ` — denormalized from last ticket_message
- `tickets.last_message_author_name TEXT` — denormalized from last ticket_message author
- `tickets.last_message_author_role TEXT` — denormalized from last ticket_message author role
- Fix `tickets_manager_read` RLS: replace `can_manage_community(community_id)` (fails for NULL) with JOIN on `collaborators → collaborator_communities → user_community_access`
- Add `tickets_admin_read` policy: admin sees all tickets

**Ticket list page (`/ticket`):**
- `amministrazione` and `responsabile_compensi`: two vertical lists
  - "Ticket ricevuti" — APERTO + IN_LAVORAZIONE, ordered by `created_at` desc
  - "Ticket recenti" — `updated_at >= NOW() - 3 days`, any stato, ordered by `updated_at` desc
  - Each row (TicketRecordRow): categoria badge · oggetto · collab name · stato badge · last-reply badge · "Apri →"
- `collaboratore`: own tickets via RLS (existing TicketList behavior), no Ticket nav item
- `responsabile_compensi`: "Nuovo ticket" link hidden (creation not allowed)

**Ticket detail (`/ticket/[id]`):**
- Chat-style bidirectional layout: own messages right (blue-600/20), others left (gray-800)
- "Nuovo" badge: localStorage `ticket_last_visit_{id}` — messages after last visit from others = "Nuovo"
- Inline status change (TicketStatusInline client component) in header, visible to admin + responsabile
- TicketMessageForm: reply-only (status change moved to header)

**Dashboard — responsabile_compensi:**
- Quick actions (2 buttons: Compensi + Ticket) appear after hero, before KPIs
- Ticket section shows two sub-lists (ricevuti max 5 + recenti max 5) with last-reply badge
- "Azioni rapide" section at bottom removed

**Dashboard — collaboratore:**
- New ticket section: own open tickets (max 3) — oggetto + stato badge + "Vedi" link
- Access to ticket detail via dashboard link + notification bell (no nav item)

**Creation restriction:** `responsabile_compensi` → redirect from `/ticket/nuova` to `/`

### 4.5 Export

**Compensations "Da pagare"** (stato = APPROVATO):
- Nome, Cognome, CF, Community, Periodo, Causale, Data competenza, Lordo, Ritenuta, Netto, IBAN

**Reimbursements "Da pagare"** (stato = APPROVATO):
- Nome, Cognome, CF, Community, Categoria, Data spesa, Importo, IBAN, Note

---

## 5. Pages and navigation

### Collaboratore (8 items)
| Item | Route | Content |
|---|---|---|
| Home | `/` | Dashboard: metric cards, quick actions, feed |
| Profilo e Documenti | `/profilo` | Tab **Profilo** (personal data, IBAN, fiscal dependence) + Tab **Documenti** (signed document history) |
| Compensi e Rimborsi | `/compensi` | PaymentOverview + compensation list (all states) + reimbursement list + "Apri ticket" button (TicketQuickModal) |
| Corsi | `#` | Coming soon — item visible, not clickable |
| Schoolbusters | `#` | Coming soon — item visible, not clickable |
| Eventi | `/eventi` | Community events list (read-only, sorted by date ASC) |
| Comunicazioni e Risorse | `/comunicazioni` | Tab **Comunicazioni** (announcements board, read-only) + Tab **Risorse** (guides and materials, read-only) |
| Opportunità e Sconti | `/opportunita` | Benefits and discounts list (read-only) |

**Collaborator navigation rules:**
- Collaborator **does not create** compensations — `/compensi/nuova` redirects to `/compensi`
- Reimbursements are visible in `/compensi`; `/rimborsi` redirects to `/compensi`
- Documents are accessible only from `/profilo?tab=documenti`; `/documenti` redirects there
- Tickets are opened via modal from `/compensi`, not from a dedicated page
- `uscente_senza_compenso`: access only to `/profilo?tab=documenti`

### Responsabile Compensi (max 7 items)
Approvals (tab Compensi/Rimborsi), Collaborators (assigned communities), Tickets, Contents.

### Responsabile Cittadino / Responsabile Servizi Individuali
Navigation to be defined when the functional spec for these roles is written.

### Amministrazione (max 7 items)
Work queue (tabs: Da approvare / Documenti da firmare / Ticket aperti), Collaborators, Export, Documents, Tickets, Contents, Settings.

---

## 6. UX requirements (binding)

- **Anonymity**: collaborator does not see the name/email of the approver. Timeline shows only "Responsabile" / "Amministrazione"
- **Rejection**: `rejection_note` free text, required. Collaborator sees the note in the detail view and can reopen the compensation (→ BOZZA) to edit and resubmit
- **Liquidation**: responsabile_compensi and admin can "Segna liquidato" individually (from detail) and in bulk. `liquidated_at` set automatically. `payment_reference` optional but recommended
- **Approve all**: responsabile can bulk-approve all IN_ATTESA compensations/reimbursements for the community
- **Default filter**: "Only items requiring my action" active by default for Responsabile and Admin
- **Wizard**: max 3 steps to create requests (Data → Attachments → Summary and submit)
- **Timeline**: always visible in the request detail view

---

## 7. Security

- RLS on all tables
- IBAN and documents: access only to admin and the owning collaborator
- Private Supabase Storage (signed URL, no public buckets)
- Log: who approves, when, who marks as paid

---

## 8. Notifications (in-app, minimal)

### 8.1 Event triggers
- Document assigned for signature
- Signed document received (notification to admin)
- Ticket reply
- Generic request state change

### 8.2 Bell UI behaviour
- **Entity link**: all notifications with a populated `entity_type` are clickable:
  `compensation → /compensi/:id`, `reimbursement → /rimborsi/:id`, `document → /documenti/:id`, `ticket → /ticket/:id`
- **Single mark-read**: clicking a notification marks it as read; no auto-mark-all-read on dropdown open
- **"Segna tutte come lette"**: explicit button in the dropdown header, visible only if `unread > 0`
- **Loading/error state**: visual indicator during first fetch; message if fetch fails
- **Single dismiss**: × button (visible on hover) to permanently remove a notification
- **Truncated list warning**: if the dropdown reaches the limit (50 notifications), show banner + "Vedi tutte" link
- **Full page**: "Vedi tutte →" link at the bottom of the dropdown → `/notifiche` with:
  - Pagination (20 per page)
  - "Solo non lette" toggle
  - Single mark-read and dismiss for each item

---

## 9. Out of current scope (notes for future)

**Unified course definition (idea never implemented):**
- Staff: course definition → who attended → payments
- Simu: course definition → classroom management → notifications to students and teachers
- Currently Simu payments relate to a separate course definition
- Do not implement in Phase 1–2; evaluate in Phase 3+

---

## 10. Operational notes

- **UI language**: Italian. Code/commits: English.
- **Storage**: private Supabase buckets with signed URL. Never public links for documents.
- **CU batch**: align with accounting on the CSV format before implementing the batch import.
- **New members**: onboarding flow must be completable autonomously by the admin without technical intervention (profile registration + contract generation + role assignment).

---

## 11. Collaborator dashboard (Phase 3)

Collaborator home page. Currently a "Under construction" placeholder.

### Summary cards (3 large cards)
Each card shows: active request count + total amount in euros + count of requests pending liquidation (APPROVATO) + related amount.

- **Compensations**: active requests (state ≠ LIQUIDATO, ≠ RIFIUTATO) + of which pending liquidation (APPROVATO)
- **Reimbursements**: same logic as compensations, counts and amounts separate
- **Documents to sign**: count only of documents in DA_FIRMARE state

### Quick actions
- New compensation → `/compensi/nuova`
- New reimbursement → `/rimborsi/nuova`
- Open ticket → `/ticket/nuova`

### "What I need to do"
Section signalling actions required from the collaborator. Triggers:
- Requests in RIFIUTATO state → "Hai X richiesta/e rifiutata/e da riaprire"
- Documents in DA_FIRMARE state → "Hai X documento/i da firmare"
- Open tickets with no collaborator reply (last message is not from the current user)
- Incomplete profile: missing required fields (IBAN, codice fiscale) → "Completa il tuo profilo"
  - Note: once onboarding is implemented, the profile will always be complete at activation. The check remains as a fallback.

### Latest updates (feed)
Show the last 10 aggregated items from:
- State changes on own compensations and reimbursements (from `compensation_history` / `expense_history`)
- Replies to own tickets (new `ticket_messages` from other users)
- New announcements on the board (`announcements`, max 3, pinned first)

---

## 12. Extended collaborator profile (Phase 3)

Extension of the current profile (IBAN, phone, address, tshirt_size).

### DB schema — notes
Field renamed in Block 3: `ha_figli_a_carico` → `sono_un_figlio_a_carico` (migration 018).
Added `importo_lordo_massimale decimal(10,2) nullable` (migration 019).
Contract type unified to `OCCASIONALE` only (migration 020 — COCOCO/PIVA removed).

### Fiscal data — Fiscal dependence
- Semantics: the collaborator declares whether they ARE fiscally dependent on a relative (e.g. parent). Not whether they "have dependent children".
- DB field: `sono_un_figlio_a_carico` boolean (renamed in Block 3 from `ha_figli_a_carico`)
- Checkbox "Sono fiscalmente a carico" + explanatory text
- If true: show a collapsible guide with income/age thresholds — content managed by admin via Contenuti > Guide (tag: `detrazioni-figli`)

### VAT number info
- Field `partita_iva` (text, optional) already in the model: editable by the collaborator
- If `partita_iva` is set: show banner "Sei registrato come P.IVA" + content from an admin-managed guide (tag: `procedura-piva`). Same mechanism as above.

### Start date
- Field `data_ingresso` (date): set by admin in the user creation form
- Editable by admin or responsabile in Settings > Collaborators (MemberStatusManager or dedicated section)
- Read-only for the collaborator in their own profile

### Profile photo
- Field `foto_profilo_url` in the collaborator record
- Uploaded by the collaborator in their own profile (Supabase Storage, `avatars` bucket — public or signed URL)
- Not required; shown in Sidebar if present, otherwise initials

### Payment overview — Compensations page
Section "I miei pagamenti" at the top of `/compensi`, with two cards:
- **Compensi ricevuti**: year-by-year breakdown — total LIQUIDATO for current year and prior years
- **Rimborsi ricevuti**: same year-by-year breakdown

Pending amounts (IN_ATTESA + APPROVATO) shown separately below the cards as a summary row.
Calculated dynamically — no persisted field.

### Annual gross cap (`importo_lordo_massimale`)
- Collaborator-editable field in the profile; max value 5000€; nullable (= no cap set).
- If set: progress bar on the Compensations page showing `sum of importo_lordo for LIQUIDATO compensations current year / cap`.
  - Progress bar not shown if `importo_lordo_massimale IS NULL`.
- Italian legislation defines two standard reference thresholds:
  - Occasional services: 5000€/year
  - Fiscally dependent child: ~2840€/year (varies; see `detrazioni-figli` guide)
  - The collaborator sets their own cap manually based on their additional employment situation.

### Contract type
- Only supported contract type: `OCCASIONALE` (Block 3 — COCOCO and PIVA removed).
- The `tipo_contratto` field on `collaborators` is no longer user-editable; hardcoded to `OCCASIONALE` at creation.
- Contract template: only the OCCASIONALE template managed by admin in Settings.
- The `tipo` field on `compensations` records was removed in Block 7 (PIVA eliminated — only OCCASIONALE supported).

### Collaborator username (Block 4)
- Column `username TEXT UNIQUE` on `collaborators` (nullable for pre-existing records).
- **Generation**: auto-computed from `{nome}_{cognome}` (lowercase, accents removed, non-alphanumeric → `_`).
- **User creation (CreateUserForm)**: username field computed live from nome+cognome, editable by admin before submit. If admin provides an explicit username → server validates uniqueness → 409 if already in use. If not provided → auto-generates with numeric suffix (`_2`, `_3`) transparently.
- **Onboarding wizard**: shows username (from DB prefill) as readonly preview in the Identity section; if prefill.username is null, computed live from typed nome+cognome.
- **Collaborator profile (ProfileForm)**: read-only coloured badge next to the avatar.
- **Admin view (CollaboratoreDetail)**: shows username + inline edit → `PATCH /api/admin/collaboratori/[id]` (admin/responsabile_compensi only). Server-side uniqueness validation → 409 if already in use.

### Field validations and normalisation (Block 4)
- **Codice fiscale**: alphanumeric + uppercase only during input (in forms); full format regex in Zod API: `/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/`.
- **IBAN**: uppercase + space removal (already existing); Zod regex: `/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/`.
- **Phone**: permissive format — digits, `+`, `-`, spaces, parentheses; min 7 digits.
- **Province**: 2 uppercase letters; regex `/^[A-Z]{2}$/`.

### Collaborator profile editing by responsabile_compensi (Block 5)
- `responsabile_compensi` and `amministrazione` can edit all profile fields of a collaborator **except IBAN** (sensitive data).
- `responsabile_compensi` can only edit collaborators in their managed communities.
- Endpoint: `PATCH /api/admin/collaboratori/[id]/profile` — handles all profile fields + username.
- Username included in the same endpoint; same logic as admin: server-side uniqueness validation → 409 if already in use.
- Security fix: community check also added to the existing PATCH username endpoint (`/api/admin/collaboratori/[id]`).
- UI: toggle-able "Modifica profilo" section in CollaboratoreDetail — inline form with all editable fields.
- **Profile consistency rule**: documented in `docs/profile-editing-contract.md`. Every block touching collaborator profile data must verify alignment across onboarding, admin edit, and responsabile edit (see file for field × entry point matrix).

### Reimbursement request and ticket from compensations (Block 6)

#### Reimbursement — 3-step wizard
Collaborator creates a reimbursement request from `/rimborsi/nuova` via a 3-step wizard.
All data is collected in local React state; the actual submit happens only on "Conferma e invia" in Step 3.

- **Step 1 — Reimbursement data**: Category (required), Expense date (required), Amount in € (required), Description (optional — free note on the expense). Next enabled only with valid category + date + amount.
- **Step 2 — Attachments**: Upload supporting documents (PDF, JPG, PNG, max 10 MB each). Attachments optional. Supabase Storage bucket `expenses`, path `{user_id}/{expenseId}/{filename}`. The `community_id` field is ignored in this block.
- **Step 3 — Summary + Confirm**: shows all entered data + attachment filenames. "Conferma e invia" → `POST /api/expenses` → upload attachments → redirect `/rimborsi`.

**Reimbursement categories** (Block 6 — updated): `Trasporti, Vitto, Alloggio, Materiali, Cancelleria, Altro`.

**`descrizione`** — made optional (Block 6): migration `022_expense_descrizione_nullable.sql` removes `NOT NULL`. Optional field in form and API.

#### Ticket from Compensations and Reimbursements section
- Available only via `TicketQuickModal` on the `/compensi` page (top right header).
- **Ticket reference** (required field): `Compenso` or `Rimborso` — the only accepted values. Tickets not linked to these two scopes are removed from DB (migration 028).
- Implicit recipient: `responsabile_compensi` (workflow to be revised in a dedicated block).

### Collaborator section finalisation — Compensations and Reimbursements (Block 9)

**Structural rule**: the collaborator navigation items (8 items) are fixed — do not add new routes or pages. All new elements must be integrated within `/compensi`.

#### Page layout — Compensi / Rimborsi tabs
Replaces the two stacked vertical sections (COMPENSI + RIMBORSI) with horizontal tabs:
- Tab header: `Compensi (N)` | `Rimborsi (N)` — N = total request count per type
- Compensi tab: "Da ricevere" section (if APPROVATO > 0) + chip filters + card list
- Rimborsi tab: chip filters + card list + "Nuovo rimborso" button
- Chip filters by state (Tutti / In attesa / Approvato / Rifiutato / Liquidato) in both tabs

#### PaymentOverview — changes
- Cap progress bar label: `Massimale annuo {anno}` → `Massimale annuo {anno} lordo`
- Card "Compensi liquidati": row `Lordo {anno corrente}: X €` always visible (not gated on cap). Sum of `importo_lordo` for LIQUIDATO compensations in the current calendar year.

#### "Da ricevere" section (in Compensi tab, only if APPROVATO > 0)
- Columns: Description, Community, Period, Gross ℹ, Net ℹ, detail link
- Total row: sum Gross + sum Net
- ℹ tooltip on gross/net columns with explanatory text about withholding tax

#### Compensation list design — card style (Block 9)
- Replaces the header table with card rows:
  - LEFT: Description (bold), Community (coloured dot + name), Date, Period
  - RIGHT: `X,XX € lordi ℹ` + `X,XX € netti ℹ` (contextual colour) + state badge (pill)
- Community dot: deterministic colour from community ID hash (fixed Tailwind palette)
- Net colour: APPROVATO → amber-400; LIQUIDATO → green-400; IN_ATTESA / RIFIUTATO → gray-400
- ℹ CSS-only tooltip (hover): "Lordo: compenso prima della ritenuta d'acconto (20%). Netto = Lordo − 20% = importo accreditato sul conto."

#### Reimbursement list design — card style (Block 9)
- Equivalent card layout but with a single amount (reimbursements have no withholding tax)

### Collaborator Documents section — Documents tab (Block 10)

**Scope**: `/profilo?tab=documenti` — document type cleanup and self-service feature additions.

#### Document type changes
- Removed type `RICEVUTA_PAGAMENTO` (receipts belong to reimbursement attachments, not general documents)
- Valid types: `CONTRATTO_OCCASIONALE` | `CU`
- `DocumentMacroType`: `CONTRATTO` | `CU` (removed `RICEVUTA_PAGAMENTO`)

#### Documents tab — updated layout
- **Blue CTA** top right: "Nuovo rimborso" → `/rimborsi/nuova`
- **Self-upload form** (`DocumentUploadForm`, `isAdmin=false`): collaborator can upload `CONTRATTO_OCCASIONALE` or `CU` directly
  - Type dropdown: 2 options only (no optgroup)
  - `stato_firma` always `NON_RICHIESTO` (forced server-side for non-admin)
  - Contract uniqueness: 409 if a CONTRATTO already exists for the collaborator
- **DocumentList**: unchanged below the form

#### API security
- `POST /api/documents`: `validTipi` restricted to `['CONTRATTO_OCCASIONALE', 'CU']`
  - CONTRATTO_COCOCO, CONTRATTO_PIVA, RICEVUTA_PAGAMENTO → 400

#### Migration 025
- `DELETE FROM documents WHERE tipo = 'RICEVUTA_PAGAMENTO'`
- DROP + recreate `macro_type` generated column (CONTRATTO/CU only)
- CHECK constraint updated to `('CONTRATTO_OCCASIONALE', 'CU')`
- Unique index `uq_one_contratto_per_collaborator` recreated

### Collaborator Dashboard Redesign (Block 11)

**Scope**: `/` (collaboratore role) — full redesign of the collaborator section.

#### Approved layout

1. **Header**: `Ciao [Nome]!` + current date in Italian
2. **4 KPI card** (grid 2×2 mobile, 1×4 desktop):
   - Compensi in corso: count IN_ATTESA+APPROVATO · importo netto totale → `/compensi`
   - Rimborsi in corso: count IN_ATTESA+APPROVATO · importo totale → `/rimborsi`
   - Da ricevere: APPROVATO netto compensi + APPROVATO rimborsi · amber se >0 → `/compensi`
   - Da firmare: count DA_FIRMARE · amber se >0 · → `/profilo?tab=documenti`
3. **Sezione "Da fare"** (visibile solo se presente almeno 1 item — sostituisce "Cosa mi manca"):
   - Ogni documento DA_FIRMARE mostrato individualmente con titolo + link a `/documenti/[id]`
   - Ticket senza risposta: generico → `/ticket`
   - Profilo incompleto (IBAN/CF): generico → `/profilo`
4. **Azioni rapide** (4 button): `+ Nuovo rimborso`, `Compensi e rimborsi`, `Carica documento`, `+ Apri ticket`
5. **PaymentOverview**: riuso diretto del componente esistente (massimale + compensi liquidati/approvati + rimborsi)
6. **DashboardBarChart** (nuovo client component, Recharts): bar chart ultimi 6 mesi, 2 bar per mese (blu = compensi lordi liquidati, teal = rimborsi liquidati). Nascosto se tutti i valori sono zero.
7. **Ultimi aggiornamenti**: feed con badge contatori non letti sui tab:
   - Badge numerico su **Eventi**, **Comunicazioni e risorse**, **Opportunità e sconti**
   - Contatore = notifiche in-app non lette per gli `entity_type` corrispondenti al tab (nessuna nuova tabella, riuso `notifications`)
   - Mapping: `event` → tab Eventi; `communication`+`resource` → tab Comunicazioni e risorse; `opportunity`+`discount` → tab Opportunità e sconti
   - Decremento: quando il collaboratore apre il dettaglio di un item, le notifiche unread con quel `entity_type`+`entity_id` vengono marcate read (write server-side nella page di dettaglio, service role)
   - Copertura: solo item pubblicati dopo Block 13 (quando le notifiche contenuto sono state introdotte)

#### Additional data needed (expanding existing selects, zero new queries)
- `collaborators`: aggiungere `nome, cognome, importo_lordo_massimale`
- `compensations`: aggiungere `importo_lordo, liquidated_at`
- `expense_reimbursements`: aggiungere `liquidated_at`
- `documents` (DA_FIRMARE): aggiungere `titolo`

---

## Block 13 — Compensi e rimborsi (responsabile_compensi) + Importazione da Google Sheet

### 13a — Approvals section redesign (✅ complete)

**Scope**: `/approvazioni` — full redesign for `responsabile_compensi`: KPI cards, name search, state filters, checkbox selection, bulk approve. Same structure for Rimborsi tab. Import section placeholder (disabled).

**Campi KPI compensi**: count IN_ATTESA, totale lordo IN_ATTESA, count APPROVATO, totale lordo APPROVATO.
**Campi KPI rimborsi**: count IN_ATTESA, totale IN_ATTESA, count APPROVATO, totale APPROVATO.

**File**: `app/(app)/approvazioni/page.tsx`, `components/compensation/ApprovazioniCompensazioni.tsx`, `components/expense/ApprovazioniRimborsi.tsx`, `app/api/compensations/approve-bulk/route.ts`, `app/api/expenses/approve-bulk/route.ts`, `lib/types.ts` (community_id nullable on Expense), `lib/nav.ts` (label → "Compensi e rimborsi").

### 13b-I — Schema alignment compensations (migration 030)

**Goal**: align the `compensations` DB structure to the source Google Sheet fields (1:1 mapping).

**Migration 030**:
- RENAME `compensations.descrizione` → `nome_servizio_ruolo`
- RENAME `compensations.note_interne` → `info_specifiche`
- DROP `compensations.corso_appartenenza` (superseded da `nome_servizio_ruolo`)
- ALTER `compensations.community_id` → nullable (compensi non legati a community per evitare duplicazione dati su collaboratori multi-community)
- ADD `compensations.competenza text` FK → `compensation_competenze.key`
- CREATE TABLE `compensation_competenze` (id, key UNIQUE, label, active, sort_order, created_at) con seed: corsi/Corsi, produzione_materiale/Produzione Materiale, sb/Schoolbusters, extra/Extra
- RLS `compensations_responsabile_read` + `_update`: riscritta su `collaborator_id IN (collaborator_communities JOIN user_community_access)` — indipendente da `community_id` sul record
- DROP policy stale `compensations_own_update_bozza` (stato BOZZA rimosso da workflow)

**Updated consumers**: `lib/types.ts`, `CompensationDetail`, `CompensationList`, `PendingApprovedList`, `ApprovazioniCompensazioni`, `CompensationCreateWizard`, `app/api/compensations/route.ts`.

### 13b-II — Import da Google Sheet

**Flow**: fetch GSheet (googleapis service account) → filter `stato = TO_PROCESS` → validate → paginated preview → confirm → bulk insert IN_ATTESA + writeback `PROCESSED`. Re-pull available after corrections.

**GSheet**: `GOOGLE_SHEET_ID` + `GOOGLE_SERVICE_ACCOUNT_JSON` in `.env.local`. URL/tab configurable by admin in /impostazioni.

**File-level errors** (block everything): file unreachable, invalid format, missing header.
**Row-level errors** (skip row): missing field, invalid amount, invalid date, username not found, collaborator outside community, uscente_senza_compenso.

**Valori fissi su import**: `community_id = null`, `ritenuta_acconto = 20`, `importo_netto = lordo × 0.80`, `periodo_riferimento = "MMM YYYY"` derivato da `data_competenza`, `stato = IN_ATTESA`.

**Mapping colonne GSheet → DB**: Data competenza → `data_competenza`, Importo → `importo_lordo`, collaboratore → match su `collaborators.username`, nome servizio / ruolo → `nome_servizio_ruolo`, Info specifiche → `info_specifiche`, competenza → `competenza`.

### 13b-III — Individual compensation creation form

**Scope**: replaces `/approvazioni/carica` for admin + responsabile_compensi.

**Fields**: collaboratore (username autocomplete), competenza (select from `compensation_competenze`), data_competenza, importo_lordo (gross → net computed at 20%), nome_servizio_ruolo, info_specifiche (optional), periodo_riferimento (manual text).

**Fixed values**: `community_id = null`, `ritenuta_acconto = 20`, `importo_netto` computed server-side, `stato = IN_ATTESA`.

---

## Block 14 — Rich Text Editor + Notification Alerts

### Feature 1 — Rich Text Editor (Tiptap)

**Library**: `@tiptap/react @tiptap/pm @tiptap/starter-kit` — outputs semantic HTML stored in existing `text` DB columns (no migration).

**Extensions**: bold, italic, heading (H2/H3), bullet list, ordered list, blockquote, hard break.

**Backward compatibility**: `toSafeHtml` helper in `RichTextDisplay` — if content doesn't start with `<`, wraps plain text in `<p>` tags.

**New components**:
- `components/ui/RichTextEditor.tsx` — dark-mode toolbar with B/I/H2/H3/bullet/ordered buttons + Tiptap editor area.
- `components/ui/RichTextDisplay.tsx` — renders HTML with `dangerouslySetInnerHTML`, applies Tailwind arbitrary-selector dark prose styles.

**Admin list components** (replace `<textarea>` with `<RichTextEditor>`):
- `CommunicationList.tsx` → `contenuto`
- `EventList.tsx` → `descrizione`
- `OpportunityList.tsx` → `descrizione`, `requisiti`
- `DiscountList.tsx` → `descrizione`
- `ResourceList.tsx` → `descrizione`

**Detail pages** (replace `whitespace-pre-wrap` text with `<RichTextDisplay>`):
- `comunicazioni/[id]/page.tsx`, `eventi/[id]/page.tsx`, `opportunita/[id]/page.tsx`, `sconti/[id]/page.tsx`, `risorse/[id]/page.tsx`

**Email templates** (`lib/email-templates.ts`): add optional `contenuto`/`descrizione` param to E10/E11/E12; render via private `htmlSection()` helper after highlight block. API routes pass the body field to the email call.

### Feature 2 — Notification Sound + Bell Pulse

- `components/NotificationBell.tsx`: add `prevUnreadRef` to detect new arrivals; on count increase → play Web Audio API sine-wave ping (880→1174 Hz, 0.5s) + trigger `.bell-pulse` animation on bell emoji.
- `app/globals.css`: add `@keyframes bell-pulse` + `.bell-pulse` class.

---

## Block Banner — Community-specific banner

**Approved: 2026-03-21**

### Overview
A community-specific informational banner rendered at the top of the app layout, visible only to `collaboratore` role. Admins manage content and visibility from a dedicated tab in `/impostazioni`.

### Rules
- Banner is **community-specific**: TB collaboratori see the TB banner; P4M collaboratori see the P4M banner.
- Only `collaboratore` role sees the banner in the app layout. `responsabile_compensi` does NOT see it.
- Admin manages banners from `/impostazioni?tab=banner` (new tab). Admin does NOT see the banner in the layout.
- Dismiss: localStorage-based, session-agnostic. Key: `banner_dismissed_{communityId}_{updatedAt}`. Updating banner content resets dismiss for all users automatically.
- Banner appears between the persistent AppHeader and `<main>` content area.

### DB
`communities` table — 5 new columns (migration 052):
- `banner_content TEXT` — Tiptap HTML rich text
- `banner_active BOOLEAN NOT NULL DEFAULT false`
- `banner_link_url TEXT` — optional CTA link URL
- `banner_link_label TEXT` — optional CTA link label
- `banner_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` — used for dismiss key versioning

### Components
- `components/banner/CommunityBanner.tsx` — client component: dismiss logic, `RichTextDisplay`, optional CTA `<a>` link, dismiss `Button`
- `components/settings/BannerManager.tsx` — admin: one `Card` per community with `Switch` (active toggle), `RichTextEditor`, link URL/label `Input` fields, Salva `Button`

### API
`PATCH /api/admin/banner/[communityId]` — admin-only, updates banner fields + sets `banner_updated_at = now()`

### Layout
`app/(app)/layout.tsx`: when `role === 'collaboratore'`, fetch community banner via service client (2-step: collaborator_communities → communities). Render `<CommunityBanner>` if `banner_active && banner_content`.

---

## Block corsi-2 — Collaboratore View + Candidature

### Scope
Activates the collaboratore-facing `/corsi` route (previously redirecting to `/`). Collaboratori can browse their community's active/upcoming corsi and submit/withdraw candidature for individual lezioni.

### Requirements confirmed
- `/corsi` lists corsi for the collaboratore's own community only (via `collaborator_communities`)
- Only `programmato` and `attivo` corsi shown (concluso filtered out, stato computed)
- `/corsi/[id]` shows corso info header (links, modalita, citta) + lezioni table
- Each lezione row has Docente and Q&A candidatura buttons
- No slot limits — any collab can apply
- Withdrawal allowed only while `stato = in_attesa`
- Blacklisted collabs see the page but all candidatura buttons are disabled (yellow alert shown)
- Assegnazioni shown as "Assegnato · Ruolo" badge in the lezioni row (no separate section)
- No filter by materie

### Out of scope (deferred to corsi-3)
- Responsabile_cittadino view
- Admin acceptance/rejection of candidature
- Assegnazione management

### Migration 056
Two RLS policies on `candidature`:
- `candidature_collab_insert`: collaboratore INSERT own candidature (tipo docente/qa only)
- `candidature_collab_update_own`: collaboratore UPDATE own → `stato = 'ritirata'` only

### API Routes
- `POST /api/candidature`: blacklist check → duplicate check (same lezione+tipo, not ritirata) → insert
- `PATCH /api/candidature/[id]`: ownership check → stato=in_attesa guard → set ritirata

### Pages modified
- `app/(app)/corsi/page.tsx`: removed collab redirect; added collab SSR branch (community fetch via `collaborator_communities`, corso list filtered to programmato/attivo)
- `app/(app)/corsi/[id]/page.tsx`: added collab SSR branch (7 fetches: collab, community, blacklist, corso, lezioni, own candidature, own+all assegnazioni)

### New components
- `CorsiListCollab.tsx`: card grid with stato badge, modalita/citta badges, date range
- `LezioniTabCollab.tsx`: table with DropdownMenu candidatura, AlertDialog withdraw confirm, optimistic state, blacklist alert

---

## Block corsi-dashboard — Dashboard + Profile Corsi Gaps

### Scope
Closes G1–G7 identified in post-release compliance review of corsi-1/2/3.

### Requirements confirmed
- **G1** — Dashboard collab hero: read-only chips `materie_insegnate`. Gray "Non configurato" chip if array empty. No click action.
- **G2** — Dashboard collab: new "Corsi" section below the 4 existing KPI cards. 6 boxes:
  - Corsi assegnati docente: assegnazioni tipo=docente, lezione.data >= today, corso.stato IN (programmato, attivo)
  - Corsi svolti docente: assegnazioni tipo=docente, lezione.data < today, valutazione IS NOT NULL
  - Valutazione media docente: AVG(assegnazioni.valutazione) WHERE tipo=docente AND valutazione IS NOT NULL
  - Valutazione media CoCoDà: AVG(assegnazioni.valutazione) WHERE tipo=cocoda AND valutazione IS NOT NULL
  - Q&A assegnati: count assegnazioni tipo=qa, lezione.data >= today, corso programmato/attivo; ore = "--" (deferred to corsi-4)
  - Q&A svolti: count assegnazioni tipo=qa, lezione.data < today, valutazione IS NOT NULL; ore = "--"
  - All boxes → /corsi on click (no filter)
- **G3** — Dashboard collab: "Prossimi eventi" box showing national future events (city events deferred to eventi-citta block)
- **G4** — Profilo page collab: hero card at top with avatar, nome/cognome, community, materie chips row (last row in hero)
- **G5/G7** — Dashboard resp.citt: add "Ultimi aggiornamenti" section (same DashboardUpdates component used in collab dashboard: Events / Comunicazioni e risorse / Opportunità e sconti tabs)
- **G6** — LezioniTabCollab: show "X/Y" posti count per lezione row (X = assegnazioni of that tipo, Y = max)

### Out of scope
- City events in dashboard — deferred to eventi-citta block
- Q&A ore — deferred to corsi-4 block
- Nav changes — already correct from corsi-3

### Files modified
- `app/(app)/page.tsx`: collab branch (materie chips G1, KPI corsi G2, prossimi eventi G3), resp.citt branch (DashboardUpdates G5/G7)
- `components/corsi/LezioniTabCollab.tsx`: posti count per row (G6)
- `app/(app)/profilo/page.tsx`: hero card with materie chips (G4)

### New components
- `components/corsi/DashboardCorsiKpi.tsx`: 6 KPI cards client component


---

## Block corsi-blocco4 — Blocco 4 Corsi Gap Fixes

### Scope
Gap fixes (G1–G6 + anomaly A1) identified during compliance review of the Blocco 4 Corsi raw requirements against corsi-1/2/3/corsi-dashboard.

### Implemented

- **G1** — Dashboard collab: Add `assegnatiCocoda` + `svoltiCocoda` KPI boxes (DashboardCorsiKpi: 6→8 boxes)
- **A1+G2** — `/corsi` collab: 3 scrollable sections:
  - Corsi assegnati (own assegnazioni, any stato)
  - Corsi programmati — Docenza (community corsi, not concluso; in_aula filtered by `collaborators.citta = corsi.citta`; online = all)
  - Q&A programmati (community corsi, not concluso, no city filter)
- **G3** — `/corsi` collab: monthly calendar above sections, colored cells by ruolo (brand=docente, amber=cocoda, green=qa), prev/next navigation
- **G4** — `/corsi/[id]` collab: display community name, `linea`, allegati docenza/CoCoD'à
- **G5** — ✅ Already done in corsi-1 (`linea` field in CorsoForm at line 197)
- **G6** — Resp.citt CoCoD'à direct assignment: migration 058 (RLS INSERT), POST /api/assegnazioni, CoCoD'à panel in `/corsi/assegnazione` per lezione with collab dropdown

### Out of scope
- CoCoD'à removal (not in requirements)
- City filter for Q&A section (by spec Q&A has no city filter)
- Allegati management (admin-only, already in admin panel)

### Files
- NEW: `supabase/migrations/058_assegnazioni_cocoda_rls.sql`
- NEW: `app/api/assegnazioni/route.ts`
- NEW: `components/corsi/CorsiCalendario.tsx`
- NEW: `components/corsi/CorsiPageCollab.tsx`
- MOD: `components/corsi/DashboardCorsiKpi.tsx`
- MOD: `app/(app)/page.tsx`
- MOD: `app/(app)/corsi/page.tsx`
- MOD: `app/(app)/corsi/[id]/page.tsx`
- MOD: `app/(app)/corsi/assegnazione/page.tsx`
- MOD: `components/corsi/AssegnazioneRespCittPage.tsx`
- NEW: `__tests__/api/assegnazioni.test.ts`

---

## Block eventi-citta — City Events (Responsabile Cittadino)

### Scope
Activates the "Creazione Eventi" nav item for `responsabile_cittadino`. Resp.citt can create,
edit, and delete events scoped to their city (`citta_responsabile`). City events appear in:
- Collab dashboard "Prossimi eventi" box (alongside national events, filtered by `collab.citta`)
- Collab `/eventi` feed (national + city events matching `collab.citta`)
- Admin `/contenuti` tab eventi (all events, city events show a città badge)

### Requirements confirmed
- Extend `events` table: add `citta text NULL` column (national events = NULL)
- **RLS (migration 059)**: resp.citt can INSERT events where `citta = citta_responsabile`; UPDATE/DELETE own city events only
- **`/corsi/eventi-citta`**: resp.citt CRUD page — list own city events, create/edit via Dialog, delete with AlertDialog
- **API `POST /api/events`**: add `responsabile_cittadino` to WRITE_ROLES; auto-set `citta = citta_responsabile` and `community_ids` from resp.citt's community
- **API `PATCH/DELETE /api/events/[id]`**: add `responsabile_cittadino`; ownership check (can only modify events with `citta = citta_responsabile`)
- **Dashboard collab**: "Prossimi eventi" includes city events where `event.citta = collab.citta`
- **Feed `/eventi`**: shows national (`citta IS NULL`) + city events where `event.citta = collab.citta`
- **Admin `/contenuti`**: all events shown; city events display a badge with city name
- **Notifications**: creating a city event notifies active collabs in the same city via `getCollaboratoriForCity()` helper (in-app only)
- **Nav**: remove `comingSoon: true` from resp.citt "Creazione eventi"; update `href: '/corsi/eventi-citta'`

### Out of scope
- Draft/status workflow for events (no stato field introduced)
- Email notifications for city events (in-app only, matching national behavior)
- Resp.citt cannot manage allegati or luma_embed_url (visible in feed but not editable by resp.citt)

### Files
- NEW: `supabase/migrations/059_events_citta.sql`
- NEW: `app/(app)/corsi/eventi-citta/page.tsx`
- NEW: `app/(app)/corsi/eventi-citta/loading.tsx`
- NEW: `components/corsi/EventiCittaPage.tsx`
- NEW: `__tests__/api/events.test.ts`
- MOD: `lib/types.ts` — ContentEvent add `citta`
- MOD: `lib/nav.ts` — remove comingSoon from resp.citt "Creazione eventi"
- MOD: `lib/notification-helpers.ts` — add `getCollaboratoriForCity()`
- MOD: `app/api/events/route.ts` — resp.citt support + city notification filter
- MOD: `app/api/events/[id]/route.ts` — resp.citt ownership check
- MOD: `app/(app)/page.tsx` — dashboard city events filter
- MOD: `app/(app)/eventi/page.tsx` — feed city events filter
- MOD: `app/(app)/eventi/[id]/page.tsx` — citta badge
- MOD: `components/contenuti/EventList.tsx` — citta badge in admin list

---

## Block liquidazione-request — Liquidation Request Flow

### Scope
Collaboratori can request liquidation of their APPROVATO compensations and expense reimbursements.
Admin receives the request in /coda and can accept (bulk-liquidate exactly those records) or reject with optional note.

### Requirements
- **Threshold**: request only allowed when total net of selected records ≥ €250 (net already stored in `compensations.importo_netto` and `expense_reimbursements.importo`; ritenuta already applied at creation)
- **Per-record selection**: checkbox table — collab selects which APPROVATO records to include. No partial-record splitting.
- **IBAN**: shown read-only from `collaborators.iban` — collab cannot change it in this flow
- **P.IVA**: optional checkbox ("Sono possessore di Partita IVA")
- **Disclaimer**: "Ho controllato che i dati siano corretti" (required checkbox) + explanation of €250 minimum
- **One active request per collab**: unique index on `(collaborator_id) WHERE stato = 'in_attesa'`
- **Revoca**: collab can revoke their in_attesa request (sets stato = 'annullata')
- **Admin accept**: bulk-liquidates exactly the compensation_ids + expense_ids in the request
- **Admin reject**: sets stato = 'annullata' with optional note_admin
- **Notifications**: E15 → admin on creation; E16 → collab on accept/reject (in-app + email)

### Out of scope
- Slack integration
- Amount splitting (records are included in full or not at all)
- Liquidation of records not individually selected

---

## Block: telegram-notifications — Telegram opt-in notification channel

### Summary
Add opt-in Telegram bot notification channel for collaboratori. Dual-channel (email + Telegram) for 3 corsi events: assegnazione docente/CoCoD'à/Q&A, nuovo corso in città, reminder 24h pre-lezione. Collaboratori connect via BotFather deep link; admin can reset the connection.

### In scope
- Migration 066: `collaborators.telegram_chat_id BIGINT UNIQUE NULL`, `telegram_tokens` table, `notification_settings.telegram_enabled BOOLEAN DEFAULT false`, seed 3 event rows
- `lib/telegram.ts`: `sendTelegram(chatId, text)` fire-and-forget, 3 message templates
- `lib/notification-helpers.ts`: add `telegram_chat_id` to `PersonInfo`; extend all `.select()` calls
- `proxy.ts`: whitelist exact `path === '/api/telegram/webhook'` only
- 4 new API routes: webhook (unauthenticated), connect (POST), disconnect (DELETE), admin reset (PATCH)
- Extend `app/api/assegnazioni/route.ts`, `app/api/corsi/route.ts`, `app/api/jobs/lesson-reminders/route.ts` with Telegram send
- `components/profilo/TelegramConnect.tsx`: connect/disconnect UI
- `/profilo` page: add "Impostazioni" tab with TelegramConnect
- `/collaboratori/[id]` admin page: Telegram section with "Reset connessione"

### Out of scope
- Group/channel notifications (bot sends only DMs)
- Telegram for non-collaboratore roles
- Push notifications or webhooks for non-corsi events
- Telegram message history or logging

### New tables
`telegram_tokens` — migration 066

### Files
- NEW: `supabase/migrations/066_telegram_notifications.sql`
- MOD: `lib/notification-helpers.ts` — PersonInfo + select extensions
- NEW: `lib/telegram.ts` — sendTelegram + 3 templates
- MOD: `proxy.ts` — whitelist webhook path
- NEW: `app/api/telegram/webhook/route.ts`
- NEW: `app/api/telegram/connect/route.ts`
- NEW: `app/api/telegram/disconnect/route.ts`
- NEW: `app/api/admin/collaboratori/[id]/telegram/route.ts`
- MOD: `app/api/assegnazioni/route.ts` — add Telegram send
- MOD: `app/api/corsi/route.ts` — add Telegram send
- MOD: `app/api/jobs/lesson-reminders/route.ts` — add Telegram send
- NEW: `components/profilo/TelegramConnect.tsx`
- MOD: `app/(app)/profilo/page.tsx` — add Impostazioni tab
- MOD: `app/(app)/collaboratori/[id]/page.tsx` — fetch telegram_connected; pass to CollaboratoreDetail
- MOD: `components/responsabile/CollaboratoreDetail.tsx` — Telegram section for admin
- NEW: `__tests__/api/telegram.test.ts`

### New table
`liquidazione_requests` — migration 061

### Files
- NEW: `supabase/migrations/061_liquidazione_requests.sql`
- MOD: `lib/types.ts` — add `LiquidazioneRequestStato`, `LiquidazioneRequest`, extend `NotificationEntityType`
- MOD: `lib/email-templates.ts` — E15 + E16 templates
- MOD: `lib/notification-utils.ts` — add `buildLiquidazioneRequestNotification`
- NEW: `app/api/liquidazione-requests/route.ts` — POST (collab creates) + GET (admin lists)
- NEW: `app/api/liquidazione-requests/[id]/route.ts` — PATCH (revoca / accetta / annulla)
- NEW: `components/compensi/LiquidazioneRequestBanner.tsx` — banner + dialog (4 states)
- MOD: `app/(app)/compensi/page.tsx` — fetch APPROVATO records + active request; render banner
- NEW: `components/admin/CodaLiquidazioni.tsx` — admin table with Accetta/Rifiuta actions
- MOD: `app/(app)/coda/page.tsx` — add Liquidazioni tab
- NEW: `__tests__/api/liquidazione-requests.test.ts` — 11 tests
