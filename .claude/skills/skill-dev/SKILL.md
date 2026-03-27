---
name: skill-dev
description: Code quality and technical debt audit for the staff-manager codebase. Identifies coupling, duplication, dead code, pattern inconsistencies, missing or premature abstractions, TypeScript type safety gaps (any, unsafe assignments, floating promises), React antipatterns (useEffect misuse, derived state in state), empty catch blocks, magic strings/numbers, and 'use client' boundary sprawl. Uses docs/sitemap.md as structural guide. Outputs findings to docs/refactoring-backlog.md.
user-invocable: true
model: sonnet
context: fork
argument-hint: [target:section:<section>|target:page:<route>]
---

You are performing a code quality and technical debt audit of the staff-manager Next.js codebase.

## Step 0 — Target resolution

Parse `$ARGUMENTS` for a `target:` token.

| Pattern | Meaning |
|---|---|
| `target:section:corsi` | Focus on corsi/lezioni/candidature/assegnazioni components and API routes |
| `target:section:compensi` | Focus on compensation and expense components |
| `target:section:notifications` | Focus on notification system (lib/notification-utils.ts, NotificationBell, NotificationPageClient) |
| `target:page:/corsi` | Focus on the corsi page and its direct component dependencies |
| No argument | Full audit — all files from sitemap |

Announce: `Running skill-dev — scope: [FULL | target: <resolved>]`
Apply the target filter to the file list in Step 1.

**Critical constraints**:
- `docs/sitemap.md` is the authoritative inventory of every page and component. Use it to build your file target list — do NOT scan the filesystem freely.
- Do NOT make code changes. Audit only.
- Do NOT report issues already in `docs/refactoring-backlog.md` — check for duplicates before adding.
- All new findings go to `docs/refactoring-backlog.md`.

---

## Step 1 — Read structural guides

Read in order:
1. `docs/sitemap.md` — build target file list (page files + key components per route + lib files referenced)
2. `docs/refactoring-backlog.md` — note existing entries to avoid duplicate reporting

Output: structured file list (pages + components + lib utilities). Do not proceed until complete.

---

## Step 2 — Delegate pattern checks to Explore agent

Launch a **single Explore subagent** (model: haiku) with the full file list from Step 1 and these instructions:

"Run all 11 checks below on ONLY the files provided. For each check: state total match count, list every match as `file:line — excerpt`, and state PASS or FAIL.

**CHECK D1 — Cross-module direct imports (coupling)**
Pattern: components importing directly from other feature components (e.g. `components/admin/` importing from `components/compensation/`).
Grep: in each file, find `import.*from.*'@/components/` lines. Flag any import where the importing file's feature folder differs from the imported file's feature folder AND the import does not go through a shared `@/components/ui/` or `@/lib/` path.
Expected: imports between feature folders are explicit dependencies — flag each one.

**CHECK D2 — Duplicated inline color maps**
Pattern: object literals mapping status strings to CSS classes (e.g. `{ IN_ATTESA: 'bg-yellow-', APPROVATO: 'bg-green-' }`).
Grep: `IN_ATTESA.*bg-|APPROVATO.*bg-|LIQUIDATO.*bg-|RIFIUTATO.*bg-|ACCETTATA.*bg-|CONFERMATA.*bg-|RITIRATA.*bg-`
Note: include candidatura states (ACCETTATA, RIFIUTATA, CONFERMATA, RITIRATA) — these are corsi-domain values that may have inline maps in collab/resp_citt components.
Flag: any file with this pattern NOT already using `ContentStatusBadge` or importing from a shared badge-maps utility.
Expected: all status color maps centralised.

**CHECK D3 — N+1 fetch patterns in components and API routes**
Pattern A: any `.from('<tablename>').select(` call inside a `.map(`, `for (`, `forEach(`, or `for...of` loop.
Grep: `\.from\(.*\)\.select` — then check if it appears inside an iteration block.
Flag ALL tables (not just compensations/expenses) — any Supabase query inside a loop is a potential N+1.
Pattern B: `for...of` with `await svc.from(` or `await supabase.from(` inside the loop body (sequential awaits).
Flag: each match with file:line.

**CHECK D4 — Dead exports (unused named exports)**
Pattern: `export (function|const|type|interface) ` that are never imported elsewhere.
Sample check: for the 5 largest component files (by line count from sitemap), grep the export names across all other files.
Flag: exports with 0 consumers outside their own file.

**CHECK D5 — Duplicated validation logic**
Pattern: the same field validation appearing in more than one API route handler (e.g. checking `!collaboratorId` or `!importo` in multiple routes).
Grep: `if (!.*collaborator_id|if (!.*importo|if (!.*email` in `app/api/**/*.ts`.
Flag: identical guard patterns in 3+ routes that are not using a shared Zod schema.

