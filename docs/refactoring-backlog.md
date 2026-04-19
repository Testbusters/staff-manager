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
| DB-RLS-2 | `expense_history` FK CASCADE deletes audit trail on expense deletion | MEDIUM | G3 |
| SEC2 | Invite email does not include a direct link with token | MEDIUM | G3 |
| SEC10 | DELETE `/api/expenses/[id]` phantom success for `responsabile_compensi` (no DELETE RLS) | MEDIUM | G3 |
| SEC11 | `GET /api/expenses` unvalidated `?stato=` query param in `.in()` filter | MEDIUM | G3 |
| SEC15 | `exp_history_insert_authenticated` RLS allows any active user to forge expense audit trail | MEDIUM | G3 |
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
| API21 | Sitemap declares `GET /api/profile` — handler not implemented (405 on GET) | MEDIUM | G4 |
| API22 | Sitemap says `POST /api/profile/password` open to C/R/A — route 403s non-collaboratori | MEDIUM | G4 |
| | **G6 - Performance** | | |
| PERF-1 | `ProfileForm.tsx` useEffect fetches lookup options (citta/materie) on every mount | HIGH | G6 |
| PERF-2 | `app/(app)/layout.tsx` banner queries sequential + uncached on every collab page load | HIGH | G6 |
| PERF-3 | `app/(app)/profilo/page.tsx` documents query uses `select('*')` | MEDIUM | G6 |
| PERF-4 | `profilo/page.tsx` + `ProfileForm.tsx` unsized `<img>` avatar tags (CLS risk) | MEDIUM | G6 |
| P1 | `GET /api/compensations` join does not enrich collaborator name | LOW | G6 |
| DEV-11 | `GET /api/blacklist` has no pagination - unbounded query | LOW | G6 |
| | **G5 remnants - DRY / Code Quality** | | |
| S8 | `formatDate` and `formatCurrency` duplicated across 4+ components | LOW | G5 |
| DEV-14 | `MassimaleImpact` type defined in client component, imported by API route | MEDIUM | G5 |
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
| S7 | `ProfileForm.tsx` too large (1038L, 7+ responsibilities) | MEDIUM | G8 |
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
| UI-4 | `OnboardingWizard.tsx` success/warning panels use hardcoded green/yellow instead of semantic tokens | LOW | G9 |

---

## Detail sections

### SEC1 — Temporary password returned in plain text by the create-user API
- **Problem**: `POST /api/admin/create-user` responds with `{ email, password }` in plain text in the JSON body. Visible in the browser network tab and server logs.
- **Files**: `app/api/admin/create-user/route.ts:159-162`
- **Impact**: HIGH
- **Fix**: Consider Supabase magic link instead of a temporary password. If password is kept, send it only via email - never in the response body.


### DB-RLS-2 — `expense_history` FK CASCADE deletes audit trail
- **Problem**: `expense_history.reimbursement_id` uses ON DELETE CASCADE. Deleting an expense destroys the full audit trail. Financial records require preserved history.
- **Impact**: MEDIUM
- **Fix**: Change FK to ON DELETE RESTRICT. DELETE route already checks `stato = 'IN_ATTESA'` (only fresh expenses deletable).

### SEC2 — Invite email does not include a direct link with token
- **Problem**: Invite email has no pre-authenticated app link. User must remember email/password from admin console.
- **Files**: `lib/email-templates.ts` (template E8)
- **Impact**: MEDIUM
- **Fix**: Use `supabase.auth.admin.generateLink({ type: 'magiclink', email })` to add a one-time link.


### SEC15 — `exp_history_insert_authenticated` RLS too broad
- **Problem**: `exp_history_insert_authenticated` policy has `WITH CHECK (is_active_user())` - any active user can insert `expense_history` rows for any `reimbursement_id`, including expenses they don't own. Financial audit trail integrity bypass via direct Supabase client.
- **Files**: `supabase/migrations/002_rls.sql`
- **Impact**: MEDIUM
- **Fix**: Add `EXISTS (SELECT 1 FROM expense_reimbursements e WHERE e.id = expense_history.reimbursement_id AND (e.collaborator_id = get_my_collaborator_id() OR get_my_role() IN ('amministrazione', 'responsabile_compensi')))` to WITH CHECK. Same pattern applies to `compensation_history`.

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

