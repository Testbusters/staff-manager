# Refactoring Backlog

Structural, DB naming, and architectural issues to address in dedicated sessions.
Not blocking for current functionality unless marked **CRITICAL/HIGH**.

> Update this file whenever a structural issue emerges that is not resolved in the current block.

---

## Priority index

Ordered by execution group (G1-G9). Execute groups in order; items within each group are independent.

**Group dependencies**: G1 (CVE, ✅ done 2026-04-15) → G1b (xlsx migration, ✅ done 2026-04-15) → G2 (DB schema) → G3 (security code) → G4 (API design) → G5 (DRY) → G6 (perf) → G7 (tests) → G8 (large refactors) → G9 (UI/UX).
- G2 depends on G1+G1b: clean `npm audit` baseline before schema work (both done; 0 residual vulnerabilities).
- G3 depends on G2: schema constraints (NOT NULL, CHECK) must be in place before code-level security fixes.
- G4 depends on G2+G3: schema + security patterns stable before API contract changes.
- G5 depends on G4: API routes stable before extracting shared code.
- G6 depends on G4+G5: pagination + shared utilities in place before performance work.
- G7 depends on G3+G4: security + API contracts stable before writing regression tests.
- G8 depends on G5+G7: shared code extracted + tests as safety net before large refactors.
- G9 depends on G8: component structure stable before visual/UX polish.