**CHECK D6 — Magic strings and magic numbers**
*Magic strings* — state machine values hardcoded as string literals in component files:
Grep in `.tsx` files (not in API routes or type definitions):
`'IN_ATTESA'|'APPROVATO'|'LIQUIDATO'|'RIFIUTATO'|'INVIATO'|'DA_FIRMARE'|'FIRMATO'|'ACCETTATA'|'CONFERMATA'|'RITIRATA'|'APERTO'|'IN_GESTIONE'|'CHIUSO'`
Flag: any string literal that should reference a shared enum/constant.
*Magic numbers* — hardcoded numeric literals in business logic:
Grep in `app/` and `lib/` files: `[^a-zA-Z](0\.20|0\.60|1500|3000|50000|86400)(?![a-zA-Z])` — flag numeric constants that look like business rules (withholding rates, page sizes, timeouts, amounts). Exclude: test files, CSS px values, HTTP status codes.
Expected: 0 magic numbers in business logic paths.

**CHECK D7 — TODO/FIXME/HACK comments**
Grep: `\bTODO\b|\bFIXME\b|\bHACK\b|\bXXX\b` across all files in scope.
Flag: each match with context. Note how long the TODO has been present if determinable from surrounding code.

**CHECK D8 — TypeScript type safety suppressions and `any` usage**
Pattern A — Directive suppressions:
Grep: `@ts-ignore|@ts-expect-error|@ts-nocheck` across all files.
`@ts-ignore` is highest severity — it suppresses errors silently even if the error disappears. `@ts-expect-error` is acceptable if it has a description comment explaining why. Flag both.
Pattern B — Explicit `any`:
Grep: `:\s*any\b|as\s+any\b|<any>|Promise<any>` in non-test `.ts` and `.tsx` files.
Exclude: `lib/supabase.ts`, `lib/supabase-server.ts`, type definition files (`*.d.ts`), and known Supabase client type workarounds (see CLAUDE.md — `SupabaseClient<any, any, any>` is an intentional pattern in notification helpers).
Flag: each remaining `any` usage. A typed alternative almost always exists.
Pattern C — Floating Promises (unhandled async):
Grep in `.tsx` component files: `^\s*(fetch\(|router\.(push|replace)\(|supabase\.|svc\.` lines NOT preceded by `await` and NOT assigned to a variable or chained to `.then(` or `.catch(`.
Flag: async calls without await or error handling in component event handlers — these are silent fire-and-forget operations that can fail without user feedback.

**CHECK D9 — useEffect antipatterns**
Pattern A — Derived state stored in state + updated via useEffect:
Grep: `useState` followed within 10 lines by `useEffect(() => { set` — state that is immediately updated in an effect is usually derivable during render.
Flag: components that `useState` for a value and then have a `useEffect` whose ONLY purpose is to call the matching `setState` based on props or other state.
Pattern B — Event handler logic inside useEffect:
Grep: `useEffect.*\n.*(?:toast|router\.push|showNotification|sendEmail|console\.log)` — side effects triggered by state changes that were actually caused by a user action. These belong in the event handler, not in an effect.
Pattern C — Missing dependency array (effect runs on every render):
Grep: `useEffect\(\s*(?:async\s*)?\(\s*\)\s*=>` followed by `\n` then `\}\)` (closing without a dependency array `[` before `)`).
Flag: `useEffect` calls without a dependency array — they run on every render and are almost always bugs or performance issues.
Expected: 0 matches for A and C. B requires judgment — flag candidates.

**CHECK D10 — Empty catch blocks and console.log in production**
Pattern A — Empty or near-empty catch blocks:
Grep: `catch\s*\([^)]*\)\s*\{\s*\}|catch\s*\([^)]*\)\s*\{\s*\/\/|catch\s*\([^)]*\)\s*\{\s*console\.log`
Flag: catch blocks that swallow errors silently or log them without any recovery or user feedback.
Pattern B — console.log in production code:
Grep: `console\.log\(|console\.warn\(|console\.error\(` in `app/` and `lib/` files (excluding `__tests__/`, `e2e/`, `.test.ts` files).
Expected: 0 matches outside of intentional error boundaries. `console.error` in catch blocks is acceptable if also returning an error response."

---

## Step 3 — Structural judgment checks (main context)

These require reading and reasoning, not just pattern matching:

**J1 — Over-large components**
From sitemap.md "Componenti chiave" column, identify the 3 components with the most listed sub-responsibilities (e.g. a component handling fetch + state + form + validation + display). Read each candidate file.
Flag components that are:
- Over 300 lines AND have 4+ distinct responsibilities (fetch, state management, form handling, display)
- Exhibit "divergent change" — if you need to change compensation logic AND display logic in the same file, it should be split
- Exhibit "feature envy" — if a component uses more data/methods from another domain than from its own (e.g. a collab component that heavily manipulates compensation data structures)

**J2 — Prop drilling depth**
For each wizard/multi-step form (OnboardingWizard, rimborsi stepper, document upload wizard): read the top-level component. Count how many props are passed down 3+ levels without being consumed at intermediate levels. Flag if prop count > 5 at depth > 2.
Also check for "data clumps" — groups of 3+ related variables always passed together as separate props (e.g. `userId`, `collaboratorId`, `communityId` should be an object type).

**J3 — Client component boundary placement**

*Specific patterns to check (source: Next.js App Router composition patterns):*

