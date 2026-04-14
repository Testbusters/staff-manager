# Sitemap — Staff Manager

Last updated: 2026-03-28

Columns: **Route** | **Page file** | **Roles** | **Layout** | **Componenti chiave** | **loading.tsx** | **Access notes** | **Audit**

Legend:
- `collab` = `collaboratore`
- `resp` = `responsabile_compensi`
- `admin` = `amministrazione`
- `all` = all authenticated roles
- `*` = member_status restriction applies (see note)

Audit column symbols:
- `UI` = included in `/ui-audit` static scan (all routes)
- `R` = included in `/responsive-audit` (collab + resp roles only — admin-only routes excluded)
- `UX` = included in `/ux-audit` flow analysis
- Pre-auth routes: `UI` only
- Admin-only routes: `UI` `UX` (no `R`)
- Collab / resp / multi-role routes: `UI` `R` `UX`

Layout values: `auth-form` | `full-list` | `detail` | `detail+timeline` | `tabs` | `feed` | `form` | `wizard` | `chat` | `dashboard` | `import-panel`

**Consult this file first** — before running Grep/Explore across all pages for cross-cutting tasks (responsive audit, token normalization, empty-state review, loading.tsx audit). The Layout + Componenti columns give the full picture without a codebase scan.

---

## Test accounts (audit use)

| Role | Email | Password | Notes |
|---|---|---|---|
| collaboratore | collaboratore_tb_test@test.com | Testbusters123 | staging smoke tests (TB community). Production: collaboratore_test@test.com |
| responsabile_compensi | responsabile_compensi_test@test.com | Testbusters123 | smoke tests |
| amministrazione | admin_test@test.com | Testbusters123 | smoke tests |
| responsabile_cittadino | responsabile_cittadino_test@test.com | Testbusters123 | smoke tests |

> These accounts are for `/responsive-audit` and `/ux-audit` skill use. `/ui-audit` static mode needs no login.
> For Playwright-based skills: login sequence → email field → password field → submit → wait for `/` redirect.

---

## Pre-auth / Special flows

| Route | Page file | Roles | Layout | Componenti chiave | loading.tsx | Access notes | Audit |
|---|---|---|---|---|---|---|---|
| `/login` | `app/login/page.tsx` | unauthenticated | `auth-form` | Card, Form, Input, Button | n/a | Redirects to `/` if already authenticated | `UI` |
| `/pending` | `app/pending/page.tsx` | authenticated | `auth-form` | Card | n/a | Shown when `is_active = false` | `UI` |
| `/change-password` | `app/change-password/page.tsx` | authenticated | `auth-form` | Card, Form, Input | n/a | Shown when `must_change_password = true` (proxy-enforced) | `UI` |
| `/onboarding` | `app/onboarding/page.tsx` | authenticated | `wizard` | multi-step Form, Input, Select, Dialog | n/a | Shown when `onboarding_completed = false` (proxy-enforced) | `UI` |
| `/auth/callback` | `app/auth/callback/route.ts` | unauthenticated | — | — | n/a | OAuth callback handler | `UI` |

---

## Dashboard

| Route | Page file | Roles | Layout | Componenti chiave | loading.tsx | Access notes | Audit |
|---|---|---|---|---|---|---|---|
| `/` | `app/(app)/page.tsx` | all | `dashboard` | Card, Table, Badge, EmptyState | ✅ | Role-specific content: Admin / Responsabile / Collaboratore dashboard | `UI` `R` `UX` |

---

## Common routes (all roles)

| Route | Page file | Roles | Layout | Componenti chiave | loading.tsx | Access notes | Audit |
|---|---|---|---|---|---|---|---|
| `/profilo` | `app/(app)/profilo/page.tsx` | all | `tabs` | Tabs, Form, Input, Avatar, Table, Badge, TelegramConnect | ✅ | Own profile view + documents tab + Impostazioni tab (collab only: Telegram connection). Admin/Responsabile see own profile only. Community field read-only for collab. | `UI` `R` `UX` |
| `/notifiche` | `app/(app)/notifiche/page.tsx` | all | `full-list` | list rows, Badge, EmptyState | ✅ | Notification center | `UI` `R` `UX` |

---

## Collaboratore routes