| ID | Title | Impact | Group |
|----|--------|---------|-------|
| | **G2 - DB Schema (migrations only)** — ✅ ALL RESOLVED | | |
| | **G3 - Security Code** | | |
| SEC1 | Temporary password returned in plain text by create-user API | HIGH | G3 |
| SEC8 | `expenses` bucket missing - attachment uploads silently fail | HIGH | G3 |
| ~~SEC-NEW-5~~ | ~~`POST /api/auth/change-password` no Zod schema~~ — RESOLVED | ~~HIGH~~ | G3 |
| SEC2 | Invite email does not include a direct link with token | MEDIUM | G3 |
| SEC3 | No rate limiting on POST compensations/reimbursements | MEDIUM | G3 |
| SEC4 | No rate limiting on create-user | MEDIUM | G3 |
| ~~SEC10~~ | ~~DB error messages forwarded verbatim to client~~ — RESOLVED | ~~MEDIUM~~ | G3 |
| SEC14 | Leaked password protection disabled in Supabase Auth | MEDIUM | G3 |
| ~~SEC16~~ | ~~`app_errors` INSERT RLS~~ — RESOLVED (migration 062) | ~~MEDIUM~~ | G3 |
| ~~SEC-NEW-2~~ | ~~16+ import/export routes forward `err.message` to client~~ — RESOLVED | ~~MEDIUM~~ | G3 |
| ~~SEC-NEW-3~~ | ~~40 dynamic route handlers lack UUID path-param validation~~ — RESOLVED | ~~MEDIUM~~ | G3 |
| SEC-NEW-8 | `POST /api/admin/collaboratori/[id]/resend-invite` no rate limiting | MEDIUM | G3 |
| ~~SEC-17~~ | ~~Telegram webhook TOCTOU: non-atomic token validation~~ — RESOLVED | ~~MEDIUM~~ | G3 |
| SEC-NEW-4 | 7 admin RLS `FOR ALL` policies lack explicit `WITH CHECK` | LOW | G3 |
| SEC6 | No documented rotation policy for `RESEND_API_KEY` | LOW | G3 |
| | **G4 - API Design** | | |
| C14 | `GET /api/candidature` handler missing - sitemap declares it, only POST exists | HIGH | G4 |
| DB9 | `GET /api/compensations` and `GET /api/expenses` fully unbounded - no pagination | HIGH | G4 |
| DB10 | `GET /api/tickets` fully unbounded - no pagination | HIGH | G4 |
| S5 | mark-paid operation not atomic (no transaction) | HIGH | G4 |
| ~~API2~~ | ~~`canTransition` 403 for state conflicts~~ — RESOLVED | ~~MEDIUM~~ | G4 |
| ~~API3~~ | ~~State conflicts 400→409~~ — RESOLVED (already 409) | ~~MEDIUM~~ | G4 |
| ~~API6~~ | ~~content/ticket write routes lack Zod~~ — RESOLVED (13 routes) | ~~MEDIUM~~ | G4 |
| ~~API9~~ | ~~Inconsistent Zod error shape~~ — RESOLVED (6 occurrences) | ~~MEDIUM~~ | G4 |
| ~~API12~~ | ~~change-password silently discards flagErr~~ — RESOLVED | ~~MEDIUM~~ | G4 |
| ~~API-4~~ | ~~summary.errors field name~~ — RESOLVED (already errorCount) | ~~MEDIUM~~ | G4 |
| ~~S7~~ | ~~No file.size check before upload~~ — RESOLVED (6 routes) | ~~MEDIUM~~ | G4 |
| API4 | `expenses` route: collection key `expenses` vs create key `reimbursement` | LOW | G4 |
| API5 | Duplicate bulk-action routes with inverted naming convention | LOW | G4 |
| API7 | No unified pagination contract across endpoints | LOW | G4 |
| API8 | `POST /api/admin/create-user` returns 200 instead of 201 | LOW | G4 |
| API13 | `POST /api/import/collaboratori/run` `skipContract` defaults to `true` | LOW | G4 |
| | **G5 - DRY / Code Quality** | | |
| DEV-1 | `TYPE_BADGE` map duplicated in `NotificationBell` and `NotificationPageClient` | MEDIUM | G5 |
| DEV-2 | `TSHIRT_SIZES` in 3 components + 2 Zod schemas; OnboardingWizard missing XXXL | MEDIUM | G5 |
| DEV-8 | `email-template-service.ts` imported by client without `server-only` guard | MEDIUM | G5 |
| DEV-12 | Invite tracking badges: hardcoded colors + `text-[10px]` below minimum | MEDIUM | G5 |
| DEV-13 | `CollaboratoreDetail.tsx` invite props data clump - extract type | MEDIUM | G5 |
| T6 | `UserProfile` interface missing `invite_email_sent` + `must_change_password` | MEDIUM | G5 |
| A1 | Logic duplication between notification-utils and notification-helpers | MEDIUM | G5 |
| A2 | Fire-and-forget email with no failure log | MEDIUM | G5 |
| S8 | `formatDate` and `formatCurrency` duplicated across 4+ components | LOW | G5 |
| DEV-4 | `86400000` (ms/day) magic number repeated in 6 files | LOW | G5 |
| DEV-7 | Cross-module coupling: expense/ imports compensation/, responsabile/ imports admin/ | LOW | G5 |
| DEV-9 | `lib/username.ts` uses `svc: any` instead of `SupabaseClient<any, any, any>` | LOW | G5 |
| DEV-10 | `pdf-utils.ts` uses `as any` for pdfjs-dist and pdf-lib types | LOW | G5 |
| DEV-14 | `collaboratori/page.tsx` two parallel `Map<string, boolean>` - consolidate | LOW | G5 |
| A3 | `createServiceClient()` instantiated per route (no singleton) | LOW | G5 |
| A4 | RBAC logic scattered across React components | LOW | G5 |
| T1 | `SupabaseClient<any, any, any>` in notification-helpers.ts | LOW | G5 |
| T2 | `action as CompensationAction` cast without type guard | LOW | G5 |
| T3 | `Record<string, unknown>` for updatePayload without narrowing | LOW | G5 |
| T4 | State machine action is not a discriminated union | LOW | G5 |
| T5 | `tipo` column in documents is `text + CHECK` instead of PostgreSQL ENUM | LOW | G5 |
| | **G6 - Performance** | | |
| PERF-3 | Admin dashboard: sequential `adminCollab` fetch before 25-query `Promise.all` | MEDIUM | G6 |
| PERF-4 | Collab dashboard: sequential collaborator + community fetch before parallel block | MEDIUM | G6 |
| PERF-5 | N+1 `createSignedUrl` calls in export/import history (up to 50) | MEDIUM | G6 |
| PERF-6 | 5 raw `<img>` without `width`/`height` - CLS risk | MEDIUM | G6 |
| PERF-7 | `select('*')` on 20+ API list routes - over-fetches large text columns | MEDIUM | G6 |
| DB11 | N+1 DB calls in `bulk-approve` routes: sequential UPDATE per collaborator | MEDIUM | G6 |
| DB12 | N+1 notification inserts in `liquidazione-requests` route | MEDIUM | G6 |
| P3 | `getNotificationSettings` called on every transition without cache | MEDIUM | G6 |
| P4 | `getResponsabiliForCommunity` uses unoptimized triple join | MEDIUM | G6 |
| P1 | `GET /api/compensations` join does not enrich collaborator name | LOW | G6 |
| P2 | Index on `collaborators.user_id` not documented (auto-created by UNIQUE) | LOW | G6 |
| PERF-8 | Bundle analyzer not configured | LOW | G6 |
| DEV-11 | `GET /api/blacklist` has no pagination - unbounded query | LOW | G6 |
| | **G7 - Tests** | | |
| TC5 | No RLS test for `compensation_history` leakage (consolidated with SEC5) | HIGH | G7 |
| TC1 | No unit test for `reject_manager` on compensations | MEDIUM | G7 |
| TC3 | No e2e test for bulk mark-paid | MEDIUM | G7 |
| TC4 | No test for Resend email failure path | MEDIUM | G7 |
| TC-NEW-1 | `events.test.ts` (7 failures): proxy redirects without session setup | LOW | G7 |
| | **G8 - Large Refactors** | | |
| DEV-5 | `page.tsx` 1592 lines: 3 role dashboards in one Server Component | MEDIUM | G8 |
| DEV-6 | `CodaCompensazioni` (862L) and `CodaRimborsi` (868L): 5+ responsibilities | MEDIUM | G8 |
| S9 | `MonitoraggioSection.tsx` 1031 lines: 5+ responsibilities | MEDIUM | G8 |
| B2 | Inconsistent naming: table `expense_reimbursements`, TS `Expense`, FK `reimbursement_id` | MEDIUM | G8 |
| B3 | `community_id` nullable on `expense_reimbursements` | MEDIUM | G8 |
| S1 | `CreateUserForm.tsx` too large (409L) | LOW | G8 |
| S2 | `CollaboratoreDetail.tsx` too large (474L) | LOW | G8 |
| S3 | `OnboardingWizard.tsx` complex local state (408L) | LOW | G8 |
| S6 | Documents query uses `.like('tipo', 'CONTRATTO_%')` instead of `macro_type` | LOW | G8 |
| N2 | `contenuti/page.tsx` accessible to collaboratori but not in nav | LOW | G8 |
| N3 | Italian URL routes - rename to English (~30 dirs, ~60-80 files) | LOW | G8 |
| N4 | Italian DB column names - rename to English | LOW | G8 |
| N5 | Italian PostgreSQL enum values - translate to English | LOW | G8 |
| | **G9 - UI/UX** | | |
| C13 | 4 corsi form components: `<label>` without `htmlFor`, inputs without `id` | MEDIUM | G9 |
| VI-1 | 9/10/11px font sizes coexist with design system scale - consolidate | MEDIUM | G9 |
| VI-2 | Muted-foreground text at 9-10px on dark backgrounds may fail APCA Lc 45 | MEDIUM | G9 |
| VI-8 | `/rimborsi/[id]` IN_ATTESA state sparse - add timeline section | MEDIUM | G9 |
| UX-2 | Form validation inconsistency: 1 form uses RHF+Zod, 30+ use useState+toast | MEDIUM | G9 |
| UX-10 | `/profilo` 15+ fields, no sticky save button or collapsible sections | MEDIUM | G9 |
| RESP-3 | `/corsi/eventi-citta` events table overflows at 375px | MEDIUM | G9 |
| VI-3 | Brand red netto values - verify APCA contrast against dark bg | LOW | G9 |
| VI-4 | `/approvazioni` too many equally-weighted elements | LOW | G9 |
| VI-5 | `/coda` icon-only action buttons rely on colour alone | LOW | G9 |
| VI-6 | `/login` `pb-52` excessive empty space | LOW | G9 |
| VI-7 | `/comunicazioni` with <=2 items feels sparse | LOW | G9 |
| VI-9 | `/rimborsi/[id]` rejection note same visual weight as attachments | LOW | G9 |
| UX-3 | HTML `required` triggers English browser tooltip - add `noValidate` | LOW | G9 |
| UX-4 | CoCoD'a button hidden when no collabs - show disabled + tooltip | LOW | G9 |
| UX-11 | `/profilo` required field markers inconsistent | LOW | G9 |
| UX-12 | `/profilo` Sicurezza card visually disconnected | LOW | G9 |
| UX-13 | `/profilo?tab=impostazioni` TelegramConnect: no spinner on loading | LOW | G9 |
| UX1 | Ticket form validation: global toast only, no inline field errors | LOW | G9 |
| UX2 | Tab switching pattern inconsistency across pages | LOW | G9 |
| RESP-6 | `/corsi/valutazioni` table overflows 6px | LOW | G9 |
| RESP-7 | Systemic: 28-36px touch targets below 44px WCAG minimum | LOW | G9 |
| RESP-8 | `/notifiche` "Segna tutte come lette" clipped at 375px | LOW | G9 |
| RESP-9 | `/corsi` "Allegato CoCoD'a" clipped at 375px | LOW | G9 |
| UI1 | 6 bare `<p>` empty states - replace with `<EmptyState>` | LOW | G9 |
| UI2 | 7 native `<button>` elements - replace with shadcn Button | LOW | G9 |
| UI3 | Inline badge color maps duplicating `lib/content-badge-maps.ts` in 10 files | LOW | G9 |
| UI4 | `docs/ui-components.md` snippets use hardcoded dark classes instead of tokens | LOW | G9 |
| C2 | Corsi page date display: cards use ISO, table rows use DD/MM/YYYY | LOW | G9 |
| C3 | `AssegnazioneRespCittPage` uses native `<table>` instead of shadcn Table | LOW | G9 |
| C4 | CoCoD'a toggle should show disabled + Tooltip when unavailable | LOW | G9 |
| C5 | `/corsi` admin "Date" column truncated at 1280px | LOW | G9 |
| C6 | `/corsi` admin "Apri" link barely visible in dark mode | LOW | G9 |
| C7 | `/corsi/assegnazione` heading inconsistency + icon mismatch | LOW | G9 |
| C8 | `/corsi/valutazioni` spinbox inputs lack "/10" range hint | LOW | G9 |
| C9 | `/corsi/[id]` active tab competes visually with primary CTA | LOW | G9 |
| C10 | `/corsi/nuovo` "Annulla" border invisible in light mode | LOW | G9 |
| C11 | `/corsi` collab list shows duplicates for assigned collabs | LOW | G9 |
| C12 | `/corsi/assegnazione` "Azioni" column header absent/inconsistent | LOW | G9 |

