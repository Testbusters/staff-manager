# Refactoring Backlog

Structural, DB naming, and architectural issues to address in dedicated sessions.
Not blocking for current functionality unless marked **CRITICAL/HIGH**.

> Update this file whenever a structural issue emerges that is not resolved in the current block.

---

## Priority index

| ID | Title | Impact |
|----|--------|---------|
| DEV-1 | `TYPE_BADGE` map duplicated identically in `NotificationBell` and `NotificationPageClient` — extract to `lib/notification-utils.ts` | MEDIUM |
| DEV-2 | `TSHIRT_SIZES` array defined in 3 components + 2 Zod schemas — not centralised in `lib/types.ts`; OnboardingWizard is missing `XXXL` | MEDIUM |
| DEV-3 | `CompensationEditModal` hardcodes `0.20` withholding rate instead of calling `calcRitenuta()` from `lib/ritenuta.ts` — breaks P4M community rate | HIGH |
| DEV-4 | `86400000` (ms/day) magic number repeated in 6 files — extract to a named constant | LOW |
| DEV-5 | `app/(app)/page.tsx` is 1592 lines: 3 full role-specific dashboards + 8 sub-components + all data fetching in one Server Component | MEDIUM |
| DEV-6 | `CodaCompensazioni` (862 lines) and `CodaRimborsi` (868 lines) each manage bulk-approve state, reject dialog, receipt generation, table rendering, and section toggles — should be split | MEDIUM |
| DEV-7 | Cross-module coupling: `expense/` components import `compensation/StatusBadge`; `compensation/CompenseTabs` imports from `expense/`; `responsabile/CollaboratoreDetail` imports from `admin/` and `collaboratori/` | LOW |
| DEV-8 | `email-template-service.ts` is imported by client component `EmailTemplateManager` but lacks `import 'server-only'` guard — relies on tree-shaking to prevent `SUPABASE_SERVICE_ROLE_KEY` leakage | MEDIUM |
| DEV-9 | `lib/username.ts` uses `svc: any` parameter type instead of the project-standard `SupabaseClient<any, any, any>` — inconsistent with notification-helpers pattern | LOW |
| DEV-10 | `pdf-utils.ts` uses `as any` twice (`pdfjsLib` import and `sigImage`) — missing typed wrappers for pdfjs-dist and pdf-lib types | LOW |
| DB9 | `GET /api/compensations` and `GET /api/expenses` fully unbounded — no pagination | HIGH |
| DB10 | `GET /api/tickets` fully unbounded — no pagination | HIGH |
| SEC7 | ~~`corsi-allegati` bucket missing from DB~~ — **RESOLVED** migration 062 (verified security-audit 2026-03-30, public bucket confirmed) | ~~HIGH~~ |
| SEC8 | `expenses` bucket missing from DB — expense attachment uploads silently fail | HIGH |
| SEC9 | `codice_fiscale` exposed in `GET /api/admin/collaboratori` to `responsabile_compensi` role | HIGH |
| DB3 | 39 RLS policies use bare `auth.uid()` — per-row function evaluation | MEDIUM |
| DB4 | All 90+ RLS policies lack explicit `TO` clause (all `{public}`) | MEDIUM |
| DB13 | `tickets.community_id` FK unindexed — responsabile community-scoped RLS join scans | MEDIUM |
| DB14 | `corsi.community_id` FK unindexed — per-community corsi queries do sequential scan | MEDIUM |
| DB15 | `documents.community_id` FK unindexed — responsabile document scoping join unindexed | LOW |
| DB16 | `tickets.creator_user_id ON DELETE NO ACTION` — orphaned tickets if auth user deleted | LOW |
| DB7 | `user_profiles.theme_preference` is `varchar(5)` — should be `text` | MEDIUM |
| DB11 | N+1 DB calls in `bulk-approve` routes: sequential UPDATE per collaborator | MEDIUM |
| DB12 | N+1 notification inserts in `liquidazione-requests` route | MEDIUM |
| SEC10 | DB error messages forwarded verbatim to client in 20+ routes | MEDIUM |
| SEC11 | `assegnazioni_valutazione_update` RLS policy has `WITH CHECK (true)` — unrestricted write scope | HIGH |
| SEC12 | ~~6 RLS helper functions (`get_my_role`, `is_active_user`, etc.) have mutable `search_path`~~ — **RESOLVED** migration 063 (verified skill-db 2026-03-30) | ~~HIGH~~ |
| SEC13 | `xlsx` dependency has 2 unpatched high CVEs (Prototype Pollution + ReDoS) — no fix available | HIGH |
| SEC14 | Leaked password protection disabled in Supabase Auth | MEDIUM |
| SEC15 | Missing Zod on 6+ write routes (tickets POST, ticket status, ticket messages, sign, notifications, members status) | MEDIUM |
| SEC16 | `app_errors` table has `WITH CHECK (true)` for INSERT — any authenticated user can insert arbitrary rows | MEDIUM |
| SEC-NEW-2 | 15+ import/export routes forward `err.message` from Google Sheets/file-parse errors to client — reveals internal service config | MEDIUM |
| SEC-NEW-3 | 20+ dynamic route handlers lack UUID validation on path params — DB error instead of clean 400 | MEDIUM |
| SEC-NEW-4 | 7 admin RLS `FOR ALL` policies (corsi/lezioni/assegnazioni/candidature/blacklist/allegati_globali/liq_requests) lack explicit `WITH CHECK` — functionally correct but non-standard | LOW |
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
| DB8 | Missing filter indexes on `compensations.data_competenza`, `tickets.last_message_at`, `expense_reimbursements.data_spesa` | LOW |
| DB-NEW-1 | `compensations.importo_lordo` nullable — NaN propagation in financial calculations | MEDIUM |
| DB-NEW-2 | `compensations.importo_netto` nullable — NaN propagation in financial calculations | MEDIUM |
| DB-NEW-3 | `compensations.ritenuta_acconto` nullable — incorrect net calculation | MEDIUM |
| DB-NEW-4 | `compensations.data_competenza` nullable — date-range filters silently exclude rows | MEDIUM |
| DB-NEW-5 | No `CHECK (importo_lordo > 0)` on compensations — service-role insert bypasses Zod | MEDIUM |
| DB-NEW-6 | No `CHECK (importo > 0)` on expense_reimbursements — service-role insert bypasses Zod | MEDIUM |
| DB-NEW-7 | No `CHECK (ritenuta_acconto BETWEEN 0 AND 100)` on compensations — invalid rate accepted at DB level | MEDIUM |
| DB-NEW-8 | `expense_attachments.reimbursement_id` FK unindexed — sequential scan on every expense detail join | MEDIUM |
| P2 | Index on `collaborators.user_id` not documented | LOW |
| SEC6 | No documented rotation policy for `RESEND_API_KEY` | LOW |
| N2 | `contenuti/page.tsx` accessible to collaboratori but not in nav — consider redirect to /comunicazioni | LOW |
| S8 | `formatDate` and `formatCurrency` duplicated across 4+ components — extract to `lib/format-utils.ts` | LOW |
| N3 | Italian URL routes — rename to English | LOW |
| VI-1 | 9/10/11px font sizes coexist with 12/14/16/20/24px across dashboard+compensi+approvazioni — consolidate to 5-step scale (12/14/16/20/24); remove `text-[9px]`/`text-[10px]` from KPI cards and table footers | MEDIUM |
| VI-2 | Muted-foreground text at 9-10px on dark card backgrounds (P02 KPI cards, P03 table footer, P09 action column) may fall below APCA Lc 45 — set 11px as minimum text size | MEDIUM |
| VI-3 | Brand red netto column values in `/compensi` table — verify APCA contrast of `oklch(0.628 0.258 29.2)` against dark card bg (base-900) for body text; consider `text-foreground` for amounts in dark mode | LOW |
| VI-4 | `/approvazioni` (resp) has too many equally-weighted elements: info alert + KPI strip + 2 import sections + search + filters + table all compete at same visual weight — group import sections into collapsible "Crea compenso" panel | LOW |
| VI-5 | `/coda` icon-only action buttons (approve/reject/liquidate) rely on colour alone — consider icon+text labels on desktop viewports for better discoverability | LOW |
| VI-6 | `/login` uses `pb-52` container padding creating excessive empty space between form card and test user grid — reduce to `pb-32` | LOW |
| VI-7 | `/comunicazioni` with ≤2 items: page feels sparse — consider more compact card layout when item count is low | LOW |
| UX-2 | Form validation pattern inconsistency: `ExpenseForm` uses react-hook-form+Zod (inline field errors); all other forms (30+) use manual `useState`+`toast.error` (generic toast). Unify to react-hook-form+Zod for new forms; ensure toast-only forms highlight specific failed fields | MEDIUM |
| UX-3 | HTML `required` on Input in `TicketForm`, `CorsoForm`, `CreateUserForm`, `ProfileForm` triggers English browser validation tooltip — add `noValidate` to `<form>` elements to prevent browser-native validation | LOW |
| UX-4 | CoCoD'à button on `/corsi/assegnazione` is completely hidden when no collaborators exist in responsabile's city (no `canExpand`) — show disabled state with tooltip "Nessun collaboratore disponibile nella tua città" | LOW |
| RESP-3 | `/corsi/eventi-citta` (resp_citt) — events table overflows 507px, Luogo/Tipo/action buttons invisible at 375px. Fix: card layout at mobile or responsive column hiding. | MEDIUM |
| RESP-6 | `/corsi/valutazioni` (resp_citt) — table overflows 6px, "Salva" button slightly clipped. Fix: minor padding reduction or `min-w-0` on button column. | LOW |
| RESP-7 | Systemic: hamburger (28px), notification bell (32px), tab buttons (28px), filter pills (28-36px) all below 44px WCAG tap target minimum. Fix: `min-h-[44px]` on header nav and tab bar elements. | LOW |
| RESP-8 | `/notifiche` (collab) — "Segna tutte come lette" button text clipped at 375px. Fix: shorter label at mobile or allow wrapping. | LOW |
| RESP-9 | `/corsi` (collab) — global attachment link "Allegato CoCoD'à" clipped at 375px. Fix: `truncate` class or allow wrapping on link container. | LOW |
| N4 | Italian DB column names — rename to English | LOW |
| PERF-3 | `app/(app)/page.tsx:576` (admin dashboard): sequential `await adminCollab` before 25-query `Promise.all` — independent call adds ~50-100ms TTFB. Move into the `Promise.all`. | MEDIUM |
| PERF-4 | `app/(app)/page.tsx:1023–1031` (collab dashboard): 2 sequential awaits before 10-query `Promise.all` — can be parallelized into the existing `Promise.all`. | MEDIUM |
| PERF-5 | `app/api/export/history` and `app/api/import/history`: N+1 `createSignedUrl` calls (one per row, up to 50). Fix: use `Promise.all()` to parallelize URL generation. | MEDIUM |
| PERF-6 | Raw `<img>` without `width`/`height` at `page.tsx:287`, `page.tsx:1367`, `sconti/[id]:80`, `ResponsabileAvatarHero:46` — CLS risk. Fix: add explicit dimensions or use Next.js `<Image>`. | MEDIUM |
| PERF-7 | `select('*')` on list endpoints in `tickets/route.ts`, `expenses/route.ts`, and 18+ others — over-fetches large text columns. Fix: enumerate only needed columns per endpoint. | MEDIUM |
| PERF-8 | Bundle analyzer not configured (`@next/bundle-analyzer` absent). Cannot inspect bundle composition. Add as optional dev dependency with `ANALYZE=true npm run build` pattern. | LOW |
| N5 | Italian PostgreSQL enum values — translate to English | LOW |
| C1 | `STATO_BADGE` corso stato color map duplicated in 5 corsi files — extract to `lib/corsi-utils.ts` as `CORSO_STATO_COLORS` | LOW |
| C2 | Corsi page date display: cards use raw ISO format (`2025-01-01`), table rows use `DD/MM/YYYY` — apply consistent `formatDate()` in `CorsiPageCollab` | LOW |
| C3 | `AssegnazioneRespCittPage` section 1 uses native `<table>` instead of shadcn `<Table>` — migrate for component consistency | LOW |
| VI-8 | `/rimborsi/[id]` IN_ATTESA state feels sparse (V5) — add timeline section even when empty with a single "Richiesta creata" event to fill vertical space and give context | MEDIUM |
| VI-9 | `/rimborsi/[id]` rejection note (V9) — same visual weight as attachments card despite higher semantic importance; increase left border thickness or text size to signal hierarchy | LOW |
| C4 | CoCoD'à toggle button in `AssegnazioneRespCittPage` should show disabled state with Tooltip when `!hasLezioni` or `!hasCollabs` — explain why the feature is unavailable | LOW |
| C5 | `/corsi` admin list — "Date" column truncated at right edge of viewport on standard 1280px screens; combine data_inizio/data_fine into a single column or reduce total column count | LOW |
| C6 | `/corsi` admin list — "Apri" link text is barely distinguishable from foreground text in dark mode; verify it uses `text-link` token | LOW |
| C7 | `/corsi/assegnazione` — H1/H2 heading weight compression on section-heavy page; "I miei corsi" H2 has map-pin icon, "Corsi disponibili" H2 has none — inconsistent | LOW |
| C8 | `/corsi/valutazioni` — spinbox inputs lack "/10" range hint next to the field; user relies on column header alone for scale awareness | LOW |
| C9 | `/corsi/[id]` — active tab style uses same `bg-brand` fill as primary CTA button ("Aggiungi lezione"); two competing focal points at the same visual level — consider underline/border-bottom active tab pattern | LOW |
| C10 | `/corsi/nuovo` — "Annulla" button border invisible in light mode (outline variant stroke not rendering); investigate `border` token contrast in light theme | LOW |
| C11 | `/corsi` collab list — "Corsi programmati — Docenza" and "Q&A programmati" sections show duplicates for collabs already assigned; add disambiguating subtitle or split into Assegnati/Disponibili tabs | LOW |
| C12 | `/corsi/assegnazione` — "Azioni" column header absent in "Corsi disponibili" table; "I miei corsi" section has no column headers at all — apply consistent "Azioni" header pattern across both sections | LOW |
| API1 | ~~42 routes call `request.json()` without `.catch()`~~ — **RESOLVED** api-design audit 2026-03-30: all 53 routes with `request.json()` use `.catch(() => null)` pattern; original count was wrong | ~~MEDIUM~~ |
| API2 | `canTransition` failure returns 403 for both "wrong role" and "wrong state" — state conflicts should return 409 | MEDIUM |
| API3 | `documents/[id]/sign` state check (DA_FIRMARE), `tickets/[id]/messages` closed-ticket check, `approve-bulk` IN_ATTESA check, `onboarding/complete` already-completed check all return 400 for state conflicts — should be 409 | MEDIUM |
| API4 | `GET /api/expenses` collection uses key `expenses`, but POST returns `{ reimbursement }` — entity key inconsistent within same route | LOW |
| API5 | Duplicate bulk-action routes with inverted naming: `compensations/approve-bulk` and `compensations/bulk-approve` (similarly for expenses) both exist with different caller/purpose; naming convention is inconsistent | LOW |
| API6 | 8 content/ticket write routes lack Zod validation — `tickets` (POST), `tickets/[id]/status` (PATCH), `tickets/[id]/messages` (POST), `opportunities` (POST), `communications` (POST), `resources` (POST/PUT), `events` (POST/PATCH), `discounts` (POST/PATCH) — supersedes S4/SEC15 detail | MEDIUM |
| API7 | `admin/members` pagination uses `limit` param name; email-delivery uses `page` + hardcoded `PAGE_SIZE` — no unified pagination contract across paginated endpoints | LOW |
| API8 | `POST /api/admin/create-user` returns default 200 — should be 201 (creates auth user + profile + collaborator records) | LOW |
| API9 | 8 routes wrap Zod issues in the `error` key (`{ error: [ZodIssue] }`) instead of the project standard `{ error: 'msg', issues: [...] }` — inconsistent error shape for validation failures | MEDIUM |
| API10 | ~~`POST /api/tickets/[id]/messages` returns `{ message: msg }`~~ — **RESOLVED** fixed 2026-03-30: `{ data: msg }` | ~~LOW~~ |
| API11 | ~~5 content routes return `NextResponse.json({}, { status: 204 })`~~ — **RESOLVED** fixed 2026-03-30: `new NextResponse(null, { status: 204 })` on all 5 | ~~LOW~~ |
| UX1 | Ticket form validation: global toast only, no inline `<FormMessage>` per field | LOW |
| UX2 | Tab switching pattern inconsistency: `/comunicazioni` + `/approvazioni` use `<Link href="?tab=">` (URL-based, history entries), while `/compensi` uses Radix `<Tabs>` (state-based) — normalise to one pattern | LOW |
| PERF-3 | Admin dashboard: `adminCollab` fetched sequentially before the 25-query `Promise.all` block in `app/(app)/page.tsx:576` — ~50–100ms extra latency on every admin page load | MEDIUM |
| PERF-4 | Collab dashboard: `collaborator` (line 1023) then `collaborator_communities` (line 1031) fetched sequentially before the 10-query `Promise.all` block — two extra round trips serialised unnecessarily | MEDIUM |
| PERF-5 | `GET /api/export/history` and `GET /api/import/history`: N+1 signed URL generation — one `createSignedUrl` call per run record inside `Promise.all` (up to 50 calls) — consider batch-signed-URL API or a single pre-signed path on upload | MEDIUM |
| PERF-6 | 5 raw `<img>` tags without `width`/`height` attributes — CLS risk on avatar images in dashboard hero, `/sconti/[id]` logo, and `SignaturePad` preview | MEDIUM |
| PERF-7 | `select('*')` on 20+ API routes — over-fetches all columns including large `body`/`content` text fields on `tickets`, `expense_reimbursements`, `compensations` list endpoints | MEDIUM |
| PERF-8 | Bundle analyzer not configured — neither `@next/bundle-analyzer` nor `next experimental-analyze` documented in `package.json` scripts; developers cannot inspect bundle composition without manual setup | LOW |
| PERF-11 | `components/corsi/CorsiPageCollab.tsx:9` — `CorsiCalendario` statically imported, no `next/dynamic` wrapper — loads eagerly in initial bundle for all collaboratore users on `/corsi` | MEDIUM |
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