| Route | Page file | Roles | Layout | Componenti chiave | loading.tsx | Access notes | Audit |
|---|---|---|---|---|---|---|---|
| `/compensi` | `app/(app)/compensi/page.tsx` | collab | `full-list` | Table, Badge, EmptyState | ✅ | Blocked if `member_status = uscente_senza_compenso` → redirect `/profilo?tab=documenti` | `UI` `R` `UX` |
| `/compensi/[id]` | `app/(app)/compensi/[id]/page.tsx` | collab | `detail+timeline` | Card, Badge, timeline rows | ✅ | Detail view of own compensation | `UI` `R` `UX` |
| `/rimborsi` | `app/(app)/rimborsi/page.tsx` | collab | `full-list` | Table, Badge, EmptyState | ✅ | Own reimbursement list | `UI` `R` `UX` |
| `/rimborsi/nuova` | `app/(app)/rimborsi/nuova/page.tsx` | collab | `form` | Form, Input, Select, Textarea | ✅ | Create new reimbursement | `UI` `R` `UX` |
| `/rimborsi/[id]` | `app/(app)/rimborsi/[id]/page.tsx` | collab | `detail+timeline` | Card, Badge, timeline rows | ✅ | Detail view of own reimbursement | `UI` `R` `UX` |
| `/comunicazioni` | `app/(app)/comunicazioni/page.tsx` | collab | `feed` | Card, Badge, EmptyState | ✅ | Read-only announcements feed | `UI` `R` `UX` |
| `/comunicazioni/[id]` | `app/(app)/comunicazioni/[id]/page.tsx` | collab | `detail` | Card, Tiptap (read-only) | ✅ | Announcement detail | `UI` `R` `UX` |
| `/eventi` | `app/(app)/eventi/page.tsx` | collab | `feed` | Card, Badge, EmptyState | ✅ | Read-only events feed | `UI` `R` `UX` |
| `/eventi/[id]` | `app/(app)/eventi/[id]/page.tsx` | collab | `detail` | Card, Tiptap (read-only) | ✅ | Event detail | `UI` `R` `UX` |
| `/opportunita` | `app/(app)/opportunita/page.tsx` | collab | `feed` | Tabs, Card, EmptyState | ✅ | Read-only opportunities + discounts feed | `UI` `R` `UX` |
| `/opportunita/[id]` | `app/(app)/opportunita/[id]/page.tsx` | collab | `detail` | Card, Tiptap (read-only) | ✅ | Opportunity detail | `UI` `R` `UX` |
| `/sconti/[id]` | `app/(app)/sconti/[id]/page.tsx` | collab | `detail` | Card, Tiptap (read-only) | ✅ | Discount detail | `UI` `R` `UX` |
| `/risorse/[id]` | `app/(app)/risorse/[id]/page.tsx` | collab | `detail` | Card, Tiptap (read-only) | ✅ | Resource detail | `UI` `R` `UX` |

---

## Responsabile Compensi routes

| Route | Page file | Roles | Layout | Componenti chiave | loading.tsx | Access notes | Audit |
|---|---|---|---|---|---|---|---|
| `/approvazioni` | `app/(app)/approvazioni/page.tsx` | resp | `tabs` | Tabs, Table, Badge, EmptyState | ✅ | Tabs: Compensi + Rimborsi. View assigned communities. Read-only: cannot approve/reject/liquidate (admin-only). | `UI` `R` `UX` |
| `/approvazioni/carica` | `app/(app)/approvazioni/carica/page.tsx` | resp | `import-panel` | Form, Table (preview), Dialog | ✅ | Bulk import compensations from Google Sheets | `UI` `R` `UX` |

---

## Multi-role routes

| Route | Page file | Roles | Layout | Componenti chiave | loading.tsx | Access notes | Audit |
|---|---|---|---|---|---|---|---|
| `/ticket` | `app/(app)/ticket/page.tsx` | collab + resp + admin | `full-list` | Table, Badge, EmptyState | ✅ | `uscente_senza_compenso` → redirect `/documenti`. Manager view vs collaboratore view based on role. | `UI` `R` `UX` |
| `/ticket/nuova` | `app/(app)/ticket/nuova/page.tsx` | collab + resp + admin | `form` | Form, Input, Select, Textarea | ✅ | `uscente_senza_compenso` blocked | `UI` `R` `UX` |
| `/ticket/[id]` | `app/(app)/ticket/[id]/page.tsx` | collab + resp + admin | `chat` | Chat messages, Input, Badge, Dialog | ✅ | Chat UI. Manager can change status. | `UI` `R` `UX` |
| `/documenti` | `app/(app)/documenti/page.tsx` | admin (write) + resp (read) | `full-list` | Table, Badge, Dialog, Sheet | ✅ | Admin: upload, manage. Responsabile: read-only list of assigned communities' docs. | `UI` `R` `UX` |
| `/documenti/[id]` | `app/(app)/documenti/[id]/page.tsx` | admin (write) + resp (read) | `detail` | Card, Badge, Dialog | ✅ | Signature status, download. Admin can upload new version. | `UI` `R` `UX` |
| `/contenuti` | `app/(app)/contenuti/page.tsx` | admin (write) + resp (read) | `tabs` | Tabs, Table, Dialog, Tiptap, EmptyState | ✅ | Manage Comunicazioni / Eventi / Opportunità / Sconti / Risorse. Responsabile read-only. | `UI` `R` `UX` |

