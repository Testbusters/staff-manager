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
| `collaboratore@test.com` | Playwright | collaboratore | as-is |
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
