---
name: skill-dev
description: Code quality and technical debt audit for the staff-manager codebase. Identifies coupling, duplication, dead code, pattern inconsistencies, and missing or premature abstractions. Uses docs/sitemap.md as structural guide. Outputs findings to docs/backlog-refinement.md.
user-invocable: true
model: sonnet
---

You are performing a code quality and technical debt audit of the staff-manager Next.js codebase.

**Critical constraints**:
- `docs/sitemap.md` is the authoritative inventory of every page and component. Use it to build your file target list — do NOT scan the filesystem freely.
- Do NOT make code changes. Audit only.
- Do NOT report issues already in `docs/refactoring-backlog.md` — check for duplicates before adding.
- All new findings go to `docs/backlog-refinement.md`.

---

## Step 1 — Read structural guides

Read in order:
1. `docs/sitemap.md` — build target file list (page files + key components per route)
2. `docs/refactoring-backlog.md` — note existing entries to avoid duplicate reporting
3. `docs/backlog-refinement.md` — note existing entries to avoid duplicates

Output: structured file list (pages + components). Do not proceed until complete.

---

## Step 2 — Delegate pattern checks to Explore agent

Launch a **single Explore subagent** (model: haiku) with the full file list from Step 1 and these instructions:

"Run all 7 checks below on ONLY the files provided. For each check: state total match count, list every match as `file:line — excerpt`, and state PASS or FAIL.

**CHECK D1 — Cross-module direct imports (coupling)**
Pattern: components importing directly from other feature components (e.g. `components/admin/` importing from `components/compensation/`).
Grep: in each file, find `import.*from.*'@/components/` lines. Flag any import where the importing file's feature folder differs from the imported file's feature folder AND the import does not go through a shared `@/components/ui/` or `@/lib/` path.
Expected: imports between feature folders are explicit dependencies — flag each one.

**CHECK D2 — Duplicated inline color maps**
Pattern: object literals mapping status strings to CSS classes (e.g. `{ IN_ATTESA: 'bg-yellow-', APPROVATO: 'bg-green-' }`).
Grep: `IN_ATTESA.*bg-|APPROVATO.*bg-|LIQUIDATO.*bg-|RIFIUTATO.*bg-`
Flag: any file with this pattern NOT already using `ContentStatusBadge` or importing from `lib/content-badge-maps.ts`.
Expected: all status color maps centralised.

**CHECK D3 — Repeated fetch patterns (N+1 risk)**
Pattern: `.from('compensations').select(` or `.from('expense_reimbursements').select(` inside a loop or mapped callback.
Grep: `\.from\(.*\)\.select` inside `\.map\(` or `for\s*\(` blocks.
Flag: any query inside an iteration.

**CHECK D4 — Dead exports (unused named exports)**
Pattern: `export (function|const|type|interface) ` that are never imported elsewhere.
Sample check: for the 5 largest component files (by line count from sitemap), grep the export names across all other files.
Flag: exports with 0 consumers outside their own file.

**CHECK D5 — Duplicated validation logic**
Pattern: the same field validation appearing in more than one API route handler (e.g. checking `!collaboratorId` or `!importo` in multiple routes).
Grep: `if (!.*collaborator_id|if (!.*importo|if (!.*email` in `app/api/**/*.ts`.
Flag: identical guard patterns in 3+ routes that are not using a shared Zod schema.

**CHECK D6 — Magic strings (status/enum values)**
Pattern: state machine values hardcoded as strings in component files instead of referencing a shared constant.
Grep: `'IN_ATTESA'|'APPROVATO'|'LIQUIDATO'|'RIFIUTATO'|'INVIATO'|'DA_FIRMARE'|'FIRMATO'` in component `.tsx` files (not in API routes or type definitions).
Flag: any string literal that should reference a shared enum/constant.

**CHECK D7 — TODO/FIXME/HACK comments**
Grep: `TODO|FIXME|HACK|XXX|@ts-ignore|@ts-expect-error` across all files in scope.
Flag: each match with context. `@ts-ignore` and `@ts-expect-error` are highest priority — they suppress type errors silently."

---

## Step 3 — Structural judgment checks (main context)

These require reading and reasoning, not just pattern matching:

**J1 — Over-large components**
From sitemap.md "Componenti chiave" column, identify the 3 components with the most listed sub-responsibilities (e.g. a component handling fetch + state + form + validation + display). Flag candidates for decomposition.

**J2 — Prop drilling depth**
For each wizard/multi-step form (OnboardingWizard, rimborsi stepper, document upload wizard): read the top-level component. Count how many props are passed down 3+ levels without being consumed at intermediate levels. Flag if prop count > 5 at depth > 2.

**J3 — Client component boundary sprawl**
Read `app/(app)/layout.tsx` and the 5 most-visited page files. Flag any `'use client'` page that could be split into a server shell + a smaller client island (i.e. only a subcomponent needs client state, not the whole page).

**J4 — lib/ utility consolidation**
Read `lib/` directory listing. Flag any utilities that appear to have overlapping purposes (e.g. two date formatting helpers, two notification builder functions).

---

## Step 4 — Produce report and update backlog

### Output format

```
## Skill-Dev Audit — [DATE]
### Scope: [N] files from sitemap.md

### Pattern Checks (Explore agent)
| # | Check | Matches | Verdict |
|---|---|---|---|
| D1 | Cross-module coupling | N | ✅/⚠️ |
| D2 | Duplicated color maps | N | ✅/⚠️ |
| D3 | N+1 fetch risk | N | ✅/⚠️ |
| D4 | Dead exports | N | ✅/⚠️ |
| D5 | Duplicated validation | N | ✅/⚠️ |
| D6 | Magic strings in components | N | ✅/⚠️ |
| D7 | TODO/FIXME/@ts-ignore | N | ✅/⚠️ |

### Structural Checks
| # | Check | Verdict | Notes |
|---|---|---|---|
| J1 | Over-large components | ✅/⚠️ | |
| J2 | Prop drilling | ✅/⚠️ | |
| J3 | Client boundary sprawl | ✅/⚠️ | |
| J4 | lib/ consolidation | ✅/⚠️ | |

### Findings requiring action ([N] total)
[file:line — issue — suggested fix for each]
```

### Write to backlog

For each finding with severity Medium or above, append to `docs/backlog-refinement.md`:
- Assign ID: `DEV-[n]` (increment from last DEV entry)
- Add row to priority index table
- Add full detail section

### Severity guide
- **Critical**: `@ts-ignore` on a security/data path; N+1 in a hot path (list page, dashboard)
- **High**: dead exports that add confusion; duplicated state machine values across 5+ files
- **Medium**: over-large component (>300 lines with 4+ distinct responsibilities); prop drilling >5 props at depth 3+
- **Low**: TODO comments; minor coupling; consolidation opportunities

---

## Execution notes

- Do NOT make any code changes.
- Do NOT report issues already in `docs/refactoring-backlog.md`.
- If `docs/sitemap.md` is not in the worktree, read from `/Users/MarcoG/Projects/staff-manager/docs/sitemap.md`.
- After producing the report, ask: "Vuoi che implementi i fix di priorità High/Critical identificati?"