---

## Admin-only routes

| Route | Page file | Roles | Layout | Componenti chiave | loading.tsx | Access notes | Audit |
|---|---|---|---|---|---|---|---|
| `/coda` | `app/(app)/coda/page.tsx` | admin | `tabs` | Tabs, Table, Badge, Dialog, stats strip | ✅ | Work queue: documents needing action, pending payments | `UI` `UX` |
| `/collaboratori` | `app/(app)/collaboratori/page.tsx` | admin | `full-list` | Table, Badge, Pagination, EmptyState | ✅ | Full collaborator list with filters + pagination | `UI` `UX` |
| `/collaboratori/[id]` | `app/(app)/collaboratori/[id]/page.tsx` | admin | `tabs` | Tabs, Form, Table, Dialog, Avatar | ✅ | Profile detail + edit + document history | `UI` `UX` |
| `/export` | `app/(app)/export/page.tsx` | admin | `tabs` | Tabs, Form, Table (preview + history) | ✅ | CSV/XLSX export of compensations and reimbursements | `UI` `UX` |
| `/import` | `app/(app)/import/page.tsx` | admin | `import-panel` | Tabs, Table (preview), Dialog, EmptyState, ImportCorsiSection | ✅ | Bulk import UI for collaboratori, contratti, CU, corsi (4 tabs). Corsi tab: GSheet import via POST /api/admin/import-corsi/run with notify toggle. | `UI` `UX` |
| `/impostazioni` | `app/(app)/impostazioni/page.tsx` | admin | `tabs` | Tabs, Form, Table, Dialog, BannerManager, Switch, BlacklistManager, AllegatiCorsiManager | ✅ | Community config, notification settings, contract templates, email template management, community banners, blacklist management, allegati corsi | `UI` `UX` |
| `/corsi` | `app/(app)/corsi/page.tsx` | admin + resp.cittadino + collab | `full-list` | Table, Badge, EmptyState, CorsiFilterBar, CorsiPageCollab, CorsiCalendario | ✅ | Admin: full list with filters. Resp.cittadino: redirect → /corsi/assegnazione. Collab: 3-section view (I miei corsi / Docenza / Q&A) + monthly calendar; city filter for in_aula docenza. | `UI` `R` `UX` |
| `/corsi/assegnazione` | `app/(app)/corsi/assegnazione/page.tsx` | resp.cittadino | `full-list` | AssegnazioneRespCittPage, Select, Badge, Button, AlertDialog | ✅ | Two sections: corsi senza città (candidatura citta_corso) + I miei corsi (accordion per corso: "CoCoD'à del corso" 2-slot assign all lezioni, "Q&A del corso" N-slot for online corsi, Rimuovi on existing; Export CSV; ⚠ blacklist in dropdown). | `UI` `R` `UX` |
| `/lista-nera` | `app/(app)/lista-nera/page.tsx` | resp.cittadino + admin | `full-list` | ListaNeraPage, Table, Badge, EmptyState | — | Read-only blacklist view. Columns: nome, cognome, username, note, data inserimento. Sourced from GET /api/blacklist. | `UI` `R` `UX` |
| `/corsi/valutazioni` | `app/(app)/corsi/valutazioni/page.tsx` | resp.cittadino | `full-list` | ValutazioniRespCittPage, Input, Button, Badge | ✅ | Per-corso, per-collaboratore×corso valutazione (1–10) input. Bulk update via PATCH /api/corsi/[id]/valutazioni. | `UI` `R` `UX` |
| `/corsi/eventi-citta` | `app/(app)/corsi/eventi-citta/page.tsx` | resp.cittadino | `full-list` | EventiCittaPage, Table, Dialog, AlertDialog, RichTextEditor | ✅ | Create/edit/delete city-scoped events. citta auto-set from resp.citt profile. Ownership enforced on PATCH/DELETE. | `UI` `R` `UX` |
| `/corsi/nuovo` | `app/(app)/corsi/nuovo/page.tsx` | admin | `form` | CorsoForm, Select, Input, Button | ✅ | Create new corso. Admin-only. | `UI` `UX` |
| `/corsi/[id]` | `app/(app)/corsi/[id]/page.tsx` | admin + resp.cittadino + collab | `tabs` | Tabs, CorsoForm, LezioniTab, CandidatureCittaTab, LezioniTabCollab, LezioniTabRespCitt | ✅ | Admin: 3 tabs (Dettaglio/Lezioni/Candidature città). Resp.citt: lezioni + candidature with Accetta/Rifiuta/Revoca; capacity badges; blacklist badge + Q&A metadata (materie/città/qaSvolti). Collab: lezioni list + candidatura actions + allegati. | `UI` `R` `UX` |
| `/feedback` | `app/(app)/feedback/page.tsx` | admin | `full-list` | Table, EmptyState | ✅ | User feedback/suggestions | `UI` `UX` |

