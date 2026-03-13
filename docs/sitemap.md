# Sitemap — Staff Manager

Last updated: 2026-03-13

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
| collaboratore | collaboratore_test@test.com | Testbusters123 | collab_id 99f6c44c-... — smoke tests |
| responsabile_compensi | responsabile_compensi_test@test.com | Testbusters123 | smoke tests |
| amministrazione | admin_test@test.com | Testbusters123 | smoke tests |

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
| `/profilo` | `app/(app)/profilo/page.tsx` | all | `tabs` | Tabs, Form, Input, Avatar, Table, Badge | ✅ | Own profile view + documents tab. Admin/Responsabile see own profile only | `UI` `R` `UX` |
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
| `/import` | `app/(app)/import/page.tsx` | admin | `import-panel` | Tabs, Table (preview), Dialog, EmptyState | ✅ | Bulk import UI for collaboratori, contratti, CU | `UI` `UX` |
| `/impostazioni` | `app/(app)/impostazioni/page.tsx` | admin | `tabs` | Tabs, Form, Table, Dialog | ✅ | Community config, notification settings, contract templates, email template management | `UI` `UX` |
| `/monitoraggio` | `app/(app)/monitoraggio/page.tsx` | admin | `tabs` | Tabs, Badge, Table, auto-refresh | ✅ | System monitoring: access logs, emails, DB performance, app errors | `UI` `UX` |
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
| Impostazioni | — | — | ✅ |
| Monitoraggio | — | — | ✅ |
| Feedback | — | — | ✅ |

> `responsabile_cittadino` and `responsabile_servizi_individuali` have no nav items defined yet.

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
- **Tabs / states**: 3 tabs — Informazioni personali · Documenti · Sicurezza (password change form).
- **Key interactions**: All roles: edit own contact/fiscal fields (constrained by role). Collab: sign documents from Documenti tab. All roles: change password from Sicurezza tab.
- **Empty states**: Documenti tab uses EmptyState when no documents assigned.
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
- **Tabs / states**: 2 tabs — Compensi · Rimborsi. Stats strip at top shows aggregate counts. Each tab: sub-filters (community, state), date sort, bulk approve + bulk liquidate, footer totals. Bulk actions open a confirmation Dialog (with MassimaleCheckModal for over-massimale cases).
- **Key interactions**: Admin — bulk approve all IN_ATTESA, bulk liquidate all APPROVATO, individual approve/reject/liquidate per row.
- **Empty states**: Both tabs use EmptyState when queue is empty.
- **Responsive notes**: Stats strip is multi-column — stack on mobile. Bulk action buttons and per-row actions must remain accessible. Footer totals row should not be hidden by overflow.

### `/collaboratori/[id]`
- **Tabs / states**: 5 tabs — Profilo · Compensi · Rimborsi · Documenti · Ticket. Profilo tab contains editable form fields and a status/role management section.
- **Key interactions**: Admin — edit profile fields, change member_status / is_active / data_ingresso, upload documents, view compensation/reimbursement history, reset password, manage contract.
- **Empty states**: Compensi, Rimborsi, Documenti, and Ticket tabs each use EmptyState when no records exist.
- **Responsive notes**: Profile form is multi-column on desktop. Tab navigation should remain scrollable on narrow viewports.

### `/impostazioni`
- **Tabs / states**: 5 tabs — Community · Notifiche · Contratti · Template mail · Monitoraggio. Community tab: list + Dialog editor. Notifiche tab: notification settings matrix (event × role toggles). Contratti tab: template upload + preview. Template mail tab: 12 email templates with inline editor. Monitoraggio tab: redirects or links to `/monitoraggio`.
- **Key interactions**: Admin — configure community metadata, toggle notification events per role, upload/replace contract templates, edit email template HTML.
- **Empty states**: Community tab uses EmptyState when no communities exist.
- **Responsive notes**: Notification settings matrix (event × role) is a wide table — horizontal scroll allowed here. Template editor (Tiptap/textarea) needs adequate height.

### `/import`
- **Tabs / states**: 3 outer tabs — Collaboratori · Contratti · CU. Each tab has an inner toggle — Importa · Storico. Importa state: GSheet URL input → preview table → confirm Dialog → run result panel. Storico state: list of past import runs with XLSX download.
- **Key interactions**: Admin — paste sheet URL, preview rows, confirm and run import, download run history XLSX.
- **Empty states**: Storico inner tab uses EmptyState when no import runs exist. Preview table shows validation errors inline before confirm.
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

### `/opportunita`
- **Tabs / states**: 2 tabs — Opportunità · Sconti (two content types rendered in one page for collab). Each tab: card feed with EmptyState.
- **Key interactions**: Collab — browse and open detail pages for opportunities and discounts.
- **Empty states**: Both tabs use EmptyState when no items are visible for the user's community.
- **Responsive notes**: Card grid should adapt from multi-column (desktop) to single column (mobile).

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
