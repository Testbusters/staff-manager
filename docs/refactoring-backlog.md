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
| SEC9 | `responsabile_compensi` can approve/reject expenses via API (RBAC gap) | HIGH | G3 |
| DB-RLS-1 | 3 dead expense RLS policies reference stale `INVIATO`/`INTEGRAZIONI_RICHIESTE` states | HIGH | G3 |
| DB-RLS-2 | `expense_history` FK CASCADE deletes audit trail on expense deletion | MEDIUM | G3 |
| SEC2 | Invite email does not include a direct link with token | MEDIUM | G3 |
| SEC10 | DELETE `/api/expenses/[id]` phantom success for `responsabile_compensi` (no DELETE RLS) | MEDIUM | G3 |
| SEC11 | `GET /api/expenses` unvalidated `?stato=` query param in `.in()` filter | MEDIUM | G3 |
| SEC14 | Attachment upload trusts client-supplied MIME type (no magic-byte check) | LOW | G3 |
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
| API14 | `bulk-approve` and `bulk-liquidate` return 400 for state-conflict (should be 409) | MEDIUM | G4 |
| API15 | `POST /api/expenses/[id]/attachments` returns 403 for state-guard (should be 422) | LOW | G4 |
| API16 | `POST /api/expenses/[id]/transition` fetches DB before validating request body | LOW | G4 |
| API17 | `POST /api/expenses/[id]/transition` returns only `{ stato }` — no updated entity | LOW | G4 |
| API18 | `approve-all` returns `{ updated }`, `approve-bulk` returns `{ approved }` — inconsistent bulk key | LOW | G4 |
| API19 | Sitemap/filesystem mismatch: `GET,PATCH` on `[id]`, `GET` on `attachments` — none implemented | MEDIUM | G4 |
| API20 | `approve-bulk/route.ts` undocumented in sitemap | LOW | G4 |
| | **G6 - Performance** | | |
| P1 | `GET /api/compensations` join does not enrich collaborator name | LOW | G6 |
| DEV-11 | `GET /api/blacklist` has no pagination - unbounded query | LOW | G6 |
| | **G5 remnants - DRY / Code Quality** | | |
| S8 | `formatDate` and `formatCurrency` duplicated across 4+ components | LOW | G5 |
| DEV-12 | Floating promise on expense approve button (no error feedback) | HIGH | G5 |
| DEV-13 | Phantom state `INVIATO` in expense rate-limit query | LOW | G5 |
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

### SEC9 — `responsabile_compensi` can approve/reject expenses via API (RBAC gap)
- **Problem**: `lib/expense-transitions.ts` grants `responsabile_compensi` approve/reject/mark_liquidated actions. Three API routes (`[id]/transition`, `approve-bulk`, `approve-all`) delegate to that function without explicit role pre-check. UI correctly blocks this, but direct API calls bypass the restriction.
- **Files**: `lib/expense-transitions.ts:16-18`, `app/api/expenses/[id]/transition/route.ts:74`, `app/api/expenses/approve-bulk/route.ts:25`, `app/api/expenses/approve-all/route.ts:27`
- **Impact**: HIGH
- **Fix**: Add explicit role pre-check in each route; remove resp from `ALLOWED_EXPENSE_TRANSITIONS` for approve/reject/mark_liquidated.

### DB-RLS-1 — 3 dead expense RLS policies reference stale states
- **Problem**: `expenses_own_update_inviato`, `expenses_responsabile_update`, and `exp_attachments_own_insert` reference `INVIATO` and `INTEGRAZIONI_RICHIESTE` states removed in migration 023. Policies are effectively dead - no rows match. Mitigated by API-level service role usage and state checks, but defense-in-depth is absent.
- **Impact**: HIGH
- **Fix**: Single migration: (1) drop `expenses_own_update_inviato`, recreate with `stato = 'IN_ATTESA'`; (2) drop `expenses_responsabile_update` (resp has read-only access per RBAC matrix); (3) fix `exp_attachments_own_insert` to reference `'IN_ATTESA'`.

### DB-RLS-2 — `expense_history` FK CASCADE deletes audit trail
- **Problem**: `expense_history.reimbursement_id` uses ON DELETE CASCADE. Deleting an expense destroys the full audit trail. Financial records require preserved history.
- **Impact**: MEDIUM
- **Fix**: Change FK to ON DELETE RESTRICT. DELETE route already checks `stato = 'IN_ATTESA'` (only fresh expenses deletable).

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

### API14 — `bulk-approve` and `bulk-liquidate` return 400 for state-conflict (should be 409)
- **Problem**: Both routes check that records are in the expected prior state and return 400 when they are not. A state conflict (approving a non-IN_ATTESA record, liquidating a non-APPROVATO record) is not a malformed request — it is a valid request that conflicts with current server state, which maps to 409 per RFC 9457.
- **Files**: `app/api/expenses/bulk-approve/route.ts:53-57` · `app/api/expenses/bulk-liquidate/route.ts:48-53`
- **Impact**: MEDIUM
- **Fix**: Change `{ status: 400 }` to `{ status: 409 }` on the state-guard returns in both routes. No logic change needed.

### API15 — `POST /api/expenses/[id]/attachments` returns 403 for state-guard (should be 422)
- **Problem**: Line 32 returns 403 when `expense.stato !== 'IN_ATTESA'`. This is a business rule (not a permission denial) — the caller is authenticated and authorized; the upload is blocked because the record is in the wrong state. RFC 9457 maps this to 422 (semantically invalid given current state). A 403 implies the caller lacks permission, which is misleading.
- **Files**: `app/api/expenses/[id]/attachments/route.ts:32-34`
- **Impact**: LOW
- **Fix**: Change `{ status: 403 }` to `{ status: 422 }` on the state-guard return.

