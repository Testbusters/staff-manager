---
name: ui-audit
description: Run a full UI/UX quality audit against the design system, responsive rules, and UX patterns. Uses docs/sitemap.md as the authoritative file inventory — no free-form filesystem search.
user-invocable: true
model: sonnet
---

You are performing a UI/UX quality audit of the staff-manager Next.js app.

**Critical constraint**: `docs/sitemap.md` is the authoritative inventory of every page file and key component. Read it first and derive the file target list from it. Do NOT run free-form `grep -r` across all of `app/` or `components/` — scope every check to the files listed in the sitemap.

---

## Step 1 — Read sitemap and build target lists

Read `docs/sitemap.md`. Extract:

**A — Page files**: every path in the "Page file" column (e.g. `app/(app)/compensi/page.tsx`).

**B — Component groups by layout type**:
- `full-list` pages: compensi, rimborsi, ticket, collaboratori, documenti, feedback, notifiche, contenuti
- `detail` pages: compensi/[id], rimborsi/[id], ticket/[id], comunicazioni/[id], eventi/[id], opportunita/[id], sconti/[id], risorse/[id], documenti/[id]
- `form / wizard` pages: rimborsi/nuova, onboarding, profilo
- `tabs` pages: profilo, impostazioni, contenuti, approvazioni, collaboratori/[id]
- `dashboard`: app/(app)/page.tsx
- `feed`: comunicazioni, eventi, opportunita

**C — Key component files**: for each page, note the "Componenti chiave" column and map to actual files under `components/`. These are the component files to include in grep checks.

Output: structured lists A, B, C. Do not proceed to Step 2 until these are complete.

---

## Step 2 — Delegate grep checks to Explore agent

Launch a **single Explore subagent** (model: haiku) with the following instructions and the exact file lists from Step 1. Pass all file paths explicitly — do not ask the agent to discover them.

### Instructions for the Explore agent:

"Run all 9 checks below. For each check: report the total match count, list every match as `file:line — excerpt`, and state PASS (0 matches) or FAIL (N matches). If a check returns 0 matches, explicitly state '0 matches — PASS'. Do not skip any check.

File scope: use ONLY the page files and component files provided. Do not search outside this list.

**CHECK 1 — Grids without responsive prefix**
Pattern: `"grid grid-cols-[2-9]` (any grid-cols-2 through 9 that is NOT preceded by sm:/md:/lg:)
Grep: for each file in scope, search for lines matching `grid grid-cols-[2-9]` and filter OUT lines containing `sm:grid-cols` or `md:grid-cols` or `lg:grid-cols`.
Expected: 0 matches.

**CHECK 2 — Hardcoded blue color tokens**
Pattern: `bg-blue-|text-blue-|border-blue-`
Exclude: lines starting with `//`, lines containing `focus:`, `ring-`, `via-`, `aria-`
Expected: 0 matches. Any match is a design system violation.

**CHECK 3 — Hardcoded gray on structural containers**
Pattern: `bg-gray-[789]\|bg-gray-[89][0-9]\|bg-gray-[0-9]{3}`
Exclude: lines with `dark:`, `hover:`, `border-`, `//`, `focus:`
Expected: 0 on structural elements. Badge pairs (bg-gray-100 text-gray-700) are acceptable only if they have a matching dark: override.

**CHECK 4 — Required field asterisks using text-red-500 instead of text-destructive**
Pattern: `text-red-500`
Exclude: lines with `//`, `border-`, `hover:`, `ring-`, `focus:`
Count per file. After Wave 3 fix (Q1=B), expected: 0 matches.

**CHECK 5 — Duplicate CSS class tokens**
Pattern: look for any word repeated twice in the same className string, specifically `dark:[a-z-]+-[0-9]+ dark:[a-z-]+-[0-9]+` where the two tokens are identical.
Flag lines where the same utility class appears twice.
Expected: 0 matches.

**CHECK 6 — Bare empty states (no EmptyState component)**
Pattern: lines containing `<p` AND (`Nessun` OR `Nessuna`) with a className including `text-center` or `text-muted-foreground`
Exclude: lines containing `EmptyState`, `toast`, `aria-`, `placeholder=`, `title=`
Expected: 0 matches. All empty states must use the EmptyState component.

