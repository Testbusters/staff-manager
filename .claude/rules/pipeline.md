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
- Read `docs/implementation-checklist.md` to verify current state and block dependencies.
- Read **only the relevant section** of `docs/requirements.md` for the current block — not the entire file.
- Check `docs/refactoring-backlog.md`: if there are entries that intersect the current block, include them in the work plan or flag them explicitly.
- **Consult `docs/entity-manifest.md`**: for any block touching a domain entity (profile, compensation, reimbursement, document, ticket, content), look up the entity and read its linked contract file in `docs/contracts/`. Every surface and entry point listed there is a mandatory candidate for the file list. This is a **functional** dependency check — distinct from and complementary to the code-level scan below. If the block introduces a brand-new entity (new DB table + CRUD surface), propose creating a new contract file in `docs/contracts/` and a new entry in `entity-manifest.md` before proceeding to Phase 1.5.
- **Consult `docs/prd/01-rbac-matrix.md`**: for any block touching role permissions, RBAC rules, member_status restrictions, or adding a new role/entity. The matrix is the cross-cutting authority — entity contracts describe field-level detail, the RBAC matrix is the role-level overview.
- Summarize the block's requirements concisely based on the doc reads above.
- **Scope confirmation gate — always mandatory**: apply the **Interaction Protocol** (CLAUDE.md § Plan-then-Confirm) using the structured sweep below. First, select the tier based on block signals from the doc reads, declare it explicitly, and allow the user to override before proceeding.

  **Tier selection (auto, after doc reads):**
  - **Tier 1 — Standard Sweep**: ≤5 files, single entity, no migration, no new pattern, no cross-role change.
  - **Tier 2 — EARS + Deep Sweep**: >5 files, OR new entity, OR migration, OR multi-role change, OR new integration, OR full redesign.

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

**Phase 1.5 — Design review** *(blocks introducing new patterns, DB schema changes, or touching >5 files)*
- Present a design outline: data flow, data structures involved, main trade-offs.
- State any discarded alternatives and rationale.
- For simple blocks (≤3 files **AND** no shared types/utilities modified **AND** no migration **AND** no new patterns): skip this phase, stating so explicitly.
- **All clarification questions arising during design review must use the `AskUserQuestion` tool** — same rule as Phase 1, no inline open questions.
- *** STOP — wait for an execution keyword (`Esegui` · `Procedi` · `Confermo` · `Execute` · `Proceed`) before writing code. ***

**Phase 1.6 — Visual & UX Design** *(MANDATORY for any block with UI/UX impact — cannot be skipped)*

**Triggers — this phase is required when the block:**
- Creates a new page route or full-page redesign
- Introduces a new layout pattern, component hierarchy, or navigation structure
- Changes the information architecture of an existing page (sections, tabs, panels)
- Adds a complex interactive pattern (multi-step flow, bulk actions, split views)

**When triggered, always execute in this order:**

1. **ASCII wireframe** — invoke the `frontend-design` skill with an explicit ASCII wireframe request. The wireframe must show:
   - Full page layout with named regions
   - Column structure for tables/lists
   - Action placement and grouping
   - Empty states and loading states
   - Mobile breakpoint if relevant

2. **Design context + HTML preview** *(optional)* — Two paths, in order of preference:
   - **Path A — Figma MCP**: use `get_variable_defs` on the Foundation TB file (`p9kUAQ2qNVg4PojTBEkSmC`) to pull real design tokens, then generate the component with `frontend-design`. This produces code aligned with the actual design system.
   - **Path B — frontend-design standalone**: `frontend-design` skill → self-contained HTML (inline Tailwind CDN) → iterate in-session. Use when Figma context is not needed.
   Either way: approved preview = visual contract for Phase 2; generated code is reference only.

3. **UX rationale** — for each layout decision, state explicitly:
   - What mental model it maps to (inbox, pipeline, kanban, wizard…)
   - Why competing alternatives were discarded
   - The single most important UX improvement over the current state

4. **Design system mapping** — map every wireframe region to the correct shadcn component and token before writing any code. No region should be "TBD" at this stage.

5. **STOP — present wireframe (+ CodePen link or description if HTML preview was used) + UX rationale + component map. Wait for an execution keyword (`Esegui` · `Procedi` · `Confermo` · `Execute` · `Proceed`) before proceeding to Phase 2. The approved wireframe/preview is the implementation contract — Phase 2 must match it.**

