---
name: commit
description: Generate and execute a Conventional Commits 1.0.0 compliant commit for staff-manager. Use at Phase 3 intermediate commit, Phase 8 docs commit, and Phase 8 context commit. Derives type, scope, and description from staged changes.
user-invocable: true
model: haiku
context: fork
---

Generate and execute a Conventional Commits 1.0.0 compliant commit for the staff-manager project.

## Step 1 — Read staged changes

Run: `git -C ~/Projects/staff-manager diff --staged --stat`

If output is empty: respond "No staged files. Run `git add <files>` first." and stop.

## Step 2 — Determine commit type

Classify based on staged files:

| Staged files | Type |
|---|---|
| Source code (`app/`, `lib/`, `components/`, `supabase/migrations/`) introducing new capability | `feat` |
| Source code correcting broken behaviour | `fix` |
| Test files only (`__tests__/`, `e2e/`) | `test` |
| Docs only (`docs/`, `README.md`) | `docs` |
| Context/config files (`.claude/`, `CLAUDE.md`, `MEMORY.md`, pipeline, skills, settings) | `chore` |
| Restructuring without behaviour change | `refactor` |

When code + tests are staged together, type follows the code change (`feat` or `fix`).

**BREAKING CHANGE**: if a migration drops a column, renames a table, removes an API field, or changes a response shape — append `!` after type/scope AND add a `BREAKING CHANGE:` footer line explaining the impact.

## Step 3 — Determine scope

Derive from the primary functional area of the staged changes:

- Domain entities: `compensations` · `reimbursements` · `documents` · `tickets` · `content` · `corsi`
- Infrastructure: `auth` · `proxy` · `db` · `api` · `email`
- Horizontal: `ui` (UI-only, no domain logic) · `context` (pipeline.md, CLAUDE.md, skills, rules)
- Omit scope if changes span >3 unrelated areas or are truly cross-cutting

## Step 4 — Write description

Rules:
- Imperative mood: `add`, `fix`, `update`, `remove` — never past tense
- Max 72 characters total including `type(scope): `
- Specific over generic: `add reject_manager transition to compensations` not `update compensations`
- No period at end

## Step 5 — Body (include when useful)

Include a body when:
- The reason for the change is non-obvious
- A BREAKING CHANGE needs explanation
- Phase 8 docs commit: list which doc files were updated and why

Separate body from subject with a blank line.

## Step 6 — Execute

Output the proposed commit message, then run:

```bash
git -C ~/Projects/staff-manager commit -m "<subject>" [-m "<body>"]
```

Use multiple `-m` flags for subject + body. Never use `--amend` or `--no-verify`.

---

## Reference — Three-commit block pattern (S8)

| Commit | Phase | Type | Scope | Content |
|---|---|---|---|---|
| 1 — code | Phase 3 | `feat` or `fix` | domain entity | source files + migrations + tests |
| 2 — docs | Phase 8 | `docs` | block name | implementation-checklist, README, sitemap, db-map, contracts, PRD |
| 3 — context | Phase 8 | `chore` | `context` | CLAUDE.md and/or MEMORY.md only if updated |