### Resolved archive

Items verified as resolved in codebase (2026-04-14 audit). Kept for historical reference.

| ID | Resolution | Date |
|----|-----------|------|
| B4 | Typo `data_compenso` fixed - column `data_competenza` used correctly | 2026-04-14 |
| C1 | `CORSO_STATO_BADGE` extracted to `lib/corsi-utils.ts` | 2026-04-14 |
| DB1 | `candidature` FK indexes added - migration 063 | 2026-03-30 |
| DB2 | `lezioni.corso_id` index added - migration 063 | 2026-03-30 |
| DB5 | `compensation_attachments.compensation_id` index added - migration 063 | 2026-03-30 |
| DB6 | `ticket_messages.ticket_id` index added - migration 063 | 2026-03-30 |
| DB7 | `user_profiles.theme_preference` already `text` in live schema | 2026-04-11 |
| DEV-3 | `CompensationEditModal` rate default fixed (`useState(0)`, no hardcoded 0.20) | 2026-04-14 |
| SEC7 | `corsi-allegati` bucket exists - migration 062 (public, intentional) | 2026-03-30 |
| SEC9 | `codice_fiscale` stripped from response for non-admin callers (line 133-136) | 2026-04-14 |
| SEC11 | `assegnazioni_valutazione_update` WITH CHECK fixed - migration 062 | 2026-03-30 |
| SEC12 | RLS helper `search_path` set to `public` on all 4 functions - migration 063 | 2026-03-30 |
| SEC-NEW-6 | `next` 16.1.6 → 16.2.3 (--save-exact) — 5 high CVEs closed (HTTP smuggling, CSRF, SSRF via middleware redirect, dev HMR CSRF, DoS Server Components) | 2026-04-15 |
| SEC-NEW-7 | `axios` transitive 1.13.5 → 1.15.0 via `npm audit fix` — critical SSRF + header injection closed | 2026-04-15 |
| SEC-NEW-9 | `@xmldom/xmldom` not in dependency tree (verified `npm ls`) | 2026-04-14 |
| API1 | All 53 `request.json()` calls use `.catch(() => null)` pattern | 2026-03-30 |
| API10 | `POST /api/tickets/[id]/messages` returns `{ data: msg }` | 2026-03-30 |
| API11 | 5 content routes use `new NextResponse(null, { status: 204 })` | 2026-03-30 |
| PERF-11 | `CorsiCalendario` converted to `dynamic(() => import(...), { ssr: false })` | 2026-03-30 |
| TC-NEW-2 | `expense-form.test.ts` assertions match current enum | 2026-04-14 |
| DB-NEW-1 | `compensations.importo_lordo` SET NOT NULL — migration 070 | 2026-04-15 |
| DB-NEW-2 | `compensations.importo_netto` SET NOT NULL — migration 070 | 2026-04-15 |
| DB-NEW-3 | `compensations.ritenuta_acconto` SET NOT NULL + backfill (lordo-netto)/lordo*100 — migration 070 | 2026-04-15 |
| DB-NEW-4 | `compensations.data_competenza` SET NOT NULL — migration 070 | 2026-04-15 |
| DB-NEW-5 | `CHECK (importo_lordo > 0)` on compensations — migration 070 | 2026-04-15 |
| DB-NEW-6 | `CHECK (importo > 0)` on expense_reimbursements — migration 070 | 2026-04-15 |
| DB-NEW-7 | `CHECK (ritenuta_acconto BETWEEN 0 AND 100)` on compensations — migration 070 | 2026-04-15 |
| DB-NEW-8 | `CREATE INDEX idx_expense_attachments_reimbursement_id ON expense_attachments(reimbursement_id)` — migration 071 | 2026-04-15 |
| DB-NEW-9 | `DROP CONSTRAINT collaborators_telegram_chat_id_key` (redundant full UNIQUE; partial idx kept) — migration 072 | 2026-04-16 |
| DB3 | Mitigated by design — `auth.uid()` is `LANGUAGE sql STABLE`, PostgreSQL auto-inlines to `(SELECT auth.uid())`. All 39 policies already use subquery form in internal representation. No action needed. | 2026-04-16 |
| DB13 | `CREATE INDEX tickets_community_id_idx ON tickets(community_id)` — migration 073 | 2026-04-16 |
| DB14 | `CREATE INDEX corsi_community_id_idx ON corsi(community_id)` — migration 073 | 2026-04-16 |
| DB15 | `CREATE INDEX documents_community_id_idx ON documents(community_id)` — migration 073 | 2026-04-16 |
| DB4 | `ALTER POLICY ... TO authenticated` on all 98 public-schema policies — migration 074. Defense-in-depth: anon blocked at DB level. | 2026-04-16 |
| DB8 | 3 filter indexes: `compensations(data_competenza)`, `expense_reimbursements(data_spesa)`, `tickets(last_message_at)` — migration 075 | 2026-04-16 |
| DB16 | Mitigated by design — `ON DELETE NO ACTION` already prevents orphaned tickets; `member_status` deactivation flow makes user deletion unnecessary. No migration needed. | 2026-04-16 |
| SEC-NEW-5 | Zod schema on `POST /api/auth/change-password` (min 8, max 128 chars) — block g3-security-hardening | 2026-04-16 |
| SEC10 | Error messages sanitized in 16+ API routes — generic responses + `console.error` server-side | 2026-04-16 |
| SEC-NEW-2 | Import/export `err.message` replaced with generic strings in 16 routes | 2026-04-16 |
| SEC-NEW-3 | UUID validation added to all 40 dynamic route handlers via shared `isValidUUID()` helper | 2026-04-16 |
| SEC16 | Already resolved in migration 062 — `WITH CHECK (user_id = auth.uid())` | 2026-04-16 |
| SEC-17 | Telegram webhook TOCTOU fixed — atomic `UPDATE WHERE used_at IS NULL` replaces SELECT+UPDATE | 2026-04-16 |
| API2 | `TransitionResult.reason_code` added — state conflicts return 409, role failures stay 403 | 2026-04-16 |
| API3 | Already 409 in all 5 state-conflict routes (documents/sign, tickets/messages, approve-bulk ×2, onboarding/complete) | 2026-04-16 |
| API6 | Zod schema added to 13 content/ticket write routes (POST+PATCH for tickets, opportunities, communications, resources, events, discounts) | 2026-04-16 |
| API9 | Zod error shape fixed in 5 corsi/blacklist files (6 occurrences: `{error: issues}` → `{error, issues}`) | 2026-04-16 |
| API12 | `flagErr` now logged server-side + `warning` field returned in response | 2026-04-16 |
| API-4 | Already renamed to `summary.errorCount` in prior block | 2026-04-16 |
| S7 | `file.size` pre-check added to 6 upload routes (10MB docs, 50MB batch ZIP, 2MB CSV) | 2026-04-16 |