Read `app/(app)/layout.tsx` and the 5 most-visited page files from sitemap.md.

Check 1 — `'use client'` at page/layout level when only a subcomponent needs it:
If a `page.tsx` or `layout.tsx` has `'use client'` but only uses client features in one subcomponent (e.g. only one `useState` or one interactive button), it should instead split the interactive part into a named Client Component and keep the page as a Server Component. Marking the whole page `'use client'` forces ALL its imports into the client bundle.

Check 2 — Context providers placed too high:
If a context Provider wraps the entire `<html>` or `<body>` element, check if it can be moved lower — providers as high as possible in the tree prevent Next.js from optimising the static parts of Server Components.

Check 3 — `lib/` files with server secrets imported into `'use client'` files:
Grep: any `'use client'` file that imports from a `lib/` file containing `process.env` access for non-NEXT_PUBLIC variables. These utilities should have a `import 'server-only'` guard or be split.

Flag each issue with: file path, current placement, recommended refactor.

**J4 — lib/ utility consolidation**
Read `lib/` directory listing. Flag any utilities that appear to have overlapping purposes (e.g. two date formatting helpers, two notification builder functions).
Known overlaps to verify (do NOT re-report if already in backlog):
- `TYPE_BADGE` map defined locally in BOTH `components/NotificationBell.tsx` AND `components/NotificationPageClient.tsx` — should be extracted to `lib/notification-utils.ts`. Assess whether this has been resolved.
- `lib/notification-utils.ts` vs `lib/notification-helpers.ts` — confirm if both exist and what their respective responsibilities are; flag if they overlap.

**J5 — Type definition consolidation**
Read `lib/types.ts` (or equivalent). Flag:
- Types defined inline in component files that are used in 3+ places (should be in `lib/types.ts`)
- Response types that duplicate Supabase-generated types (should extend the generated types instead)
- `interface X extends Y` where Y is never used independently (prefer composition or a union type)

---

## Step 4 — Produce report and update backlog

### Output format

```
## Skill-Dev Audit — [DATE]
### Scope: [N] files from sitemap.md
### Sources: Refactoring.Guru smells taxonomy, typescript-eslint rules, Next.js composition patterns, React "You Might Not Need an Effect"

### Pattern Checks (Explore agent)
| # | Check | Matches | Severity | Verdict |
|---|---|---|---|---|
| D1 | Cross-module coupling | N | Medium | ✅/⚠️ |
| D2 | Duplicated color maps | N | Medium | ✅/⚠️ |
| D3 | N+1 fetch patterns | N | High | ✅/⚠️ |
| D4 | Dead exports | N | Low | ✅/⚠️ |
| D5 | Duplicated validation | N | Medium | ✅/⚠️ |
| D6 | Magic strings + numbers | N | Medium | ✅/⚠️ |
| D7 | TODO/FIXME comments | N | Low | ✅/⚠️ |
| D8 | @ts-ignore + any + floating promises | N | High | ✅/⚠️ |
| D9 | useEffect antipatterns | N | Medium | ✅/⚠️ |
| D10 | Empty catch + console.log | N | Medium | ✅/⚠️ |

### Structural Checks
| # | Check | Verdict | Notes |
|---|---|---|---|
| J1 | Over-large components | ✅/⚠️ | |
| J2 | Prop drilling + data clumps | ✅/⚠️ | |
| J3 | 'use client' boundary | ✅/⚠️ | |
| J4 | lib/ consolidation | ✅/⚠️ | |
| J5 | Type definition consolidation | ✅/⚠️ | |

### Findings requiring action ([N] total)
[file:line — check# — issue — suggested fix for each]
```

### Write to backlog

For each finding with severity Medium or above, append to `docs/refactoring-backlog.md`:
- Assign ID: `DEV-[n]` (increment from last DEV entry)
- Add row to priority index table
- Add full detail section

### Severity guide

- **Critical**: `@ts-ignore` on a security/data path (D8); N+1 in a hot path — list page or dashboard (D3); floating promise in an auth or data-write event handler (D8)
- **High**: `any` usage in shared lib utilities; `useEffect` with no dependency array (D9C); dead exports in shared lib; empty catch on a DB write (D10)
- **Medium**: `useEffect` derived-state antipattern (D9A); over-large component >300 lines with 4+ responsibilities (J1); `'use client'` at page level when only a subcomponent needs it (J3); magic business-rule numbers (D6); console.log in production (D10); data clumps >3 always-grouped props (J2)
- **Low**: TODO comments; minor coupling; consolidation opportunities; magic enum strings with existing type definitions

---

## Execution notes

- Do NOT make any code changes.
- Do NOT report issues already in `docs/refactoring-backlog.md`.
- The `SupabaseClient<any, any, any>` pattern in `lib/notification-helpers.ts` is intentional — do not flag as a D8 violation (documented in CLAUDE.md Known Patterns).
- If `docs/sitemap.md` is not in the worktree, read from `/Users/MarcoG/Projects/staff-manager/docs/sitemap.md`.
- After producing the report, ask: "Vuoi che implementi i fix di priorità High/Critical identificati?"
