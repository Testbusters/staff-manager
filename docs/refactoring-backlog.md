# Refactoring Backlog

Open structural, DB naming, and architectural issues. Resolved items are removed on closure.

> Update this file whenever a structural issue emerges that is not resolved in the current block.

---

## Priority index

Ordered by execution group. G1/G1b/G2/G5/G7 fully resolved and removed.

**Group dependencies**: G3 (security code) → G4 (API design) → G6 (perf) → G8 (large refactors) → G9 (UI/UX).

| ID | Title | Impact | Group |
|----|--------|---------|-------|
| | **G3 - Security Code** | | |
| SEC1 | Temporary password returned in plain text by create-user API | HIGH | G3 |
| SEC8 | `expenses` bucket missing - attachment uploads silently fail | HIGH | G3 |
| SEC2 | Invite email does not include a direct link with token | MEDIUM | G3 |
| SEC-NEW-4 | 7 admin RLS `FOR ALL` policies lack explicit `WITH CHECK` | LOW | G3 |
| SEC6 | No documented rotation policy for `RESEND_API_KEY` | LOW | G3 |
| | **G4 - API Design** | | |
| C14 | `GET /api/candidature` handler missing - sitemap declares it, only POST exists | HIGH | G4 |
| DB9 | `GET /api/compensations` and `GET /api/expenses` fully unbounded - no pagination | HIGH | G4 |
| DB10 | `GET /api/tickets` fully unbounded - no pagination | HIGH | G4 |
| S5 | mark-paid operation not atomic (no transaction) | HIGH | G4 |
| API4 | `expenses` route: collection key `expenses` vs create key `reimbursement` | LOW | G4 |
| API5 | Duplicate bulk-action routes with inverted naming convention | LOW | G4 |
| API7 | No unified pagination contract across endpoints | LOW | G4 |
| API8 | `POST /api/admin/create-user` returns 200 instead of 201 | LOW | G4 |
| API13 | `POST /api/import/collaboratori/run` `skipContract` defaults to `true` | LOW | G4 |
| | **G6 - Performance** | | |
| PERF-7 | `select('*')` on 20+ API list routes - over-fetches large text columns | MEDIUM | G6 |
| P1 | `GET /api/compensations` join does not enrich collaborator name | LOW | G6 |
| DEV-11 | `GET /api/blacklist` has no pagination - unbounded query | LOW | G6 |
| | **G5 remnants - DRY / Code Quality** | | |
| S8 | `formatDate` and `formatCurrency` duplicated across 4+ components | LOW | G5 |
| DEV-7 | Cross-module coupling: expense/ imports compensation/, responsabile/ imports admin/ | LOW | G5 |
| DEV-10 | `pdf-utils.ts` uses `as any` for pdfjs-dist and pdf-lib types | LOW | G5 |
| A3 | `createServiceClient()` instantiated per route (no singleton) | LOW | G5 |
| A4 | RBAC logic scattered across React components | LOW | G5 |
| T1 | `SupabaseClient<any, any, any>` in notification-helpers.ts | LOW | G5 |
| T4 | State machine action is not a discriminated union | LOW | G5 |
| T5 | `tipo` column in documents is `text + CHECK` instead of PostgreSQL ENUM | LOW | G5 |
| | **G8 - Large Refactors** | | |
| B2 | Inconsistent naming: table `expense_reimbursements`, TS `Expense`, FK `reimbursement_id` | MEDIUM | G8 |
| S1 | `CreateUserForm.tsx` too large (409L) | LOW | G8 |
| S2 | `CollaboratoreDetail.tsx` too large (474L) | LOW | G8 |
| S3 | `OnboardingWizard.tsx` complex local state (408L) | LOW | G8 |
| S6 | Documents query uses `.like('tipo', 'CONTRATTO_%')` instead of `macro_type` | LOW | G8 |
| N2 | `contenuti/page.tsx` accessible to collaboratori but not in nav | LOW | G8 |
| N3 | Italian URL routes - rename to English (~30 dirs, ~60-80 files) | LOW | G8 |
| N4 | Italian DB column names - rename to English | LOW | G8 |
| N5 | Italian PostgreSQL enum values - translate to English | LOW | G8 |
| | **G9 - UI/UX** | | |
| VI-1 | 9/10/11px font sizes coexist with design system scale - consolidate | MEDIUM | G9 |
| VI-2 | Muted-foreground text at 9-10px on dark backgrounds may fail APCA Lc 45 | MEDIUM | G9 |
| VI-8 | `/rimborsi/[id]` IN_ATTESA state sparse - add timeline section | MEDIUM | G9 |
| UX-2 | Form validation inconsistency: 1 form uses RHF+Zod, 30+ use useState+toast | MEDIUM | G9 |
| UX-10 | `/profilo` 15+ fields, no sticky save button or collapsible sections | MEDIUM | G9 |
| VI-3 | Brand red netto values - verify APCA contrast against dark bg | LOW | G9 |
| VI-4 | `/approvazioni` too many equally-weighted elements | LOW | G9 |
| VI-7 | `/comunicazioni` with <=2 items feels sparse | LOW | G9 |
| VI-9 | `/rimborsi/[id]` rejection note same visual weight as attachments | LOW | G9 |
| UX-11 | `/profilo` required field markers inconsistent | LOW | G9 |
| UX-12 | `/profilo` Sicurezza card visually disconnected | LOW | G9 |
| UX1 | Ticket form validation: global toast only, no inline field errors | LOW | G9 |
| UX2 | Tab switching pattern inconsistency across pages | LOW | G9 |
| RESP-7 | Systemic: 28-36px touch targets below 44px WCAG minimum | LOW | G9 |
| UI3 | Inline badge color maps duplicating `lib/content-badge-maps.ts` in 10 files | LOW | G9 |

