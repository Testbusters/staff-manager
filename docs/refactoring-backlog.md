# Refactoring Backlog

Structural, DB naming, and architectural issues to address in dedicated sessions.
Not blocking for current functionality unless marked **CRITICAL/HIGH**.

> Update this file whenever a structural issue emerges that is not resolved in the current block.

---

## Priority index

| ID | Title | Impact |
|----|--------|---------|
| TC5 | No RLS test for compensation_history leakage | HIGH |
| B4 | Typo `data_compenso` vs `data_competenza` in transition route | HIGH |
| SEC1 | Temporary password returned in plain text by the API | HIGH |
| S5 | mark-paid operation is not atomic (no transaction) | HIGH |
| SEC3 | No rate limiting on POST compensations/reimbursements | MEDIUM |
| SEC4 | No rate limiting on create-user | MEDIUM |
| SEC5 | RLS on compensation_history not covered by tests | MEDIUM |
| A1 | Logic duplication between notification-utils and notification-helpers | MEDIUM |
| A2 | Fire-and-forget email with no failure log | MEDIUM |
| S4 | API route input validation not standardized (missing Zod) | MEDIUM |
| S7 | No `file.size` check before Buffer upload | MEDIUM |
| TC1 | No unit test for `reject_manager` on compensations | MEDIUM |
| TC3 | No e2e test for bulk mark-paid | MEDIUM |
| TC4 | No test for Resend email failure path | MEDIUM |
| P3 | `getNotificationSettings` called on every transition without cache | MEDIUM |
| P4 | `getResponsabiliForCommunity` uses unoptimized triple join | MEDIUM |
| B2 | Inconsistent naming across reimbursements table and FK columns | MEDIUM |
| B3 | `community_id` nullable on expense_reimbursements | MEDIUM |
| A3 | `createServiceClient()` instantiated in every route (no singleton) | LOW |
| A4 | RBAC logic scattered across React components | LOW |
| S1 | `CreateUserForm.tsx` too large (409 lines) | LOW |
| S2 | `CollaboratoreDetail.tsx` too large (474 lines) | LOW |
| S3 | `OnboardingWizard.tsx` complex local state (408 lines) | LOW |
| S6 | Documents query uses `.like('tipo', 'CONTRATTO_%')` instead of `macro_type` | LOW |
| T1 | `SupabaseClient<any, any, any>` in notification-helpers.ts | LOW |
| T2 | `action as CompensationAction` cast without type guard | LOW |
| T3 | `Record<string, unknown>` for updatePayload without narrowing | LOW |
| T4 | State machine action is not a discriminated union | LOW |
| T5 | `tipo` column in documents is `text + CHECK` instead of a PostgreSQL ENUM | LOW |
| P2 | Index on `collaborators.user_id` not documented | LOW |
| SEC6 | No documented rotation policy for `RESEND_API_KEY` | LOW |
| N2 | `contenuti/page.tsx` accessible to collaboratori but not in nav — consider redirect to /comunicazioni | LOW |
| S8 | `formatDate` and `formatCurrency` duplicated across 4+ components — extract to `lib/format-utils.ts` | LOW |
| N3 | Italian URL routes — rename to English | LOW |
| N4 | Italian DB column names — rename to English | LOW |
| N5 | Italian PostgreSQL enum values — translate to English | LOW |
| C1 | `STATO_BADGE` corso stato color map duplicated in 5 corsi files — extract to `lib/corsi-utils.ts` as `CORSO_STATO_COLORS` | LOW |
| C2 | Corsi page date display: cards use raw ISO format (`2025-01-01`), table rows use `DD/MM/YYYY` — apply consistent `formatDate()` in `CorsiPageCollab` | LOW |
| C3 | `AssegnazioneRespCittPage` section 1 uses native `<table>` instead of shadcn `<Table>` — migrate for component consistency | LOW |
| C4 | CoCoD'à toggle button in `AssegnazioneRespCittPage` should show disabled state with Tooltip when `!hasLezioni` or `!hasCollabs` — explain why the feature is unavailable | LOW |
| UX1 | Ticket form validation: global toast only, no inline `<FormMessage>` per field | LOW |
| UX2 | Tab switching pattern inconsistency: `/comunicazioni` + `/approvazioni` use `<Link href="?tab=">` (URL-based, history entries), while `/compensi` uses Radix `<Tabs>` (state-based) — normalise to one pattern | LOW |
| UI1 | G4: 6 bare `<p>` empty states in import sections and constrained UI contexts (NotificationBell, TicketDetailModal) — replace with `<EmptyState>` | LOW |
| UI2 | S2: 7 native `<button>` elements — filter chips in CompensationList/ExpenseList/ApprovazioniRimborsi/ApprovazioniCompensazioni + MonitoraggioSection (×2) + SignaturePad (×2) | LOW |
| UI3 | S4: Inline badge color maps duplicating `lib/content-badge-maps.ts` in 10 files — consolidate | LOW |
| UI4 | `docs/ui-components.md` Dialog/Sheet/Tabs snippets use hardcoded dark classes (`bg-gray-900`, `border-gray-800`, `data-[state=active]:bg-gray-800`) instead of semantic tokens (`bg-card`, `border-border`, etc.) — update snippets to token-based equivalents | LOW |

