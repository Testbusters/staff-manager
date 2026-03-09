# Staff Manager

Internal portal for managing collaborators, compensation/reimbursement approvals, documents, and support tickets. Role-based access control (email/password, invite-only) via Supabase Auth.

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript, `output: 'standalone'`)
- **Styling**: Tailwind CSS — no component libraries
- **Auth**: Supabase Auth (email/password, invite-only, forced password change on first login)
- **Database**: Supabase Postgres with Row Level Security
- **Email**: Resend (transactional, fire-and-forget, `noreply@testbusters.it`)
- **Testing**: Vitest + @vitest/coverage-v8

## Roles

| Role | Access |
|------|--------|
| `collaboratore` | Own profile, compensation requests, reimbursements, documents, support tickets |
| `responsabile_compensi` | Approve compensations/reimbursements for assigned communities; own profile and support tickets |
| `responsabile_cittadino` | *(in definition — access TBD)* |
| `responsabile_servizi_individuali` | *(in definition — access TBD)* |
| `amministrazione` | Full approval queue, payments, user management, exports, settings |

## Compensation Flow (State Machine)

Compensations created by `responsabile_compensi` or `amministrazione` — always start as `IN_ATTESA`.

```
IN_ATTESA → APPROVATO → LIQUIDATO
          ↘ RIFIUTATO (rejection_note obbligatoria)
RIFIUTATO → IN_ATTESA (reopen, collaboratore)
```

| Action | From | To | Role |
|--------|------|----|------|
| reopen | RIFIUTATO | IN_ATTESA | collaboratore |
| approve | IN_ATTESA | APPROVATO | responsabile_compensi, amministrazione |
| reject | IN_ATTESA | RIFIUTATO | responsabile_compensi, amministrazione |
| mark_liquidated | APPROVATO | LIQUIDATO | responsabile_compensi, amministrazione |

## Reimbursement Flow (State Machine)

Reimbursements created by `collaboratore` — submitted directly as `IN_ATTESA`.

```
IN_ATTESA → APPROVATO → LIQUIDATO
          ↘ RIFIUTATO
```

| Action | From | To | Role |
|--------|------|----|------|
| approve | IN_ATTESA | APPROVATO | responsabile_compensi, amministrazione |
| reject | IN_ATTESA | RIFIUTATO | responsabile_compensi, amministrazione |
| mark_liquidated | APPROVATO | LIQUIDATO | responsabile_compensi, amministrazione |

## Compensation Import — Google Sheets

Compensations can be bulk-imported from a configured Google Sheet. Roles authorized: `responsabile_compensi`, `amministrazione`.

### Sheet structure

| Column | Field | Notes |
|--------|-------|-------|
| A | `data_competenza` | Date — accepts `dd/MM/yyyy` or `yyyy-MM-dd` |
| B | `importo_lordo` | Amount — accepts EU (`1.234,56`) or US (`1,234.56`) format |
| C | `collaboratore` | Collaborator **username** (must match `collaborators.username`) |
| D | `nome_servizio_ruolo` | Service / role description |
| E | `info_specifiche` | Additional notes (ignored if value is `-`) |
| F | `stato` | Import status — `TO_PROCESS` → `PROCESSED` (writeback) |
| G | `competenza` | Compensation type — `corsi` \| `produzione_materiale` \| `sb` \| `extra` |

Only rows where column F = `TO_PROCESS` are read. The header row (row 1) is skipped.

### Import flow (two-step, stateless)

```
Sheet (TO_PROCESS rows)
        │
        ▼
POST /api/compensations/import/preview   ← step 1: read + validate only
        │  returns { rows[], errors[], total }
        ▼
User reviews preview table in UI
        │  confirms
        ▼
POST /api/compensations/import/confirm   ← step 2: re-fetch + re-validate + insert
        │
        ├─▶ INSERT compensations (stato: IN_ATTESA, community_id: null)
        ├─▶ INSERT compensation_history (note: "Importato da Google Sheet")
        └─▶ PATCH sheet col F → PROCESSED  (non-blocking: failure doesn't roll back DB)
```

**Step 2 re-validates independently** — it does not trust the client-side preview state. If the sheet changed between preview and confirm, only currently valid rows are imported.

### Validation rules

| Field | Rule |
|-------|------|
| `collaboratore` | Must match an existing `collaborators.username`; unknown username → row error |
| `data_competenza` | Must parse to a valid date in supported formats |
| `importo_lordo` | Must be a positive number; zero or unparseable → row error |
| `competenza` | Must be one of `corsi`, `produzione_materiale`, `sb`, `extra`, or empty |

Rows failing validation are returned as `errors[]` with a reason string. They are **not imported** and their sheet status is **not changed** — they remain `TO_PROCESS` for correction and re-import.

### Amount calculation (fixed withholding)

```
ritenuta_acconto = importo_lordo × 0.20   (20% fixed rate)
importo_netto    = importo_lordo × 0.80
```

### UI entry point

`/approvazioni/carica` → "Import da Google Sheet" card → `ImportSection.tsx` component.

---

## Project Structure