---

## Sidebar visibility by role

| Sidebar item | collab | resp | admin |
|---|---|---|---|
| Dashboard / Home | ✅ | ✅ | ✅ |
| Profilo | ✅ | ✅ | — |
| Compensi | ✅ | — | — |
| Rimborsi | ✅ | — | — |
| Ticket | ✅ | ✅ | ✅ |
| Comunicazioni | ✅ | — | — |
| Eventi | ✅ | — | — |
| Opportunità / Sconti | ✅ | — | — |
| Approvazioni | — | ✅ | — |
| Coda lavoro | — | — | ✅ |
| Collaboratori | — | — | ✅ |
| Documenti | — | ✅ (read) | ✅ |
| Export | — | — | ✅ |
| Contenuti | — | ✅ (read) | ✅ |
| Corsi | ✅ (corsi-2) | — | ✅ |
| Candidatura e Assegnazione | — | ✅ (resp.citt) | — |
| Valutazione Corsi | — | ✅ (resp.citt) | — |
| Impostazioni | — | — | ✅ |
| Monitoraggio | — | — | ✅ |
| Feedback | — | — | ✅ |

> `responsabile_cittadino` nav defined in corsi-1 (4 items: Home, Candidatura e Assegnazione, Valutazione Corsi, Creazione Eventi). Corsi pages implemented in corsi-3. Creazione eventi page implemented in eventi-citta block.
> `responsabile_servizi_individuali` has no nav items defined yet.

---

## Proxy redirect chain

```
Request
  → not authenticated            → /login
  → is_active = false            → /pending
  → must_change_password = true  → /change-password
  → onboarding_completed = false → /onboarding
  → app route reached ✅
```

API routes `/api/*` pass all checks (auth + active only). `/api/health` is fully public.

---

## Page sub-hierarchies

Internal structure of complex pages: tabs, states, sub-routes, and per-role interactions.

### `/`
- **Tabs / states**: No tabs — role-specific dashboard variants. Admin: stats strip + compensation queue + ticket queue (AdminDashboard). Responsabile: KPIs + pending items + ticket list. Collaboratore: DashboardUpdates with 4 tabs (Documenti / Comunicazioni / Opportunità / Eventi) + compensation summary card + open tickets list.
- **Key interactions**: Admin — click through to coda/compensi/ticket detail. Resp — navigate to approvazioni. Collab — navigate to detail pages from feed tabs.
- **Empty states**: Each dashboard tab/section uses EmptyState when no records exist.
- **Responsive notes**: Stats strip (admin) is a multi-column grid — needs stack at mobile. Feed tabs (collab) scroll vertically; card layout should adapt to single column.

### `/profilo`
- **Tabs / states**: Collaboratori: 3 tabs — Profilo · Documenti · Impostazioni. Admin/Responsabile: no tabs (profile form only). Impostazioni tab contains TelegramConnect section.
- **Key interactions**: All roles: edit own contact/fiscal fields (constrained by role). Community field is read-only for collaboratori (admin-only via `/collaboratori/[id]`). Collab: sign documents from Documenti tab, change password from Profilo tab, connect/disconnect Telegram from Impostazioni tab. Admin also has a Telegram reset button on `/collaboratori/[id]`.
- **Empty states**: Documenti tab uses EmptyState when no documents assigned. TelegramConnect shows disconnected state with connect CTA when no chat_id set.
- **Responsive notes**: Form fields in two-column grid on desktop → single column on mobile. Avatar upload button should remain accessible.