---

## B — DB Naming / Schema semantics

### B2 — Inconsistent naming across reimbursements table and FK columns
- **Problem**: Table is `expense_reimbursements`, TS interface is `Expense`, FK in related tables is named `reimbursement_id`. Three different names for the same concept.
- **Files**: `app/api/expenses/route.ts`, `lib/types.ts:375-412`, `supabase/migrations/001_schema.sql:147-180`
- **Impact**: MEDIUM
- **Fix**: Standardize everything on `expense_reimbursements`; rename FK `reimbursement_id` → `expense_id` in `expense_attachments` and `expense_history`.

### B3 — `community_id` nullable on `expense_reimbursements`
- **Problem**: `expense_reimbursements.community_id` is not `NOT NULL`, but every reimbursement logically requires it. Orphaned reimbursements cause anomalies in aggregation queries.
- **Files**: `supabase/migrations/001_schema.sql:150`
- **Impact**: MEDIUM
- **Fix**: Check whether any reimbursements have no community_id → if not, add `NOT NULL`.

### B4 — Typo `data_compenso` vs `data_competenza` in transition route
- **Problem**: The transition route accesses `comp.data_compenso` but the real column is `data_competenza`. Causes a runtime error on property access.
- **Files**: `app/api/compensations/[id]/transition/route.ts:160,215`
- **Impact**: HIGH
- **Fix**: Replace the typo with the real column name `data_competenza`.

---

## A — Architecture / Coupling

### A1 — Logic duplication between notification-utils.ts and notification-helpers.ts
- **Problem**: The two files are always imported together. No unified abstraction layer. Each transition route has 6+ imports from these two files.
- **Files**: `lib/notification-utils.ts`, `lib/notification-helpers.ts`, `app/api/compensations/[id]/transition/route.ts:9-19`
- **Impact**: MEDIUM
- **Fix**: Create `lib/notification-service.ts` that re-exports builders + helpers from a single entry point.

### A2 — Fire-and-forget email with no failure log
- **Problem**: `sendEmail(...).catch(() => {})` silences every Resend error. If the provider is down, no user receives notifications and no admin is alerted.
- **Files**: `lib/email.ts:5-20` (used in 8+ routes)
- **Impact**: MEDIUM
- **Fix**: Add async error logging (console.error or an `email_errors` table) for operational visibility.

### A3 — `createServiceClient()` instantiated in every route (no singleton)
- **Problem**: Every API route creates a new service client instance with the same credentials. DRY violation.
- **Files**: all route handlers in `app/api/`
- **Impact**: LOW
- **Fix**: Create `lib/supabase/service-client.ts` with an exported singleton and reuse it everywhere.

### A4 — RBAC logic scattered across React components
- **Problem**: `CreateUserForm` and `NotificationSettingsManager` embed inline role checks. Changing a permission requires searching across components.
- **Files**: `components/impostazioni/CreateUserForm.tsx:97-98`, `components/impostazioni/NotificationSettingsManager.tsx`
- **Impact**: LOW
- **Fix**: Create `lib/auth-guards.ts` with pure functions (`canCreateFullUser(role)`, etc.) and import them in components.