### API21 — `GET /api/profile` handler not implemented
- **Problem**: `docs/sitemap.md` declares `GET, PATCH` for `/api/profile` with `C, R, A` access. Only the PATCH handler exists; a GET request returns 405. The `/profilo` page currently fetches profile data via direct Supabase server client, so no consumer is broken today, but the sitemap contract is incorrect.
- **Files**: `app/api/profile/route.ts` · `docs/sitemap.md`
- **Impact**: MEDIUM
- **Fix**: Either implement `GET /api/profile` (session-scoped read of the current user's collaborator + user_profile data) or update the sitemap to list `PATCH` only.

### API22 — `POST /api/profile/password` sitemap/implementation mismatch
- **Problem**: `docs/sitemap.md` lists `POST /api/profile/password` as accessible to `C, R, A`. The handler explicitly returns 403 for `responsabile_compensi` and `amministrazione`. No runtime mismatch today because `PasswordChangeForm` is only rendered for collaboratori, but a future admin password-change UI would get a surprising 403.
- **Files**: `app/api/profile/password/route.ts:27-29` · `docs/sitemap.md`
- **Impact**: MEDIUM
- **Fix**: Decide the correct access scope. If password change is collaboratore-only, update the sitemap to `C` only. If it should be available to all roles, remove the role guard (the password change itself is scoped to `user.id`).

### PERF-1 — `ProfileForm.tsx` fetches lookup options via useEffect on every mount
- **Problem**: `ProfileForm.tsx:214` runs two sequential `fetch()` calls in a `useEffect` to load città + materie options. Data is semi-static per community, but fires on every mount and arrives after hydration causing Select dropdowns to flash empty-then-populated.
- **Files**: `components/ProfileForm.tsx:214`
- **Impact**: HIGH
- **Fix**: Fetch server-side in `app/(app)/profilo/page.tsx` `Promise.all` block and pass `cittaOptions`/`materiaOptions` as props to `ProfileForm`. Bundle with the planned `ProfileForm` decomposition (S7).

### PERF-2 — Layout banner queries sequential + uncached on every collab page load
- **Problem**: `app/(app)/layout.tsx:71-81` fetches `collaborator_communities` then `communities` in sequence for every authenticated collaboratore page load. The queries are not wrapped in `React.cache`, so re-render within the same request triggers new DB round-trips.
- **Files**: `app/(app)/layout.tsx:71-81`
- **Impact**: HIGH
- **Fix**: Wrap both queries in a single cached `getBannerData(collaboratorId)` function alongside the existing `getSessionProfile`/`getSessionCollaborator`. Sequential flow is intrinsic (second depends on first), but caching eliminates repetition.

### PERF-3 — `profilo/page.tsx` documents query uses `select('*')`
- **Problem**: `app/(app)/profilo/page.tsx:82` uses `.select('*, collaborators(nome, cognome)')` on the documents query — fetches every document column when the Documenti tab only needs id/tipo/stato/dates.
- **Files**: `app/(app)/profilo/page.tsx:82`
- **Impact**: MEDIUM
- **Fix**: Replace with explicit column list matching `DocumentList` consumption.

### PERF-4 — Avatar `<img>` tags without width/height (CLS risk)
- **Problem**: `app/(app)/profilo/page.tsx:130` and `components/ProfileForm.tsx:317` render raw `<img>` tags without explicit dimensions. Browser cannot reserve layout space before load → content below shifts on first cold-cache render.
- **Files**: `app/(app)/profilo/page.tsx:130`, `components/ProfileForm.tsx:317`
- **Impact**: MEDIUM
- **Fix**: Switch to Next.js `<Image>` component or add `width={56}`/`height={56}` (and `width={64}`/`height={64}`) — remove the existing `eslint-disable-next-line @next/next/no-img-element` suppression.

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

### DEV-14 — `MassimaleImpact` type defined in client component, imported by API route
- **Problem**: `MassimaleImpact` type lives in `components/admin/MassimaleCheckModal.tsx` but is imported by `app/api/expenses/bulk-approve/route.ts`. Server code depending on client component for type definition is a wrong-direction dependency.
- **Files**: `components/admin/MassimaleCheckModal.tsx`, `app/api/expenses/bulk-approve/route.ts:7`
- **Impact**: MEDIUM
- **Fix**: Move `MassimaleImpact` to `lib/types.ts`, update both importers.

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

### S7 — `ProfileForm.tsx` too large (1038L, 7+ responsibilities)
- **Problem**: Single component handles avatar upload state + upload handler, lookup-options fetch (città/materie), guida fiscale modal state, 8 collapsible form sections (Informazioni personali, Documento, Alimentazione, Spedizione, Contatti, Pagamento, Attività, Sicurezza/Tab), GDPR consent cross-field logic, form submission, and inline `Section`/`Field`/`GuideBox` sub-components. Divergent change risk: any new profile section requires touching this file.
- **Files**: `components/ProfileForm.tsx`
- **Impact**: MEDIUM
- **Fix**: Extract in order of payoff — (1) `Section`/`Field`/`GuideBox` into `components/profile/primitives.tsx`; (2) avatar upload into `components/profile/AvatarUpload.tsx`; (3) each collapsible block into its own `components/profile/sections/<Section>.tsx` sharing the form via `useFormContext()`. Target <300L per file.

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

### UI-4 — `OnboardingWizard.tsx` success/warning panels use hardcoded green/yellow
- **Problem**: Lines 819, 836, 871 use paired `bg-green-50 dark:bg-green-900/20` / `bg-yellow-50 dark:bg-yellow-900/20` for "Contratto generato" / "Account configurato" success panels and warning banners. Pattern pre-exists this block — works visually but is not tokenized.
- **Files**: `components/onboarding/OnboardingWizard.tsx:819,836,871`
- **Impact**: LOW
- **Fix**: Migrate to `Alert` component variants or semantic tokens (`bg-success/10`, `bg-warning/10`).


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
