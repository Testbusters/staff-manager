# Workflow Requirements

CRITICAL: these are non-negotiable process constraints. They apply to EVERY development task — feature blocks, bug fixes, refactoring, minor features — even when the full plan is provided in a single prompt. Always execute one phase at a time and stop at the indicated gates. Do not proceed to the next phase without explicit confirmation.

## Which pipeline to use

| Work type | Branch / worktree | Pipeline |
|---|---|---|
| Functional block (new feature, redesign, migration) | worktree `worktree-block-name` | Full pipeline — Phases 0 → 8.5 |
| Mini fix / bugfix / 1–3 file correction | `fix/description` | **Fast Lane** — see section below |

All functional blocks use a dedicated worktree (`.claude/worktrees/block-name`, branch `worktree-block-name`). If the current context is a `fix/` branch, use the Fast Lane. Otherwise, use the full pipeline with worktree setup.

---

## Mandatory Development Pipeline

**Phase 0 — Session orientation** *(only at the start of each new session or after a context summary)*
- **FIRST ACTION — session file**: before anything else, check `.claude/session/` for existing `block-*.md` files.
  - If one exists: read it immediately — a previous session was interrupted. Resume from the recorded state. Do NOT create a new file.
  - If none exists: create `.claude/session/block-new-session.md` with the current date and a placeholder skeleton. This file will be renamed to the real block name in Phase 1 once the block name is known.
  - This is non-negotiable: the session file must exist before any other Phase 0 action runs.
- Read `.claude/CLAUDE.local.md` to confirm active overrides for this session (it is auto-loaded, but an explicit read ensures its content is fully in context). If the file does not exist, continue.
- Check `MEMORY.md` (project root): read the **Active plan** section (if present) to re-align on in-progress sessions, then **Lessons/Patterns** for patterns relevant to the current block. The auto-memory is injected automatically — no explicit read needed.
- If context was compressed (summary): read `docs/implementation-checklist.md` to re-align on current state.
- Do not re-read files already in the current context — use the already-acquired line reference.
- **Worktree setup** *(functional blocks — skip for Fast Lane `fix/` branches)*:
  1. **Propose name**: use `AskUserQuestion` to propose a worktree name in the format `worktree-[block-name]` and wait for explicit user approval. Do NOT create the worktree before the name is confirmed.
  2. **Create worktree**: `git -C ~/Projects/staff-manager worktree add .claude/worktrees/[block-name] -b worktree-[block-name] staging`
  3. **Environment setup** (mandatory, in this order):
     - `cp ~/.envs/staff-manager.staging.env ~/Projects/staff-manager/.claude/worktrees/[block-name]/.env.local`
     - `cp ~/Projects/staff-manager/CLAUDE.md ~/Projects/staff-manager/.claude/worktrees/[block-name]/`
     - If `.claude/CLAUDE.local.md` exists: `cp ~/Projects/staff-manager/.claude/CLAUDE.local.md ~/Projects/staff-manager/.claude/worktrees/[block-name]/.claude/`
     - `node_modules` and `.next` are **auto-symlinked** by `EnterWorktree` via `settings.json` (`worktree.symlinkDirectories`). No manual `ln -s` needed.
  4. **Enter worktree**: use the `EnterWorktree` tool to switch the active context to the new worktree directory. All subsequent file operations run inside the worktree.
- **For Fast Lane (`fix/`)**: confirm current branch starts with `fix/`. If on `main` or `staging`: stop — instruct user to run `sm-fix description`. No worktree needed.

**Phase 1 — Requirements**
- **Rename session file**: at the start of Phase 1, once the block name is determined, rename `.claude/session/block-new-session.md` → `.claude/session/block-[name].md`. If the file was already named correctly (resumed session), skip this step.
- Update the session file after every significant exchange during requirements definition (each AskUserQuestion answer, each design decision). This ensures the session can be resumed if the tab is accidentally closed. See `.claude/session/` for format reference.
- Read `docs/implementation-checklist.md` for two specific checks only: (1) are prerequisite blocks marked ✅ before this one starts? (2) are there any 🔄 in-progress blocks in the same functional area that could cause file conflicts? Do not read it for general orientation.
- Read **only the relevant section** of `docs/requirements.md` for the current block — not the entire file. Purpose: historical context and related blocks already planned, not the spec for the current block (that gets written at the start of Phase 2).
- **Consult `docs/entity-manifest.md`**: for any block touching a domain entity (profile, compensation, reimbursement, document, ticket, content), look up the entity and read its linked contract file in `docs/contracts/`. Every surface and entry point listed there is a mandatory candidate for the file list. This is a **functional** dependency check — distinct from and complementary to the code-level scan below. If the block introduces a brand-new entity (new DB table + CRUD surface), propose creating a new contract file in `docs/contracts/` and a new entry in `entity-manifest.md` before proceeding to Phase 1.5.
- **Consult `docs/dependency-map.md`** (alongside entity-manifest.md, before Tier selection): look up the entity being modified to get an early read on surface count and consumer spread. A high surface count or shared utility with >10 consumers seen here upgrades the tier to Tier 2 even if the initial signal was Tier 1. If the entity is not listed, add it to the map before proceeding.
- **Consult `docs/prd/01-rbac-matrix.md`**: for any block touching role permissions, RBAC rules, member_status restrictions, or adding a new role/entity. The matrix is the cross-cutting authority — entity contracts describe field-level detail, the RBAC matrix is the role-level overview.
- Summarize the block's requirements concisely based on the doc reads above.
- **Scope confirmation gate — always mandatory**: apply the **Interaction Protocol** (CLAUDE.md § Plan-then-Confirm) using the structured sweep below. First, select the tier based on block signals from the doc reads, declare it explicitly, and allow the user to override before proceeding.

  **Tier selection (auto, after doc reads):**
  - **Tier 1 — Standard Sweep**: ≤5 files, single entity, no migration, no new pattern, no cross-role change.
  - **Tier 2 — EARS + Deep Sweep**: >5 files, OR new entity, OR migration, OR multi-role change, OR new integration, OR full redesign.
  - **Tier upgrade after dep scan**: if the dep scan reveals a file count or consumer spread beyond Tier 1 thresholds (e.g. shared utility with >10 consumers), complete the Tier 2 sweep before the STOP gate — even if Tier 1 was selected initially.

  Work through every dimension of the selected tier. Note "clear" if no ambiguity; include open items in the `AskUserQuestion` call. The user — not Claude — declares when the scope is complete. Do NOT proceed to the dependency scan until an execution keyword is received.

  **Tier 1 — Standard Sweep:**
  - **Roles & permissions**: which roles are in scope? Any implicit inclusion or exclusion?
  - **Data**: entities read/written? Cascading effects? Silent data loss possible?
  - **Triggers**: what user action or system event activates this? Any secondary trigger?
  - **Error conditions**: invalid input, missing data, concurrent edits — behavior defined?
  - **UI states**: empty, error, loading covered?
  - **Integrations**: emails, notifications, external systems affected?
  - **Reversibility**: any irreversible operation? Rollback path defined?
  - **Explicit exclusions**: what is NOT being done that a reader might assume is included?

  **Tier 2 — EARS + Deep Sweep:**
  - **Triggers** `WHEN`: what event activates this? Secondary or implicit triggers?
  - **Conditions** `IF/THEN`: what preconditions change behavior? Edge cases, concurrent edits?
  - **States** `WHILE`: which entity states (`member_status`, record status) or user states (role, onboarding) affect behavior? All combinations covered?
  - **Optional / role-gated** `WHERE`: what is conditional on role, community, or config? Role-specific variations not stated?
  - **Roles & permissions**: any permission edge case (`uscente`, responsabile community mismatch)?
  - **Data**: entities read/written? Cascading effects? Silent data loss possible?
  - **UI states**: empty, error, loading, dark/light mode?
  - **Integrations**: emails, notifications, GSheets, external systems triggered or suppressed?
  - **Reversibility**: any irreversible operation? Rollback path defined?
  - **Explicit exclusions**: what is NOT being done that a reader might assume is included?
  - **Pre-mortem**: if this plan fails in Phase 2 due to scope ambiguity, what ambiguity caused it?

  Compose one `AskUserQuestion` with all open items across dimensions.