---

## S — Structure / Code quality

### S1 — `CreateUserForm.tsx` too large (409 lines)
- **Problem**: A single component handles mode toggle, form validation, invite result, and credentials display.
- **Files**: `components/impostazioni/CreateUserForm.tsx`
- **Impact**: LOW
- **Fix**: Extract `InviteResultCard` (email/password display) and keep only form logic in the main component.

### S2 — `CollaboratoreDetail.tsx` too large (474 lines)
- **Problem**: Profile, compensations, reimbursements, and documents all inline in a single client component.
- **Files**: `components/responsabile/CollaboratoreDetail.tsx`
- **Impact**: LOW
- **Fix**: Split into `CollaboratoreHeader`, `CollaboratoreCompensazioni`, `CollaboratoreDocumenti`.

### S3 — `OnboardingWizard.tsx` complex local state (408 lines)
- **Problem**: Steps 1 and 2 are tightly coupled in state. Contract generation logic is inline.
- **Files**: `components/onboarding/OnboardingWizard.tsx`
- **Impact**: LOW
- **Fix**: Extract step logic into sub-components; move contract generation to a dedicated hook.

### S4 — API route input validation not standardized
- **Problem**: `admin/create-user` uses Zod, but `tickets/route.ts` and `documents/route.ts` validate manually with if-chains. Structural inconsistency.
- **Files**: `app/api/tickets/route.ts:82-91`, `app/api/documents/route.ts:68-72`
- **Impact**: MEDIUM
- **Fix**: Standardize all routes on Zod; create shared schemas for recurring payloads (e.g. `PaginationSchema`, `AttachmentSchema`).

### S5 — mark-paid operation is not atomic
- **Problem**: `POST /api/export/mark-paid` updates compensations then inserts history in separate steps. If the second step fails, the record is left in an inconsistent state.
- **Files**: `app/api/export/mark-paid/route.ts:47-84`
- **Impact**: HIGH
- **Fix**: Wrap in a PostgreSQL stored procedure (RPC) for atomicity, or implement explicit rollback on error.

### S6 — Documents query uses `.like('tipo', 'CONTRATTO_%')` instead of `macro_type`
- **Problem**: The generated column `macro_type` exists exactly for this purpose but is not used consistently.
- **Files**: `app/api/documents/route.ts:109`
- **Impact**: LOW
- **Fix**: Replace all `.like('tipo', '...')` filters with `.eq('macro_type', '...')`.

### S7 — No `file.size` check before Buffer upload
- **Problem**: Upload routes do not validate file size before converting to Buffer. The bucket has a 10 MB policy but the check happens after the server has already read the full body.
- **Files**: `app/api/documents/route.ts:128-137`, `app/api/tickets/[id]/messages/route.ts:77-95`
- **Impact**: MEDIUM
- **Fix**: Add `if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File too large' }, { status: 413 })` before the upload.

### S8 — `formatDate` and `formatCurrency` duplicated across 4+ components
- **Problem**: `formatDate` (toLocaleDateString it-IT DD/MM/YYYY) and `formatCurrency` (Intl.NumberFormat EUR) are defined locally in `CompensationList.tsx`, `ExpenseList.tsx`, `PendingApprovedList.tsx`, `PendingApprovedExpenseList.tsx`, and others. Changing the format requires updating all of them.
- **Files**: `components/compensation/CompensationList.tsx`, `components/compensation/PendingApprovedList.tsx`, `components/expense/ExpenseList.tsx`, `components/expense/PendingApprovedExpenseList.tsx`
- **Impact**: LOW
- **Fix**: Extract to `lib/format-utils.ts` and import in all consumers.

---

## T — Type safety

### T1 — `SupabaseClient<any, any, any>` in notification-helpers.ts
- **Problem**: The service client type is `any`, losing all type hints and IDE autocomplete.
- **Files**: `lib/notification-helpers.ts:7`
- **Impact**: LOW
- **Fix**: Use the correct type `SupabaseClient<Database>` by importing the type generated by supabase-codegen.