### `/contenuti`
- **Tabs / states**: 5 tabs — Comunicazioni · Risorse · Eventi · Opportunità · Sconti. Each tab: filterable list + Dialog for create/edit/delete (admin) or read-only view (resp).
- **Key interactions**: Admin — create/edit/delete content items, target communities, publish/unpublish. Resp — read-only list with detail Dialog.
- **Empty states**: Each tab uses EmptyState when no items exist for the selected filter.
- **Responsive notes**: Table layout per tab; on mobile the action column (edit/delete buttons) should remain accessible. Dialog content (Tiptap editor) needs min-height on small screens.

### `/approvazioni`
- **Tabs / states**: 2 tabs — Compensi · Rimborsi. Each: filterable table by community + state. Resp can only create compensations; all approve/reject/liquidate actions are admin-only.
- **Key interactions**: Resp — create individual compensation, bulk GSheet import (via `/approvazioni/carica`), view compensation and reimbursement details. Admin — approve/reject/liquidate from this view.
- **Empty states**: Both tabs use EmptyState when no records match the current filter.
- **Responsive notes**: Filter bar (community + state selects) and table should stack on mobile. Action buttons per row should remain tappable.

### `/coda`
- **Tabs / states**: 3 tabs — Compensi · Rimborsi · Liquidazioni. Stats strip at top shows aggregate counts. Compensi/Rimborsi tabs: sub-filters (community, state), date sort, bulk approve + bulk liquidate, footer totals. Bulk actions open a confirmation Dialog (with MassimaleCheckModal for over-massimale cases). Liquidazioni tab: CodaLiquidazioni table (collabName, importo netto, masked IBAN, P.IVA, record count, date) with Accetta (AlertDialog) / Rifiuta (Dialog + note) per row.
- **Key interactions**: Admin — bulk approve all IN_ATTESA, bulk liquidate all APPROVATO, individual approve/reject/liquidate per row; accept/reject liquidazione requests per row.
- **Empty states**: All tabs use EmptyState when queue is empty.
- **Responsive notes**: Stats strip is multi-column — stack on mobile. Bulk action buttons and per-row actions must remain accessible. Footer totals row should not be hidden by overflow.

### `/collaboratori/[id]`
- **Tabs / states**: 5 tabs — Profilo · Compensi · Rimborsi · Documenti · Ticket. Profilo tab contains editable form fields and a status/role management section.
- **Key interactions**: Admin — edit profile fields, change member_status / is_active / data_ingresso, upload documents, view compensation/reimbursement history, reset password, manage contract.
- **Empty states**: Compensi, Rimborsi, Documenti, and Ticket tabs each use EmptyState when no records exist.
- **Responsive notes**: Profile form is multi-column on desktop. Tab navigation should remain scrollable on narrow viewports.

### `/impostazioni`
- **Tabs / states**: 5 tabs — Community · Notifiche · Contratti · Template mail · Monitoraggio + additional tabs (Banner, Blacklist, Allegati corsi). Community tab: list + Dialog editor. Notifiche tab: notification settings matrix (event × role toggles). Contratti tab: template upload + preview. Template mail tab: email templates with inline editor. Monitoraggio tab: system monitoring section embedded within this page (not a separate route) — access logs, emails, DB performance, app errors.
- **Key interactions**: Admin — configure community metadata, toggle notification events per role, upload/replace contract templates, edit email template HTML.
- **Empty states**: Community tab uses EmptyState when no communities exist.
- **Responsive notes**: Notification settings matrix (event × role) is a wide table — horizontal scroll allowed here. Template editor (Tiptap/textarea) needs adequate height.

### `/import`
- **Tabs / states**: 4 outer tabs — Collaboratori · Contratti · CU · Corsi. Collaboratori/Contratti/CU: inner toggle Importa · Storico. Importa state: GSheet URL input → preview table → confirm Dialog → run result panel. Storico state: list of past import runs with XLSX download. Corsi tab: single-shot execution (no preview) — button "Esegui import" + toggle "Notifica collaboratori" (default OFF, gates E17) → results table (tab name | status PROCESSED/ERROR/SKIPPED | error message).
- **Key interactions**: Admin — paste sheet URL, preview rows, confirm and run import, download run history XLSX. Corsi: click "Esegui import" → server reads all `TO_PROCESS` tabs → results list shown inline; re-running is idempotent (already-PROCESSED tabs skipped).
- **Empty states**: Storico inner tab uses EmptyState when no import runs exist. Preview table shows validation errors inline before confirm. Corsi tab: before first run shows only the button; after run shows summary `{processed, errorCount, skipped}` + per-tab rows.
- **Responsive notes**: Preview table can have many columns — horizontal scroll acceptable within the import panel. Run result panel (success/error counts) should stack vertically on mobile.