**Plan lock + context reset** *(after Phase 1 or 1.5 STOP gate is confirmed — mandatory before every Phase 2)*
- Use `EnterPlanMode` to present the complete approved plan in structured, locked form. Call `ExitPlanMode` after confirmation.
- Run `/compact` immediately to reset context and preserve enough window for the full Phase 2 implementation.
- Phase 2 begins only after `/compact` completes.

**Phase 2 — Implementation**
- **First action**: update `docs/requirements.md` with the approved plan for the current block (add or update the relevant section with the feature summary and scope as confirmed in Phase 1/1.5). This persists the approved spec before any code is written.
- Write the code. Follow the project's Coding Conventions.
- **UI components** — follow `CLAUDE.md § "UI Design System — MANDATORY RULES"` and `CLAUDE.md § "Known Patterns"` before writing any UI code. Key: shadcn components only (no native HTML elements), semantic tokens only, `loading.tsx` for new routes, `aria-label` on icon-only buttons, `iconName: string` in nav data.
- Do not add unrequested features. No unrequested refactoring.
- **After every new migration** (`supabase/migrations/NNN_*.sql`): apply **immediately** to the **staging DB only** (`gjwkvgfwkdwzqlvudgqr`) — use `mcp__claude_ai_Supabase__execute_sql` with `project_id: "gjwkvgfwkdwzqlvudgqr"` (preferred, no shell interpolation issues) or Node.js `https.request` as fallback. Verify with a SELECT query + add a row to `docs/migrations-log.md`. **Never apply to production (`nyajqcjqmgxctlqighql`) during development** — production migrations run exclusively in Phase 8 step 7 pre-deploy (see below). **Do not wait for tests to discover missing migrations** — finding them in later phases is a process error.
- **Destructive migrations** (`DROP COLUMN`, `DROP TABLE`, `ALTER TYPE … RENAME VALUE`, `TRUNCATE`): before applying, write the rollback SQL in a comment block at the top of the migration file (e.g. `-- ROLLBACK: ALTER TABLE t ADD COLUMN c ...`). This ensures recovery is possible without relying on memory.
- **PostgREST join syntax** (`table!relation`, `!inner`): verify FK existence before using it. If FK absent → two-step query (separate fetches + in-memory merge). Verification query: `SELECT conname FROM pg_constraint WHERE conrelid='tablename'::regclass AND contype='f';`
- **DROP CONSTRAINT before UPDATE** (migrations): if a column has a CHECK constraint and the UPDATE sets a value not allowed by the current constraint (e.g. renaming an enum value), the UPDATE fails. Pattern inside a single migration: (1) `ALTER TABLE t DROP CONSTRAINT c;` (2) `UPDATE t SET col = new_val WHERE ...;` (3) `ALTER TABLE t ADD CONSTRAINT c CHECK (...);` — all three statements in the same migration file so they run atomically.
- **Security checklist** (before intermediate commit): for every new/modified API route verify: (1) auth check before any operation, (2) input validated (Zod), (3) no sensitive data exposed in response, (4) RLS not implicitly bypassed; for every new Supabase table: (5) `ALTER TABLE t ENABLE ROW LEVEL SECURITY` is present in the migration and at least one policy covers each relevant role.
- Expected output: list of created/modified files with paths.
- **After writing code, before Phase 3**: run `/simplify` (built-in skill) on the changed files. It reviews for reuse, quality, and efficiency and fixes issues in-place. Skippable for trivial 1-file changes.

**Phase 3 — Build + unit tests**
- Run `npx tsc --noEmit` and `npm run build`. Must complete without errors.
- Run `npx vitest run`. All tests must pass.
- Expected output: summary line only (e.g. `✓ 106/106`). Do NOT paste full output — reduces token consumption.
- If something fails: paste only the error lines, fix, and re-run. Do not proceed with open errors.
- After green build + tests: **make an intermediate commit** (`git add … && git commit`) on the current `feature/block-name` branch. Do NOT push to `staging` or `main` at this point — promotion happens in Phase 8.