### Superseded / consolidated items

| ID | Disposition |
|----|------------|
| S4 | Superseded by API6 (full route list for missing Zod validation) |
| SEC5 | Consolidated into TC5 (both cover compensation_history RLS testing) |
| SEC15 | Superseded by API6 (full route list for missing Zod validation) |
| API-1 | Duplicate of API8 (same issue: create-user returns 200 not 201) |
| API-2 | Duplicate of API12 (same issue: change-password flagErr) |
| API-3 | Duplicate of API13 (same issue: skipContract default) |

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

### S4 — ~~API route input validation not standardized~~ — SUPERSEDED by API6
- **Disposition**: Superseded by API6, which lists all 8 routes lacking Zod validation with specific route paths and fix instructions.

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

### S7 — ~~No file.size check before upload~~ — RESOLVED (6 routes, see resolved archive)

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

### SEC5 — ~~RLS on `compensation_history` not covered by tests~~ — CONSOLIDATED into TC5
- **Disposition**: Consolidated into TC5, which covers the same requirement (RLS test for compensation_history leakage).

### SEC6 — No documented rotation policy for `RESEND_API_KEY`
- **Problem**: `RESEND_API_KEY` is in `.env.local` with no documented rotation procedure.
- **Files**: `lib/email.ts:3`, `.env.local.example`
- **Impact**: LOW
- **Fix**: Document in README: "Rotate RESEND_API_KEY every 90 days" + add note in `.env.local.example`.

### SEC7 — ~~`corsi-allegati` bucket missing from DB~~ — RESOLVED (see resolved archive)

### SEC8 — `expenses` bucket missing from DB — expense attachment uploads silently fail
- **Problem**: `components/expense/ExpenseForm.tsx` (a client component) uploads expense attachments to `storage.from('expenses')` and calls `getPublicUrl` on the result. The `expenses` bucket does not exist in Supabase (confirmed via live DB query). Every attachment upload silently fails. Furthermore, using `getPublicUrl` from a client component violates the project rule that storage operations must go through API routes with service role (CLAUDE.md Known Patterns — "Storage upload").
- **Files**: `components/expense/ExpenseForm.tsx:126,134`, missing migration for bucket creation.
- **Impact**: HIGH
- **Fix**: (1) Create the `expenses` bucket via migration with `public: false`, (2) Move the upload logic to `POST /api/expenses/[id]/attachments` using service role client and return signed URLs, (3) Remove direct storage access from the client component.

### SEC9 — ~~`codice_fiscale` exposed in collaborator list~~ — RESOLVED (see resolved archive)

### SEC10 — ~~DB error messages forwarded verbatim to client~~ — RESOLVED (see resolved archive)

### SEC11 — ~~`assegnazioni_valutazione_update` WITH CHECK~~ — RESOLVED (see resolved archive)

### SEC12 — ~~RLS helper functions mutable `search_path`~~ — RESOLVED (see resolved archive)

### SEC13 — ~~`xlsx` (SheetJS) dependency has 2 unpatched high CVEs~~ — RESOLVED (block refactor-g1b-xlsx, 2026-04-15)
- **Resolution**: migrated all 6 surfaces from `xlsx` 0.18.5 to `exceljs` ^4.4.0. `npm uninstall xlsx && npm install exceljs`. `next.config.ts` serverExternalPackages updated. Both CVEs eliminated (0 vulnerabilities remaining).

### SEC14 — Leaked password protection disabled in Supabase Auth
- **Problem**: Supabase Auth's HaveIBeenPwned integration for checking compromised passwords is disabled. This means users (including collaboratori setting their own password on first login) can choose passwords known to be in breach databases.
- **Impact**: MEDIUM
- **Fix**: Enable in Supabase Dashboard → Authentication → Password Security → "Leaked Password Protection". No code change required.