### `/export`
- **Tabs / states**: 2 tabs — Esporta · Storico. Esporta tab: filter form (date range, community, type) + preview table + export action. Storico tab: list of past export runs with XLSX download.
- **Key interactions**: Admin — configure export parameters, preview aggregated rows, download CSV/XLSX, view export history.
- **Empty states**: Storico tab uses EmptyState when no export runs exist. Preview table shows EmptyState when filters return no data.
- **Responsive notes**: Filter form fields should stack on mobile. Preview table is wide (many columns) — horizontal scroll acceptable.

### `/ticket/[id]`
- **Tabs / states**: No tabs — single chat UI with a side status panel. States: `APERTO` / `IN_LAVORAZIONE` / `CHIUSO`. Manager (resp/admin) can change status via Dialog. Closed tickets are read-only.
- **Key interactions**: All roles — send message. Manager — change status (open → in progress → closed). Admin/resp — close ticket.
- **Empty states**: No empty state (ticket detail always has at least the opening message).
- **Responsive notes**: Chat + status panel are side-by-side on desktop → stack vertically on mobile (status panel above chat). Message input must remain above the keyboard on mobile.

### `/rimborsi/[id]` and `/compensi/[id]`
- **Tabs / states**: No tabs — detail card + timeline. States: `IN_ATTESA` / `APPROVATO` / `RIFIUTATO` / `LIQUIDATO`. Timeline shows history of state transitions with role_label and timestamp.
- **Key interactions**: Collab — view status, reopen if RIFIUTATO. Admin — approve/reject/liquidate with optional rejection note Dialog.
- **Empty states**: Timeline section uses EmptyState when no history entries exist yet.
- **Responsive notes**: Detail card fields and timeline should stack cleanly in a single column on mobile.

### `/corsi/[id]`
- **Tabs / states**: 3 URL-driven tabs (`?tab=dettaglio|lezioni|candidature`). Dettaglio: CorsoForm in edit mode. Lezioni: table + Sheet (add/edit) + AlertDialog (delete). Candidature città: only shown when `corso.citta = null`; manual city assignment via Select.
- **Key interactions**: Admin — edit corso metadata, add/edit/delete lezioni, assign città from candidature. Resp.cittadino — read-only in corsi-1 (full access in corsi-3).
- **Empty states**: Lezioni tab uses EmptyState when no lezioni exist yet. Candidature città shows empty state when no candidature submitted yet.
- **Responsive notes**: Admin-only route — desktop usage only.

### `/opportunita`
- **Tabs / states**: 2 tabs — Opportunità · Sconti (two content types rendered in one page for collab). Each tab: card feed with EmptyState.
- **Key interactions**: Collab — browse and open detail pages for opportunities and discounts.
- **Empty states**: Both tabs use EmptyState when no items are visible for the user's community.
- **Responsive notes**: Card grid should adapt from multi-column (desktop) to single column (mobile).

---

## API Routes

> Used by skills with `target:section:<section>` to scope audits to specific functional areas.
> Role abbreviations: `C` = collaboratore · `R` = responsabile_compensi · `RC` = responsabile_cittadino · `A` = amministrazione

### Section: compensi

| Path | Methods | Roles | Notes |
|---|---|---|---|
| `/api/compensations` | GET, POST | C (own), R (community), A | List + create |
| `/api/compensations/[id]` | GET, PATCH, DELETE | C (own), R, A | Detail + edit |
| `/api/compensations/[id]/transition` | POST | R (reject only), A | State machine transitions |
| `/api/compensations/[id]/edit` | PATCH | A | Admin-only field edit |
| `/api/compensations/approve-all` | POST | A | Bulk approve all IN_ATTESA |
| `/api/compensations/bulk-approve` | POST | A | Bulk approve selected |
| `/api/compensations/bulk-liquidate` | POST | A | Bulk liquidate selected |
| `/api/compensations/communities` | GET | C, R, A | Community list for filters |
| `/api/compensations/competenze` | GET | R, A | Competenze lookup |
| `/api/compensations/import/preview` | POST | R, A | GSheet import preview |
| `/api/compensations/import/confirm` | POST | R, A | GSheet import confirm |
| `/api/liquidazione-requests` | GET, POST, PATCH | R, A | Liquidazione request management |