**Phase 3b — API integration tests** *(only if the block creates or modifies API routes)*
- Write core tests in `__tests__/api/<route-name>.test.ts` with vitest:
  - Happy path: expected status code + key fields in response body
  - Auth: no token → 401
  - Authz: unauthorized role → 403
  - Validation: invalid payload or missing required field → 400
  - Business rules: application constraint violation → correct error code
  - DB state: after write, verify expected record with service role
- Focus on core cases — do not exhaust every combination, cover critical paths.
- **Test data teardown**: every test that writes to DB must clean up in `afterAll`/`afterEach` using the service role client. Use cleanup-first pattern in `beforeAll` (delete any pre-existing data before creating test fixtures — prevents orphaned records from interrupted runs).
- Run `npx vitest run __tests__/api/` — all green.
- Output: summary line only. Do not proceed with open errors.

**Phase 3c — HTTP integration tests (Bruno CLI)** *(only if the block modifies `proxy.ts`, auth flow, or introduces routes where cookie/header/redirect behavior is critical and cannot be covered by Vitest)*
- Write `.bru` request files in `api-tests/<block-name>/` (one file per endpoint or scenario).
- Minimum cases to cover:
  - No token → 401 (or redirect to `/login`, depending on route type)
  - Valid session → expected status code + response shape
  - `must_change_password=true` → redirect to `/change-password` (proxy-level check)
  - Role boundary: unauthorized role → 403
- Run against the running dev server (`npm run dev`): `npx @usebruno/cli run api-tests/<block-name>/`
- `.bru` files are committed in `api-tests/`. Never commit Bruno environment files containing secrets (add to `.gitignore`).
- Output: summary line only. If something fails: paste the failing request + response body, fix, re-run. Do not proceed with open failures.

**Phase 4 — UAT definition + Playwright e2e** ⏸ SUSPENDED
> Suspended via `.claude/CLAUDE.local.md`. Remove that file (with explicit user confirmation) to re-enable.
> When re-enabling: use `data-*` attribute selectors (see CLAUDE.md "shadcn e2e selectors").
> Never use `span.text-{color}` for status badges — Badge renders `<div>`, not `<span>`.

**Phase 4b — Visual baseline + structural check** ⏸ SUSPENDED
> Suspended for the same reason as Phase 4 above. Re-enable together with Phase 4 after Fase 9.

**Phase 5b — Test data setup** *(MANDATORY — must complete before Phase 5c)*
- **Prerequisite — dev server**:
  - **Worktree context**: start `npm run dev` automatically on the first available port. Port detection: check `lsof -ti:3000` — if non-empty, try 3001, 3002, … until a free port is found. Start in background: `PORT=NNNN npm run dev > /tmp/staff-dev.log 2>&1 &`. Wait ~15s, then verify: `curl -s -o /dev/null -w "%{http_code}" http://localhost:NNNN` must return 200 or 302. Declare the endpoint to the user before proceeding: **"Dev server started at `http://localhost:NNNN` — use this URL for smoke test steps."**
  - **Main repo (non-worktree)**: default port is 3000. If not already running, instruct the user to start it (`npm run dev`) before inserting fixtures.
- Determine the test user(s) from the role scope of the block:
  - Collaboratore → `collaboratore_test@test.com`
  - Responsabile compensi → `responsabile_compensi_test@test.com`
  - Admin → `admin_test@test.com`
  - Multi-role blocks: use all relevant accounts.
- Identify the entities and states involved in the block (tables, state machines, relevant DB records).
- Insert representative test records covering all relevant states via Node.js one-shot script (service role, cleanup-first pattern — delete existing UAT records before inserting fresh ones).
- Goal: the smoke test account has realistic data for every UI state that must be visible in Phase 5c.
- Leave test data in DB for the smoke test. Clean up after Phase 5c only if the records would break other tests.

**Phase 5c — Manual smoke test** *(before the formal checklist)*
- **Run locally — feature branches never merge to staging before Phase 8**: smoke test always runs against `http://localhost:[PORT]` with `npm run dev` running.
  - **Worktree context**: use the port detected and declared in Phase 5b (server already running). Restate the endpoint at the top of this phase: **"Smoke test endpoint: `http://localhost:NNNN`"**.
  - **Main repo (non-worktree)**: default port 3000. If not running, instruct the user to start it first.
- **Step 1 — smoke test on localhost**: open the declared endpoint and use the staging test accounts:
  - Collaboratore → `collaboratore_test@test.com`
  - Responsabile compensi → `responsabile_compensi_test@test.com`
  - Admin → `admin_test@test.com`