### T2 — `action as CompensationAction` cast without type guard
- **Problem**: `action` is cast with `as` after Zod validation. The cast is redundant and hides the fact that Zod already guarantees the type.
- **Files**: `app/api/compensations/[id]/transition/route.ts:87`, `app/api/expenses/[id]/transition/route.ts:82`
- **Impact**: LOW
- **Fix**: Remove the `as` cast; let TypeScript infer the type from the Zod output.

### T3 — `Record<string, unknown>` for updatePayload without narrowing
- **Problem**: `updatePayload` built as `Record<string, unknown>` has no shape guarantees before DB insert.
- **Files**: `app/api/compensations/[id]/transition/route.ts:95`, `app/api/expenses/[id]/transition/route.ts:89`
- **Impact**: LOW
- **Fix**: Type as `Partial<Compensation>` or `Partial<Expense>`.

### T4 — State machine action is not a discriminated union
- **Problem**: State machine actions are not discriminated unions. The switch/if-chain has no exhaustive check from TypeScript, making it easy to miss a case when adding new actions.
- **Files**: `app/api/compensations/[id]/transition/route.ts:97-113`
- **Impact**: LOW
- **Fix**: Define `type TransitionPayload = { action: 'approve_manager' } | { action: 'request_integration'; note: string } | ...` and use it as a discriminated union.

### T5 — `tipo` column in `documents` is `text + CHECK` instead of a PostgreSQL ENUM
- **Problem**: No compile-time guarantee that an invalid value cannot be inserted directly via SQL.
- **Files**: `supabase/migrations/001_schema.sql:205`
- **Impact**: LOW
- **Fix**: Create `CREATE TYPE document_tipo AS ENUM (...)` and migrate the column.

---

## SEC — Security / Auth

### SEC1 — Temporary password returned in plain text by the create-user API
- **Problem**: `POST /api/admin/create-user` responds with `{ email, password }` in plain text in the JSON body. Visible in the browser network tab and server logs.
- **Files**: `app/api/admin/create-user/route.ts:159-162`
- **Impact**: HIGH
- **Fix**: Consider Supabase magic link instead of a temporary password. If password is kept, send it only via email — never in the response body.

### SEC2 — Invite email does not include a direct link with token
- **Problem**: The invite email template does not include a pre-authenticated app link. The user must remember email/password from the admin console.
- **Files**: `lib/email-templates.ts` (template E8)
- **Impact**: MEDIUM
- **Fix**: Use `supabase.auth.admin.generateLink({ type: 'magiclink', email })` to add a one-time link to the invite email.

### SEC3 — No rate limiting on POST compensations/reimbursements
- **Problem**: An authenticated collaborator can submit unlimited requests — potential application spam or DoS.
- **Files**: `app/api/compensations/route.ts`, `app/api/expenses/route.ts`
- **Impact**: MEDIUM
- **Fix**: Add application-level check: maximum N compensations in IN_ATTESA/BOZZA state per collaborator (e.g. 20). Alternatively, rate-limit via middleware.

### SEC4 — No rate limiting on create-user
- **Problem**: A compromised admin can create unlimited users.
- **Files**: `app/api/admin/create-user/route.ts`
- **Impact**: MEDIUM
- **Fix**: Rate-limit per admin user (e.g. 10 users/hour) via middleware or DB check.

### SEC5 — RLS on `compensation_history` not covered by tests
- **Problem**: No test verifies that a collaborator cannot read another collaborator's compensation history.
- **Files**: `supabase/migrations/002_rls.sql`
- **Impact**: MEDIUM
- **Fix**: Add RLS test: collaborator B calls GET `/api/compensations/[id_of_A]/` → must receive 403/404.

### SEC6 — No documented rotation policy for `RESEND_API_KEY`
- **Problem**: `RESEND_API_KEY` is in `.env.local` with no documented rotation procedure.
- **Files**: `lib/email.ts:3`, `.env.local.example`
- **Impact**: LOW
- **Fix**: Document in README: "Rotate RESEND_API_KEY every 90 days" + add note in `.env.local.example`.

---

## P — Performance