### Section: rimborsi

| Path | Methods | Roles | Notes |
|---|---|---|---|
| `/api/expenses` | GET, POST | C (create+own), R (community read), A | List + create |
| `/api/expenses/[id]` | GET, PATCH | C (own), R, A | Detail + edit |
| `/api/expenses/[id]/transition` | POST | A | State machine transitions |
| `/api/expenses/[id]/attachments` | GET, POST | C (own), A | File attachments |
| `/api/expenses/approve-all` | POST | A | Bulk approve all IN_ATTESA |
| `/api/expenses/bulk-approve` | POST | A | Bulk approve selected |
| `/api/expenses/bulk-liquidate` | POST | A | Bulk liquidate selected |

### Section: corsi

| Path | Methods | Roles | Notes |
|---|---|---|---|
| `/api/corsi` | GET, POST | C, RC, A | List + create (A only) |
| `/api/corsi/[id]` | GET, PATCH, DELETE | RC, A | Detail + admin edit |
| `/api/corsi/[id]/lezioni` | GET, POST | A | Lessons list + create |
| `/api/corsi/[id]/lezioni/[lid]` | PATCH, DELETE | A | Lesson edit + delete |
| `/api/corsi/[id]/valutazioni` | PATCH | RC | Resp.citt ratings |
| `/api/candidature` | GET, POST | C, RC, A | Candidatura submit |
| `/api/candidature/[id]` | PATCH | C, RC | Revoke or accept |
| `/api/assegnazioni` | GET, POST | RC, A | CoCoD'à assignments |
| `/api/assegnazioni/[id]` | DELETE | RC, A | Remove assignment |
| `/api/assegnazioni/export` | GET | RC, A | Export CSV |

### Section: documenti

| Path | Methods | Roles | Notes |
|---|---|---|---|
| `/api/documents` | GET | C, R, A | List (role-filtered by RLS) |
| `/api/documents/[id]` | GET, PATCH, DELETE | C (own), R, A | Detail + admin ops |
| `/api/documents/[id]/sign` | POST | C | Self-guided signature |
| `/api/documents/[id]/sign-guided` | POST | A | Admin-assisted signature |
| `/api/documents/[id]/recompile` | POST | A | Regenerate document |
| `/api/documents/cu-batch` | POST | A | Batch CU generation |
| `/api/documents/generate-receipts` | POST | A | Batch receipt generation |
| `/api/documents/receipts/preview` | POST | A | Receipt preview |

### Section: ticket

| Path | Methods | Roles | Notes |
|---|---|---|---|
| `/api/tickets` | GET, POST | C, R, A | List + create |
| `/api/tickets/[id]` | GET | C, R, A | Detail (`serviceClient` mandatory) |
| `/api/tickets/[id]/messages` | GET, POST | C, R, A | Thread messages |
| `/api/tickets/[id]/status` | PATCH | R, A | Status transition |

### Section: contenuti

| Path | Methods | Roles | Notes |
|---|---|---|---|
| `/api/communications` | GET, POST | C, R (read), A | Communications |
| `/api/communications/[id]` | GET, PATCH, DELETE | A | Admin CRUD |
| `/api/events` | GET, POST | C, R (read), A | Events |
| `/api/events/[id]` | GET, PATCH, DELETE | A | Admin CRUD |
| `/api/opportunities` | GET, POST | C, R (read), A | Opportunities |
| `/api/opportunities/[id]` | GET, PATCH, DELETE | A | Admin CRUD |
| `/api/discounts` | GET, POST | C, R (read), A | Discounts |
| `/api/discounts/[id]` | GET, PATCH, DELETE | A | Admin CRUD |
| `/api/resources` | GET, POST | C, R (read), A | Resources / guides |
| `/api/resources/[id]` | GET, PATCH, DELETE | A | Admin CRUD |

### Section: notifiche

| Path | Methods | Roles | Notes |
|---|---|---|---|
| `/api/notifications` | GET | C, R, A | Notification bell feed |
| `/api/notifications/[id]` | PATCH | C, R, A | Mark as read |

### Section: profilo