- Run 3-5 quick steps in the browser to verify the main flow.
- Goal: catch obvious issues (blocked UI, wrong redirect, data not saved) before presenting Phase 6.
- Output: "smoke test OK" or list the problem and fix it before proceeding.
- **For blocks with UI changes**: run the smoke test once in light mode and once in dark mode (sidebar theme toggle). Confirm both themes render correctly.
- **For blocks that trigger transactional emails** (invite, state transitions, ticket reply, content publish): use the Resend MCP to verify delivery after the triggering action. Standard verification sequence:
  1. Perform the action in the browser (or via API call) using the test account.
  2. Wait ~5s, then call `resend_list_emails` with `limit: 5` to retrieve recent sends.
  3. Confirm: correct `to` address, expected `subject`, `last_event: "delivered"` (not `bounced` or `complained`).
  4. If the email has a CTA link: confirm the `APP_URL` env var produced a correct absolute URL (not `localhost`) by inspecting the HTML body via `resend_get_email`.
  - Do NOT send emails to real user addresses during smoke tests — use `@test.com` or `@test.local` addresses only.

**Phase 5d — Block-scoped quality audit** *(for blocks with UI changes — runs on localhost)*
- Run `/ui-audit` scoped to the block's new/modified routes only (token compliance, shadcn usage, empty states, loading.tsx). Do not run full-site scan.
- Run `/visual-audit` scoped to the block's new/modified pages (7 visual dimensions: typography, spacing, hierarchy, colour, density, dark-mode, micro-polish).
- Run `/ux-audit` scoped to the block's user flows (task completion, feedback clarity, cognitive load).
- Run `/responsive-audit` **only** if the block modifies collab or responsabile routes (Admin routes = desktop-only, skip).
- **Execution order**: `/ui-audit` is static by default — launch it concurrently with the first Playwright-based skill. `/visual-audit` → `/ux-audit` → `/responsive-audit` (if applicable) must run **sequentially** — they share the MCP Playwright session and cannot run in parallel without conflicts.
- Fix all **Critical** issues before Phase 6. Flag **Major** issues in the Phase 6 checklist with planned resolution. Log **Minor** issues in `docs/refactoring-backlog.md`.
- Output per skill: one-paragraph summary only — do not paste full reports.

**Phase 6 — Outcome checklist + confirmation**
Present this checklist filled with actual results, then wait for explicit confirmation before proceeding to Phase 8:

```
## Block checklist — [Block Name]

### Build & Test
- [ ] tsc --noEmit: 0 errors
- [ ] npm run build: success
- [ ] Vitest unit: N/N passed
- [ ] Vitest API: N/N passed *(if Phase 3b executed)*
- [ ] HTTP integration (Bruno CLI): N/N passed *(if Phase 3c executed)*
- [ ] Playwright e2e: N/N passed *(⏸ suspended if CLAUDE.local.md active)*
- [ ] Visual baseline + axe-core: passed *(if Phase 4b executed)*
- [ ] ui-audit: no Critical issues *(if Phase 5d executed)*
- [ ] visual-audit: no Critical issues *(if Phase 5d executed)*
- [ ] ux-audit: no Critical issues *(if Phase 5d executed)*
- [ ] responsive-audit: PASS *(if collab/responsabile routes modified)*

### UI Design System compliance *(skip if block has no UI changes)*
- [ ] No hardcoded `bg-blue-*` on interactive elements (use `bg-brand hover:bg-brand/90`)
- [ ] No hardcoded `text-blue-*` link pairs (use `text-link hover:text-link/80`)
- [ ] Empty states use `<EmptyState>` component, not bare `<p>`
- [ ] New page routes have a `loading.tsx` with Skeleton placeholders
- [ ] Icon-only buttons have `aria-label`
- [ ] No Lucide icon components in Server→Client data props (use `iconName: string`)
- [ ] New UI verified in both light and dark mode (sidebar theme toggle)

### Implemented features
- [ ] [feature 1]: [outcome]

### Manual verification
Steps to verify manually with the appropriate test account:
1. [step]

### SQL verification queries
SELECT …;

### Created / modified files
- path/to/file.ts — description
```

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
2b2. If the block modified any domain entity (compensation, reimbursement, document, ticket, content): update the relevant contract file in `docs/contracts/` — field matrix, entry points, validation rules, state transitions, known constraints. If the block introduced a brand-new entity (new table + CRUD surface): create a new contract file in `docs/contracts/` AND add the entity to `docs/entity-manifest.md` before closing.
2e. If the block changed role permissions for any entity, added a new action to an existing role, or modified member_status restrictions: update `docs/prd/01-rbac-matrix.md` — the relevant entity section. If the block introduced a new role: add a column to every table in that document.
2f. **PRD update — MANDATORY in every block, no exceptions (full pipeline and fast-lane alike).**
   - **Source of truth** (`docs/prd/prd.md`): update the relevant section(s) directly in the Markdown file whenever the block introduces a new feature area, changes architecture, adds an integration, modifies RBAC, or updates a workflow. Commit this file in Commit 2 (docs).
   - **Google Docs sync** (presentation layer): after updating `docs/prd/prd.md`, append a Changelog entry to the GDoc (Doc ID: `1OtOQO8-6pjjaq2CrOaBh7ntT-nZ4haV_yvxCBZpL46o`). The entry goes in section "VII — Changelog" and must include: version date, block name, one-line summary of changes. Do NOT rewrite the whole document — append only. Use **exactly** this command (run from project root — `require('dotenv').config` is mandatory, `GOOGLE_SERVICE_ACCOUNT_JSON` is not in the shell env):
     ```
     cd ~/Projects/staff-manager && node -e "
     require('dotenv').config({ path: '.env.local' });
     const { google } = require('googleapis');
     const svc = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
     const auth = new google.auth.GoogleAuth({ credentials: svc, scopes: ['https://www.googleapis.com/auth/documents'] });
     const docs = google.docs({ version: 'v1', auth });
     const DOC_ID = '1OtOQO8-6pjjaq2CrOaBh7ntT-nZ4haV_yvxCBZpL46o';
     const text = '\nDATE  |  vX.Y  |  Block Name: one-line summary.\n';
     (async () => {
       const doc = await docs.documents.get({ documentId: DOC_ID });
       const endIndex = doc.data.body.content.at(-1).endIndex - 1;
       await docs.documents.batchUpdate({ documentId: DOC_ID, requestBody: { requests: [{ insertText: { location: { index: endIndex }, text } }] } });
       console.log('GDoc changelog appended');
     })().catch(e => { console.error(e.message); process.exit(1); });
     "
     ```
   - **Minimum scope**: even if the block is purely technical (bug fix, refactor), if it changes observable system behaviour, update the PRD. If no PRD section is affected (e.g. pure internal refactor with zero functional change), skip the GDoc append but still verify `docs/prd/prd.md` is current.
2c. If the block added/removed a route, changed role access to an existing route, modified member_status restrictions, or updated sidebar items: update `docs/sitemap.md`. Sync with `lib/nav.ts`, `proxy.ts`, and the relevant `page.tsx` guards. Also update the **Layout**, **Componenti chiave**, and **loading.tsx** columns for any page whose structure changed (new Tabs, Sheet, Tiptap added/removed; loading.tsx created/deleted).
2d. If the block applied a migration that adds/modifies tables, columns, FKs, indexes, or RLS policies: update `docs/db-map.md` — Tables section (add/update rows), FK Graph (add new FK lines), Indexes section, RLS Summary. Then run `node scripts/refresh-db-map.mjs` to regenerate the Column specs section from the live staging schema. Mandatory — `skill-db` uses this as authoritative schema reference.
3. Update `README.md` (Project Structure + test counts).
4. Update `MEMORY.md` (project root) **only if** new lessons emerged that are not already documented. Avoid duplications.
   - If project-root MEMORY.md exceeds ~150 active lines: extract the topic into a separate file and replace with a link.
5. If structural or design issues emerged: open `docs/refactoring-backlog.md`, check for duplicates, add new entries ordered by topic.
6. **Commit sequence** — each block produces up to 3 commits, all on the `worktree-[block-name]` branch:
   - **Commit 1 — code** (already done in Phase 3): source files only.
   - **Commit 2 — docs**: `docs/implementation-checklist.md` + `README.md` + `docs/refactoring-backlog.md` if modified + `docs/migrations-log.md` if modified + `docs/profile-editing-contract.md` if modified in 2b.
   - **Commit 3 — context files** (only if updated): `CLAUDE.md` and/or project-root `MEMORY.md` in a separate commit — never mixed with code or docs.