### P1 — GET compensations join does not enrich collaborator data
- **Problem**: The admin route does not include the collaborator's name/surname in the select, forcing the frontend to merge in-memory or make a second fetch.
- **Files**: `app/api/compensations/route.ts:44-47`
- **Impact**: LOW
- **Fix**: Add `collaborators(nome, cognome)` to the select when the caller is admin/responsabile.

### P2 — Index on `collaborators.user_id` not documented
- **Problem**: `UNIQUE` on `collaborators.user_id` automatically creates an index in Postgres, but it is not explicit in the migration. Confusing for anyone reading the schema.
- **Files**: `supabase/migrations/001_schema.sql:45`
- **Impact**: LOW
- **Fix**: Add comment `-- UNIQUE automatically creates an index on user_id` or create the index explicitly.

### P3 — `getNotificationSettings` called on every transition without cache
- **Problem**: 15 rows read from DB on every compensation/reimbursement transition. At 100 transitions/day = 1,500 identical queries.
- **Files**: `lib/notification-helpers.ts` (getNotificationSettings), used in transition routes
- **Impact**: MEDIUM
- **Fix**: Add in-memory cache with TTL 5 minutes (e.g. `Map` + timestamp) or preload at startup.

### P4 — `getResponsabiliForCommunity` uses unoptimized triple join
- **Problem**: The function executes: select user_community_access → filter user_profiles → fetch collaborators → global `auth.admin.listUsers()` call. Inefficient at scale.
- **Files**: `lib/notification-helpers.ts:62-101`
- **Impact**: MEDIUM
- **Fix**: Convert to a PostgreSQL RPC that returns `PersonInfo[]` directly in a single query with JOINs.

---

## TC — Test coverage

### TC1 — No unit test for new workflow actions (Block 7)
- **Problem**: The new `reopen` (RIFIUTATO → BOZZA) and `approve_all` actions have no unit coverage.
- **Files**: `__tests__/compensation-transitions.test.ts`, `__tests__/expense-transitions.test.ts`
- **Impact**: MEDIUM
- **Fix**: Add tests for reopen, approve_all, reject (with rejection_note). To be done in Block 7c.

### TC3 — No e2e test for bulk mark-paid
- **Problem**: `POST /api/export/mark-paid` with an array of multiple IDs is not covered by any Playwright test.
- **Files**: `e2e/export.spec.ts`
- **Impact**: MEDIUM
- **Fix**: Add scenario `S9: select 3 compensations → bulk mark-liquidated → verify DB state=LIQUIDATO`. To be updated in Block 7c.

### TC4 — No test for Resend email failure path
- **Problem**: `sendEmail().catch(() => {})` is never exercised. The error path is never tested.
- **Files**: `lib/email.ts`, `__tests__/`
- **Impact**: MEDIUM
- **Fix**: Add vitest test with a mocked Resend that throws → verify the catch does not propagate.

### TC5 — No RLS test for `compensation_history` leakage
- **Problem**: No test (unit or e2e) verifies that a collaborator cannot read another collaborator's compensation history.
- **Files**: `__tests__/`, `supabase/migrations/002_rls.sql`
- **Impact**: HIGH
- **Fix**: Add test: collaborator B calls `GET /api/compensations/[id_of_A]` → response 403 or 404.

---

## N — Naming / Conventions

### N3 — Italian URL routes — rename to English
- **Problem**: All app routes use Italian names (`/compensi`, `/rimborsi`, `/documenti`, `/approvazioni`, etc.). There are 30 Italian-named directories under `app/(app)/` and ~60–80 source files with hardcoded references. Inconsistent with the "code in English" convention declared in CLAUDE.md.
- **Scope**:
  - 30 `app/(app)/` directories to rename
  - ~60–80 `.ts`/`.tsx` files with `href`, `redirect()`, `router.push()` to update
  - `proxy.ts` — explicit route whitelist (risk: broken session if a route is missing post-rename)
  - `lib/nav.ts` — central navigation hub
  - `__tests__/api/` — ~15–20 files with hardcoded routes
  - `e2e/` — ~10–15 Playwright specs with `goto('/...')` calls to update