### SEC7 — ~~`corsi-allegati` bucket missing from DB~~ — RESOLVED
- **Resolution**: Bucket `corsi-allegati` exists in staging (`public: true`, `file_size_limit: 50MB`). Created in migration 062. `getPublicUrl` in `route.ts:71` is correct for a public bucket. Decision (2026-03-30): intentionally public — these are generic training contract templates with no PII, shared with all community collaboratori.
- **Closed**: 2026-03-30

### SEC8 — `expenses` bucket missing from DB — expense attachment uploads silently fail
- **Problem**: `components/expense/ExpenseForm.tsx` (a client component) uploads expense attachments to `storage.from('expenses')` and calls `getPublicUrl` on the result. The `expenses` bucket does not exist in Supabase (confirmed via live DB query). Every attachment upload silently fails. Furthermore, using `getPublicUrl` from a client component violates the project rule that storage operations must go through API routes with service role (CLAUDE.md Known Patterns — "Storage upload").
- **Files**: `components/expense/ExpenseForm.tsx:126,134`, missing migration for bucket creation.
- **Impact**: HIGH
- **Fix**: (1) Create the `expenses` bucket via migration with `public: false`, (2) Move the upload logic to `POST /api/expenses/[id]/attachments` using service role client and return signed URLs, (3) Remove direct storage access from the client component.