7. **Branch promotion sequence** (after all commits are on the worktree branch):
   - **staging (requires explicit user approval)**: present the branch name and commit count, then ask: "Confermo il merge di `[branch]` su staging e il deploy su Vercel preview?" Wait for explicit yes before proceeding. Then run: `git -C ~/Projects/staff-manager checkout staging && git pull origin staging && git merge [branch] --no-ff && git push origin staging`. Wait ~1–2 min for Vercel preview deploy; verify at `https://staff-staging.peerpetual.it`.
   - **production migrations (pre-deploy — mandatory if block has migrations)**: before running `sm-deploy`, apply every migration from this block to the production DB using `mcp__claude_ai_Supabase__execute_sql` with `project_id: "nyajqcjqmgxctlqighql"`. Read each `supabase/migrations/NNN_*.sql` file added in this block and execute it. Verify with a SELECT query. This is the **only moment** production migrations are applied — never during Phase 2.
   - **production**: run `sm-deploy` from iTerm to merge `staging → main` and trigger the production deploy on `staff.peerpetual.it`.
   - Verify the production deploy completes without errors (Vercel dashboard or direct URL check).
   - Do NOT run `git push origin main` manually — always use `sm-deploy` to ensure staging is the promotion source.
8. **Worktree cleanup** *(functional blocks only)*:
   - *** STOP — before cleanup: ask "Confermo eliminazione worktree `worktree-[block-name]` locale e remoto?" Wait for explicit yes before proceeding. ***
   - Remove local worktree: `git -C ~/Projects/staff-manager worktree remove .claude/worktrees/[block-name]`
   - Delete remote branch: `git -C ~/Projects/staff-manager push origin --delete worktree-[block-name]`
   - Use `ExitWorktree` tool if the active context is still inside the worktree before running cleanup.

**Phase 8.5 — Context file review + compact**
After git push, before closing the session:
- **C1–C3** (pure grep checks — no reasoning required): delegate to a **Haiku subagent** via the Agent tool with `model: "haiku"`. Pass the exact grep commands from `context-review.md` and the relevant file paths in the prompt. Collect results; apply any fix in the main session if needed.
- Execute checks **C4 through C11** from `.claude/rules/context-review.md` in order (in the main session — these require judgment).
- Apply any fix found before moving to the next check.
- **Phase complete only when all 11 checks pass** — not when the review "seems thorough".
- **Final commit + push**: if any context file was modified during C1–C11 (CLAUDE.md, project-root MEMORY.md, pipeline.md, context-review.md), commit those changes and push:
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
- **FIRST ACTION — session file**: check `.claude/session/` for existing `fix-*.md` files.
  - If one exists: read it — a previous fix session was interrupted. Resume from it. Do NOT create a new file.
  - If none exists: create `.claude/session/fix-[description].md` with a one-line description of the fix and the current date. This file must exist before any code is written.
- Confirm current branch starts with `fix/`. If not, stop and instruct user to run `sm-fix description`.
- If on `main` or `staging`: stop — same rule as Phase 0 of the full pipeline.
- **Escalation to full pipeline**: if the fix touches a shared type or utility with >5 import consumers, stop — notify the user and escalate to the full pipeline (worktree + Phase 1 scope gate). A fix with wide-impact shared changes is not a fast-lane operation.