**CHECK 7 — Back links in detail pages missing block display**
Scope: only the 'detail' layout pages from the sitemap.
Pattern: `← Torna` — check that the containing Link has `block` in its className.
Expected: every back link has `block` in className.

**CHECK 8 — Content status badges with hardcoded colors**
Scope: only the 'detail' and 'feed' layout pages for content routes (comunicazioni, eventi, opportunita, sconti, risorse).
Pattern: `bg-green-|bg-yellow-|bg-orange-|text-green-|text-yellow-` on badge/span elements
After Wave 3 fix (Q2=B), expected: 0 matches. Before fix: document all occurrences.

**CHECK 9 — Tab bars missing whitespace-nowrap**
Scope: only the 'tabs' layout pages from the sitemap.
Pattern: check tab link elements (`className=.*tabCls\|rounded-lg.*px-4.*py-2`) for presence of `whitespace-nowrap`.
Expected: all tab links have whitespace-nowrap to prevent wrapping on mobile."

---

## Step 3 — Supplemental checks (run in main context, not delegated)

These require judgment, not just pattern matching:

**S1 — loading.tsx coverage**
From the sitemap "loading.tsx" column, identify any route marked ✗ or missing.
Run: `find app/(app) -name "loading.tsx" | sort` and cross-reference with the sitemap.
Flag any route with significant data loading that lacks a loading.tsx.

**S2 — NotificationBell placement**
Read `components/Sidebar.tsx` and `app/(app)/layout.tsx`.
Verify: NotificationBell appears exactly once in the rendered DOM per viewport (no duplication).
Known issue: `collapsible="offcanvas"` sidebar + `md:hidden` header can cause double rendering. The correct pattern is a persistent AppHeader above main content.

**S3 — Sign-out button semantic color**
Read `components/Sidebar.tsx` lines containing "Esci" or "sign" or "red".
Verify: uses `bg-destructive` (semantic) not `bg-red-600` (hardcoded).
Expected: `bg-destructive hover:bg-destructive/90`.

**S4 — Responsive sidebar trigger accessibility**
Read `app/(app)/layout.tsx`.
Verify: SidebarTrigger is reachable on BOTH mobile (in mobile header) and desktop (always accessible, not hidden when sidebar is open).
Flag if trigger is inside an `md:hidden` wrapper with no desktop alternative.

---

## Step 4 — Produce audit report

Output in this exact format:

```
## UI Audit — [DATE]
### Scope: [N] page files from sitemap.md + [N] component files

### Grep Checks
| # | Check | Matches | Verdict |
|---|---|---|---|
| 1 | Grids without responsive prefix | N | ✅/❌ |
| 2 | Hardcoded blue tokens | N | ✅/❌ |
| 3 | Hardcoded gray structural | N | ✅/❌ |
| 4 | text-red-500 asterisks | N | ✅/❌ |
| 5 | Duplicate CSS tokens | N | ✅/❌ |
| 6 | Bare empty states | N | ✅/❌ |
| 7 | Back links missing block | N | ✅/❌ |
| 8 | Content status badges hardcoded | N | ✅/❌ |
| 9 | Tab bars missing whitespace-nowrap | N | ✅/❌ |

### Supplemental Checks
| # | Check | Verdict | Notes |
|---|---|---|---|
| S1 | loading.tsx coverage | ✅/❌ | [missing routes if any] |
| S2 | NotificationBell placement | ✅/❌ | [details] |
| S3 | Sign-out semantic color | ✅/❌ | |
| S4 | Sidebar trigger accessibility | ✅/❌ | |

### ❌ Failures requiring action ([N] total)
For each FAIL check: list every file:line with excerpt and recommended fix.

### ✅ Passing checks ([N] total)
List check names with 0 matches confirmed.

### Coverage
Page files checked: N/N from sitemap.md
Component files checked: N
```

If all checks pass: output "UI Audit CLEAN — [DATE]. No violations found."

---

## Execution notes

- Do NOT make any code changes during this skill. Audit only.
- Do NOT re-read files already in context from Step 1.
- The Explore agent in Step 2 handles all grep work. Do not duplicate searches in the main context.
- If `docs/sitemap.md` is not present in the worktree, read it from `/Users/MarcoG/Projects/staff-manager/docs/sitemap.md` (main branch copy).
- After the report is produced, if any HIGH severity failures are found, ask the user: "Vuoi che implementi i fix identificati?" before touching any file.