- **Dependency scan** (mandatory when the block touches existing routes, components, or pages — runs only after scope is confirmed): grep/glob for ALL usages of affected entities. Minimum checks:
  0. **Consult `docs/dependency-map.md` first**: look up the entity being modified. Every listed surface is a mandatory candidate for the file list. If the entity is not listed, add it to the map before proceeding.
  1. Every route being moved/repurposed/removed → `grep href="/route"` across all `.tsx`/`.ts`
  2. Every component being modified → find all import consumers
  3. Every redirect being added → check breadcrumbs and CTAs in pages that link to the old route
  4. Check `e2e/` and `__tests__/api/` for files referencing affected routes or selectors
  5. Every shared type or utility being modified (e.g. `lib/types.ts`, `lib/transitions.ts`) → grep import count across `.ts`/`.tsx`. If >10 consumers: treat as high-impact regardless of file count; list all consumers in the file list.
  6. Every table being modified → check FK references from other tables and RLS policies filtering on modified columns. Query: `SELECT conname, conrelid::regclass FROM pg_constraint WHERE confrelid='tablename'::regclass AND contype='f';`
  - **Always delegate the full dependency scan to the `dependency-scanner` custom agent** (`.claude/agents/dependency-scanner.md`) — the standard checklist (items 1–6) is inherently multi-query and must never run in the main context. Invoke via `Agent tool` with `subagent_type: "dependency-scanner"`. Fallback: generic Explore subagent with `model: "haiku"`.
  - An incomplete dependency scan = incomplete file list = rework discovered in Phase 2. This is a process error.
- For broad codebase searches (≥2 independent Glob/Grep queries): use the Agent tool with `subagent_type: 'Explore'` and `model: 'haiku'` to protect the main context and reduce cost.
- Expected output: feature summary, **complete** file list verified by dependency scan.
- *** STOP — present requirements summary and file list. Any residual questions that emerged from the scan must be included here, not in a new `AskUserQuestion` call. Wait for an execution keyword (`Esegui` · `Procedi` · `Confermo` · `Execute` · `Proceed`) before proceeding. ***

**Phase 1.5 — Design review** *(blocks introducing new patterns, DB schema changes, or architectural decisions)*

**Triggers — this phase is required when the block:**
- Introduces a new shared pattern, utility, or service (used by >1 consumer)
- Applies a DB schema change (new table, column, FK, index, RLS policy)
- Involves a cross-cutting refactor (shared type, state machine, auth flow)
- Introduces a new external integration (new MCP, new API, new cron job)

**Skip**: if the block touches ≤5 files AND none of the above triggers apply — skip, stating so explicitly. File count alone is not a trigger.

**Execution** — delegate to the **`Plan` subagent** (`Agent tool`, `subagent_type: "Plan"`). Pass the confirmed scope from Phase 1 and the file list. The subagent returns a structured architectural plan; present it as the design contract for Phase 2.

**Minimum output required** (the Plan subagent must cover all applicable sections):
1. **Data model** — entities, key fields, relationships (table or ASCII diagram)
2. **API contract sketch** — new/modified routes: verb, path, payload shape, response shape, auth requirement *(only if block creates/modifies API routes)*
3. **Decision log** — at least 2 alternatives evaluated with rationale for the chosen approach. "No alternatives considered" is not acceptable.
4. **Risk register** — what can fail in Phase 2 due to this architectural choice? Pre-mortem on the design itself, not the scope.

The approved output is the **architectural contract** for Phase 2 — implementation must match it. Any deviation discovered in Phase 2 requires returning here.

- **All clarification questions arising during design review must use the `AskUserQuestion` tool** — same rule as Phase 1, no inline open questions.
- *** STOP — present Plan subagent output. Wait for an execution keyword (`Esegui` · `Procedi` · `Confermo` · `Execute` · `Proceed`) before writing code. ***

**Phase 1.6 — Visual & UX Design** *(run when triggered)*

**Triggers**: new page route or full-page redesign · new layout pattern or navigation structure · change to information architecture of existing page · new complex interactive pattern (multi-step flow, bulk actions, split views).

**Skip**: block modifies only an internal section of an existing page without layout or navigation change → skip. Use Phase 1.5 if architectural decision involved.

> **Model — MANDATORY**: switch to Opus 4.6 before executing (`/model opus`). Switch back to Sonnet only after STOP confirmed.

**Execute**: invoke Skill tool with `skill: "phase-design"`. Full procedure in `.claude/skills/phase-design/SKILL.md` (steps 0–6: consistency check → wireframe → HTML preview → UX rationale → design system mapping → Design Quality Gate (10 criteria) → session persist).

7. **STOP — present wireframe + HTML preview + UX rationale + component map + Design Quality Gate checklist. Wait for execution keyword before proceeding to Phase 2. Switch back to Sonnet (`/model sonnet`) only after the user confirms. The approved output is the implementation contract — Phase 2 must match it.**

**Plan lock + context reset** *(after Phase 1, 1.5, or 1.6 STOP gate is confirmed — mandatory before every Phase 2)*
- **Pre-compact check**: verify the session file (`.claude/session/block-[name].md`) is up to date with all decisions made — scope from Phase 1, architectural contract from Phase 1.5 (if run), design contract from Phase 1.6 (if run). Update it now if any decision is missing. This file is the only persistent state that survives `/compact`.
- Use `EnterPlanMode` to present the complete approved plan in structured, locked form. The plan must reference: file list (Phase 1), architectural decisions (Phase 1.5 if run — see session file), design contract (Phase 1.6 if run — see session file). Call `ExitPlanMode` after confirmation.
- Run `/compact` immediately to reset context and preserve enough window for the full Phase 2 implementation.
- Phase 2 begins only after `/compact` completes.

**Phase 2 — Implementation**
- **First action — restore design contracts**: re-read the session file (`.claude/session/block-[name].md`) to restore the architectural contract (Phase 1.5) and design contract (Phase 1.6) into context. `/compact` clears the conversation context — the session file is the only source for approved design decisions. Skip if no Phase 1.5/1.6 contracts were saved.
- **Second action**: update `docs/requirements.md` with the approved plan for the current block (add or update the relevant section with the feature summary and scope as confirmed in Phase 1/1.5). This persists the approved spec before any code is written.