- **Route mapping**: `/compensi→/compensations`, `/rimborsi→/reimbursements`, `/documenti→/documents`, `/approvazioni→/approvals`, `/collaboratori→/collaborators`, `/contenuti→/content`, `/impostazioni→/settings`, `/profilo→/profile`, `/notifiche→/notifications`, `/coda→/queue`, `/ticket→/tickets`, sub-route `/nuova→/new`
- **Impact**: LOW (internal URLs, admin-only portal, no end-user impact)
- **Estimated effort**: ~1–1.5 days (find+replace script + proxy verification + test fixes)
- **Risks**: proxy.ts whitelist, hardcoded redirects in API routes, Next.js type generation after rename
- **Fix**: dedicated block outside the current feature cycle. Procedure: (1) rename directories via script, (2) global find+replace per route, (3) update `proxy.ts` whitelist, (4) `npx tsc --noEmit` + build + full test run.

### N4 — Italian DB column names — rename to English
- **Problem**: Many DB columns use Italian names, inconsistent with the "code in English" convention. Only FE-visible labels and UI text should remain in Italian.
- **Affected columns (non-exhaustive)**:
  - `collaborators`: `nome`, `cognome`, `data_nascita`, `luogo_nascita`, `comune_residenza`, `cap_residenza`, `indirizzo_residenza`, `civico_residenza`, `taglia_tshirt`, `partita_iva`, `sono_un_figlio_a_carico`, `tipo_contratto`, `data_inizio`, `data_fine`
  - `compensations`: `data_competenza`, `periodo_riferimento`, `importo_netto`, `ritenuta_acconto`, `rejection_note` (already English — keep)
  - `documents`: `tipo`, `data_caricamento`, `firma_richiesta_il`
  - `expense_reimbursements`: `data_competenza`, `descrizione`, `importo`
  - All `_history` tables: `role_label`, `note` (already English — keep)
- **Scope**: every renamed column requires: (1) migration `ALTER TABLE t RENAME COLUMN old TO new`, (2) RLS policy review (filter on renamed columns), (3) global grep+replace in `.ts`/`.tsx`, (4) update `lib/types.ts` interface definitions, (5) update all Supabase `.select()` strings
- **Impact**: LOW urgency, HIGH effort — touches the entire schema, all queries, all TS types, and all RLS policies
- **Risk**: RLS policies referencing renamed columns silently stop filtering if not updated. Verify every policy after each rename.
- **Fix**: dedicated block per table group (not all at once). Prerequisite: complete N3 (route rename) first to reduce concurrent churn.

### N5 — Italian PostgreSQL enum values — translate to English
- **Problem**: Status enum values are stored in Italian and used throughout application code. Only FE display labels should be in Italian.
- **Affected enums and values**:
  - Compensation/expense status: `IN_ATTESA → PENDING`, `APPROVATO → APPROVED`, `RIFIUTATO → REJECTED`, `LIQUIDATO → PAID`, `BOZZA → DRAFT`
  - Document status: `DA_FIRMARE → TO_SIGN`, `FIRMATO → SIGNED`
  - Member status: `ATTIVO → ACTIVE`, `USCENTE_CON_COMPENSO → LEAVING_WITH_PAY`, `USCENTE_SENZA_COMPENSO → LEAVING_WITHOUT_PAY`
- **Migration pattern** (per value, in a single migration file):
  1. `ALTER TYPE enum_name ADD VALUE 'NEW_VALUE';`
  2. `UPDATE table SET col = 'NEW_VALUE' WHERE col = 'OLD_VALUE';` (repeat for all tables using this enum)
  3. Cannot `DROP VALUE` from a PostgreSQL enum — old values remain harmless if no row references them, or migrate to `text + CHECK` constraint first to allow full replacement
- **Scope**: ~15 enum values across 3 enums; affects all transition routes, state machine logic, Zod schemas, TS union types, RLS policies, and FE display-label maps
- **Impact**: LOW urgency, HIGH risk — enum value renames are irreversible in PostgreSQL without a full type rebuild; must be done carefully with rollback SQL in migration headers
- **Fix**: dedicated block. Recommended order: (1) document status (smallest blast radius), (2) member status, (3) compensation/expense status (largest — most consumers). FE label maps (`STATUS_LABEL` etc.) must be updated in the same PR to keep display in Italian.