### SEC15 — ~~Missing Zod validation on 6 write routes~~ — SUPERSEDED by API6
- **Disposition**: Superseded by API6, which lists all 8 routes lacking Zod validation (extends SEC15's 6-route list with content routes).

### SEC16 — ~~`app_errors` INSERT RLS~~ — RESOLVED (migration 062, already fixed before G3)

### SEC-NEW-2 — ~~Import/export routes forward `err.message` to client~~ — RESOLVED (see resolved archive)

### SEC-NEW-3 — ~~Dynamic route handlers lack UUID path-param validation~~ — RESOLVED (see resolved archive)

### SEC-NEW-4 — Admin RLS `FOR ALL` policies lack explicit `WITH CHECK`
- **Problem**: 7 admin-only `FOR ALL` RLS policies on `corsi`, `lezioni`, `assegnazioni`, `candidature`, `blacklist`, `allegati_globali`, `liquidazione_requests` omit `WITH CHECK`. In Postgres, `FOR ALL` without `WITH CHECK` inherits `USING` for write checks — functionally equivalent, but the pattern is non-standard and harder to audit. Future policy changes risk missing the write-check implication.
- **Files**: `supabase/migrations/` — relevant policy definitions
- **Impact**: LOW
- **Fix**: Add explicit `WITH CHECK (get_my_role() = 'amministrazione')` to each of the 7 policies.
- **Discovered**: security-audit 2026-03-30

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

---

## API — API Design

### API1 — RESOLVED (see resolved archive)

### API2 — ~~`canTransition` 403 for state conflicts~~ — RESOLVED (see resolved archive)

### API3 — ~~State conflicts 400→409~~ — RESOLVED (already 409 in all 5 routes, see resolved archive)

### API4 — `expenses` route: collection key is `expenses`, create response key is `reimbursement`
- **Problem**: `GET /api/expenses` returns `{ expenses: [] }` (using the route segment name). `POST /api/expenses` returns `{ reimbursement }` (using the domain name). The same entity has two different wrapper keys within the same route file. The documented project pattern (CLAUDE.md memory) explicitly notes this: `GET /api/expenses/[id]` returns `{ reimbursement }`, not `{ expense }`. The inconsistency exists at the collection level too.
- **Files**: `app/api/expenses/route.ts:45` (GET key: `expenses`), `app/api/expenses/route.ts:133` (POST key: `reimbursement`)
- **Impact**: LOW — client code already knows to expect `reimbursement` for single entities (per memory note), but the collection/create inconsistency adds cognitive load
- **Fix**: Align to one name. Options: (a) use `reimbursements` for collection GET and `reimbursement` for single/create (domain-first, preferred); (b) use `expenses` everywhere. Pick one and apply consistently.

### API5 — Duplicate bulk-action routes with inverted naming convention
- **Problem**: Both `compensations` and `expenses` domains have two bulk action routes each with inverted naming:
  - `POST /api/compensations/approve-bulk` — called by `ApprovazioniRimborsi`-equivalent (responsabile path, community-scoped)
  - `POST /api/compensations/bulk-approve` — called by `CodaCompensazioni` (admin path, with massimale check)
  - Same pattern for expenses: `approve-bulk` (resp) and `bulk-approve` (admin)
  These are functionally distinct routes (different callers, different logic) but their names are each other's anagram. Any developer adding a new caller will guess the wrong endpoint. The `approve-all` route (POST) adds a third naming pattern.
- **Files**: `app/api/compensations/approve-bulk/`, `app/api/compensations/bulk-approve/`, `app/api/compensations/approve-all/`, and expense equivalents
- **Impact**: LOW — currently the correct endpoint is called; risk is in future maintenance
- **Fix**: Rename to communicate caller/purpose: `bulk-approve-resp` + `bulk-approve-admin` (or `/api/compensations/batch` with a `scope` body field). Update frontend fetch calls in `ApprovazioniRimborsi.tsx`, `CodaCompensazioni.tsx`, `CodaRimborsi.tsx`.

### API6 — ~~content/ticket write routes lack Zod~~ — RESOLVED (13 routes, see resolved archive)

### API7 — No unified pagination contract across paginated collection endpoints
- **Problem**: Two paginated collection endpoints use different parameter and response naming:
  - `GET /api/admin/members` — params: `page`, `limit`; response: `{ members, total, page, limit }`
  - `GET /api/admin/monitoring/email-delivery` — params: `page`; response: `{ events, total, page_size }` (uses hardcoded `PAGE_SIZE = 20`, no client-provided size)
  - `GET /api/admin/monitoring/access-log` — no standardized pagination at all
  - All other collection endpoints (`compensations`, `expenses`, `tickets`, `corsi`, etc.) return full unbounded result sets with no pagination
- **Impact**: LOW — currently no client-side cross-endpoint pagination consumer; risk grows as lists scale
- **Fix**: Define a project-wide pagination standard: params `page` + `pageSize`, response `{ items: T[], total: number, page: number, pageSize: number }`. Apply to `admin/members` first (already closest), then `email-delivery`, then evaluate unbounded endpoints for risk.

### API8 — `POST /api/admin/create-user` returns 200 instead of 201
- **Problem**: `POST /api/admin/create-user` (line 183) returns `NextResponse.json({ email, password })` with no explicit status, defaulting to 200. This route creates an auth user, a `user_profiles` row, and a `collaborators` row — it is a resource-creation endpoint and should return 201 per RFC 9110. Every other resource-creating POST in the project returns 201.
- **Files**: `app/api/admin/create-user/route.ts:183`
- **Impact**: LOW — no current client checks the status code; affects future client consistency
- **Fix**: Change final return to `NextResponse.json({ email, password }, { status: 201 })`.

### API9 — ~~Inconsistent Zod error shape~~ — RESOLVED (6 occurrences in 5 files, see resolved archive)

---

## DB — Database Schema / Indexes / RLS

### DB1, DB2 — RESOLVED (see resolved archive)

### DB3 — RESOLVED (mitigated by design — see resolved archive)

### DB4, DB5, DB6, DB7, DB8 — RESOLVED (see resolved archive)

### DB9 — Unbounded `GET /api/compensations` and `GET /api/expenses` list endpoints
- **Problem**: `GET /api/compensations` and `GET /api/expenses` select ALL records for the authenticated user (filtered by RLS) with no `.limit()` or pagination. A collaborator with 500 compensations causes 500 rows to be serialized and sent on every page load. An admin query (no RLS filter) would return the entire table. API7 notes the broader pagination gap — this entry specifically flags these two as the highest-risk collection endpoints due to their state machine usage patterns.
- **Files**: `app/api/compensations/route.ts:30-36`, `app/api/expenses/route.ts:33-39`
- **Impact**: HIGH (admin/responsabile view returns full table; no limit = risk of timeout or OOM at scale)
- **Fix**: Add pagination (`page`, `pageSize` params) with a sensible default (e.g. 50). Admin export routes that need all records (`/export/gsheet`, `/export/mark-paid`) should continue to fetch unbounded — only the UI-facing list endpoints need limits. Track as part of API7 resolution.

### DB10 — `GET /api/tickets` list endpoint fully unbounded
- **Problem**: `GET /api/tickets` selects ALL tickets via `.select('*').order('created_at')` with no limit. Same pattern as DB9. Admin/responsabile views receive the entire tickets table. After enrichment with collaborator names via a second query, the response serialization grows unboundedly.
- **Files**: `app/api/tickets/route.ts:31-36`
- **Impact**: HIGH
- **Fix**: Add `pageSize` + `page` pagination matching the API7 standard. Default page size: 50.

### DB11 — N+1 DB calls in `bulk-approve` routes: sequential `UPDATE` per collaborator
- **Problem**: Both `app/api/compensations/bulk-approve/route.ts` and `app/api/expenses/bulk-approve/route.ts` perform a sequential `await svc.from('collaborators').update(...)` inside a `for (const [collabId, delta] of deltaByCollab)` loop — one DB write per unique collaborator in the batch. For a 100-item bulk approve with 50 distinct collaborators: 50 sequential UPDATE round-trips instead of 1 batch update or RPC.
- **Files**: `app/api/compensations/bulk-approve/route.ts:137-143`, `app/api/expenses/bulk-approve/route.ts:137-143`
- **Impact**: MEDIUM (latency grows linearly with distinct collaborator count in the batch)
- **Fix**: Replace the loop with an RPC `update_ytd_batch(deltas: {id, delta}[])` that does a single `UPDATE collaborators SET approved_lordo_ytd = approved_lordo_ytd + input.delta WHERE id = input.id` for all rows in one call. Alternatively: batch-build `CASE WHEN id = X THEN val ELSE approved_lordo_ytd END` update.

### DB12 — N+1 notification inserts in `liquidazione-requests` route
- **Problem**: `app/api/liquidazione-requests/route.ts` calls `await svc.from('notifications').insert(...)` inside a `for (const adminId of adminUserIds)` loop — one sequential INSERT per admin. For N admins: N round-trips instead of 1 batch insert.
- **Files**: `app/api/liquidazione-requests/route.ts:165-171`
- **Impact**: MEDIUM (minor at current admin count; becomes measurable if admin count grows)
- **Fix**: Collect all notification objects into an array and issue a single `.insert(notificationsArray)` call after the loop.

### DB13, DB14, DB15 — RESOLVED (see resolved archive)

### DB16 — RESOLVED (mitigated by design — see resolved archive)

### DB-NEW-1..9 — RESOLVED (see resolved archive)

---

## DEV — Code Quality / Coupling / Type Safety

### DEV-1 — `TYPE_BADGE` map duplicated in `NotificationBell` and `NotificationPageClient`
- **Problem**: The exact same 8-entry `TYPE_BADGE: Record<string, { label: string; cls: string }>` object is copy-pasted verbatim in both `components/NotificationBell.tsx:44` and `components/notifications/NotificationPageClient.tsx:26`. Any update to an entity label or badge color class must be applied in two places — guaranteed drift.
- **Files**: `components/NotificationBell.tsx:44–53`, `components/notifications/NotificationPageClient.tsx:26–35`
- **Impact**: MEDIUM
- **Fix**: Export `NOTIFICATION_TYPE_BADGE` from `lib/notification-utils.ts` and import it in both components.
- **Discovered**: skill-dev audit 2026-03-27

### DEV-2 — `TSHIRT_SIZES` array duplicated in 3 components and 2 Zod schemas; `OnboardingWizard` is missing `XXXL`
- **Problem**: The allowed T-shirt sizes are defined separately in: `components/ProfileForm.tsx:57` (7 values, includes XXXL), `components/onboarding/OnboardingWizard.tsx:44` (6 values, **missing XXXL**), `components/responsabile/CollaboratoreDetail.tsx:519` (inline array, 7 values), `app/api/profile/route.ts:31` (Zod enum, 7 values), `app/api/admin/collaboratori/[id]/profile/route.ts:24` (Zod enum, 7 values). The OnboardingWizard omits XXXL — a collaborator who wears XXXL cannot set their size during onboarding, creating a data gap that only an admin or self-edit can fix.
- **Files**: listed above
- **Impact**: MEDIUM (active data bug in OnboardingWizard; DRY violation across 5 files)
- **Fix**: Add `export const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;` to `lib/types.ts`. Import `TSHIRT_SIZES` in all 3 components and use `z.enum(TSHIRT_SIZES)` in both Zod schemas.
- **Discovered**: skill-dev audit 2026-03-27

### DEV-3 — RESOLVED (see resolved archive)

### DEV-4 — Magic number `86400000` (ms per day) repeated in 6 files
- **Problem**: The literal `86400000` (milliseconds in one day) appears in 6 separate files: `components/responsabile/DashboardPendingItems.tsx:44`, `components/responsabile/DashboardTicketSection.tsx:46,58`, `components/ticket/TicketRecordRow.tsx:14`, `app/(app)/page.tsx:972,990`, `app/api/jobs/lesson-reminders/route.ts:20`.
- **Files**: listed above
- **Impact**: LOW
- **Fix**: Export `const MS_PER_DAY = 86_400_000;` from `lib/utils.ts` and import it in each consumer.
- **Discovered**: skill-dev audit 2026-03-27

### DEV-5 — `app/(app)/page.tsx` is 1592 lines with 3 full role-specific dashboards
- **Problem**: The dashboard page file contains: (1) AdminDashboard data fetching branch (via sub-component), (2) Responsabile data fetching branch (KPIs, compensations, expenses, tickets), (3) Collaboratore data fetching branch (compensations, expenses, documents, events, communications, opportunities, corsi) — plus 8 inline helper sub-components (`StatCard`, `DocCard`, `TicketCard`, etc.) and all fetch logic. Each role branch independently calls Supabase. This is a divergent-change smell: any admin dashboard change, collab feed change, or resp KPI change all touch the same 1592-line file.
- **Files**: `app/(app)/page.tsx`
- **Impact**: MEDIUM
- **Fix**: Extract each role branch into dedicated page data functions in separate files: `app/(app)/_dashboard/admin.tsx`, `_dashboard/responsabile.tsx`, `_dashboard/collaboratore.tsx`. The main `page.tsx` becomes a thin router that reads role and renders the correct branch. Helper sub-components should move to `components/dashboard/`.
- **Discovered**: skill-dev audit 2026-03-27

### DEV-6 — `CodaCompensazioni` and `CodaRimborsi` each exceed 860 lines with 5+ responsibilities
- **Problem**: Both `components/admin/CodaCompensazioni.tsx` (862 lines) and `components/admin/CodaRimborsi.tsx` (868 lines) handle: (1) state management for bulk selection (approve/liquidate), (2) reject/revert dialog state, (3) API calls for every action, (4) massimale check modal integration, (5) table rendering with 3 collapsible sections, (6) receipt generation flow. These exhibit shotgun surgery: any change to the approve flow, the reject dialog, or the table display requires editing the same 860-line file.
- **Files**: `components/admin/CodaCompensazioni.tsx`, `components/admin/CodaRimborsi.tsx`
- **Impact**: MEDIUM
- **Fix**: Extract the shared logic into smaller focused components: `BulkActionBar`, `RejectDialog`, `SectionTable`. The Coda components become thin coordinators. A shared `useBulkActions` hook can encapsulate the selection + API call logic for both domains.
- **Discovered**: skill-dev audit 2026-03-27

### DEV-7 — Cross-module coupling between feature component folders
- **Problem**: Several components import directly from sibling feature folders rather than through shared UI or lib utilities:
  - `expense/ExpenseList.tsx`, `expense/ExpenseDetail.tsx`, `expense/ApprovazioniRimborsi.tsx` all import `StatusBadge` from `@/components/compensation/` — expense domain depending on compensation domain
  - `compensation/CompenseTabs.tsx` imports `ExpenseList` and `PendingApprovedExpenseList` from `@/components/expense/` — creates a circular feature dependency
  - `responsabile/CollaboratoreDetail.tsx` imports `CollaboratorAvatar` from `@/components/admin/` and `ResetPasswordDialog` from `@/components/collaboratori/` — responsabile domain depending on admin internals
- **Files**: `components/expense/ExpenseList.tsx`, `components/expense/ExpenseDetail.tsx`, `components/expense/ApprovazioniRimborsi.tsx`, `components/compensation/CompenseTabs.tsx`, `components/responsabile/CollaboratoreDetail.tsx`
- **Impact**: LOW
- **Fix**: Move `StatusBadge` to `components/ui/` (it is domain-neutral). Move `CollaboratorAvatar` to `components/ui/` or a shared `components/shared/` folder. `CompenseTabs` importing from `expense/` is acceptable as it is the composition root — document the dependency explicitly.
- **Discovered**: skill-dev audit 2026-03-27

### DEV-8 — `email-template-service.ts` imported by client component without `server-only` guard
- **Problem**: `lib/email-template-service.ts` defines `getServiceClient()` which reads `process.env.SUPABASE_SERVICE_ROLE_KEY` and `getLayoutConfig()` which calls that client. The file also exports `buildPreviewHtml()`, which is a pure string function. `components/impostazioni/EmailTemplateManager.tsx` (a `'use client'` component) imports `buildPreviewHtml` from this file. Next.js tree-shaking prevents `getServiceClient` from being included in the client bundle because it is not reachable from `buildPreviewHtml`, but there is no `import 'server-only'` guard to enforce this at build time. A future developer adding a new import or refactoring the file could accidentally leak the service role key.
- **Files**: `lib/email-template-service.ts:54–55`, `components/impostazioni/EmailTemplateManager.tsx:12`
- **Impact**: MEDIUM (latent risk — not currently leaking, but no guard)
- **Fix**: Split the file: move `buildPreviewHtml` and all pure HTML helpers to `lib/email-preview-utils.ts` (client-safe, no secrets). Keep `getServiceClient`, `getLayoutConfig`, and all DB-touching functions in `lib/email-template-service.ts` with `import 'server-only'` at the top. Update imports in `EmailTemplateManager` to point to the new client-safe file.
- **Discovered**: skill-dev audit 2026-03-27

### DEV-9 — `lib/username.ts` uses `svc: any` parameter type
- **Problem**: `lib/username.ts:31` declares the Supabase client parameter as `svc: any`. The project-standard type for this pattern (documented in CLAUDE.md Known Patterns) is `SupabaseClient<any, any, any>` from `@supabase/supabase-js`, which is the intentional workaround for PostgREST generic type incompatibility. Using bare `any` instead of the documented pattern is inconsistent and silences type-checking on `svc` method calls entirely.
- **Files**: `lib/username.ts:31`
- **Impact**: LOW
- **Fix**: Replace `svc: any` with `import type { SupabaseClient } from '@supabase/supabase-js'; svc: SupabaseClient<any, any, any>`.
- **Discovered**: skill-dev audit 2026-03-27

### DEV-10 — `pdf-utils.ts` uses `as any` for pdfjs-dist and pdf-lib types
- **Problem**: `lib/pdf-utils.ts:34` casts the pdfjs-dist dynamic import result `as any`, and `:236` casts `sigImage as any` for pdf-lib's `drawImage` call. These are necessary workarounds for missing or incompatible type definitions, but they suppress type-checking on all subsequent operations. The pdfjs-dist cast is wider than necessary — only specific APIs need the escape.
- **Files**: `lib/pdf-utils.ts:34`, `lib/pdf-utils.ts:236`
- **Impact**: LOW (server-only file; `any` casts are localised and pre-existing)
- **Fix**: Define a minimal interface for the pdfjs APIs actually used (e.g. `getDocument`, `PDFDocumentProxy`, `PDFPageProxy`) and use that instead of `any`. For `drawImage`, check if `pdf-lib` has typed overloads that accept the image type used.
- **Discovered**: skill-dev audit 2026-03-27

---

## PERF — Performance / Bundle

### PERF-3 — Admin dashboard: sequential `adminCollab` fetch before parallel block
- **Problem**: In the admin dashboard branch of `app/(app)/page.tsx` (line 576), `adminCollab` is fetched with a standalone `await svc.from('collaborators')...` before the 25-query `Promise.all` at line 589. These queries are fully independent — `adminCollab` is not used as an input to any query in the parallel block. This serialises ~50–100ms of DB latency on every admin page load.
- **Files**: `app/(app)/page.tsx:576–580`, `app/(app)/page.tsx:589–711`
- **Impact**: MEDIUM (~50–100ms added to admin dashboard TTFB on every request)
- **Fix**: Include the `adminCollab` query in the existing `Promise.all` block as one additional entry. Add `{ data: adminCollab }` destructuring from the result.
- **Discovered**: perf-audit 2026-03-27

### PERF-4 — Collab dashboard: sequential collaborator + community fetch before main parallel block
- **Problem**: In the collaboratore dashboard branch of `app/(app)/page.tsx`, `collaborator` is fetched at line 1023, then `collaborator_communities` is fetched at line 1031 using the collaborator's `id`. These two queries are run before the 10-query `Promise.all` at line 1057. The `collaborator` → `collaborator_communities` chain is inherently sequential (communities needs the collab ID), but the result (`userCommunityIds`) is only used for in-memory filtering after the parallel block — it is not used as a DB input to any of the 10 parallel queries. The community IDs could be derived from a JOIN or fetched without blocking the main block.
- **Files**: `app/(app)/page.tsx:1023–1033`, `app/(app)/page.tsx:1057–1087`
- **Impact**: MEDIUM (two sequential round trips before the main parallel block on every collab page load)
- **Fix**: Restructure to run `collaborator` + all 10 queries in one `Promise.all`, then run `collaborator_communities` only if `collaborator?.id` is available. The community filtering can be applied to already-fetched data. Alternatively, use a Supabase RPC or join to fetch collaborator + communities in one query.
- **Discovered**: perf-audit 2026-03-27

### PERF-5 — N+1 signed URL generation in history routes
- **Problem**: `GET /api/export/history` and `GET /api/import/history` use `Promise.all(rows.map(async (row) => createSignedUrl(...)))` — this fires one `createSignedUrl` per row, up to 50 calls per request. Each Supabase Storage signed URL call is a network round trip. For 50 records this is 50 concurrent network calls creating overhead on the storage service.
- **Files**: `app/api/export/history/route.ts:36–55`, `app/api/import/history/route.ts:41–62`
- **Impact**: MEDIUM (latency on admin history pages scales linearly with history count)
- **Fix**: Store the signed URL at upload time (valid for 1 year) and persist it, or use Supabase Storage batch signed URL API when available. Alternatively, generate signed URLs on-demand via a separate endpoint triggered by download button click.
- **Discovered**: perf-audit 2026-03-27

### PERF-6 — Raw `<img>` tags without dimensions (CLS risk)
- **Problem**: 5 raw `<img>` tags lack explicit `width`/`height` attributes, causing the browser to reserve no layout space until the image loads. This produces Cumulative Layout Shift (CLS > 0.1 threshold) on pages where these images appear above the fold.
- **Files**:
  - `app/(app)/page.tsx:287` — responsabile cittadino hero avatar
  - `app/(app)/page.tsx:1367` — collaboratore dashboard avatar
  - `app/(app)/sconti/[id]/page.tsx:80` — discount logo
  - `components/responsabile/ResponsabileAvatarHero.tsx:46` — hero avatar
  - `components/documents/SignaturePad.tsx:95` — signature preview (lower priority — below fold)
- **Impact**: MEDIUM (CLS metric degradation on dashboard hero sections)
- **Fix**: Replace with Next.js `<Image>` component with `fill` prop and a `relative`-positioned parent div of fixed dimensions for avatar use cases. For the discount logo, add explicit `width` and `height` props or use `<Image>` with known dimensions.
- **Discovered**: perf-audit 2026-03-27

### PERF-7 — `select('*')` on 20+ API list routes
- **Problem**: 20+ API routes use `.select('*')` on tables that include large text columns. For list endpoints, this over-fetches all columns even when only a subset is displayed in the UI.
- **Key affected routes** (list endpoints — highest priority):
  - `GET /api/tickets` — `app/api/tickets/route.ts:32` — selects all ticket columns for list view
  - `GET /api/expenses` — `app/api/expenses/route.ts:34` — selects all columns including `descrizione`
  - `GET /api/corsi/[id]` (lezioni) — `app/api/corsi/[id]/route.ts:52` — selects all lezioni columns
  - `GET /api/admin/allegati-corsi` — `app/api/admin/allegati-corsi/route.ts:30` — selects all attachment columns
- **Files**: `app/api/tickets/route.ts:32`, `app/api/expenses/route.ts:34`, `app/api/corsi/[id]/route.ts:52`, and 17+ others
- **Impact**: MEDIUM (wire size + DB serialisation overhead; most impactful on unbounded list endpoints)
- **Fix**: Enumerate specific columns needed by each consuming UI component. For list views, exclude large text columns. For single-record detail views, `select('*')` is acceptable.
- **Discovered**: perf-audit 2026-03-27

### PERF-8 — Bundle analyzer not configured
- **Problem**: Neither `@next/bundle-analyzer` nor `next experimental-analyze` is configured or documented in `package.json` scripts. Developers cannot inspect the client bundle composition without manual setup.
- **Files**: `next.config.ts`, `package.json`
- **Impact**: LOW (operational tooling gap — no runtime effect)
- **Fix**: Add `"analyze": "npx next experimental-analyze"` as a script in `package.json` (no extra package needed for Next.js 16 native analyzer).
- **Discovered**: perf-audit 2026-03-27

### PERF-11 — RESOLVED (see resolved archive)

### API-4 — `summary.errors` field name shadows the `{ error: string }` failure key
- **Problem**: `ImportResult.summary.errors` (count of per-tab failures) uses the same key name as the top-level `{ error: string }` used for request-level failures. A client checking `response.error` for failure detection could be confused by `response.summary.errors > 0`, which is a domain count, not a request error indicator.
- **Files**: `lib/corsi-import-sheet.ts:646`, `app/api/admin/import-corsi/run/route.ts:40`, `components/import/ImportCorsiSection.tsx` (any consumer of `summary.errors`)
- **Impact**: MEDIUM (client confusion risk when error-checking; low risk currently since only one internal consumer)
- **Fix**: Rename `summary.errors` → `summary.errorCount` in the `ImportResult` type definition, the `runImport()` return statement, and every consumer that reads `summary.errors`.
- **Discovered**: api-design audit 2026-04-13