- **Implementation sequence** (mandatory order — deviating causes TypeScript cascades and missing-schema errors):
  1. Migration SQL → apply to staging immediately after writing
  2. TypeScript types and interfaces (`lib/types.ts`, shared enums)
  3. Shared utilities and helpers (`lib/`)
  4. API routes (`app/api/`)
  5. Server components and data-fetching functions
  6. Client components and UI

- **Plan deviation protocol**: if during implementation a discovery makes the approved plan wrong or incomplete (FK missing, field absent, business rule conflict), **STOP immediately** — do not adapt silently. State the divergence, propose the adjustment, wait for an execution keyword before continuing. Adapting the plan without user awareness is a process error.

- **UI components** — if Phase 1.6 was executed, the design contract in the session file is the primary implementation reference. CLAUDE.md `§ "UI Design System — MANDATORY RULES"` is the fallback for patterns not covered by the contract. Key: shadcn components only (no native HTML elements), semantic tokens only, `loading.tsx` for new routes, `aria-label` on icon-only buttons, `iconName: string` in nav data.

- **Per-component UI quality check** (inline, before moving to the next file): for every new UI component written, verify before proceeding: (1) only semantic tokens used — no hardcoded color values on structural elements; (2) `data-attribute` names match the selector strategy defined in the Phase 1.6 Design Quality Gate; (3) `aria-label` present on every icon-only button; (4) component renders correctly in both light and dark theme (semantic tokens are the guarantee).

- Do not add unrequested features. No unrequested refactoring.

- **`npx tsc --noEmit` at internal checkpoints**: for blocks touching >8 files, run after each logical group (after migrations+types, after API routes, after UI components). Fixes TypeScript errors close to where they are introduced — do not accumulate them for Phase 3.

- **After every new migration** (`supabase/migrations/NNN_*.sql`): apply **immediately** to the **staging DB only** (`gjwkvgfwkdwzqlvudgqr`) — use `mcp__claude_ai_Supabase__execute_sql` with `project_id: "gjwkvgfwkdwzqlvudgqr"` (preferred, no shell interpolation issues) or Node.js `https.request` as fallback. Verify with a SELECT query + add a row to `docs/migrations-log.md`. **Never apply to production (`nyajqcjqmgxctlqighql`) during development** — production migrations run exclusively in Phase 8 step 7 pre-deploy (see below). **Do not wait for tests to discover missing migrations** — finding them in later phases is a process error.
- **Destructive migrations** (`DROP COLUMN`, `DROP TABLE`, `ALTER TYPE … RENAME VALUE`, `TRUNCATE`): before applying, write the rollback SQL in a comment block at the top of the migration file (e.g. `-- ROLLBACK: ALTER TABLE t ADD COLUMN c ...`). This ensures recovery is possible without relying on memory.
- **PostgREST join syntax** (`table!relation`, `!inner`): verify FK existence before using it. If FK absent → two-step query (separate fetches + in-memory merge). Verification query: `SELECT conname FROM pg_constraint WHERE conrelid='tablename'::regclass AND contype='f';`
- **DROP CONSTRAINT before UPDATE** (migrations): if a column has a CHECK constraint and the UPDATE sets a value not allowed by the current constraint (e.g. renaming an enum value), the UPDATE fails. Pattern inside a single migration: (1) `ALTER TABLE t DROP CONSTRAINT c;` (2) `UPDATE t SET col = new_val WHERE ...;` (3) `ALTER TABLE t ADD CONSTRAINT c CHECK (...);` — all three statements in the same migration file so they run atomically.

- **Pre-commit self-review** (before moving to Phase 3 — covers both security and API design):
  - *Security*: (1) auth check before any operation; (2) input validated with Zod; (3) no sensitive data in response; (4) RLS not implicitly bypassed; (5) new tables: `ALTER TABLE t ENABLE ROW LEVEL SECURITY` present with at least one policy per relevant role.
  - *API design*: (1) verb correct — GET never mutates, POST/PATCH/DELETE for writes; (2) response shape consistent — always `{ data }` or `{ error }`, never mixed; (3) status codes: 400 validation, 401 no-token, 403 wrong-role, 409 conflict, 422 business rule; (4) ZodError uses `.issues` not `.errors`; (5) `await params` on all dynamic route segments (Next.js 15+); (6) pagination present on routes returning unbounded lists.

- Expected output: list of created/modified files with paths.

- **End-of-Phase 2 quality gate** (in this exact order, before Phase 3):
  1. **`/simplify`** — run on all changed files. Skip only for pure text/label changes with no logic. Fixes reuse, duplication, efficiency in-place.
  2. **`/skill-dev`** — full skill invocation on the block's changed files. Audits TypeScript safety, React antipatterns, coupling, dead code, `use client` sprawl. Critical findings: fix before Phase 3. Major/Medium: append to `docs/refactoring-backlog.md`. Skippable only for migration-only blocks with no TypeScript changes.

**Phase 3 — Build + unit tests**
- Run `npx tsc --noEmit` and `npm run build`. Must complete without errors.
- Run `npx vitest run`. All tests must pass.
- Expected output: summary line only (e.g. `✓ 106/106`). Do NOT paste full output — reduces token consumption.
- If something fails: paste only the error lines, fix, and re-run. Do not proceed with open errors.
- **Debug code check** (before committing): run `grep -rn "console\.log\|debugger\|TODO\|FIXME\|@ts-ignore\|eslint-disable" <changed-files>`. Remove or justify every match before proceeding. A debug `console.log` committed to staging is a process error.
- After green build + tests: **run `/commit`** (Conventional Commits skill) to stage and commit on the current `worktree-[block-name]` branch. The skill reads staged changes, determines type+scope, and executes the commit. Do NOT push to `staging` or `main` at this point — promotion happens in Phase 8.

**Phase 3b — API integration tests** *(only if the block creates or modifies API routes)*

**Test classification — three distinct types (do not conflate):**
- **Unit tests** (no I/O): schema validation, type checks, business logic functions. Place in `__tests__/api/`. Già eseguiti in Phase 3 — non ri-eseguire in isolation, aggiungili alla suite esistente.
- **DB integration tests**: direct Supabase service role calls. Test RLS constraints, CRUD, DB state. No dev server needed.
- **HTTP integration tests**: `fetch(APP_URL/api/...)`. Test proxy redirect behavior (401 on no-session). **Require a running dev server** — verify `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` returns 200/302 before writing these; if server is not running, skip HTTP tests and cover auth via RLS instead.

**File naming convention**: `__tests__/api/<resource>[-<sub-resource>].test.ts`. Examples: `candidature.test.ts`, `corsi-valutazioni.test.ts`, `compensations-import.test.ts`. Never use slashes or dynamic segment markers `[id]` in the filename.