---

## Detail sections

### SEC1 — Temporary password returned in plain text by the create-user API
- **Problem**: `POST /api/admin/create-user` responds with `{ email, password }` in plain text in the JSON body. Visible in the browser network tab and server logs.
- **Files**: `app/api/admin/create-user/route.ts:159-162`
- **Impact**: HIGH
- **Fix**: Consider Supabase magic link instead of a temporary password. If password is kept, send it only via email - never in the response body.

### SEC8 — `expenses` bucket missing - expense attachment uploads silently fail
- **Problem**: `components/expense/ExpenseForm.tsx` uploads to `storage.from('expenses')` which does not exist. Every attachment upload silently fails. Also violates the project rule that storage operations must go through API routes with service role.
- **Files**: `components/expense/ExpenseForm.tsx:126,134`, missing migration for bucket creation
- **Impact**: HIGH
- **Fix**: (1) Create `expenses` bucket via migration with `public: false`, (2) Move upload to `POST /api/expenses/[id]/attachments` using service role, (3) Remove direct storage access from client component.

### SEC2 — Invite email does not include a direct link with token
- **Problem**: Invite email has no pre-authenticated app link. User must remember email/password from admin console.
- **Files**: `lib/email-templates.ts` (template E8)
- **Impact**: MEDIUM
- **Fix**: Use `supabase.auth.admin.generateLink({ type: 'magiclink', email })` to add a one-time link.


### SEC-NEW-4 — Admin RLS `FOR ALL` policies lack explicit `WITH CHECK`
- **Problem**: 7 admin-only `FOR ALL` policies omit `WITH CHECK`. Functionally equivalent but non-standard.
- **Impact**: LOW
- **Fix**: Add explicit `WITH CHECK (get_my_role() = 'amministrazione')` to each.

### SEC6 — No documented rotation policy for `RESEND_API_KEY`
- **Problem**: No documented rotation procedure.
- **Impact**: LOW
- **Fix**: Document in README.

### C14 — `GET /api/candidature` handler missing
- **Problem**: Sitemap declares it, only POST exists.
- **Impact**: HIGH

### DB9 — Unbounded `GET /api/compensations` and `GET /api/expenses`
- **Problem**: No `.limit()` or pagination. Admin view returns full table.
- **Files**: `app/api/compensations/route.ts:30-36`, `app/api/expenses/route.ts:33-39`
- **Impact**: HIGH
- **Fix**: Add pagination (`page`, `pageSize`) with default 50.

### DB10 — `GET /api/tickets` unbounded
- **Problem**: Same as DB9. `.select('*').order('created_at')` with no limit.
- **Files**: `app/api/tickets/route.ts:31-36`
- **Impact**: HIGH
- **Fix**: Add pagination matching DB9.

### S5 — mark-paid operation not atomic
- **Problem**: Updates compensations then inserts history in separate steps. Partial failure = inconsistent state.
- **Files**: `app/api/export/mark-paid/route.ts:47-84`
- **Impact**: HIGH
- **Fix**: PostgreSQL RPC for atomicity, or explicit rollback on error.

### API4 — `expenses` route: inconsistent collection/create key
- **Problem**: GET returns `{ expenses }`, POST returns `{ reimbursement }`. Same entity, two keys.
- **Files**: `app/api/expenses/route.ts:45,133`
- **Impact**: LOW

### API5 — Duplicate bulk-action routes with inverted naming
- **Problem**: `approve-bulk` (resp) vs `bulk-approve` (admin) - names are anagrams.
- **Files**: `app/api/compensations/approve-bulk/`, `bulk-approve/`, `approve-all/`, expense equivalents
- **Impact**: LOW

### API7 — No unified pagination contract
- **Problem**: Paginated endpoints use different param/response naming.
- **Impact**: LOW

### API8 — `POST /api/admin/create-user` returns 200 instead of 201
- **Files**: `app/api/admin/create-user/route.ts:183`
- **Impact**: LOW

### API13 — `POST /api/import/collaboratori/run` `skipContract` defaults to `true`
- **Impact**: LOW

### PERF-7 — `select('*')` on 20+ API list routes
- **Problem**: Over-fetches large text columns on list endpoints.
- **Impact**: MEDIUM