| Path | Methods | Roles | Notes |
|---|---|---|---|
| `/api/profile` | GET, PATCH | C, R, A | Own profile read + edit |
| `/api/profile/avatar` | POST, DELETE | C, R, A | Avatar upload/remove |
| `/api/profile/communities` | GET, PATCH | A | Community assignment (admin only) |
| `/api/profile/password` | POST | C, R, A | Password change |
| `/api/profile/theme` | PATCH | C, R, A | Theme preference |

### Section: export

| Path | Methods | Roles | Notes |
|---|---|---|---|
| `/api/export/gsheet` | POST | A | Export to Google Sheet |
| `/api/export/history` | GET | A | Export run history |
| `/api/export/mark-paid` | POST | A | Mark batch as paid |

### Section: import

| Path | Methods | Roles | Notes |
|---|---|---|---|
| `/api/import/collaboratori/preview` | POST | A | Collaboratori import preview |
| `/api/import/collaboratori/run` | POST | A | Collaboratori import run |
| `/api/import/contratti/preview` | POST | A | Contratti import preview |
| `/api/import/contratti/run` | POST | A | Contratti import run |
| `/api/import/cu/preview` | POST | A | CU import preview |
| `/api/import/cu/run` | POST | A | CU import run |
| `/api/import/history` | GET | A | Import run history |

### Section: admin

All routes below require `amministrazione` role.

| Path | Methods | Notes |
|---|---|---|
| `/api/admin/collaboratori` | GET, POST | List + invite collaborator |
| `/api/admin/collaboratori/[id]` | GET, PATCH, DELETE | Profile management |
| `/api/admin/collaboratori/[id]/profile` | PATCH | Profile field editing |
| `/api/admin/collaboratori/[id]/resend-invite` | POST | A | Re-send invite email + new password |
| `/api/admin/banner/[communityId]` | GET, PATCH | Community banner |
| `/api/admin/communities` | GET, PATCH | Community settings |
| `/api/admin/notification-settings` | GET, PATCH | Notification matrix |
| `/api/admin/contract-templates` | GET, POST | Contract templates |
| `/api/admin/contract-templates/[id]` | GET, PATCH, DELETE | Template detail |
| `/api/admin/email-templates` | GET | Email template list |
| `/api/admin/email-templates/[id]` | GET, PATCH | Email template edit |
| `/api/admin/import-corsi/run` | POST | GSheet corsi import run |
| (+ additional admin routes — see `app/api/admin/` for full listing) | | |

### Section: auth

| Path | Methods | Roles | Notes |
|---|---|---|---|
| `/api/auth/change-password` | POST | C, R, A | Force-change on first login |
| `/api/auth/clear-force-change` | POST | C, R, A | Clear must_change_password flag |
| `/api/onboarding/complete` | POST | C, R | Mark onboarding done |

### System routes

| Path | Methods | Roles | Notes |
|---|---|---|---|
| `/api/health` | GET | Public | Health check (no auth required) |
| `/api/errors` | GET | A | Error log viewer |
| `/api/feedback` | GET, POST | C, R, A | User feedback |
| `/api/feedback/[id]` | PATCH | A | Feedback management |
| `/api/lookup-options` | GET | A | Lookup options (città, materie) |
| `/api/webhooks/resend` | POST | Public (WEBHOOK_SECRET) | Resend delivery webhooks |
| `/api/jobs/lesson-reminders` | POST | Public (CRON_SECRET) | Vercel cron — lesson reminders |

---

## Maintenance

Update this file in **Phase 8** of any block that:
- Adds or removes a route
- Changes role access to an existing route
- Modifies member_status restrictions
- Adds a new role to the sidebar
- Introduces or changes the layout pattern of a page
- Adds or removes key components from a page (Dialog, Sheet, Tiptap, Tabs…)
- Adds or removes a `loading.tsx`

Source files to keep in sync: `lib/nav.ts` (sidebar items), `proxy.ts` (redirect chain), individual `page.tsx` files (role guards).

### Cross-cutting UI tasks
For tasks that touch many pages at once (responsive audit, token normalization, empty-state sweep, loading.tsx audit):
1. Read this file first to get the full page inventory
2. Filter by **Layout** column to scope the work (e.g. all `full-list` pages, all `tabs` pages)
3. Filter by **Componenti chiave** to find all pages using a specific component
4. Filter by **Audit** column to scope by skill (ui-audit, responsive-audit, ux-audit)
5. Only run Grep/Explore if the answer is not already here