**Minimum cases per new API route (AAA structure — Arrange → Act → Assert in every test):**
- Auth: no session → `fetch` with `redirect: 'manual'` → expect `[307, 401]`
- Authz (wrong role): test via RLS (anon client or service role with mismatched ownership) → DB error not null. HTTP 403 is structurally impossible without a real JWT for the wrong role in Vitest — use RLS verification instead. Document this explicitly in the test comment.
- Validation: invalid payload → 400 (if HTTP test feasible) or Zod schema rejection in unit test
- Business rules: application constraint violation → DB error or correct status code
- DB state: after write, verify expected record exists using service role client — not API response alone
- Happy path: expected status code + key response fields

**Test data rules:**
- **Fixture IDs**: always use canonical test accounts from `memory/test_credentials.md` — never create new permanent staging users. Key IDs: `COLLAB_ID = 'f6d75100-...'`, `COLLAB_P4M_ID = '608ccbe6-...'`.
- **Fixture prefix uniqueness**: each test file uses a unique `codice_identificativo` or name prefix (e.g. `TEST-<FEATURE>-001`) to avoid cross-file DB conflicts when Vitest runs files in parallel.
- **Cleanup-first + idempotency**: `beforeAll` must (1) delete any pre-existing data matching the test prefix before inserting fresh fixtures, and (2) cascade-delete dependent records (FK order: children before parents). Pattern: lookup by unique identifier → delete children → delete parent. Run twice in a row: same result.
- **afterAll**: delete all records inserted by this test file. Scope to the fixture prefix — never delete unrelated data.

**Conditional skip pattern**: never use `console.log + return` to skip a live test — it produces a false positive green. Use `test.skipIf(!process.env.VAR)('description', ...)` so Vitest marks it as skipped, not passed.

**Timeout**: add `{ timeout: 15000 }` to any `it()` that inserts or queries the staging DB. Default 5s is insufficient for multi-step fixture setup. Example: `it('inserts record', async () => { ... }, 15000)`.

- Focus on core cases — do not exhaust every combination, cover critical paths.
- Run `npx vitest run __tests__/api/<new-test-file>.test.ts` first (scope to the new file), then `npx vitest run` to confirm the full suite is green.
- Output: summary line only. Do not proceed with open errors.


**Phase 4 — UAT / Playwright e2e**

**Reference**: read `.claude/rules/playwright-patterns.md` before writing any spec — it contains timing, selector, serial context, and rich text patterns not repeated here.

**Spec file**: `e2e/[block-name].spec.ts` — use the same block name as the worktree. Wrap all tests in `test.describe.serial('Block name UAT', () => { ... })` — serial mode guarantees scenario order and shared state within the describe block. `playwright.config.ts` already sets `workers: 1` (global serial), but `describe.serial` also enforces within-describe ordering explicitly.

**Shared helpers — mandatory**: if `e2e/helpers.ts` does not exist, create it before writing the spec. It must export: `login(page, role)`, `db<T>(table, params)`, `dbFirst<T>(table, params)`, `dbPost<T>(table, body)`, `dbDelete(table, filter)`, `dbPatch(table, filter, body)`, `deleteAuthUser(userId)`. Never define these inline in a spec file — duplication across specs is a maintenance failure. See existing helpers pattern in git history (`cc207cc`).

**Test credentials**: always use canonical accounts from `memory/test_credentials.md`. For staging Playwright tests: `collaboratore_tb_test@test.com` (TB), `collaboratore_p4m_test@test.com` (P4M). `collaboratore@test.com` is production-only — never use it in spec files.

**Test data setup — Phase 4 is autonomous**:
- Phase 4 inserts its own fixtures in `beforeAll` via service role (Supabase REST API with `SERVICE_KEY` — not the `@supabase/supabase-js` client, which has session/context issues in Playwright). Phase 5b is separate — it prepares data for the manual smoke test (5c), not for automated specs.
- **Cleanup-first in `beforeAll`**: delete stale data matching the test prefix BEFORE inserting fresh fixtures. Cascade delete in FK order (children before parents).
- **`afterAll`**: delete all records inserted by this spec. Never delete fixtures in `e2e/fixtures/` — only temp files created during the test run.
- **`deleteAuthUser` FK rule**: before deleting an auth user, delete linked `documents` rows first (`documents.collaborator_id` FK constraint).

**Login and user switch**:
- Each test in a `describe.serial` block receives a FRESH browser context — call `login(page, role)` at the start of every `test()`, not once in `beforeAll`.
- To switch roles within the same spec (shared page via `beforeAll + browser.newPage()`): `goto('/login')` → if not on `/login` (active session) → click "Esci" → `waitForURL('/login')` → then login with new credentials.

**Timing — mandatory before every DB assertion**:
```
await Promise.all([
  page.waitForResponse(r => r.url().includes('/api/...') && r.request().method() === 'POST', { timeout: 15_000 }),
  page.click('button:has-text("Save")'),
]);
// DB assertion only after the above resolves
```
Never check DB state without waiting for the API response. Tests that assert DB state synchronously after a UI action will pass locally and fail non-deterministically in CI.

**Selector rules** (mandatory — full patterns in `playwright-patterns.md`):
- Status badges: `[data-stato="APPROVATO"]` (compensations/expenses) · `[data-ticket-stato="CHIUSO"]` (tickets)
- Dialog scope: `[data-slot="dialog-content"]`
- Never `span.text-{color}` — Badge renders `<div>`, not `<span>`
- `waitForLoadState`: use `domcontentloaded` on all app pages — never `networkidle` on pages with NotificationBell (30s polling prevents settle)

**Scenario naming**: use `S1 — description`, `S2 — description` convention. The Playwright report shows test names — generic names ("test 1", "submits form") make failure reports unreadable.

**Coverage per block** — minimum scenarios:
- Happy path: main user flow end-to-end for each affected role
- Auth boundary: unauthorized role → redirect or 403
- State transitions: if block touches a state machine, cover each transition
- Empty state: no records → correct empty state shown
- **If block modifies `proxy.ts`**: add redirect chain scenarios — `must_change_password=true → /change-password`, `onboarding_completed=false → /onboarding`, `is_active=false → /pending`, no session → `/login`. These are page-level redirects (API routes bypass proxy checks).

**Multi-role coverage**: for blocks with >1 affected role, test each role's happy path within the same spec (user switch pattern above) — do not create separate spec files per role.

**Timeouts**: default `playwright.config.ts` is `timeout: 30_000`. For complex flows (PDF generation, onboarding wizard, multi-step state machines), override with `test.setTimeout(60_000)` at the top of the specific `test()` block. Do not raise the global timeout.

**`retries: 0` is intentional**: the config has no retries by design. A flaky test masks a real timing bug or selector issue. Never add `retries` to fix intermittent failures — diagnose and fix the root cause.

- Run: `npx playwright test e2e/[block-name].spec.ts`
- Output: summary line only (`N passed`). Fix all failures before Phase 4b. Do not proceed with open failures.

**Phase 4b — Visual baseline**
- After Phase 4 passes: capture/update baseline screenshots with `npx playwright test e2e/[block-name].spec.ts --update-snapshots`.
- Snapshots committed in `e2e/snapshots/` as part of Commit 1 (code).
- On subsequent runs without `--update-snapshots`: visual regression is detected automatically.
- **Run 4b when**: the block creates or modifies at least one visible page or component. Skip only for blocks that are exclusively API routes, migrations, or lib utilities with zero UI surface.

