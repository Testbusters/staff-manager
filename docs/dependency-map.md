# Functional Dependency Map

> **Phase 1 mandatory lookup**: before producing the file list for any block,
> find the entity being modified below and add ALL listed surfaces to the file list.
> If the entity is not listed: add it here before proceeding.

---

## How to use

1. Identify the entity being changed (profile field, state machine, role, etc.)
2. Look it up in the table below
3. Every row in that entity's surface list is a candidate for the file list
4. Cross-check with the dependency scan (grep/glob) — this map is the starting point, not a substitute

---

## Entity Index

- [Collaborator Profile Fields](#1-collaborator-profile-fields)
- [Compensation State Machine](#2-compensation-state-machine)
- [Expense / Reimbursement State Machine](#3-expense--reimbursement-state-machine)
- [Document State Machine](#4-document-state-machine)
- [Ticket State Machine](#5-ticket-state-machine)
- [RBAC Roles](#6-rbac-roles)
- [Sidebar / Navigation](#7-sidebar--navigation)
- [Notification System](#8-notification-system)
- [Community Assignment](#9-community-assignment)
- [Email Templates](#10-email-templates)
- [Theme System](#11-theme-system)
- [Content Types (5 types)](#12-content-types-5-types)
- [Member Status](#13-member-status)
- [Auth / Onboarding Flow](#14-auth--onboarding-flow)
- [Contract Templates & Document Types](#15-contract-templates--document-types)
- [Export Functionality](#16-export-functionality)
- [Dashboard / KPI](#17-dashboard--kpi)

---

## 1. Collaborator Profile Fields

**Trigger**: add, remove, rename, or revalidate any profile field.
**Canonical contract**: `docs/profile-editing-contract.md` — **MUST be updated**.

| Surface | Path |
|---|---|
| Self-edit page | `app/(app)/profilo/page.tsx` |
| Admin detail view | `app/(app)/collaboratori/[id]/page.tsx` |
| Onboarding wizard | `app/onboarding/page.tsx` |
| Self-edit API | `app/api/profile/route.ts` |
| Admin edit API | `app/api/admin/collaboratori/[id]/profile/route.ts` |
| Username-only API | `app/api/admin/collaboratori/[id]/route.ts` |
| Onboarding complete API | `app/api/onboarding/complete/route.ts` |
| Create-user API | `app/api/admin/create-user/route.ts` |
| Types | `lib/types.ts` (`Collaborator` interface) |
| Profile editing contract | `docs/profile-editing-contract.md` |
| Sitemap (if field changes access) | `docs/sitemap.md` |

**DB**: `collaborators`, `user_profiles` tables. Check FK constraints if adding/removing columns.

---

## 2. Compensation State Machine

**Trigger**: add/remove/rename a state or transition; change who can perform an action; change validation rules.

| Surface | Path |
|---|---|
| Transition logic (pure) | `lib/compensation-transitions.ts` |
| Transition unit tests | `lib/compensation-transitions.test.ts` |
| Collaboratore list | `app/(app)/compensi/page.tsx` |
| Collaboratore detail | `app/(app)/compensi/[id]/page.tsx` |
| Responsabile approval view | `app/(app)/approvazioni/page.tsx` |
| Admin work queue | `app/(app)/coda/page.tsx` |
| Admin export | `app/(app)/export/page.tsx` |
| Transition API | `app/api/compensations/[id]/transition/route.ts` |
| Compensation API (list/create) | `app/api/compensations/route.ts` |
| Approve-all API | `app/api/compensations/approve-all/route.ts` |
| Approve-bulk API | `app/api/compensations/approve-bulk/route.ts` |
| Mark-paid API | `app/api/export/mark-paid/route.ts` |
| Types + labels | `lib/types.ts` (`CompensationStatus`, `COMPENSATION_STATUS_LABELS`) |
| Notification builder | `lib/notification-utils.ts` |
| Email templates | `lib/email-templates.ts` (E1, E2, E3) |

**DB**: `compensations`, `compensation_history`, `compensation_attachments`.
**RLS**: if roles or scopes change, update policies in a new migration.

---

## 3. Expense / Reimbursement State Machine

**Trigger**: same as Compensation — states, transitions, roles, validation.

| Surface | Path |
|---|---|
| Transition logic (pure) | `lib/expense-transitions.ts` |
| Transition unit tests | `lib/expense-transitions.test.ts` |
| Collaboratore list | `app/(app)/rimborsi/page.tsx` |
| Collaboratore create | `app/(app)/rimborsi/nuova/page.tsx` |
| Collaboratore detail | `app/(app)/rimborsi/[id]/page.tsx` |
| Responsabile approval view | `app/(app)/approvazioni/page.tsx` |
| Admin work queue | `app/(app)/coda/page.tsx` |
| Admin export | `app/(app)/export/page.tsx` |
| Transition API | `app/api/expenses/[id]/transition/route.ts` |
| Expense API (list/create) | `app/api/expenses/route.ts` |
| Approve-all API | `app/api/expenses/approve-all/route.ts` |
| Approve-bulk API | `app/api/expenses/approve-bulk/route.ts` |
| Types + labels | `lib/types.ts` (`ExpenseStatus`, `EXPENSE_STATUS_LABELS`, `ExpenseCategory`) |
| Notification builder | `lib/notification-utils.ts` |
| Email templates | `lib/email-templates.ts` (E1, E2, E3 reused) |

**DB**: `expense_reimbursements`, `expense_attachments`, `expense_history`.
**Note**: `expenses_responsabile_read` RLS uses double JOIN — verify if scope changes.

---

## 4. Document State Machine

**Trigger**: add a state, change who can sign/upload, change storage logic.

| Surface | Path |
|---|---|
| Collaboratore profile docs tab | `app/(app)/profilo/page.tsx` |
| Admin document manager | `app/(app)/documenti/page.tsx` |
| Document detail / sign flow | `app/(app)/documenti/[id]/page.tsx` |
| Upload API | `app/api/documents/route.ts` |
| Sign API | `app/api/documents/[id]/sign/route.ts` |
| CU batch upload API | `app/api/documents/cu-batch/route.ts` |
| Types + labels | `lib/types.ts` (`DocumentSignStatus`, `DocumentType`, `DocumentMacroType`) |
| Email templates | `lib/email-templates.ts` (E4, E5) |

**DB**: `documents` table. `macro_type` is a generated column — verify before adding indexes.
**Storage**: `documents` bucket (private, signed URLs 1h TTL via service role).

---

## 5. Ticket State Machine

**Trigger**: add/remove states or priority levels; change who can transition.

| Surface | Path |
|---|---|
| Ticket list (all roles) | `app/(app)/ticket/page.tsx` |
| Ticket create | `app/(app)/ticket/nuova/page.tsx` |
| Ticket detail + thread | `app/(app)/ticket/[id]/page.tsx` |
| Status transition API | `app/api/tickets/[id]/status/route.ts` |
| Ticket API (list/create) | `app/api/tickets/route.ts` |
| Messages API | `app/api/tickets/[id]/messages/route.ts` |
| Types + labels | `lib/types.ts` (`TicketStatus`, `TicketPriority`, `TICKET_STATUS_LABELS`) |
| Notification builder | `lib/notification-utils.ts` |
| Email templates | `lib/email-templates.ts` (E6, E9) |

**DB**: `tickets`, `ticket_messages`.
**RLS note**: `tickets_responsabile_read` uses complex join chain — do NOT use `can_manage_community()` (fails for NULL community_id).

---

## 6. RBAC Roles

**Trigger**: add/remove a role; change what a role can see or do; rename a role.

| Surface | Path |
|---|---|
| Auth proxy (role attach + redirect) | `proxy.ts` |
| Navigation config | `lib/nav.ts` (`NAV_BY_ROLE`) |
| Sidebar (icon resolution) | `components/Sidebar.tsx` |
| App layout | `app/(app)/layout.tsx` |
| Types | `lib/types.ts` (`Role`, `ROLE_LABELS`) |
| Every page with role guard | `app/(app)/**/page.tsx` (grep `x-user-role`) |
| Every API route with role check | `app/api/**/*.ts` (grep `get_my_role\|x-user-role`) |
| DB helper functions | migrations: `get_my_role()`, `can_manage_community()`, `is_active_user()` |
| All RLS policies | (check all migrations if role enum changes) |
| Sitemap | `docs/sitemap.md` |
| CLAUDE.md RBAC table | `CLAUDE.md` |

**Critical**: renaming a role requires updating the Postgres `role` enum AND all CHECK constraints AND all RLS `get_my_role()` comparisons across migrations.

---

## 7. Sidebar / Navigation

**Trigger**: add/remove a route; change a sidebar label or icon; add a new role's nav set.

| Surface | Path |
|---|---|
| Navigation config | `lib/nav.ts` |
| Sidebar component | `components/Sidebar.tsx` (ICON_MAP) |
| App layout | `app/(app)/layout.tsx` |
| Sitemap doc | `docs/sitemap.md` |

**Rule**: always use `iconName: string` in `lib/nav.ts` — never a Lucide `icon: LucideIcon` component (Server→Client boundary).

---

## 8. Notification System

**Trigger**: add a new event type; add a new recipient role; change notification payload; change DB schema.

| Surface | Path |
|---|---|
| Notification builders | `lib/notification-utils.ts` |
| Recipient helpers | `lib/notification-helpers.ts` |
| Bell component | `components/NotificationBell.tsx` |
| Notification page | `app/(app)/notifiche/page.tsx` (client) |
| Settings manager (admin) | `components/NotificationSettingsManager.tsx` |
| Settings API | `app/api/admin/notification-settings/route.ts` |
| Every API route that triggers a notification | (grep `buildXNotification\|sendEmail`) |
| Types | `lib/types.ts` (`NotificationEntityType`) |
| Email templates | `lib/email-templates.ts` (all templates) |

**DB**: `notifications`, `notification_settings` (19 rows: event_key × recipient_role).
**Pattern**: fire-and-forget `sendEmail(...).catch(() => {})` — failures must NOT block API responses.

---

## 9. Community Assignment

**Trigger**: change how responsabili are scoped; change how collaborators are assigned to communities; change content targeting logic.

| Surface | Path |
|---|---|
| Responsabile approval view | `app/(app)/approvazioni/page.tsx` |
| Admin collaboratori list | `app/(app)/collaboratori/page.tsx` |
| Admin document manager | `app/(app)/documenti/page.tsx` |
| Content management | `app/(app)/contenuti/page.tsx` |
| Communities API | `app/api/compensations/communities/route.ts` |
| Approve-all APIs | `app/api/compensations/approve-all/route.ts`, `app/api/expenses/approve-all/route.ts` |
| Admin collaboratore profile edit | `app/api/admin/collaboratori/[id]/profile/route.ts` |
| Create-user API | `app/api/admin/create-user/route.ts` |
| All content creation APIs | `app/api/communications/route.ts`, `events`, `opportunities`, `discounts`, `resources` |
| Notification helpers | `lib/notification-helpers.ts` |
| RLS DB helper | `can_manage_community()` (security definer fn) |

**DB**: `collaborator_communities`, `user_community_access`, `communities`.
**Security**: any route allowing responsabile to modify a collaborator MUST verify community membership first.

---

## 10. Email Templates

**Trigger**: change template HTML/variables; add a new template; change the sender domain or APP_URL behavior.

| Surface | Path |
|---|---|
| All templates | `lib/email-templates.ts` |
| Email sender util | `lib/email.ts` |
| Compensation transition API | `app/api/compensations/[id]/transition/route.ts` |
| Expense transition API | `app/api/expenses/[id]/transition/route.ts` |
| Document upload API | `app/api/documents/route.ts` |
| Document sign API | `app/api/documents/[id]/sign/route.ts` |
| Ticket messages API | `app/api/tickets/[id]/messages/route.ts` |
| Content creation APIs | `app/api/communications`, `events`, `opportunities`, `discounts` |

**Env**: `APP_URL` controls all CTA links. `RESEND_API_KEY` for delivery.
**Branding color**: `#E8320A` (Testbusters red) — used in template layout wrapper.

---

## 11. Theme System

**Trigger**: add/remove a CSS token; change default theme; change ThemeSync logic; add a new theme value.

| Surface | Path |
|---|---|
| CSS token definitions | `app/themes.css` |
| Semantic tokens (Tailwind v4) | `app/globals.css` |
| Theme provider | `components/ThemeProvider.tsx` |
| Theme sync (DB → provider) | `components/ThemeSync.tsx` |
| Sidebar toggle | `components/Sidebar.tsx` |
| Theme API | `app/api/profile/theme/route.ts` |
| Login page (forces light) | `app/login/page.tsx` |

**DB**: `user_profiles.theme_preference` (migration 035).
**Rule**: `suppressHydrationWarning` on `<html>`, `<body>`, and any element reading `resolvedTheme` before mount.

---

## 12. Content Types (5 types)

**Trigger**: add/remove a content type; change community targeting logic; change publish flow; add fields to a content table.

| Surface | Path |
|---|---|
| Content management (admin+resp) | `app/(app)/contenuti/page.tsx` |
| Comunicazioni list (collab) | `app/(app)/comunicazioni/page.tsx` |
| Events list (collab) | `app/(app)/eventi/page.tsx` |
| Opportunità list (collab) | `app/(app)/opportunita/page.tsx` |
| Sconti list (collab) | `app/(app)/sconti/page.tsx` |
| Risorse list (collab) | `app/(app)/risorse/page.tsx` |
| Content detail pages (collab) | `app/(app)/[type]/[id]/page.tsx` |
| Communications API | `app/api/communications/route.ts`, `[id]/route.ts` |
| Events API | `app/api/events/route.ts`, `[id]/route.ts` |
| Opportunities API | `app/api/opportunities/route.ts`, `[id]/route.ts` |
| Discounts API | `app/api/discounts/route.ts`, `[id]/route.ts` |
| Resources API | `app/api/resources/route.ts`, `[id]/route.ts` |
| Types | `lib/types.ts` (`Communication`, `ContentEvent`, `Opportunity`, `Discount`, `Resource`) |
| Notification utils | `lib/notification-utils.ts` (`buildContentNotification`) |
| Notification helpers | `lib/notification-helpers.ts` (`getAllActiveCollaboratori`, `getCollaboratoriForCommunities`) |
| Email templates | `lib/email-templates.ts` (E10, E11, E12) |

**DB**: `communications`, `content_events`, `opportunities`, `discounts`, `resources`. All use `community_ids UUID[] DEFAULT '{}'`.
**Filtering**: in-memory (not PostgREST array operators) — safer, avoids syntax issues.

---

## 13. Member Status

**Trigger**: add/remove a status value; change which pages are blocked per status.

| Surface | Path |
|---|---|
| Auth proxy (header attach) | `proxy.ts` |
| Member status manager (admin UI) | `components/MemberStatusManager.tsx` |
| Admin collaboratori detail | `app/(app)/collaboratori/[id]/page.tsx` |
| Every page checking member_status | `app/(app)/compensi`, `rimborsi`, `ticket`, `documenti` (grep `x-member-status`) |
| Types | `lib/types.ts` (`MemberStatus`) |
| Sitemap | `docs/sitemap.md` |

**DB**: `user_profiles.member_status`.
**Values**: `attivo` | `uscente_con_compenso` | `uscente_senza_compenso`.

---

## 14. Auth / Onboarding Flow

**Trigger**: change redirect logic; add/remove a step in onboarding; change the must_change_password flow.

| Surface | Path |
|---|---|
| Auth proxy (all redirect logic) | `proxy.ts` |
| Login page | `app/login/page.tsx` |
| Change password page | `app/change-password/page.tsx` |
| Onboarding wizard | `app/onboarding/page.tsx` |
| Pending page (inactive users) | `app/pending/page.tsx` |
| Auth callback | `app/auth/callback/route.ts` |
| Change password API | `app/api/auth/change-password/route.ts` |
| Clear force-change API | `app/api/auth/clear-force-change/route.ts` |
| Onboarding complete API | `app/api/onboarding/complete/route.ts` |
| Create-user API (invite flow) | `app/api/admin/create-user/route.ts` |

**Pattern**: `createRedirect(url, supabaseResponse)` — copies Supabase cookies on redirect to avoid session loss.
**Proxy chain**: `must_change_password` → `/change-password` → `onboarding_completed=false` → `/onboarding` → app.

---

## 15. Contract Templates & Document Types

**Trigger**: add a new document type; change template rendering; change the partial unique index.

| Surface | Path |
|---|---|
| Template manager (admin) | `app/(app)/impostazioni/page.tsx` |
| Document upload form | `app/(app)/documenti/page.tsx` |
| Contract templates API | `app/api/admin/contract-templates/route.ts` |
| Documents upload API | `app/api/documents/route.ts` |
| CU batch upload API | `app/api/documents/cu-batch/route.ts` |
| Types | `lib/types.ts` (`DocumentType`, `DocumentMacroType`, `ContractTemplateType`) |

**DB**: `contract_templates` table. `documents.macro_type` is a generated column.
**Partial unique index**: `WHERE macro_type = 'CONTRATTO'` — one contract per collaborator. Drop index before UPDATE, re-add after.

---

## 16. Export Functionality

**Trigger**: add/remove export columns; change export format; change mark-paid logic.

| Surface | Path |
|---|---|
| Export page (admin) | `app/(app)/export/page.tsx` |
| Export utilities | `lib/export-utils.ts` |
| Export unit tests | `__tests__/export-utils.test.ts` |
| Mark-paid API | `app/api/export/mark-paid/route.ts` |
| Compensations list API (with export params) | `app/api/compensations/route.ts` |

---

## 17. Dashboard / KPI

**Trigger**: add/remove a KPI card; change the data fetched for the dashboard; add a new role's dashboard view.

| Surface | Path |
|---|---|
| Dashboard page (all roles) | `app/(app)/page.tsx` |
| Admin dashboard | `components/AdminDashboard.tsx` |
| Responsabile dashboard | `components/DashboardPendingItems.tsx` |
| Collaboratore dashboard | `components/CollabOpenTicketsSection.tsx` |
| KPI chart | `components/DashboardBarChart.tsx` |
| Updates feed | `components/DashboardUpdates.tsx` |
| Types used | compensations, expenses, tickets, documents stati from `lib/types.ts` |

---

## Maintenance Rules

1. **When a new surface is discovered** during a block's dependency scan: add it to the relevant entity here before closing the block (Phase 8 step 5).
2. **When a new entity emerges** with >= 3 surfaces: add it as a new section.
3. **This file is not a substitute** for the Phase 1 grep/glob dependency scan — it is the starting point that accelerates it.
4. **profile-editing-contract.md** remains the authoritative field-level contract for profile fields. This map tracks surface-level dependencies only.