### SEC9 — `codice_fiscale` exposed in collaborator list endpoint to `responsabile_compensi`
- **Problem**: `GET /api/admin/collaboratori` selects `codice_fiscale` from the `collaborators` table and returns it in the response to any caller with `responsabile_compensi` or `amministrazione` role. `codice_fiscale` is a PII/fiscal identifier. Per `docs/prd/01-rbac-matrix.md`, responsabili should not have access to tax identifiers.
- **Files**: `app/api/admin/collaboratori/route.ts:71,117`
- **Impact**: HIGH
- **Fix**: Strip `codice_fiscale` from the response when `profile.role !== 'amministrazione'`. The field can remain in the select for search purposes (`searchStr` includes it) but must be removed from the returned JSON object for non-admin callers.

### SEC10 — DB error messages forwarded verbatim to client in 20+ routes
- **Problem**: Many routes return `NextResponse.json({ error: error.message }, { status: 500 })` directly, forwarding raw Supabase/PostgREST error strings (which may include table names, column names, constraint names, or RLS policy details) to the browser. This leaks internal schema information.
- **Files (sample)**: `app/api/tickets/route.ts:38,109`, `app/api/expenses/route.ts:43,88`, `app/api/opportunities/route.ts:66`, `app/api/resources/route.ts:18,72`, `app/api/admin/collaboratori/[id]/profile/route.ts:125`, and 15+ more routes.
- **Impact**: MEDIUM
- **Fix**: Log the raw error server-side (`console.error(error.message)`) and return a generic string: `return NextResponse.json({ error: 'Database error' }, { status: 500 })`. Exceptions: upload error messages (often user-actionable) and unique constraint violations (needed for UX) — those can keep descriptive messages.