**Phase 5b — Test data setup** *(MANDATORY — must complete before Phase 5c)*

**Step 1 — Insert test data** *(independent of dev server — do this first)*

Test credentials — always use canonical accounts from `memory/test_credentials.md`. Never create new permanent staging users:
- Collaboratore TB → `collaboratore_tb_test@test.com` · Collaboratore P4M → `collaboratore_p4m_test@test.com`
- Responsabile compensi → `responsabile_compensi_test@test.com` · Admin → `admin_test@test.com`
- Multi-community blocks (content, notifications, banners): insert data for BOTH communities. IDs: TB = `6a5aeb11-d4bc-4575-84ad-9c343ea95bbf` · P4M = `20ef2aac-7447-4576-b815-91d44560f00e`

**State coverage rule**: for every state machine state of the entities touched by the block (IN_ATTESA, APPROVATO_RESP, APPROVATO_ADMIN, PAGATO, RIFIUTATO, DA_FIRMARE, FIRMATO…), insert at least one record. The smoke test account must have data for every UI branch — not just the happy-path state.

**UAT prefix rule**: every record inserted in Phase 5b must be identifiable. Add a marker in a suitable field: `note_interne: 'UAT-[block-name]'` on compensations, `codice_identificativo: 'UAT-[BLOCK]-001'` on corsi, etc. This makes manual cleanup safe — search by prefix, delete only matching records.