**FL-1 — Implement**
- **Scope confirmation (compact)**: before writing any code, apply the Interaction Protocol (CLAUDE.md § Plan-then-Confirm) in compact form — state the exact files to modify, the specific change in each, and flag any irreversible operation. Wait for an execution keyword (`Esegui` · `Procedi` · `Confermo` · `Execute` · `Proceed`) before proceeding.
- No dependency scan (unless a shared utility is touched — then do a quick grep).
- Write the fix. Run `npx tsc --noEmit`. Run `npx vitest run`. Must be green.
- Commit: `git add … && git commit -m "fix(scope): description"`.
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
- Update `CLAUDE.md` only if the fix reveals a non-obvious pattern worth documenting.
- **Delete session file**: remove `.claude/session/fix-[description].md`.
  - Proceed only if `sm-deploy` completed without errors and the fix is confirmed in production.
  - If the outcome is ambiguous (deploy not yet verified, user hasn't confirmed the fix works): ask explicitly — `"Il fix è confermato in produzione — rimuovo il file di sessione?"` — before deleting.
- Instruct user: `sm-cleanup fix/description` to delete the branch.

> Fast Lane has one lightweight scope-confirm gate in FL-1 (Interaction Protocol, compact form). Proceed autonomously after execution keyword. Escalate to full pipeline if: scope expands beyond 3 files, a migration is required, or a shared utility with >5 consumers is touched.

---

## Pipeline for Structural Requirements Changes

Activate when stakeholders introduce changes to the functional scope that impact already-implemented blocks or the project structure. This pipeline **precedes** the standard development pipeline and is its prerequisite.

**Phase R1 — Requirements update**
- Compare the change with the relevant section of the current `docs/requirements.md`.
- Propose updated text section by section.
- *** STOP — wait for explicit approval of each section before writing anything. ***

**Phase R2 — Impact analysis**
- Identify all already-implemented blocks impacted by the change.
- For each block: list affected files, logic to update, tests to revise.
- Check `docs/refactoring-backlog.md`: can existing entries be deprecated, integrated, or updated in light of the change?
- Expected output: impact matrix (block → file → change type) + refactoring-backlog delta.

**Phase R3 — Intervention plan**
- Update `docs/implementation-checklist.md` with the new plan.
- Update `docs/refactoring-backlog.md` (deprecate obsolete entries, add emerging issues).
- *** STOP — present the full plan and wait for explicit confirmation before touching any code file. ***

**Phase R4 — Execution**
- Read `docs/implementation-checklist.md` — the plan for each block is already defined and approved, ready to use.
- Proceed block by block following the standard pipeline (Phases 0–8.5).
- Update `MEMORY.md` (project root) Active plan section after each completed step.

---

## Cross-Cutting Rules

- **Tool permissions**: the user has explicitly authorized autonomous execution of all commands (Bash, Node.js scripts, npx, tsc, vitest, playwright, git) **except** the explicit STOP gates. Proceed without asking for confirmation for any technical command required by the pipeline. Note: use Node.js `https.request` (not `curl`) for Supabase Management API calls — `curl` fails with PAT due to shell interpolation. **Scope**: autonomous execution applies within an already-confirmed Phase 2 block. For new requests, scope changes, architecture decisions, or modifications to pipeline.md / CLAUDE.md / memory files outside an active confirmed block: apply the plan-then-confirm protocol (CLAUDE.md § Interaction Protocol).
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
- **Hard gates**: "STOP" instructions are hard stops. Do not treat them as suggestions.
- **PRD sync is a hard gate — no exceptions**: `docs/prd/prd.md` must be updated and the GDoc Changelog entry must be appended **before closing any block**, whether full pipeline or fast-lane. This step cannot be deferred, skipped due to time pressure, or merged with another block's update. A block is not complete until both `docs/prd/prd.md` and the GDoc reflect its functional changes (or it is explicitly confirmed that no PRD section was affected).
- **Even if the plan is pre-written**: still execute phase by phase with the gates. A pre-written plan replaces only Phase 1, it does not compress subsequent phases.
- **Do not re-read files already in context**: use the already-acquired line reference.
- **Explore agent for broad searches**: if a search requires >3 independent Glob/Grep queries, use the Agent tool with `subagent_type: 'Explore'` and `model: 'haiku'` to protect the main context from verbosity and reduce cost.
- **Concise output**: always report only the build/test summary line. Paste details only on error.
- **Keep MEMORY.md compact**: project-root MEMORY.md and auto-memory MEMORY.md must both stay under ~150 active lines. Beyond that: extract topics into separate files and link.
- **Migrations — staging only during development**: see `CLAUDE.md § Known Patterns → HARD RULES`. Apply immediately after writing to `gjwkvgfwkdwzqlvudgqr` only. Production migrations run once in Phase 8 step 7 pre-deploy. Using production project_id outside Phase 8 step 7 is a hard process error — stop and flag it.
- **Mid-session context**: if context window reaches ~50% during a long Phase 2 implementation, run `/compact [keep: current implementation state and open TODOs]` before continuing. Do not wait for Phase 8.5. After compact completes, re-read `.claude/CLAUDE.local.md` to restore any active session overrides before resuming.