```
app/
  (app)/
    page.tsx                     → Dashboard collaboratore (greeting, 4 KPI cards, Ultimi aggiornamenti tabs, Da fare, CollabOpenTicketsSection, PaymentOverview, bar chart) + responsabile_compensi (4 KPI cards, DashboardPendingItems comp/rimborso modals, DashboardTicketSection full-row links) + amministrazione (KPI, community cards, urgenti, feed filtrable, period metrics, blocks drawer)
    layout.tsx                   → Protected layout (auth guard + Sidebar)
    profilo/page.tsx             → Profile editor + tab Documenti for collaboratore (avatar, fiscal data, editable IBAN/phone/address/tshirt | blue CTA "Nuovo rimborso" + DocumentUploadForm + DocumentList)
    impostazioni/page.tsx        → Settings: 5-tab server component — Users (create), Community (CRUD + responsabile assignment), Collaborators (member_status), Contratti (template upload), Notifiche (in-app + email toggles per event)
    compensi/page.tsx            → Collaboratore: unified Compensi e Rimborsi page (PaymentOverview + CompensationList + ExpenseList + TicketQuickModal)
    compensi/nuova/page.tsx      → (removed in Block 7)
    compensi/[id]/page.tsx       → Compensation detail + timeline + actions
    rimborsi/page.tsx            → Redirect → /compensi (unified page)
    rimborsi/nuova/page.tsx      → Reimbursement creation form (single step)
    rimborsi/[id]/page.tsx       → Reimbursement detail + timeline + actions (collaborator name for admin/responsabile; history enriched with changed_by_name role-gated)
    approvazioni/page.tsx        → Responsabile: "Compensi e rimborsi" — tab Compensi: 3 unified KPI cards (count+lordo) + two creation-mode cards + ApprovazioniCompensazioni (search/filter/checkbox/bulk approve, 20/p) | tab Rimborsi: 3 unified KPI cards (count+importo) + ApprovazioniRimborsi (search, stato+categoria filter chips, colored badges, importo totale in bulk bar, 20/p)
    approvazioni/carica/page.tsx → Responsabile/admin: choice screen (Singolo per docente | Excel placeholder) + CompensationCreateWizard
    collaboratori/page.tsx       → Responsabile + admin: paginated list (20/page) with URL-driven filters (all/doc-da-firmare/stallo)
    collaboratori/[id]/page.tsx  → Collaborator detail: anagrafica + compensi/rimborsi/documenti + inline pre-approva/integrazioni
    coda/page.tsx                → Admin: full lifecycle queue — all stati (IN_ATTESA/APPROVATO/RIFIUTATO/LIQUIDATO), stats strip, sub-filter pills, approve/reject/liquidate per row + bulk (?tab=compensi|rimborsi)
    export/page.tsx              → Admin: export approved records to Google Sheet + XLSX download + run history (?tab=anteprima|storico)
    documenti/page.tsx           → Admin: 3 tabs (list/upload/cu-batch). Collaboratore: redirect → /profilo?tab=documenti. Responsabile: redirect → /
    eventi/page.tsx              → Collaboratore: events list (read-only, ordered by start_datetime ASC, upcoming/past sections)
    eventi/[id]/page.tsx         → Event detail: tipo, datetime, location + Maps link, Google Calendar link, descrizione, luma embed
    comunicazioni/page.tsx       → Collaboratore: 2 tabs — Comunicazioni (non-expired, pinned first) + Risorse (categoria filter chips)
    comunicazioni/[id]/page.tsx  → Communication detail: contenuto, file_urls download links, expires_at
    risorse/[id]/page.tsx        → Resource detail: categoria badge, descrizione, tag chips, link + file download
    opportunita/page.tsx         → Collaboratore: 2 tabs — Opportunità (tipo badge, scadenza) + Sconti (expiry badge)
    opportunita/[id]/page.tsx    → Opportunity detail: tipo, descrizione, requisiti, scadenza, link_candidatura, file
    sconti/[id]/page.tsx         → Discount detail: fornitore, logo, descrizione, codice_sconto + CopyButton, validità, link
    documenti/[id]/page.tsx      → Document detail with signed URL + sign flow (checkbox gate) + delete section for admin+CONTRATTO
    ticket/page.tsx              → Ticket list (collaboratore: own; manager: two-list layout — ricevuti + recenti, each with TicketRecordRow + priority dot)
    ticket/nuova/page.tsx        → Create new ticket form (responsabile_compensi blocked — redirect to /)
    ticket/[id]/page.tsx         → Ticket detail: message thread + reply form + status change buttons
    contenuti/page.tsx           → Content hub: 5 URL-based tabs (comunicazioni/sconti/risorse/eventi/opportunita), admin-only, per-tab fetch
    notifiche/page.tsx           → Full notifications page (Suspense wrapper → NotificationPageClient)
    feedback/page.tsx            → Admin-only: two-section layout (Nuovi/Completati) with FeedbackActions (Completa + Rimuovi CTAs), signed screenshot URL (1h TTL)
  api/
    profile/route.ts             → PATCH own profile fields (nome, cognome, codice_fiscale, data_nascita, luogo_nascita, provincia_nascita, comune, provincia_residenza, telefono, indirizzo, civico_residenza, IBAN, tshirt, partita_iva, sono_un_figlio_a_carico)
    profile/avatar/route.ts      → POST upload profile photo → avatars bucket
    auth/change-password/        → POST forced password change
    auth/clear-force-change/     → POST clear must_change_password flag
    admin/create-user/           → POST invite new user (email + role + tipo_contratto required) + create collaborators record, onboarding_completed=false
    admin/communities/           → GET list communities (?all=1 returns inactive too) + POST create
    admin/communities/[id]/      → PATCH rename + toggle is_active
    admin/responsabili/[userId]/communities/ → PUT replace community assignments for a responsabile
    admin/responsabili/[userId]/publish-permission/ → PATCH toggle can_publish_announcements for a responsabile
    admin/members/[id]/status/   → PATCH update member_status for a collaboratore
    admin/members/[id]/data-ingresso/ → PATCH update data_ingresso (admin only)
    admin/contract-templates/    → GET list templates + POST upload/replace .docx per type (OCCASIONALE only)
    admin/collaboratori/route.ts → GET search collaborators (q, community_id, active_only) scoped for responsabile
    admin/blocks/clear-flag/     → POST clear must_change_password flag for a user (admin only)
    admin/notification-settings/ → GET list all 19 settings + PATCH toggle inapp_enabled/email_enabled (admin only)
    feedback/route.ts            → POST create feedback entry (authenticated; FormData: categoria/pagina/messaggio/screenshot)
    feedback/[id]/route.ts       → PATCH mark completato + DELETE hard delete + storage cleanup (admin only)
    compensations/route.ts       → GET (list, role-filtered) + POST (create, responsabile/admin only, always IN_ATTESA)
    compensations/approve-bulk/route.ts → POST bulk approve by ID array (community-scoped for responsabile, history entries)
    compensations/bulk-approve/route.ts → POST bulk approve (admin-only, no community scope)
    compensations/bulk-liquidate/route.ts → POST bulk liquidate APPROVATO→LIQUIDATO (admin-only)
    compensations/[id]/route.ts  → GET (detail + history)
    compensations/[id]/transition/route.ts → POST (state machine: reopen/approve/reject/mark_liquidated)
    compensations/communities/route.ts → GET (collaboratore's communities)
    expenses/route.ts            → GET (list) + POST (create, always IN_ATTESA)
    expenses/approve-bulk/route.ts → POST bulk approve by ID array (community-scoped for responsabile, history entries)
    expenses/bulk-approve/route.ts → POST bulk approve (admin-only, no community scope)
    expenses/bulk-liquidate/route.ts → POST bulk liquidate APPROVATO→LIQUIDATO (admin-only)
    expenses/[id]/route.ts       → GET (detail + history + attachments)
    expenses/[id]/transition/route.ts → POST (reimbursement state machine)
    expenses/[id]/attachments/route.ts → POST (register uploaded file)
    export/gsheet/route.ts       → POST full export flow: fetch APPROVATO→aggregate→GSheet push→stamp exported_at→XLS upload→record run (admin only)
    export/history/route.ts      → GET last 50 export runs + signed XLSX download URLs (admin only)
    documents/route.ts           → GET (list, RLS-filtered) + POST (create; collab/resp forces NON_RICHIESTO; enforces 1 CONTRATTO per collaboratore)
    documents/[id]/route.ts      → GET (detail + signed URL) + DELETE (admin only, CONTRATTO only, hard-deletes storage + DB)
    documents/[id]/sign/route.ts → POST (collab/resp uploads signed PDF; requires confirmed=true in FormData)
    documents/cu-batch/route.ts  → POST (ZIP+CSV batch import, dedup by collaborator+anno, notifications)
    notifications/route.ts       → GET (paginated list + real unread count; ?page/limit/unread_only/entity_type) + PATCH (mark all read)
    notifications/[id]/route.ts  → PATCH (mark single read) + DELETE (dismiss)
    tickets/route.ts             → GET (list, role-filtered + enriched with creator name) + POST (create)
    tickets/[id]/route.ts        → GET (detail + messages + signed attachment URLs + author role labels)
    tickets/[id]/messages/route.ts → POST (reply FormData + optional file, service role, notification on reply)
    tickets/[id]/status/route.ts → PATCH (change status APERTO/IN_LAVORAZIONE/CHIUSO, admin/responsabile)
    communications/route.ts      → GET (pinned first, non-expired) + POST (admin-only, fields: titolo/contenuto/pinned/expires_at/file_urls)
    communications/[id]/route.ts → PATCH + DELETE (admin-only)
    discounts/route.ts           → GET + POST (admin-only, fields: titolo/fornitore/codice_sconto/valid_from/valid_to/logo_url/file_url)
    discounts/[id]/route.ts      → PATCH + DELETE (admin-only)
    opportunities/route.ts       → GET + POST (admin-only, fields: titolo/tipo/descrizione/requisiti/scadenza_candidatura/link_candidatura)
    opportunities/[id]/route.ts  → PATCH + DELETE (admin-only)
    resources/route.ts           → GET + POST with tag[] + categoria (admin)
    resources/[id]/route.ts      → PATCH + DELETE
    events/route.ts              → GET (ordered by start_datetime asc) + POST with tipo + file_url (admin)
    events/[id]/route.ts         → PATCH + DELETE
    onboarding/complete/route.ts → POST save anagrafica + generate contract (docxtemplater) + onboarding_completed=true
  auth/callback/route.ts
  login/page.tsx
  change-password/page.tsx
  onboarding/page.tsx          → Standalone onboarding wizard (proxy redirects here when onboarding_completed=false)
  pending/page.tsx
  layout.tsx
  globals.css

components/
  onboarding/
    OnboardingWizard.tsx         → 2-step client wizard: anagrafica (all fields required) + contract generation + download
  impostazioni/
    CreateUserForm.tsx            → Create user form with dual-mode toggle: "Invito rapido" (email + nome + cognome + tipo_contratto required) and "Invito completo" (full optional anagrafica pre-fill)
    CommunityManager.tsx          → Community CRUD (create/rename/toggle active) + responsabile→community assignment
    MemberStatusManager.tsx       → Collaborator list with member_status dropdown + data_ingresso inline edit
    ContractTemplateManager.tsx   → Admin: upload/replace .docx template for OCCASIONALE + placeholders reference
    NotificationSettingsManager.tsx → Admin: toggle grid for in-app + email per event×role (15 rows, optimistic updates)
  Sidebar.tsx                    → Role-based navigation sidebar (hosts NotificationBell); renders comingSoon items as non-clickable span with "Presto" badge
  NotificationBell.tsx           → Bell icon + unread badge + dropdown (30s polling, mark-read single on click, mark-all button, dismiss ×, TYPE_BADGE colored chips per entity type, relative time, message truncation, link to /notifiche)
  FeedbackButton.tsx             → Fixed bottom-right floating button (all app pages): opens modal form (categoria/pagina/messaggio/screenshot upload), POST to /api/feedback, success toast
  FeedbackActions.tsx            → Client component: Completa + Rimuovi CTAs per feedback record (admin feedback page)
  notifications/
    NotificationPageClient.tsx   → Full notifications page: type filter chips (8 entity types), "solo non lette" toggle in header, pagination (20/page), mark-read + dismiss per row, TYPE_BADGE colored chips
  ProfileForm.tsx                → Profile edit form (avatar, fiscal data, guide collassabili)
  compensation/
    PaymentOverview.tsx          → Server component: CompensazioniCard (netto per year + ritenuta 20% + APPROVATO section + IN_ATTESA dimmed) + RimborsiCard (total per year + approved + in_attesa) + massimale progress bar
    DashboardBarChart.tsx        → Client: Recharts BarChart (last 6 months liquidato, blue=compensi teal=rimborsi)
    DashboardUpdates.tsx         → Client: tabbed "Ultimi aggiornamenti" (4 functional tabs: Documenti/Eventi/Comunicazioni e risorse/Opportunità e sconti; prev/next pagination, 4 items/page; colored badges per content type)
    CompenseTabs.tsx             → Client: tab switcher compensi/rimborsi with count badges
    PendingApprovedList.tsx      → "Da ricevere" amber card: table of APPROVATO compensations with lordo/netto + total footer
    StatusBadge.tsx              → Pill badge for CompensationStatus | ExpenseStatus
    CompensationCreateWizard.tsx → 3-step creation wizard for responsabile/admin (choice→search collab→data→summary+create)
    ApprovazioniCompensazioni.tsx → Responsabile: search + state filters + checkboxes + bulk approve bar + Import section (disabled) + pagination 25/page
    CompensationList.tsx         → Card list with status filter chips + chevron; meta row: community dot + Competenza + Inviato; tooltip only on netto
    CompensationDetail.tsx       → Read-only detail card
    Timeline.tsx                 → Chronological event list (accepts HistoryEvent[])
    ActionPanel.tsx              → Role-aware action buttons + modals (approve/reject/liquidate hidden for responsabile_compensi)
  expense/
    ApprovazioniRimborsi.tsx     → Responsabile: same structure as ApprovazioniCompensazioni without Import section
    ExpenseList.tsx              → Card list with status filter chips + chevron; date labels: Spesa/Inviato
    PendingApprovedExpenseList.tsx → "Da liquidare" amber card: table of APPROVATO expenses with importo + total footer
    ExpenseDetail.tsx            → Read-only reimbursement detail card
    ExpenseActionPanel.tsx       → Role-aware action buttons + modals for reimbursements (approve/reject/liquidate hidden for responsabile_compensi)
    ExpenseForm.tsx              → Single-step creation form (categoria, data, importo, descrizione + file upload)
  export/
    ExportSection.tsx            → Client: Anteprima/Storico tab bar + "Esporta su GSheet" action + loading state
    ExportPreviewTable.tsx       → Per-collaborator aggregated preview table (nome, count comps/rimborsi, totale lordo)
    ExportHistoryTab.tsx         → Run history list (date, count, totale) + signed XLSX download links
  admin/
    CodaCompensazioni.tsx        → Admin coda tab: stats strip (3 cards), sub-filter pills ×5, shadcn Table with left accent stripe, date sort, footer totals, approve/reject/liquidate per row + bulk select
    CodaRimborsi.tsx             → Admin coda tab: same pattern for expense_reimbursements
    MassimaleCheckModal.tsx      → Blocking warning modal: collapsible per-collaborator impact cards + total eccedenza strip
  documents/
    DocumentList.tsx             → Documents grouped by macro-type (CONTRATTO/CU) with type badges (violet/blue) + delete button for admin on CONTRATTO
    DocumentUploadForm.tsx       → Bifurcated admin/non-admin: admin gets collaboratore selector + firma toggle (CONTRATTO only); non-admin gets 2-option flat dropdown (CONTRATTO_OCCASIONALE/CU, NON_RICHIESTO enforced server-side)
    DocumentSignFlow.tsx         → Collaboratore: download original + checkbox confirmation gate + upload signed PDF
    DocumentDeleteButton.tsx     → Client component: delete CONTRATTO (admin only) via DELETE API + redirect
    CUBatchUpload.tsx            → Admin: ZIP + CSV + year batch import with success/duplicate/error detail
  ui/
    InfoTooltip.tsx              → Client component: hover + keyboard-accessible ℹ tooltip (useState, tabIndex=0, onFocus/onBlur)
    CopyButton.tsx               → Client component: copy text to clipboard with 2s "Copiato" feedback
    RichTextEditor.tsx           → Client component: Tiptap 3 rich text editor (B/I/H2/H3/bullet/ordered toolbar, dark mode)
    RichTextDisplay.tsx          → Server-compatible: renders stored HTML via dangerouslySetInnerHTML with backward-compat toSafeHtml
  ticket/
    TicketStatusBadge.tsx        → Pill badge for ticket status (APERTO=green, IN_LAVORAZIONE=yellow, CHIUSO=gray)
    TicketStatusInline.tsx       → Client component: status badge + transition buttons (APERTO/IN_LAV → only CHIUSO; no → In lavorazione CTA)
    TicketRecordRow.tsx          → Row component for manager ticket lists: full-row Link to /ticket/[id], oggetto, stato badge, priority dot, creator name, last_message_at
    CollabOpenTicketsSection.tsx → Collab dashboard: open ticket rows as buttons → TicketDetailModal
    TicketDetailModal.tsx        → Chat-style modal (thread + reply form, fetches /api/tickets/[id])
    TicketList.tsx               → Ticket table with status/priority filters + Collaboratore column for admin
    TicketForm.tsx               → Create form (priority select BASSA/NORMALE/ALTA, category dropdown, oggetto, optional initial message)
    TicketQuickModal.tsx         → Self-contained modal with trigger button: opens inline ticket form (categoria/oggetto/messaggio), POST /api/tickets, redirect to /ticket/[id]
    TicketThread.tsx             → Chat-style message thread (own=right blue bubble, other=left gray bubble); localStorage "Nuovo" badge on unread messages; signed attachment URLs; closed banner
    TicketMessageForm.tsx        → Reply-only form (textarea + file upload); no status change buttons (transitions via TicketStatusInline)
  admin/
    types.ts                     → Shared TypeScript types for admin dashboard (AdminDashboardData, AdminKPIs, AdminBlockItem, etc.)
    BlocksDrawer.tsx             → Slide-in drawer: block situations grouped by type (password, onboarding, stalled comps/exps) with direct actions
    AdminDashboard.tsx           → Main admin dashboard client component (KPI cards, community cards, urgenti, feed filters, Recharts period charts, blocks drawer trigger)
  responsabile/
    CollaboratoreDetail.tsx      → Client: anagrafica header + compensi/rimborsi/documenti sections with inline action buttons + integration modal
    DashboardTicketSection.tsx   → Responsabile: two-section ticket widget (ricevuti + recenti); TicketRow as full-row Link to /ticket/[id]
  responsabile/
    DashboardPendingItems.tsx    → Responsabile dashboard: comp/rimborso IN_ATTESA rows as buttons → CompModal/ExpModal read-only detail
  contenuti/
    CommunicationList.tsx        → Communication CRUD: pin toggle, expires_at date, file_urls (newline-separated)
    DiscountList.tsx             → Discount CRUD: fornitore, codice_sconto, valid_from/to dates, logo_url, file_url; expiry badge
    OpportunityList.tsx          → Opportunity CRUD: tipo select (LAVORO/FORMAZIONE/STAGE/PROGETTO/ALTRO), requisiti, scadenza_candidatura, link_candidatura
    ResourceList.tsx             → Resource CRUD: categoria select + tag chips, link + file_url
    EventList.tsx                → Event CRUD: tipo select, datetime, location, Luma link + iframe embed, file_url

lib/
  supabase/client.ts             → Browser Supabase client
  supabase/server.ts             → Server Supabase client (SSR)
  types.ts                       → Role, status enums, DB row interfaces (Compensation, Expense, HistoryEvent)
  nav.ts                         → NAV_BY_ROLE config; NavItem supports comingSoon flag (collaboratore: 8 voci semantiche)
  compensation-transitions.ts    → Pure state machine: canTransition, applyTransition (4 actions: reopen/approve/reject/mark_liquidated)
  expense-transitions.ts         → Pure state machine: canExpenseTransition, applyExpenseTransition (7 actions incl. reject_manager)
  export-utils.ts                → Pure functions: groupToCollaboratorRows, toGSheetRow (15-col), buildHistoryXLSXWorkbook, formatDate/Euro helpers
  documents-storage.ts           → buildStoragePath, getSignedUrl, getDocumentUrls (1h TTL, service role)
  notification-utils.ts          → Pure notification payload builders (comp/expense/ticket — collaboratore + responsabile side); buildCompensationReopenNotification; buildContentNotification (4 content types)
  notification-helpers.ts        → DB helpers: getNotificationSettings (SettingsMap), getCollaboratorInfo, getResponsabiliForCommunity/Collaborator/User, getAllActiveCollaboratori (broadcast), getCollaboratoriForCommunities (targeted community dispatch)
  email.ts                       → Resend transactional email wrapper (fire-and-forget, from noreply@testbusters.it)
  email-templates.ts             → 12 branded HTML templates E1–E12 (Testbusters logo + legal footer; APP_URL env controls all CTA links; E9=ticket reply, E10=nuova comunicazione, E11=nuovo evento, E12=nuovo contenuto)
  google-sheets.ts               → Google Sheets API wrapper: fetchPendingRows (TO_PROCESS rows), markRowsProcessed (writeback), writeExportRows (append to GOOGLE_SHEET_EXPORT_ID)

supabase/migrations/
  001_schema.sql                 → Full schema (compensations, expense_reimbursements, communities, documents, etc.)
  002_rls.sql                    → Row Level Security policies
  003_must_change_password.sql   → must_change_password column
  004_documents_storage.sql      → Private `documents` bucket + storage policies
  005_add_titolo_to_documents.sql → ALTER TABLE documents ADD COLUMN titolo text
  006_tickets_storage.sql        → Private `tickets` bucket + storage policies (10MB, PDF/image/doc)
  007_communities_settings.sql   → ADD COLUMN communities.is_active boolean DEFAULT true + admin write policy
  008_avatars_bucket.sql         → Public `avatars` bucket + storage policies (2MB, jpg/png/webp)
  009_contract_templates.sql     → luogo_nascita/comune on collaborators, CONTRATTO_COCOCO/PIVA doc types, contract_templates table, contracts bucket
  010_onboarding.sql             → onboarding_completed on user_profiles, tipo_contratto on collaborators, nome/cognome nullable
  011_contract_fields.sql        → ADD COLUMN provincia_nascita, provincia_residenza, civico_residenza on collaborators
  012_notification_settings.sql  → notification_settings table + 15 default rows (per-event × recipient_role, inapp + email toggles)
  013_responsabile_publish_permission.sql → ADD COLUMN can_publish_announcements boolean DEFAULT true on user_profiles
  014_document_macro_type.sql    → macro_type stored generated column + unique partial index (one CONTRATTO per collaborator)
  015_remove_super_admin.sql     → Remove super_admin role: update CHECK constraint, migrate existing users to amministrazione, recreate all RLS policies
  016_feedback.sql               → feedback table + RLS (insert for authenticated, select/delete for amministrazione) + private `feedback` bucket (5 MB, images)
  017_roles_rename.sql           → Rename `responsabile` → `responsabile_compensi`; add `responsabile_cittadino` + `responsabile_servizi_individuali`; update CHECK constraint, can_manage_community(), all RLS policies; rename test accounts
  018_sono_figlio_a_carico.sql   → Rename ha_figli_a_carico → sono_un_figlio_a_carico
  019_importo_lordo_massimale.sql → ADD COLUMN importo_lordo_massimale on collaborators
  020_consolidate_occasionale.sql → Remove COCOCO/PIVA tipo_contratto options; consolidate as OCCASIONALE
  021_username.sql               → ADD COLUMN username TEXT UNIQUE on collaborators
  022_expense_descrizione_nullable.sql → ALTER TABLE expense_reimbursements ALTER COLUMN descrizione DROP NOT NULL
  023_workflow_refactor.sql      → (skipped — superseded by 024)
  024_remove_bozza_add_corso.sql → Remove BOZZA state (migrate→IN_ATTESA, update CHECK, DEFAULT IN_ATTESA); ADD COLUMN corso_appartenenza TEXT on compensations
  025_remove_ricevuta_pagamento.sql → Remove RICEVUTA_PAGAMENTO type; CHECK restricted to (CONTRATTO_OCCASIONALE, CU); recreate macro_type + unique index
  026_content_types_redesign.sql  → Rename announcements→communications, benefits→discounts; add columns; CREATE TABLE opportunities + RLS
  027_notifications_redesign.sql  → Remove stale integrazioni event_keys; add documento_firmato:amministrazione; enable ticket reply email; add 4 content event_keys (comunicazione/evento/opportunita/sconto pubblicata)
  028_ticket_categories.sql      → DELETE non-conforming tickets; UPDATE 'Compensi'→'Compenso'; ADD CHECK constraint (categoria IN ('Compenso','Rimborso'))
  029_content_community_targeting.sql → Replace community_id UUID with community_ids UUID[] on all 5 content tables (communications/events/opportunities/discounts/resources); backfill existing rows; empty array = all communities
  030_compensation_schema_alignment.sql → Rename descrizione→nome_servizio_ruolo, note_interne→info_specifiche; DROP corso_apartenenza; community_id nullable; CREATE compensation_competenze + RLS + seed; ADD competenza FK; rewrite responsabile RLS (collaborator_id-based)
  031_feedback_stato.sql          → ADD COLUMN stato TEXT NOT NULL DEFAULT 'nuovo' CHECK (stato IN ('nuovo','completato')) on feedback; ADD POLICY feedback_admin_update
  032_fix_comp_history_rls.sql    → Fix comp_history_manager_read: can_manage_community(community_id) returns false for NULL community_id (GSheet imports); rewritten to use collaborator_id membership check
  033_drop_periodo_riferimento.sql → DROP COLUMN periodo_riferimento from compensations (no longer part of entity)
  034_ticket_rls_and_updates.sql  → ADD 4 denorm columns (updated_at, last_message_at, last_message_author_name/_role); DROP+recreate tickets_manager_read (creator→collaborators→collaborator_communities→user_community_access join, fixes NULL community); ADD tickets_admin_read policy
  035_add_theme_preference.sql    → ADD COLUMN theme_preference TEXT DEFAULT 'dark' on user_profiles
  036_intestatario_pagamento.sql  → ADD COLUMN intestatario_pagamento on compensations
  037_discount_brand.sql          → ADD COLUMN brand TEXT on discounts
  038_export_runs.sql             → ADD COLUMN exported_at on compensations + expenses; CREATE TABLE export_runs (id, run_at, record_count, total_lordo, gsheet_url, xlsx_storage_path); CREATE exports storage bucket; RLS
  039_digital_signature.sql       → RICEVUTA_PAGAMENTO tipo; receipt_document_id FK; data_fine_contratto on collaborators
  040_skip_contract_flag.sql      → ADD COLUMN skip_contract_on_onboarding boolean on user_profiles
  041_email_templates.sql         → CREATE TABLE email_templates (12 rows seeded) + email_layout_config; RLS admin-only

__tests__/                         → 288 tests total (vitest)
  compensation-transitions.test.ts → State machine unit tests for compensations (22 cases)
  expense-transitions.test.ts      → State machine unit tests for reimbursements
  export-utils.test.ts             → Unit tests for groupToCollaboratorRows, toGSheetRow, buildHistoryXLSXWorkbook (18 cases)
  cu-batch-parser.test.ts          → Unit tests for CU batch CSV parser + dedup logic (11 cases)
  notification-utils.test.ts       → Unit tests for notification payload builders
  ticket-notification.test.ts      → Unit tests for buildTicketReplyNotification (6 cases)
  api/
    create-user-schema.test.ts     → Unit tests for create-user Zod schema validation (9 cases)
    collaboratore-profile.test.ts  → Unit tests for collaboratore profile PATCH schema (12 cases)
    expense-form.test.ts           → Unit tests for expense form Zod schema (12 cases)
    transition-schema.test.ts      → Unit tests for compensation/expense/mark-paid/approve-all Zod schemas (22 cases)
    username.test.ts               → Unit tests for username generation and validation (23 cases)
    documents.test.ts              → Unit tests for documents validTipi and type mapping incl. RICEVUTA_PAGAMENTO (12 cases)
    notifications-block13.test.ts  → Unit tests for NotificationEntityType, buildContentNotification (4 types), buildCompensationReopenNotification, E9–E12 templates, entity_type whitelist (35 cases)
    compensation-import.test.ts    → Unit tests for import parse utilities (parseDate, parseImporto, ritenuta calc) (15 cases)
    tickets-block15a.test.ts       → Unit tests for VALID_STATI, message validation, closed ticket guard, buildTicketReplyNotification, buildTicketCollabReplyNotification, buildTicketStatusNotification, buildTicketCreatedNotification (35 cases)

e2e/
  rimborsi.spec.ts                 → Playwright UAT: reimbursement full flow (S1–S10, 11 tests)
  export.spec.ts                   → Playwright UAT: export page S1–S8 (CSV/XLSX/mark-paid, 8 tests)
  documents.spec.ts                → Playwright UAT: documents + CU batch S1–S10 (upload, sign flow, 10 tests)
  notifications.spec.ts            → Playwright UAT: in-app notifications S1–S9 (bell, badge, mark-read, 9 tests)
  ticket.spec.ts                   → Playwright UAT: ticket full flow S1–S9 (create, thread, notify, states, 9 tests)
  contenuti.spec.ts                → Playwright UAT: content hub S1–S12 (tabs, CRUD, iframe embed, RBAC, 12 tests)
  impostazioni.spec.ts             → Playwright UAT: settings S1–S11 (community CRUD, member_status, responsabile assignment, 11 tests)
  profilo.spec.ts                  → Playwright UAT: extended profile S1–S11 (avatar, fiscal data, payment overview, 11 tests)
  dashboard.spec.ts                → Playwright UAT: collaboratore dashboard S1–S10 (cards, quick actions, feed, 10 tests)
  contratti.spec.ts                → Playwright UAT: contract templates + onboarding S1–S10 (upload, new province/civico DB fields, OCCASIONALE onboarding wizard, 10 tests)
  onboarding.spec.ts               → Playwright UAT: onboarding flow S1–S10 (wizard, anagrafica, contract download, proxy redirect, 10 tests)
  collaboratori.spec.ts            → Playwright UAT: collaboratori section S1–S10 (list/filters, detail, inline actions, RBAC, 10 tests)
  dashboard-responsabile.spec.ts   → Playwright UAT: responsabile dashboard S1–S10 (CommCards, pending counters, alert, feed, RBAC, 10 tests)
  dashboard-admin.spec.ts          → Playwright UAT: admin dashboard S1–S10 (KPI cards, community cards, period charts, feed filter, blocks drawer, 10 tests)
  responsabile-actions.spec.ts     → Playwright UAT: responsabile reject_manager + can_publish_announcements S1–S10 (reject comp/rimborso, publish toggle, RBAC, 10 tests)
  notification-settings.spec.ts   → Playwright UAT: notification settings UI S1–S10 (tab notifiche, toggle in-app/email, DB verify, 10 tests)
  documents-features.spec.ts      → Playwright UAT: document features S1/S7/S8/S10/S12/S13/S14 (type badges, collab upload, CONTRATTO uniqueness, DA_FIRMARE, checkbox sign gate, admin delete, 7 tests)
  invite-form.spec.ts              → Playwright UAT: dual-mode invite form S1/S4/S6/S7 (toggle default, disabled gate, quick invite DB verify, full invite CF+community, 4 tests)
  notifications-enhanced.spec.ts  → Playwright UAT: notification bell advanced features S1–S6 (badge persistence, mark-read single, mark-all, dismiss, ticket link, /notifiche filter, 6 tests)
  remove-super-admin.spec.ts       → Playwright UAT: super_admin role removal S1–S4 (admin access, form options, login blocked, DB constraint, 4 tests)
  feedback.spec.ts                 → Playwright UAT: feedback tool S1–S5 (submit no screenshot, submit with screenshot, RBAC, admin list, login autofill, 5 tests)
  block14.spec.ts                  → Playwright UAT: rich text editor S1–S3 (H2 heading stored+rendered, editor loads HTML, RichTextDisplay collaboratore, 3 tests)
  tickets-block15a.spec.ts         → Playwright UAT: ticket overhaul S1–S8 (two-list view, ALTA priority DB verify, priority dot, only→Chiuso CTA, auto IN_LAVORAZIONE, collab reply, responsabile redirect, 8 tests)
  block15c.spec.ts                 → Playwright UAT: UI integrations S1–S9 (TicketDetailModal, CompModal/ExpModal, badge colors, priority field, row navigation — suspended)
  fixtures/                        → Real Testbusters .docx template (OCCASIONALE) used as stable e2e fixture

proxy.ts                         → Auth middleware (active check + password change redirect)
vitest.config.ts                 → Vitest configuration
package.json
next.config.ts
```

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # Run unit tests (252 cases) + Playwright e2e
npm run build      # Production build (TypeScript check included)
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=       # Supabase service role key (server-side only)
SUPABASE_ACCESS_TOKEN=           # Supabase Personal Access Token (Management API, migrations)
RESEND_API_KEY=                  # Transactional email (Resend)
APP_URL=                         # e.g. https://staff-manager.testbusters.it (used in email CTAs)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=    # Google OAuth client ID (Calendar/Maps embeds)
GOOGLE_SERVICE_ACCOUNT_JSON=     # Google service account JSON (Sheets API, GSheet import)
GOOGLE_SHEET_ID=                 # Spreadsheet ID for compensation import
GOOGLE_SHEET_TAB_NAME=           # Tab/sheet name for compensation import
```

## Storage Setup (Supabase)

Before using file uploads, run the migrations in `supabase/migrations/` via the Supabase SQL Editor in order:

- `001_schema.sql` → full schema
- `002_rls.sql` → RLS policies
- `003_must_change_password.sql` → auth column
- `004_documents_storage.sql` → creates `documents` private bucket + storage policies
- `005_add_titolo_to_documents.sql` → adds `titolo` column to documents table
- `006_tickets_storage.sql` → creates `tickets` private bucket + storage policies
- `007_communities_settings.sql` → adds `is_active` column to communities + admin write policy
- `008_avatars_bucket.sql` → creates public `avatars` bucket + storage policies
- `009_contract_templates.sql` → creates `contracts` bucket + contract_templates table
- `010_onboarding.sql` → onboarding_completed flag + tipo_contratto on collaborators

The `compensations` and `expenses` buckets must also be created (private, 10MB limit, PDF/image types).

## Deploy

Standalone Next.js output. Build and start with:
```bash
npm run build
HOSTNAME=0.0.0.0 node .next/standalone/server.js
```