**One-shot script rules** (security + correctness):
- Write the script directly in the project root — never in `/tmp/` (Node ESM resolves `node_modules` from the script's directory; `/tmp/` has none).
- Always load credentials via dotenv: `import { config } from 'dotenv'; config({ path: '.env.local' });`. Use `process.env.SUPABASE_SERVICE_ROLE_KEY` — **never hardcode the key in the script** (a hardcoded key commits production credentials to git).
- Verify staging before any write: assert `process.env.NEXT_PUBLIC_SUPABASE_URL` contains `gjwkvgfwkdwzqlvudgqr`. If not, `throw new Error('Wrong project — aborting')`.
- Cleanup-first: delete existing UAT records matching the prefix before inserting fresh ones. Cascade-delete in FK order (children before parents).
- Execute: `node script.mjs`. Then: `rm script.mjs`. The script must not remain in the repo.

**Step 2 — Start dev server** *(needed for Phase 5c and 5d Track A — do after data insertion)*
- **Worktree context**: detect first available port starting from 3000: `lsof -ti:3000` non-empty → try 3001, 3002… Start in background: `PORT=NNNN npm run dev > /tmp/staff-dev.log 2>&1 &`. Then poll until ready (max 48s): `for i in $(seq 1 24); do curl -s -o /dev/null -w "%{http_code}" http://localhost:NNNN | grep -q "200\|302" && break; sleep 2; done`. If not ready after 48s: read `/tmp/staff-dev.log` to diagnose (port conflict, .env.local missing, TypeScript error). Declare endpoint: **"Dev server started at `http://localhost:NNNN` — use this URL for smoke test steps."**
  - **Re-run after Phase 4**: `playwright.config.ts` uses `reuseExistingServer: false` on port 3001. If re-running Phase 4 after Phase 5b has already claimed port 3001, kill Phase 5b's server first: `kill $(lsof -ti:3001) 2>/dev/null || true`, then re-run Phase 4.
- **Main repo (non-worktree)**: insert data first (server-independent). Then instruct the user to start the dev server (`npm run dev`) when ready for Phase 5c.

**Cleanup lifecycle**: Phase 5b data is temporary. Clean up in the same session after Phase 5d completes (or after 5c if 5d is not applicable): delete all UAT-prefixed records inserted by this block. Exception: records needed for ongoing multi-session development may remain, but must carry the UAT prefix and be documented in the session file.

**Phase 5c — Manual smoke test** *(before the formal checklist)*
- **Run locally — feature branches never merge to staging before Phase 8**: smoke test always runs against `http://localhost:[PORT]` with `npm run dev` running.
  - **Worktree context**: use the port detected and declared in Phase 5b (server already running). Restate the endpoint at the top of this phase: **"Smoke test endpoint: `http://localhost:NNNN`"**.
  - **Main repo (non-worktree)**: default port 3000. If not running, instruct the user to start it first.
- **Step 1 — smoke test on localhost**: open the declared endpoint and use the staging test accounts (full list: `memory/test_credentials.md`):
  - Collaboratore TB → `collaboratore_tb_test@test.com` · Collaboratore P4M → `collaboratore_p4m_test@test.com`
  - Responsabile compensi → `responsabile_compensi_test@test.com` · Admin → `admin_test@test.com`
  - Responsabile cittadino: use the account from `memory/test_credentials.md` if available. Required for any block touching corsi/assegnazioni/valutazioni.
- **Multi-role coverage rule**: test every role that the block explicitly targets. For a single-role block, test only that role. For a multi-role block (e.g. collab + responsabile + admin), verify the primary CTA and nav for each role — use the account switch pattern (log out → log in as next role).
- **Minimum verification steps** (not optional): for each role tested: (1) page loads without JS errors in the browser console; (2) UAT records inserted in Phase 5b are visible in the list (not empty state); (3) primary CTA for the block's feature is present and clickable; (4) no 500 errors in the browser network tab. Confirm all four before marking smoke test OK.
- **Sidebar navigation check**: if the block adds a new nav item, confirm it appears in the sidebar for the correct roles and is absent for roles that should not see it.
- **For API-only blocks** (no UI surface — pure API routes, migrations, lib utilities): skip the browser steps. Instead run a targeted test: `curl -s -o /dev/null -w "%{http_code}" http://localhost:NNNN/api/<new-route>` → confirm 401 (no token, as expected). This verifies the route is reachable without a full UI walkthrough.
- Goal: catch obvious issues (blocked UI, wrong redirect, data not saved) before presenting Phase 6.
- Output: "smoke test OK" or list the problem and fix it. **Fix loop**: after any fix, run `npx tsc --noEmit`; if the fix touched an API route also run `npx vitest run __tests__/api/<affected-file>.test.ts`; then re-run the smoke test steps. Do not proceed to 5d until the smoke test passes cleanly.
- **For blocks with UI changes**: run the smoke test once in light mode and once in dark mode (sidebar theme toggle). Confirm both themes render correctly.
- **For blocks that trigger transactional emails** (invite, state transitions, ticket reply, content publish): run `/resend-verify` after the triggering action. The skill handles the full verification sequence (list → confirm delivery → CTA link check). Do NOT send emails to real user addresses — use `@test.com` or `@test.local` addresses only.

**Phase 5d — Block-scoped quality audit** *(two tracks — apply whichever match the block type; both may apply)*

**Track A — UI audit** *(if block adds/modifies UI routes or components — runs on localhost)*
- **Dev server health check**: `curl -s -o /dev/null -w "%{http_code}" http://localhost:NNNN | grep -q "200\|302" || echo "SERVER DOWN"`. If down: restart per Phase 5b Step 2.
- **Multi-route syntax**: `target:page:/route1 target:page:/route2`. Scope to block's modified routes only.
- **Execution** (sequential — shared Playwright session; ui-audit is static and runs concurrently):
  - `/ui-audit target:page:<route(s)>` — concurrent with first Playwright skill
  - `/visual-audit target:page:<route(s)>` → `/ux-audit target:page:<route(s)>` → `/responsive-audit target:page:<route(s)>` — sequential
  - Skip `/responsive-audit` for admin-only routes (desktop-only by design)
- **Server shutdown** (worktree only): `kill $(lsof -ti:NNNN) 2>/dev/null; sleep 1; kill -9 $(lsof -ti:NNNN) 2>/dev/null || true` (replace NNNN with the port declared in Phase 5b — two-step kill handles Next.js child worker processes). Track B audits may run after shutdown. Main repo: server was started by the user — do not stop it. If Track A fails mid-way and the server remains live, run the shutdown command manually before continuing.

**Track B — API/DB audit** *(if block creates/modifies API routes or applies migrations — static analysis, no dev server needed)*
- Run `/security-audit target:section:<section>` if the block creates or modifies any API route (auth, Zod, RLS, cron secret, export roles, sensitive data exposure).
- Run `/api-design target:section:<section>` if the block adds new API routes OR substantially modifies existing ones (response shape, verb, status codes, auth logic).
- `/security-audit` and `/api-design` are both static — run them concurrently.
- Run `/skill-db target:section:<section>` **only** if the block applies migrations (index coverage, RLS completeness, cascade behavior, data type choices).

**Track C — Performance audit** *(static, no dev server needed — run after Track A server shutdown if applicable)*
- **Trigger**: block adds ≥1 new page component, Server Component, or `lib/` utility imported by ≥5 consumers.
- Run `/perf-audit target:section:<section>` — covers `'use client'` sprawl, provider placement, sequential await waterfalls, missing `use cache`/`React.cache`, bundle health (`serverExternalPackages`, `optimizePackageImports`).
- Skip for migration-only blocks, doc-only blocks, and pure API route additions with no new components.
- Bundle analyzer checks require a prior `npm run build` — if Phase 3 build was run, they are included automatically; otherwise the skill skips them.

**Severity handling — all tracks**:
- **Critical**: fix before Phase 6. Do not proceed with open Critical issues.
- **Major**: flag in Phase 6 checklist with planned resolution sprint.
- **Medium / Minor**: append to `docs/refactoring-backlog.md` immediately — assign the correct ID prefix matching the backlog's existing scheme (`PERF-` performance, `DEV-` code quality, `SEC-`/`SEC` security, `DB-`/`B-` schema, `A-` architecture, `S-` structure, `T-` TypeScript, `N-` naming) and add to the priority index. Do not defer or accumulate silently.
- Output per skill: one-paragraph summary only — do not paste full reports.

**Phase 6 — Outcome checklist + confirmation**
Present the checklist from `@docs/phase6-checklist-template.md` filled with actual results, then wait for explicit confirmation before proceeding to Phase 8.

- *** STOP — do not declare the block complete, do not update any documents, do not move to the next block until the user responds with an execution keyword (`Esegui` · `Procedi` · `Confermo` · `Execute` · `Proceed`). ***

**Phase 8 — Block closure**
Only after explicit confirmation:
0. **Delete session recovery file**: remove `.claude/session/block-[name].md` if it exists.
   - Proceed with deletion only if the user's confirmation message unambiguously closes the block (e.g. "ok", "procedi", "tutto ok", "confermo").
   - If the confirmation is ambiguous (e.g. partial approval, open questions remaining, or the user mentioned wanting to continue something): ask explicitly before deleting — `"Confermo rimozione del file di sessione e chiusura del blocco?"` — then wait for a clear yes before proceeding.
   - Never delete the session file speculatively.
1. Update `docs/implementation-checklist.md`: mark block ✅, add a Log row with date, files, test results, relevant notes.
2. Update `CLAUDE.md` **only if** the block introduces non-obvious patterns, modifies RBAC, or adds a new coding convention. Do not update for simple file additions — Claude infers structure from code.
2b. If the block touched collaborator profile fields, permissions, or edit flows: update `docs/profile-editing-contract.md` (field × entry point matrix). Mandatory per CLAUDE.md reference documents.
2b2. If the block modified any domain entity (compensation, reimbursement, document, ticket, content): update the relevant contract file in `docs/contracts/` — field matrix, entry points, validation rules, state transitions, known constraints. If the block introduced a brand-new entity (new table + CRUD surface): create a new contract file in `docs/contracts/` AND add the entity to `docs/entity-manifest.md` before closing. If the block added a new surface to an **existing** entity (new API route, new UI component, new export, new email trigger): update the entity's row in `docs/entity-manifest.md` — add the surface to the relevant column. An outdated manifest causes future Phase 1 dep scans to miss surfaces from the file list.
2e. If the block changed role permissions for any entity, added a new action to an existing role, or modified member_status restrictions: update `docs/prd/01-rbac-matrix.md` — the relevant entity section. If the block introduced a new role: add a column to every table in that document.
2f. **PRD update — MANDATORY in every block, no exceptions (full pipeline and fast-lane alike).**
   - **Source of truth** (`docs/prd/prd.md`): update the relevant section(s) directly in the Markdown file whenever the block introduces a new feature area, changes architecture, adds an integration, modifies RBAC, or updates a workflow. Commit this file in Commit 2 (docs).
   - **Google Docs sync** (presentation layer): after updating `docs/prd/prd.md`, append a Changelog entry to the GDoc. Use the script in `@.claude/rules/gdoc-append.md`. Entry format: `DATE  |  vX.Y  |  Block Name: one-line summary.`
   - **Minimum scope**: even if the block is purely technical (bug fix, refactor), if it changes observable system behaviour, update the PRD. If no PRD section is affected (e.g. pure internal refactor with zero functional change), skip the GDoc append but still verify `docs/prd/prd.md` is current.
2c. If the block added/removed a route, changed role access to an existing route, modified member_status restrictions, or updated sidebar items: update `docs/sitemap.md`. Sync with `lib/nav.ts`, `proxy.ts`, and the relevant `page.tsx` guards. Also update the **Layout**, **Componenti chiave**, and **loading.tsx** columns for any page whose structure changed (new Tabs, Sheet, Tiptap added/removed; loading.tsx created/deleted).
2d. If the block applied a migration that adds/modifies tables, columns, FKs, indexes, or RLS policies: update `docs/db-map.md` — Tables section (add/update rows), FK Graph (add new FK lines), Indexes section, RLS Summary. Then run `node scripts/refresh-db-map.mjs` to regenerate the Column specs section from the live staging schema. Mandatory — `skill-db` uses this as authoritative schema reference.
3. Update `README.md` (Project Structure + test counts).
4. Update `MEMORY.md` (project root) **only if** new lessons emerged that are not already documented. Avoid duplications.
   - If project-root MEMORY.md exceeds ~150 active lines: extract the topic into a separate file and replace with a link.
5. If structural or design issues emerged: open `docs/refactoring-backlog.md`, check for duplicates, add new entries ordered by topic.
6. **Commit sequence** — each block produces up to 3 commits, all on the `worktree-[block-name]` branch:
   - **Commit 1 — code** (already done in Phase 3): source files only.
   - **Commit 2 — docs**: `docs/implementation-checklist.md` + `README.md` + `docs/prd/prd.md` (mandatory per 2f) + `docs/refactoring-backlog.md` if modified + `docs/migrations-log.md` if modified + `docs/profile-editing-contract.md` if modified in 2b + `docs/contracts/<entity>.md` if modified in 2b2 + `docs/entity-manifest.md` if modified in 2b2 + `docs/prd/01-rbac-matrix.md` if modified in 2e + `docs/sitemap.md` if modified in 2c + `docs/db-map.md` if modified in 2d.
   - **Commit 3 — context files** (only if updated): `CLAUDE.md` and/or project-root `MEMORY.md` in a separate commit — never mixed with code or docs.
7. **Branch promotion sequence** (after all commits are on the worktree branch):
   - **staging (requires explicit user approval)**: present the branch name and commit count, then ask: "Confermo il merge di `[branch]` su staging e il deploy su Vercel preview?" Wait for explicit yes before proceeding. Then run: `git -C ~/Projects/staff-manager checkout staging && git pull origin staging && git merge [branch] --no-ff && git push origin staging`. Wait ~1–2 min for Vercel preview deploy; verify at `https://staff-staging.peerpetual.it`.
   - **production migrations (pre-deploy — mandatory if block has migrations)**: before running `sm-deploy`, apply every migration from this block to the production DB using `mcp__claude_ai_Supabase__execute_sql` with `project_id: "nyajqcjqmgxctlqighql"`. Read each `supabase/migrations/NNN_*.sql` file added in this block and execute it. Verify with a SELECT query. This is the **only moment** production migrations are applied — never during Phase 2.
   - **production**: run `sm-deploy` from iTerm to merge `staging → main` and trigger the production deploy on `staff.peerpetual.it`.
   - Verify the production deploy completes without errors (Vercel dashboard or direct URL check).
   - Do NOT run `git push origin main` manually — always use `sm-deploy` to ensure staging is the promotion source.
8. **Worktree cleanup** *(functional blocks only)*:
   - *** STOP — before cleanup: ask "Confermo eliminazione worktree `worktree-[block-name]` locale e remoto?" Wait for explicit yes before proceeding. ***
   - **Exit worktree first (mandatory)**: call `ExitWorktree` to switch the active context back to the main repo (`~/Projects/staff-manager`) BEFORE running any removal command. If Claude's shell CWD is still inside the worktree directory when `git worktree remove` runs, the directory is deleted and all subsequent Bash commands fail with "Working directory no longer exists".
   - Remove local worktree: `git -C ~/Projects/staff-manager worktree remove .claude/worktrees/[block-name]`
   - Delete remote branch: `git -C ~/Projects/staff-manager push origin --delete worktree-[block-name]`

**Phase 8.5 — Context file review + compact**
After git push, before closing the session:
- **C1–C3** (pure grep checks — no reasoning required): delegate to a **Haiku subagent** via the Agent tool with `model: "haiku"`. Pass the exact grep commands from `context-review.md` and the relevant file paths in the prompt. Collect results; apply any fix in the main session if needed.
- Execute checks **C4 through C12** from `.claude/rules/context-review.md` in order (in the main session — these require judgment).
- Apply any fix found before moving to the next check.
- **Phase complete only when all 12 checks pass** — not when the review "seems thorough".
- **Final commit + push**: if any context file was modified during C1–C12 (CLAUDE.md, project-root MEMORY.md, pipeline.md, context-review.md), commit those changes and push:
  ```
  git add <modified context files>
  git commit -m "chore(context): post-block context review fixes"
  git push
  ```
  Skip if no context files were modified.
- **Mandatory closing message** (after final commit+push or after confirming no fixes needed, before `/compact`): post a summary to the user in this exact format:

```
**Block complete ✅ — [Block name]**
- Implemented: [one-line summary of what changed]
- Tests: tsc ✅ · build ✅ · vitest N/N ✅ [+ any other phases run]
- Next: [next defined block name] OR "No next block defined — ready to plan Block N"
```

  This message is **non-negotiable** — never skip it, even if the block was small or the session is long.
- Then run `/compact` to free the current session's context.

> `pipeline.md` and `files-guide.md`: update only if a process gap or structural change was explicitly identified during the block. These are not routine targets — they are covered by C5 and C8 respectively.

---

## Fast Lane — Mini fixes and bugfixes

Use when: the change touches ≤3 files, introduces no migration, no new patterns, no shared type changes.
Branch prefix `fix/` activates this pipeline automatically.

**FL-0 — Branch check + session file**
- **Session file (optional for truly trivial fixes)**: check `.claude/session/` for existing `fix-*.md` files.
  - If one exists: read it — a previous fix session was interrupted. Resume from it. Do NOT create a new file.
  - If none exists: only create `fix-[description].md` if the fix is expected to span sessions (e.g. complex investigation, multi-step change). For a clear 1-file correction, skip — no file needed.
- Confirm current branch starts with `fix/`. If not, stop and instruct user to run `sm-fix description`.
- If on `main` or `staging`: stop — same rule as Phase 0 of the full pipeline.
- **Escalation to full pipeline**: if ANY of these conditions hold, stop and escalate to the full pipeline (worktree + Phase 1 scope gate): (a) fix touches a shared type or utility with >5 import consumers; (b) fix requires a DB migration; (c) fix introduces a new shared pattern. A fast-lane fix is always migration-free and pattern-free — discovering otherwise mid-FL-1 is a hard escalation.

**FL-1 — Implement**
- **Scope confirmation (compact)**: before writing any code, apply the Interaction Protocol (CLAUDE.md § Plan-then-Confirm) in compact form — state the exact files to modify, the specific change in each, and flag any irreversible operation. Wait for an execution keyword (`Esegui` · `Procedi` · `Confermo` · `Execute` · `Proceed`) before proceeding.
- No dependency scan (unless a shared utility is touched — then do a quick grep).
- Write the fix. Run `npx tsc --noEmit`. Run `npx vitest run`. Must be green.
- **If the fix modifies any file under `app/api/`**: run `/security-audit target:section:<section>` (static, no dev server needed). Critical findings block the commit and escalate to full pipeline. Medium/Low: append to `docs/refactoring-backlog.md` and proceed.
- Run `/commit` (Conventional Commits skill) to stage and commit with correct type+scope. Do NOT use manual `git commit -m "..."` — the skill ensures Conventional Commits 1.0.0 compliance.
- No intermediate docs update unless `CLAUDE.md` genuinely needs a pattern correction.

**FL-2 — Deploy to staging + smoke**
- Ask user: "Confermo il merge di `[fix-branch]` su staging?" Wait for explicit yes before proceeding.
- Run: `git -C ~/Projects/staff-manager checkout staging && git pull origin staging && git -C ~/Projects/staff-manager merge <fix-branch> --no-ff -m "fix: merge <fix-branch> into staging" && git -C ~/Projects/staff-manager push origin staging`
- Wait for Vercel preview deploy (~1–2 min). Open `https://staff-staging.peerpetual.it`.
- Verify the fix in 1–3 steps. If broken: fix on the `fix/` branch, ask approval again, re-merge.

**FL-3 — Promote to production**
- Instruct user: `sm-deploy` from iTerm (or run git merge commands directly).
- Output a one-line summary: `fix complete ✅ — [description] · tsc ✅ · vitest N/N ✅`

**FL-4 — Cleanup**
- Update `docs/implementation-checklist.md` only if the fix closes a tracked item.
- **PRD update** (mandatory if observable behaviour changed): update `docs/prd/prd.md` and append GDoc Changelog entry (script in `@.claude/rules/gdoc-append.md`). If the fix is a pure internal change with zero functional effect, skip GDoc append but verify `docs/prd/prd.md` is current. Same rule as Phase 8 step 2f — no exceptions.
- Update `CLAUDE.md` only if the fix reveals a non-obvious pattern worth documenting.
- **Delete session file**: remove `.claude/session/fix-[description].md`.
  - Proceed only if `sm-deploy` completed without errors and the fix is confirmed in production.
  - If the outcome is ambiguous (deploy not yet verified, user hasn't confirmed the fix works): ask explicitly — `"Il fix è confermato in produzione — rimuovo il file di sessione?"` — before deleting.
- Instruct user: `sm-cleanup fix/description` to delete the branch.

> Fast Lane has one lightweight scope-confirm gate in FL-1 (Interaction Protocol, compact form). Proceed autonomously after execution keyword. Escalate to full pipeline if: scope expands beyond 3 files, a migration is required, or a shared utility with >5 consumers is touched.

---

## Pipeline for Structural Requirements Changes

Activate when stakeholders change functional scope impacting already-implemented blocks or the project structure. This pipeline **precedes** the standard development pipeline and is its prerequisite.

1. **Update requirements** (`docs/requirements.md`): compare the change with the current text; propose updated text section by section. *** STOP — wait for explicit approval of each section before writing anything. ***
2. **Impact analysis**: identify all already-implemented blocks impacted. For each: list affected files, logic to update, tests to revise. Check `docs/refactoring-backlog.md` for entries to deprecate or update. Output: impact matrix (block → file → change type) + refactoring-backlog delta.
3. **Intervention plan**: update `docs/implementation-checklist.md` + `docs/refactoring-backlog.md` (deprecate obsolete entries, add emerging issues). *** STOP — present the full plan and wait for explicit confirmation before touching any code file. ***
4. **Execution**: proceed block by block following the standard pipeline (Phases 0–8.5). Update `MEMORY.md` (project root) Active plan section after each completed block.

---

## Cross-Cutting Rules

- **Tool permissions**: the user has explicitly authorized autonomous execution of all commands (Bash, Node.js scripts, npx, tsc, vitest, playwright, git) **except** the explicit STOP gates. Proceed without asking for confirmation for any technical command required by the pipeline. Note: use Node.js `https.request` (not `curl`) for Supabase Management API calls — `curl` fails with PAT due to shell interpolation. **Scope**: autonomous execution applies across all phases (2 through 8.5) of an already-confirmed block. For new requests, scope changes, architecture decisions, or modifications to pipeline.md / CLAUDE.md / memory files outside an active confirmed block: apply the plan-then-confirm protocol (CLAUDE.md § Interaction Protocol).
- **Branch discipline**: never commit directly to `main` or `staging`. Functional blocks use dedicated worktrees (branch `worktree-block-name`). Fixes use `fix/description` branches. Promotions only via the git merge commands in Phase 8 step 7 (→staging) and `sm-deploy` (staging→main, Vercel production).
- **Worktree isolation (hard rule)**: worktree branches must never be merged to staging before Phase 8 step 7. No `sm-staging`, `git push origin staging`, or git merge into staging is permitted during Phases 1–7. Smoke tests (Phase 5c) always run on localhost. Staging deploy happens exactly once, in Phase 8 step 7, under explicit user approval. Fast Lane (`fix/`) branches: same rule — FL-2 staging deploy also requires explicit user confirmation before execution.
- **Promoting branches from Claude**: `sm-staging` and `sm-deploy` are zsh functions — not available in Claude's Bash subprocess. Claude must use git commands directly: `git -C ~/Projects/staff-manager checkout staging && git pull origin staging && git merge <branch> --no-ff && git push origin staging`. Always use `-C ~/Projects/staff-manager` to target the main repo, even when running inside a worktree directory.
- **Worktree — always from staging**: worktrees must always be created from the `staging` branch, never from `main`. Base branch is verified automatically by the Phase 0 setup command. If `EnterWorktree` is used manually, confirm base branch is `staging` first.
- **Environment isolation (hard rule — all services)**: see `CLAUDE.md § Known Patterns → HARD RULES`. Source: `~/.envs/staff-manager.staging.env`. If missing: stop and instruct user to run `smenv-save staging`.
- **Worktree — migration numbering**: before creating a new migration inside a worktree, always check `ls ~/Projects/staff-manager/supabase/migrations/` (the main repo, not the worktree) to get the correct next number. Two parallel worktrees must not use the same migration number.
- **Worktree — staging is serial**: if two worktrees are ready to merge simultaneously, they must merge to staging sequentially. Staging must be in a testable state at all times — never merge two unrelated worktree branches to staging at the same time without smoke-testing the first one first.
- **Worktree — CLAUDE.local.md**: if `.claude/CLAUDE.local.md` exists in the main repo (active overrides), copy it into the worktree directory at setup time. It is gitignored and not auto-present in worktrees.
- **Worktree — sm-staging command**: always pass the branch name explicitly: `sm-staging worktree-block-name`. Never call `sm-staging` without arguments when in a worktree context.
- **Worktree cleanup**: handled in Phase 8 step 8 — local `git worktree remove` + remote branch delete — always under explicit user confirmation (STOP gate).
- **Dependency scan is mandatory**: whenever a block touches existing routes, components, or pages, always grep for all usages before producing the file list (Phase 1). Deliver a complete file list from the start.
- **PRD sync is a hard gate — no exceptions**: `docs/prd/prd.md` must be updated and the GDoc Changelog entry must be appended **before closing any block**, whether full pipeline or fast-lane. This step cannot be deferred, skipped due to time pressure, or merged with another block's update. A block is not complete until both `docs/prd/prd.md` and the GDoc reflect its functional changes (or it is explicitly confirmed that no PRD section was affected).
- **Even if the plan is pre-written**: still execute phase by phase with the gates. A pre-written plan replaces only Phase 1, it does not compress subsequent phases.
- **Migrations — staging only during development**: see `CLAUDE.md § Known Patterns → HARD RULES`. Apply immediately after writing to `gjwkvgfwkdwzqlvudgqr` only. Production migrations run once in Phase 8 step 7 pre-deploy. Using production project_id outside Phase 8 step 7 is a hard process error — stop and flag it.
- **Mid-session context**: if context window reaches ~50% during a long Phase 2 implementation, run `/compact [keep: current implementation state and open TODOs]` before continuing. Do not wait for Phase 8.5. After compact completes, re-read `.claude/CLAUDE.local.md` to restore any active session overrides before resuming.