### SEC11 — `assegnazioni_valutazione_update` RLS policy has `WITH CHECK (true)` — unrestricted write scope
- **Problem**: Supabase Security Advisor flags the `assegnazioni_valutazione_update` UPDATE policy on `public.assegnazioni` as having `WITH CHECK (true)`. The `USING` clause correctly restricts which rows can be read/updated (resp.citt's city), but the `WITH CHECK` clause is always true — meaning an UPDATE can write any value to any column, including `collaborator_id`, `lezione_id`, or `ruolo`, as long as the row passes the USING filter. The USING clause alone is not sufficient to restrict what can be written.
- **Files**: `supabase/migrations/058_assegnazioni_cocoda_rls.sql` (or the migration where this policy was created)
- **Impact**: HIGH
- **Fix**: Add a meaningful `WITH CHECK` clause that mirrors the `USING` clause (or restricts to only the `valutazione` column). Example: `WITH CHECK ((public.get_my_role() = 'responsabile_cittadino') AND (lezione_id IN (SELECT l.id FROM lezioni l JOIN corsi c ON c.id = l.corso_id JOIN user_profiles up ON up.user_id = auth.uid() WHERE c.citta IS NOT NULL AND c.citta = up.citta_responsabile)))`.

### SEC12 — ~~6 RLS helper functions have mutable `search_path`~~ — RESOLVED
- **Resolution**: All 4 active SECURITY DEFINER helpers (`get_my_role`, `is_active_user`, `can_manage_community`, `get_my_collaborator_id`) verified with `SET search_path = public` in the live staging DB. Confirmed by skill-db audit 2026-03-30.
- **Originally**: Supabase Security Advisor flagged mutable `search_path` as a potential privilege escalation vector in SECURITY DEFINER functions.
- **Closed**: 2026-03-30

### SEC13 — `xlsx` (SheetJS) dependency has 2 unpatched high CVEs
- **Problem**: `npm audit` reports the `xlsx` package (SheetJS) has two high-severity CVEs with no fix available: (1) **GHSA-4r6h-8v6p-xvw6** — Prototype Pollution (CVSS 7.8, CWE-1321); (2) **GHSA-5pgg-2g8v-p4x9** — ReDoS (CVSS 7.5, CWE-1333). Both affect all versions (`range: *`). The package is used in `app/api/export/gsheet/route.ts` and `app/api/export/history/route.ts` (server-side XLSX generation). The prototype pollution vector is local (AV:L) so risk is mitigated by server-side only usage. The ReDoS (AV:N) is more directly relevant to any route parsing uploaded XLSX input.
- **Files**: `app/api/export/gsheet/route.ts`, `app/api/export/history/route.ts`, `package.json`
- **Impact**: HIGH (no patch available)
- **Fix**: No upstream fix is available for the SheetJS community package. Options: (1) Switch to `exceljs` (actively maintained, no known CVEs); (2) Vendor a patched fork; (3) Pin to the last known good version and document the risk until a safe upgrade path exists. Priority: investigate `exceljs` as a drop-in replacement.

### SEC14 — Leaked password protection disabled in Supabase Auth
- **Problem**: Supabase Auth's HaveIBeenPwned integration for checking compromised passwords is disabled. This means users (including collaboratori setting their own password on first login) can choose passwords known to be in breach databases.
- **Impact**: MEDIUM
- **Fix**: Enable in Supabase Dashboard → Authentication → Password Security → "Leaked Password Protection". No code change required.

### SEC15 — Missing Zod validation on 6 write routes
- **Problem**: The following POST/PATCH routes manually cast `req.json()` to a type without Zod schema validation, creating a risk of unexpected field types or values reaching the DB: `POST /api/tickets` (categoria/oggetto cast), `PATCH /api/tickets/[id]/status` (no schema), `POST /api/tickets/[id]/messages` (no schema), `POST /api/documents/[id]/sign` (no schema), `PATCH /api/notifications/[id]` (no schema), `PATCH /api/admin/members/[id]/status` (no schema). Already tracked as S4 in this backlog — this entry provides the specific route list.
- **Files**: The 6 files listed above.
- **Impact**: MEDIUM
- **Fix**: Add Zod schema + `safeParse` to each route. Merge with S4 resolution.

### SEC16 — `app_errors` INSERT RLS policy uses `WITH CHECK (true)` — any authenticated user can insert
- **Problem**: Supabase Security Advisor flags `app_errors_insert` as having `WITH CHECK (true)` for the `authenticated` role. This allows any authenticated user to insert arbitrary rows into the `app_errors` table, potentially flooding it with noise, obscuring real errors, or abusing it as a logging channel.
- **Files**: Migration where `app_errors_insert` policy was created.
- **Impact**: MEDIUM
- **Fix**: Restrict the INSERT policy to only the fields the application writes (e.g. add a CHECK on `user_id = auth.uid()` and/or restrict `error_type` to a known enum). Alternatively, use service role only for inserts and remove the RLS INSERT policy entirely.

### SEC-NEW-2 — Import/export routes forward `err.message` from external services to client
- **Problem**: 15+ import/export routes (Google Sheets import, history export, XLSX generation) catch errors and return `err.message` directly in the JSON response. These messages can reveal internal service configuration details (GSheet IDs, OAuth scopes, file paths) to authenticated users.
- **Files**: `app/api/export/`, `app/api/admin/import/`, related import routes
- **Impact**: MEDIUM
- **Fix**: Replace `err.message` in catch blocks for external service calls with a generic `'Errore servizio esterno'` string. Log the real error server-side: `console.error('[import]', err.message)`.
- **Discovered**: security-audit 2026-03-30

### SEC-NEW-3 — Dynamic route handlers lack UUID path-param validation
- **Problem**: All 20+ dynamic API routes (e.g. `/api/compensations/[id]`, `/api/tickets/[id]`) use `params.id` directly in Supabase queries without validating UUID format. An invalid UUID (e.g. `../admin`, `' OR 1=1`) causes a Supabase DB error (not a clean 400), leaking internal error shape to the caller.
- **Files**: All `app/api/**/*[id]*/route.ts` files (20+ handlers)
- **Impact**: MEDIUM
- **Fix**: Add `z.string().uuid().parse(id)` at the top of each dynamic handler, wrapped in try/catch returning `{ error: 'ID non valido' }` with status 400.
- **Discovered**: security-audit 2026-03-30

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

### API1 — ~~`request.json()` called without `.catch()` or `try/catch` in 42 routes~~ — RESOLVED
- **Problem**: 42 API route handlers call `await request.json()` (or `await req.json()`) without wrapping in a `try/catch` or chaining `.catch()`. If the client sends a malformed JSON body (e.g. truncated payload, wrong `Content-Type`), the `JSON.parse` inside `request.json()` throws a `SyntaxError`. In Next.js App Router, an unhandled throw returns a raw 500 text response instead of a clean `{ error }` JSON. Client code that always expects JSON will silently fail. Known-safe routes use `.catch(() => null)` inline (e.g. `bulk-approve`, `assegnazioni/route.ts`).
- **Sample affected files (42 total)**:
  - `app/api/tickets/route.ts` (POST handler, line 82)
  - `app/api/tickets/[id]/status/route.ts` (line 31)
  - `app/api/auth/change-password/route.ts` (line 19)
  - `app/api/admin/create-user/route.ts` (line 60)
  - `app/api/admin/communities/route.ts` (line 42)
  - `app/api/admin/communities/[id]/route.ts` (line 30)
  - `app/api/admin/collaboratori/[id]/route.ts` (line 61)
  - `app/api/admin/collaboratori/[id]/profile/route.ts` (line 84)
  - `app/api/compensations/route.ts` (line 62)
  - `app/api/compensations/[id]/transition/route.ts` (line 67)
  - `app/api/expenses/route.ts` (line 72)
  - `app/api/expenses/[id]/transition/route.ts` (line 63)
  - `app/api/corsi/route.ts` (line 84), `corsi/[id]/route.ts`, `corsi/[id]/lezioni/route.ts`, `corsi/[id]/lezioni/[lid]/route.ts`, `corsi/[id]/valutazioni/route.ts` (5 corsi routes — bare, no try/catch wrapper)
  - `app/api/events/route.ts`, `events/[id]/route.ts`, `communications/route.ts`, `communications/[id]/route.ts`, `discounts/route.ts`, `discounts/[id]/route.ts`, `resources/route.ts`, `resources/[id]/route.ts`
  - and 20+ more admin/profile routes
- **Impact**: MEDIUM — malformed JSON from a browser/test client returns a non-JSON 500, breaking client error handling
- **Fix**: Standardize on `const body = await request.json().catch(() => null)` followed by a null check (preferred for simple routes), or wrap in `try/catch`. Merge with S4 resolution.

### API2 — `canTransition` failure returns 403 for both permission and state-conflict cases
- **Problem**: `POST /api/compensations/[id]/transition` and `POST /api/expenses/[id]/transition` pass all `canTransition` failures to the client with `status: 403`. However, `canTransition` can fail for two distinct reasons:
  1. The caller's **role** is not allowed for the action → 403 (correct)
  2. The record's **current state** does not permit the transition (e.g. approving an already-APPROVATO record) → should be 409 (state conflict), not 403
  Currently both cases return 403, making it impossible for clients to distinguish "you can never do this" from "you can do this, but not right now".
- **Files**: `app/api/compensations/[id]/transition/route.ts:79`, `app/api/expenses/[id]/transition/route.ts:74`, `lib/compensation-transitions.ts:canTransition`, `lib/transitions.ts:canTransition`
- **Impact**: MEDIUM
- **Fix**: Enrich the `TransitionResult` type with a `reason_code` field (`'role' | 'state'`) and map to the correct status code in the route handler: `reason_code === 'role'` → 403, `reason_code === 'state'` → 409.

### API3 — State conflicts returning 400 instead of 409 in 4+ routes
- **Problem**: RFC 9110 defines 409 Conflict as the correct code for "the request conflicts with the current state of the resource". The following routes return 400 for conditions that are clearly state conflicts:
  1. `POST /api/documents/[id]/sign` line 37: `Il documento non è in stato DA_FIRMARE` → should be 409
  2. `POST /api/tickets/[id]/messages` line 62: `Il ticket è chiuso` → should be 409
  3. `POST /api/compensations/approve-bulk` line 54: `Alcuni compensi selezionati non sono in stato IN_ATTESA` → should be 409
  4. `POST /api/expenses/approve-bulk` line 54: same pattern → should be 409
  5. `POST /api/onboarding/complete` line 53: `Onboarding già completato` → should be 409
- **Files**: listed above
- **Impact**: MEDIUM — clients using status codes to drive UI behavior (retry logic, "try again later" vs "bad request") will show wrong UX
- **Fix**: Change each listed status to 409. No logic change needed.

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

### API6 — 8 content and ticket write routes lack Zod validation
- **Problem**: The following POST/PATCH routes do not use Zod `safeParse` — they either manually check individual fields with `if (!field)` or use TypeScript `as` casts without runtime validation. Missing Zod means: (1) unexpected field types reach the DB without sanitization, (2) error responses are inconsistent (some return Italian strings, some return nothing), (3) no `.issues` array available for client-side field-level error display.
  - `POST /api/tickets` — manual `if (!categoria?.trim() || !oggetto?.trim())`
  - `PATCH /api/tickets/[id]/status` — manual `if (!stato || !VALID_STATI.includes(stato))`
  - `POST /api/tickets/[id]/messages` — no validation (just null check on `message`)
  - `POST /api/opportunities` — manual field checks
  - `POST /api/communications` — manual field checks
  - `POST/PATCH /api/resources` — manual field checks
  - `POST/PATCH /api/events` — manual field checks
  - `POST/PATCH /api/discounts` — manual field checks
- **Files**: listed above
- **Impact**: MEDIUM — supersedes and extends S4/SEC15 which listed 6 routes; this entry adds the content routes
- **Fix**: Add Zod schema + `safeParse` to each route. Return `{ error: 'Validation failed', issues: result.error.issues }` on failure. Coordinate with S4 resolution.

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

### API9 — Inconsistent Zod validation error shape in 8 routes
- **Problem**: The project standard for Zod validation failures is `{ error: 'Dati non validi', issues: result.error.issues }` (used in 20+ routes: `expenses`, `liquidazione-requests`, `compensations`, etc.). Eight routes wrap the issues array directly in the `error` key: `{ error: parsed.error.issues }` — an array where a string is expected. Client code that reads `data.error` as a string to display will receive `[object Object]` or `[...]`. The affected routes are all in the corsi domain plus `admin/blacklist`.
- **Files**: `app/api/corsi/route.ts:86`, `app/api/corsi/[id]/route.ts:78,87`, `app/api/corsi/[id]/lezioni/route.ts:53`, `app/api/corsi/[id]/lezioni/[lid]/route.ts:36`, `app/api/admin/blacklist/route.ts:62`
- **Impact**: MEDIUM — client error display shows `[object Object]` for validation failures in corsi/blacklist routes
- **Fix**: Replace `{ error: parsed.error.issues }` with `{ error: 'Dati non validi', issues: parsed.error.issues }` in all 6 files listed above.

---

## DB — Database Schema / Indexes / RLS

### ~~DB1~~ — `candidature` table: 4 FK columns completely unindexed — ✅ RESOLVED migration 063
- Indexes `candidature_collaborator_id_idx`, `candidature_corso_id_idx`, `candidature_lezione_id_idx`, `candidature_city_user_id_idx` added in migration 063.

### ~~DB2~~ — `lezioni.corso_id` FK column unindexed — ✅ RESOLVED migration 063
- Index `lezioni_corso_id_idx` added in migration 063.

### DB3 — 39 RLS policies use bare `auth.uid()` — per-row function evaluation
- **Problem**: Supabase's own documentation recommends wrapping `auth.uid()` and `auth.role()` in `(select ...)` to enable per-statement caching instead of per-row evaluation. Query `S4B` identified 39 policies across tables including `compensations`, `expense_reimbursements`, `tickets`, `candidature`, `assegnazioni`, `collaborators`, `user_profiles`, `liquidazione_requests`, and others that call bare `auth.uid()`. On tables with hundreds/thousands of rows, `auth.uid()` is called once per row per query instead of once per query.
- **Files**: All RLS migration files (migrations 002 through 058).
- **Impact**: MEDIUM (performance degradation at scale — measurable at >1000 rows per table)
- **Fix**: Replace every `auth.uid()` with `(select auth.uid())` in USING and WITH CHECK clauses. This is a policy-wide migration — replace all at once in a single migration for consistency. Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

### DB4 — All 90+ RLS policies lack explicit `TO` clause (all `{public}`)
- **Problem**: Query `S4C` confirmed that all 90+ RLS policies in the `public` schema have `roles = '{public}'`, meaning they apply to ALL roles including the `anon` role. Since the app uses `authenticated` sessions only, the `anon` role should never access any data. The current setup adds overhead: every anonymous request to any table triggers policy evaluation. It also increases the attack surface if a misconfigured route bypasses session checks.
- **Files**: All RLS migration files.
- **Impact**: MEDIUM (defense-in-depth gap; minor performance overhead on anon requests)
- **Fix**: Add `TO authenticated` to every policy that targets logged-in users. For insert-only policies (like `app_errors_insert`, `feedback_insert`) that are intentionally open: explicitly document the choice. Migration pattern: `ALTER POLICY policy_name ON table_name TO authenticated USING (...) WITH CHECK (...)`.

### ~~DB5~~ — `compensation_attachments.compensation_id` FK column unindexed — ✅ RESOLVED migration 063
- Index `comp_attachments_compensation_id_idx` added in migration 063.

### ~~DB6~~ — `ticket_messages.ticket_id` FK column unindexed — ✅ RESOLVED migration 063
- Index `ticket_messages_ticket_id_idx` added in migration 063.

### DB7 — `user_profiles.theme_preference` is `varchar(5)` — should be `text`
- **Problem**: `user_profiles.theme_preference` is defined as `character varying(5)`. Per PostgreSQL best practices (wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_varchar.28n.29_by_default), `varchar(n)` offers no storage advantage over `text` but adds an arbitrary rejection constraint. The value `'dark'` fits in 5 chars, but `'system'` (a valid next-themes value) does not — any future theme addition longer than 5 chars would silently fail.
- **Files**: `supabase/migrations/` (whichever migration created `user_profiles.theme_preference`)
- **Impact**: MEDIUM (silent truncation/rejection risk for future theme values)
- **Fix**:
  ```sql
  ALTER TABLE user_profiles ALTER COLUMN theme_preference TYPE text;
  ```

### DB8 — Missing filter indexes on `compensations.data_competenza`, `tickets.last_message_at`
- **Problem**: `db-map.md` documents these as known gaps. `compensations.data_competenza` is used in date-range filters during export (admin Coda lavoro). `tickets.last_message_at` is used for recency ordering in the ticket list. Both columns are queried without an index, causing full table scans as data grows. `expense_reimbursements.data_spesa` already has NOT NULL + a btree-friendly type but no index.
- **Files**: No migration — missing indexes.
- **Impact**: LOW (currently low row counts; becomes Medium at >5000 rows)
- **Fix**:
  ```sql
  CREATE INDEX compensations_data_competenza_idx ON compensations(data_competenza);
  CREATE INDEX tickets_last_message_at_idx ON tickets(last_message_at DESC NULLS LAST);
  CREATE INDEX er_data_spesa_idx ON expense_reimbursements(data_spesa);
  ```

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

### DB13 — `tickets.community_id` FK column unindexed
- **Problem**: `tickets.community_id → communities.id` has no index. The `tickets_manager_read` RLS policy joins `collaborators → collaborator_communities → user_community_access` and then filters via `creator_user_id`; if any future query filters by `community_id` directly (e.g. community-scoped ticket list), it performs a sequential scan.
- **Files**: `supabase/migrations/` — add index
- **Impact**: MEDIUM
- **Fix**: `CREATE INDEX tickets_community_id_idx ON tickets(community_id);`
- **Discovered**: skill-db audit 2026-03-27

### DB14 — `corsi.community_id` FK column unindexed
- **Problem**: `corsi.community_id → communities.id` has no index. Queries filtering corsi by community (e.g. resp.citt joining corsi on city, admin per-community corsi list) perform sequential scans on the full corsi table.
- **Files**: `supabase/migrations/` — add index
- **Impact**: MEDIUM
- **Fix**: `CREATE INDEX corsi_community_id_idx ON corsi(community_id);`
- **Discovered**: skill-db audit 2026-03-27

### DB15 — `documents.community_id` FK column unindexed
- **Problem**: `documents.community_id → communities.id` has no index. Responsabile document queries use `can_manage_community(community_id)` in `documents_manager_read` RLS policy — if any query filters by `community_id`, it scans the full documents table.
- **Files**: `supabase/migrations/` — add index
- **Impact**: LOW (responsabile document queries currently go through `collaborator_id` first)
- **Fix**: `CREATE INDEX documents_community_id_idx ON documents(community_id);`
- **Discovered**: skill-db audit 2026-03-27

### DB16 — `tickets.creator_user_id ON DELETE NO ACTION` — orphaned tickets risk
- **Problem**: The FK `tickets.creator_user_id → auth.users` uses `ON DELETE NO ACTION`. If an auth user is deleted (e.g. admin deactivates + removes account), their tickets remain with a dangling `creator_user_id` that no longer resolves. The ticket_messages, notifications, and community joins based on this FK become logically orphaned.
- **Files**: `supabase/migrations/` — alter FK
- **Impact**: LOW (user deletion is rare; member_status flow softly deactivates before hard delete)
- **Fix**: Change to `ON DELETE SET NULL` and make `creator_user_id` nullable, or add `ON DELETE RESTRICT` to prevent user deletion while tickets exist.
- **Discovered**: skill-db audit 2026-03-27

### DB-NEW-1 — `compensations.importo_lordo` nullable — NaN propagation risk
- **Problem**: `importo_lordo` has no NOT NULL constraint. A NULL value silently propagates as NaN through `importo_netto` and `ritenuta_acconto` calculations, producing corrupt financial records without a DB-level error.
- **Files**: `supabase/migrations/` — ALTER COLUMN
- **Impact**: MEDIUM
- **Fix**: Verify no NULL rows exist (`SELECT COUNT(*) FROM compensations WHERE importo_lordo IS NULL`), then `ALTER TABLE compensations ALTER COLUMN importo_lordo SET NOT NULL`.
- **Discovered**: skill-db audit 2026-03-30

### DB-NEW-2 — `compensations.importo_netto` nullable — NaN propagation risk
- **Problem**: Same as DB-NEW-1. `importo_netto` is nullable — should always be derived from `importo_lordo` and `ritenuta_acconto`, so NULL is semantically invalid.
- **Files**: `supabase/migrations/` — ALTER COLUMN
- **Impact**: MEDIUM
- **Fix**: `ALTER TABLE compensations ALTER COLUMN importo_netto SET NOT NULL` (after backfill check).
- **Discovered**: skill-db audit 2026-03-30

### DB-NEW-3 — `compensations.ritenuta_acconto` nullable — incorrect net calculation
- **Problem**: `ritenuta_acconto` is nullable. A NULL withholding rate causes `importo_netto` to be calculated incorrectly (treated as 0%) — the collaborator appears to receive gross pay.
- **Files**: `supabase/migrations/` — ALTER COLUMN
- **Impact**: MEDIUM
- **Fix**: `ALTER TABLE compensations ALTER COLUMN ritenuta_acconto SET NOT NULL` (after backfill check).
- **Discovered**: skill-db audit 2026-03-30

### DB-NEW-4 — `compensations.data_competenza` nullable — date-range filters silently exclude rows
- **Problem**: `data_competenza` is nullable. Date-range export filters (e.g. `gte`/`lte`) silently exclude NULL rows, causing compensations without a competency date to disappear from exports without any error.
- **Files**: `supabase/migrations/` — ALTER COLUMN
- **Impact**: MEDIUM
- **Fix**: `ALTER TABLE compensations ALTER COLUMN data_competenza SET NOT NULL` (after backfill check).
- **Discovered**: skill-db audit 2026-03-30

### DB-NEW-5 — No `CHECK (importo_lordo > 0)` on compensations
- **Problem**: No constraint prevents a service-role insert (bypassing Zod) from writing a zero or negative gross amount. This creates financially invalid records.
- **Files**: `supabase/migrations/` — ADD CONSTRAINT
- **Impact**: MEDIUM
- **Fix**: `ALTER TABLE compensations ADD CONSTRAINT chk_comp_lordo_positive CHECK (importo_lordo > 0)` (verify no zero/negative rows first).
- **Discovered**: skill-db audit 2026-03-30

### DB-NEW-6 — No `CHECK (importo > 0)` on expense_reimbursements
- **Problem**: Same pattern as DB-NEW-5 on the `expense_reimbursements` table. No positive-amount constraint at DB level.
- **Files**: `supabase/migrations/` — ADD CONSTRAINT
- **Impact**: MEDIUM
- **Fix**: `ALTER TABLE expense_reimbursements ADD CONSTRAINT chk_exp_importo_positive CHECK (importo > 0)`.
- **Discovered**: skill-db audit 2026-03-30

### DB-NEW-7 — No `CHECK (ritenuta_acconto BETWEEN 0 AND 100)` on compensations
- **Problem**: The withholding rate is stored as a percentage (e.g. 20 = 20%). No DB constraint prevents inserting a value outside 0–100, which would produce mathematically invalid `importo_netto` calculations.
- **Files**: `supabase/migrations/` — ADD CONSTRAINT
- **Impact**: MEDIUM
- **Fix**: `ALTER TABLE compensations ADD CONSTRAINT chk_ritenuta_range CHECK (ritenuta_acconto BETWEEN 0 AND 100)`.
- **Discovered**: skill-db audit 2026-03-30

### DB-NEW-8 — `expense_attachments.reimbursement_id` FK unindexed
- **Problem**: The FK `expense_attachments.reimbursement_id → expense_reimbursements.id` has no index. Every expense detail page join and cascade delete operation requires a full sequential scan of `expense_attachments`.
- **Files**: `supabase/migrations/` — CREATE INDEX CONCURRENTLY
- **Impact**: MEDIUM
- **Fix**: `CREATE INDEX CONCURRENTLY idx_exp_att_reimbursement_id ON expense_attachments(reimbursement_id)`.
- **Discovered**: skill-db audit 2026-03-30

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

### DEV-3 — `CompensationEditModal` hardcodes `0.20` withholding rate — breaks P4M community
- **Problem**: `components/compensation/CompensationEditModal.tsx:40,56,78` uses the literal `0.20` as the default/fallback withholding rate. The canonical rate calculator `lib/ritenuta.ts` shows that TB rate = `lordo × 0.20` but P4M rate = `lordo × 0.60 × 0.20` (effectively `0.12` of lordo). The edit modal neither imports `calcRitenuta` nor receives community context, so editing a P4M collaborator's compensation will silently apply the wrong rate fallback. The derived `rateDecimal` is computed from existing DB values when open, which partially mitigates this — but the reset path (`handleClose`) always resets to `0.20`.
- **Files**: `components/compensation/CompensationEditModal.tsx:40,56,78`, `lib/ritenuta.ts`
- **Impact**: HIGH — silent data corruption for P4M compensation edits (wrong withholding rate reset)
- **Fix**: Pass `communityName` as a prop to `CompensationEditModal`. Import `calcRitenuta` from `lib/ritenuta.ts` (safe for client components). Replace the hardcoded `0.20` fallback with `calcRitenuta(communityName, 1)` (rate of 1 lordo) to derive the correct rate for the community.
- **Discovered**: skill-dev audit 2026-03-27

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

### PERF-11 — `CorsiCalendario` statically imported — no `next/dynamic`
- **Problem**: `components/corsi/CorsiPageCollab.tsx:9` statically imports `CorsiCalendario`, a client-side calendar component with full day-grid rendering logic. It loads eagerly in the initial JS bundle for every collaboratore visiting `/corsi`, even those with no calendar entries or who never view the calendar tab.
- **Files**: `components/corsi/CorsiPageCollab.tsx:9`
- **Impact**: MEDIUM (initial JS bundle size + parse time for all collaboratori on `/corsi`)
- **Fix**: Replace static import with `const CorsiCalendario = dynamic(() => import('./CorsiCalendario'), { ssr: false })` — the calendar doesn't need SSR.
- **Discovered**: perf-audit 2026-03-30