### API16 — `POST /api/expenses/[id]/transition` fetches DB before validating request body
- **Problem**: The route fetches `expense_reimbursements` (line 55-63) before calling `request.json()` + `safeParse` (lines 65-68). This wastes a DB round-trip on invalid requests. Validation should always happen before any DB operation.
- **Files**: `app/api/expenses/[id]/transition/route.ts:55-68`
- **Impact**: LOW
- **Fix**: Move the `request.json()` + `safeParse` block to immediately after the `isValidUUID` check (line 52), before the expense fetch.

### API17 — `POST /api/expenses/[id]/transition` returns only `{ stato }` — no updated entity
- **Problem**: Success response is `{ stato: newStato }` (line 242). Clients must fire a second GET to get the updated `approved_at`, `liquidated_at`, `rejection_note`, and `payment_reference` fields. This forces an extra round-trip after every transition.
- **Files**: `app/api/expenses/[id]/transition/route.ts:242`
- **Impact**: LOW
- **Fix**: Return the updated record: `{ reimbursement: updatedExpense }` by re-fetching after the update, or pass the merged payload directly.

### API18 — Bulk endpoint response key inconsistency (`updated` vs `approved`)
- **Problem**: `POST /api/expenses/approve-all` returns `{ updated: N }` while `POST /api/expenses/approve-bulk` returns `{ approved: N }`. Both perform the same logical operation (bulk approve) but use different keys for the count. This breaks any client code trying to handle both uniformly.
- **Files**: `app/api/expenses/approve-all/route.ts:121` · `app/api/expenses/approve-bulk/route.ts:101`
- **Impact**: LOW
- **Fix**: Standardize on `{ approved: N }` for all bulk-approve routes. Update `approve-all` success response accordingly.

### API19 — Sitemap declares methods not implemented: PATCH on `[id]`, GET on `attachments`
- **Problem**: `docs/sitemap.md` lists `GET, PATCH` for `/api/expenses/[id]` (only GET and DELETE exist) and `GET, POST` for `/api/expenses/[id]/attachments` (only POST exists). These are dead contracts — clients or future developers expecting PATCH edit capability or GET attachment listing will find no handler.
- **Files**: `app/api/expenses/[id]/route.ts` · `app/api/expenses/[id]/attachments/route.ts` · `docs/sitemap.md:290-292`
- **Impact**: MEDIUM
- **Fix**: Either implement the missing handlers (PATCH for inline edits, GET for attachment listing) or correct the sitemap to reflect only the methods that exist. If `GET /attachments` is intentionally omitted (attachments returned inside `GET /expenses/[id]`), update sitemap to `POST` only.

### API20 — `approve-bulk/route.ts` undocumented in sitemap
- **Problem**: `app/api/expenses/approve-bulk/route.ts` exists on the filesystem but is absent from `docs/sitemap.md`. The sitemap only lists `bulk-approve`. Both routes exist, both are POST handlers for bulk approval, but they differ: `approve-bulk` targets resp+admin (max 100 IDs, no massimale check), `bulk-approve` targets admin-only (max 500 IDs, massimale check). The duplication and the undocumented route are a maintenance hazard.
- **Files**: `app/api/expenses/approve-bulk/route.ts` · `docs/sitemap.md`
- **Impact**: LOW
- **Fix**: Document `approve-bulk` in sitemap. Long-term: consolidate into one route with `force` flag or explicit massimale parameter (API5 covers the naming part).

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

### DEV-12 — Floating promise on expense approve button (no error feedback)
- **Problem**: `onClick: () => perform('approve')` in `ExpenseActionPanel.tsx` discards the async result. Network errors or state update failures produce no user feedback.
- **Files**: `components/expense/ExpenseActionPanel.tsx:98`
- **Impact**: HIGH
- **Fix**: Convert to `onClick: async () => { await perform('approve'); }` or handle errors explicitly.

### DEV-13 — Phantom state `INVIATO` in expense rate-limit query
- **Problem**: `.in('stato', ['IN_ATTESA', 'INVIATO'])` references `INVIATO` state removed by migration 023. Dead code.
- **Files**: `app/api/expenses/route.ts:84`
- **Impact**: LOW
- **Fix**: Replace with `.eq('stato', 'IN_ATTESA')`.

### SEC10 — DELETE `/api/expenses/[id]` phantom success for `responsabile_compensi`
- **Problem**: `responsabile_compensi` passes the role check but has no DELETE RLS policy on `expense_reimbursements`. `.delete()` silently removes 0 rows and route returns 204 - false success.
- **Files**: `app/api/expenses/[id]/route.ts:84`
- **Impact**: MEDIUM
- **Fix**: Remove `responsabile_compensi` from the DELETE handler's role list, or add a DELETE RLS policy.

### SEC11 — `GET /api/expenses` unvalidated `?stato=` query param
- **Problem**: `stato` query param split on comma and fed into `.in('stato', stati)` with no allowlist. Callers can probe internal enum names.
- **Files**: `app/api/expenses/route.ts:39`
- **Impact**: MEDIUM
- **Fix**: Add `z.enum(EXPENSE_STATUSES).array()` validation or allowlist filter before the query.

### SEC14 — Attachment upload trusts client-supplied MIME type
- **Problem**: `file.type` is browser-controlled. An attacker can set `type = "application/pdf"` while uploading a different file type.
- **Files**: `app/api/expenses/[id]/attachments/route.ts:53`
- **Impact**: LOW
- **Fix**: Add magic-byte detection for PDF/JPEG/PNG.