### P1 — GET compensations join does not enrich collaborator name
- **Files**: `app/api/compensations/route.ts:44-47`
- **Impact**: LOW

### DEV-11 — `GET /api/blacklist` unbounded
- **Impact**: LOW

### S8 — `formatDate` and `formatCurrency` duplicated across 4+ components
- **Files**: `components/compensation/CompensationList.tsx`, `ExpenseList.tsx`, `PendingApprovedList.tsx`, `PendingApprovedExpenseList.tsx`
- **Impact**: LOW
- **Fix**: Extract to `lib/format-utils.ts`.

### DEV-7 — Cross-module coupling between feature component folders
- **Problem**: expense/ imports from compensation/, compensation/ imports from expense/, responsabile/ imports from admin/.
- **Impact**: LOW
- **Fix**: Move `StatusBadge` and `CollaboratorAvatar` to `components/ui/`.

### DEV-10 — `pdf-utils.ts` uses `as any` for pdfjs-dist and pdf-lib types
- **Files**: `lib/pdf-utils.ts:34,236`
- **Impact**: LOW

### A3 — `createServiceClient()` instantiated per route (no singleton)
- **Impact**: LOW
- **Fix**: `lib/supabase/service-client.ts` singleton.

### A4 — RBAC logic scattered across React components
- **Impact**: LOW
- **Fix**: `lib/auth-guards.ts` with pure functions.

### T1 — `SupabaseClient<any, any, any>` in notification-helpers.ts
- **Files**: `lib/notification-helpers.ts:7`
- **Impact**: LOW

### T4 — State machine action is not a discriminated union
- **Files**: `app/api/compensations/[id]/transition/route.ts:97-113`
- **Impact**: LOW

### T5 — `tipo` column in documents is `text + CHECK` instead of ENUM
- **Impact**: LOW

### B2 — Inconsistent naming: expense_reimbursements / Expense / reimbursement_id
- **Fix**: Standardize on `expense_reimbursements`; rename FK `reimbursement_id` → `expense_id`.
- **Impact**: MEDIUM

### S1 — `CreateUserForm.tsx` too large (409L)
- **Fix**: Extract `InviteResultCard`.
- **Impact**: LOW

### S2 — `CollaboratoreDetail.tsx` too large (474L)
- **Fix**: Split into header + compensazioni + documenti sub-components.
- **Impact**: LOW

### S3 — `OnboardingWizard.tsx` complex local state (408L)
- **Fix**: Extract step sub-components; move contract generation to hook.
- **Impact**: LOW

### S6 — Documents query uses `.like('tipo', 'CONTRATTO_%')` instead of `macro_type`
- **Fix**: Replace with `.eq('macro_type', '...')`.
- **Impact**: LOW

### N2 — `contenuti/page.tsx` accessible to collaboratori but not in nav
- **Note**: Page is admin CRUD. Collaboratori have dedicated pages per content type. By design - not a bug.
- **Impact**: LOW

### N3 — Italian URL routes - rename to English
- **Scope**: ~30 dirs, ~60-80 files, proxy.ts whitelist, lib/nav.ts
- **Impact**: LOW (internal URLs, admin portal)

### N4 — Italian DB column names - rename to English
- **Impact**: LOW urgency, HIGH effort
- **Prerequisite**: N3

### N5 — Italian PostgreSQL enum values - translate to English
- **Impact**: LOW urgency, HIGH risk (enum value renames irreversible in PostgreSQL)

### VI-1 — Font sizes 9/10/11px outside design system scale
- **Impact**: MEDIUM

### VI-2 — Muted-foreground at 9-10px may fail APCA contrast
- **Impact**: MEDIUM

### VI-8 — `/rimborsi/[id]` IN_ATTESA state sparse
- **Fix**: Add timeline section.
- **Impact**: MEDIUM

### UX-2 — Form validation: 1 RHF+Zod vs 30+ useState+toast
- **Impact**: MEDIUM

### UX-10 — `/profilo` 15+ fields, no sticky save or collapsible sections
- **Impact**: MEDIUM

### VI-3 — Brand red netto values - APCA contrast check
- **Impact**: LOW

### VI-4 — `/approvazioni` too many equally-weighted elements
- **Impact**: LOW

### VI-7 — `/comunicazioni` sparse with <=2 items
- **Impact**: LOW

### VI-9 — `/rimborsi/[id]` rejection note same weight as attachments
- **Impact**: LOW

### UX-11 — `/profilo` required field markers inconsistent
- **Impact**: LOW

### UX-12 — `/profilo` Sicurezza card visually disconnected
- **Impact**: LOW

### UX1 — Ticket form: toast only, no inline field errors
- **Impact**: LOW

### UX2 — Tab switching pattern inconsistency
- **Impact**: LOW

### RESP-7 — Touch targets 28-36px below 44px WCAG minimum
- **Impact**: LOW

### UI3 — Inline badge color maps duplicated in 10 files
- **Impact**: LOW
