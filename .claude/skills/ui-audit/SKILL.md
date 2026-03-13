---
name: ui-audit
description: Run a structured UI compliance check on the staff-manager codebase. Scope: shadcn component adoption, design token correctness, accessibility attributes, table layout rules. Does NOT cover UX flows or responsiveness (use /ux-audit and /responsive-audit for those). Pass "screenshots" to capture live screenshots via Playwright (requires npm run dev on localhost:3000). Pass "screenshots full" for all routes.
user-invocable: true
model: sonnet
context: fork
argument-hint: [screenshots|screenshots full]
allowed-tools: Read, Glob, Grep, Agent, WebFetch, mcp__playwright__browser_navigate, mcp__playwright__browser_screenshot, mcp__playwright__browser_snapshot, mcp__playwright__browser_type, mcp__playwright__browser_click, mcp__playwright__browser_wait_for
---

## Mode detection

Check `$ARGUMENTS`:
- Empty / not provided → **static mode** (Steps 1–5 + 7 only)
- Contains `screenshots` → **static + visual mode** (Steps 1–7)
- Contains `screenshots full` → **static + visual mode, all routes**

Announce the mode at the start: `Running ui-audit in [STATIC | VISUAL (fast) | VISUAL (full)] mode.`

---

## Step 1 — Load reference documents (parallel)

Read ALL of these before running any checks:

1. **`docs/ui-components.md`** — the project's component contract: available shadcn components, badge → variant mapping per status, documented patterns for Dialog, Sheet, Tooltip, Tabs, EmptyState.

2. **`docs/sitemap.md`** — canonical route list. Use the **Componenti chiave** column to scope checks per route. Use the **loading.tsx** column for S1.

3. **`~/.claude/ui-kits/shadcn-ui-kit/components/ui/button.tsx`**, **`dialog.tsx`**, **`badge.tsx`**, **`table.tsx`** — reference shadcn implementations. Read these when a check requires understanding the correct prop structure.

After reading, extract and hold in working memory:
- Full component map (18 components from `docs/ui-components.md`)
- Status → Badge variant mapping (compensations, documents, tickets)
- Correct className pattern for Dialog/Sheet backgrounds
- Route list grouped by role (from `docs/sitemap.md`)

---

## Step 2 — Build the file scope

Glob `app/(app)/**/*.tsx` and `components/**/*.tsx`. This is the target for all grep checks.

---

## Step 3 — Automated grep checks (delegate to Explore subagent, model: haiku)

Launch a single Explore subagent with the instruction: "Run all grep searches in parallel and return file path + line number + matching line for every hit. Scope: all .tsx files under app/ and components/."

### G1 — Hardcoded blue on interactive elements
`bg-blue-` → must be `bg-brand hover:bg-brand/90 text-white`

### G2 — Hardcoded blue link text
`text-blue-` → must be `text-link hover:text-link/80`

### G3 — Insufficient muted hover opacity
Regex: `hover:bg-muted\/([1-5][0-9]?)\b` where captured value < 60 → must be `hover:bg-muted/60`

### G4 — Bare empty-state paragraphs
`<p className=` within 2 lines of `text-center` or `text-muted` → must use `<EmptyState>`

### G5 — Non-existent Tailwind scale
`gray-850|slate-850|zinc-850|neutral-850` → scale ends at 950, 850 does not exist

### G6 — Full-width table
`w-full` within 3 lines of `<Table` → `<Table>` must be `w-auto`, container `w-fit`

### G7 — Horizontal scroll on table containers
`overflow-x-auto` (exclude `<pre>` blocks) → table containers use `overflow-hidden`

### G8 — Wrong color for required field asterisks
`text-red-500|text-red-400|text-red-600` on form asterisks or required markers → use `text-destructive`

### G9 — Icon-only buttons missing aria-label
`<Button[^>]*>` or `<button[^>]*>` containing only a Lucide icon component, without `aria-label` on the same element

### G10 — Hardcoded dark background in Dialog/Sheet
`bg-gray-900|bg-gray-800|bg-zinc-900` inside `DialogContent` or `SheetContent` className → use `bg-card` for theme compatibility

### G11 — Native HTML inside modal components
`<button |<input |<select |<textarea ` (lowercase native) inside `<Dialog` or `<Sheet` blocks → use shadcn Button, Input, Select, Textarea

### G12 — Status badges missing data-* attributes
`<StatusBadge|<Badge` rendering a status value without `data-stato` (compensations/expenses) or `data-ticket-stato` (tickets) attribute

---

## Step 4 — Supplemental checks (you, not the subagent)

### S1 — Pages missing loading.tsx
For each directory under `app/(app)/` with a `page.tsx`, verify a sibling `loading.tsx` exists.
Cross-reference with sitemap `loading.tsx` column. List all routes missing it.

### S2 — Native HTML instead of shadcn components
Extend G11 results to the full scope. Cross-reference `docs/ui-components.md` component map.
Exclude: `components/ui/` (source files), `<input type="hidden">`, server components with no interactivity.
Map: `<button` → `Button`, `<input` → `Input`, `<textarea` → `Textarea`, `<select` → `Select`.

### S3 — Lucide icons in Server→Client data props
Read `lib/nav.ts`. Verify icon references use `iconName: string`, not `icon: LucideIcon`.
Also grep any file exporting navigation/menu data structures for `icon:` followed by a capitalized identifier.

### S4 — Hardcoded structural colors
Extend G10 results. `bg-gray-*`, `bg-slate-*`, `bg-zinc-*` on cards, sidebars, headers, form containers → use `bg-card`, `bg-muted`, `bg-background`.
**Allowed**: semantic badge pairs (`bg-green-100 text-green-700`, `bg-amber-100`, etc.) — these are valid per `docs/ui-components.md`.

### S5 — Badge variant mismatch
Grep for `<Badge` or `<StatusBadge` rendering compensation/expense/document/ticket status.
Verify `variant` and `className` match the documented mapping in `docs/ui-components.md`.
Flag deviations from the contract.

---

## Step 5 — Static audit report

Produce this table before visual audit (if enabled):

```
## UI Audit — [DATE] — [MODE]
### Reference: docs/ui-components.md · shadcn-ui-kit · docs/sitemap.md
### Scope: shadcn compliance · design tokens · accessibility attributes · table layout
### Out of scope: UX flows → /ux-audit | Responsiveness → /responsive-audit

### Static analysis

| Check | Description | Status | Violations |
|---|---|---|---|
| G1  | bg-blue-* on interactive elements | ✅/❌ | N |
| G2  | text-blue-* link pairs | ✅/❌ | N |
| G3  | hover:bg-muted < /60 | ✅/❌ | N |
| G4  | Bare <p> for empty states | ✅/❌ | N |
| G5  | Non-existent Tailwind *-850 | ✅/❌ | N |
| G6  | w-full on <Table> | ✅/❌ | N |
| G7  | overflow-x-auto on table containers | ✅/❌ | N |
| G8  | text-red-* for required markers | ✅/❌ | N |
| G9  | Icon-only buttons without aria-label | ✅/❌ | N |
| G10 | Hardcoded bg in Dialog/Sheet | ✅/❌ | N |
| G11 | Native HTML inside modals | ✅/❌ | N |
| G12 | Status badges missing data-* attrs | ✅/❌ | N |
| S1  | Pages missing loading.tsx | ✅/❌ | N |
| S2  | Native HTML instead of shadcn | ✅/❌ | N |
| S3  | Lucide icons in Server→Client props | ✅/❌ | N |
| S4  | Hardcoded structural colors | ✅/❌ | N |
| S5  | Badge variant mismatch | ✅/❌ | N |

### Violations detail
[For each ❌: file:line — violation — suggested fix from component map or UI kit]

### Clean checks
[✅ checks with one-line confirmation each]

### Component map coverage
Components from docs/ui-components.md in use: N/18
Not yet found in codebase: [list if any]
```

---

## Step 6 — Visual audit via Playwright (only if screenshots mode)

**Skip entirely if $ARGUMENTS is empty.**

### 6a — Pre-flight check
Navigate to `http://localhost:3000` with a GET check. If not reachable, stop and output:
> ❌ Dev server not running. Start it with `npm run dev` then re-run `/ui-audit screenshots`.

### 6b — Route matrix
Use these route groups for screenshots:

**Fast mode** (`screenshots` without `full`) — 12 key routes covering each layout type:
| Role | Routes |
|---|---|
| admin | `/`, `/coda`, `/collaboratori`, `/documenti`, `/contenuti`, `/import`, `/impostazioni` |
| collab | `/compensi`, `/rimborsi`, `/ticket` |
| resp | `/approvazioni` |

**Full mode** (`screenshots full`) — all routes from sitemap (skip detail routes like `/compensi/[id]` unless a real record ID is available).

### 6c — Login flow (admin session first)
```
1. Navigate to http://localhost:3000/login
2. Wait for login form
3. Type email: admin_test@test.com
4. Type password: Testbusters123
5. Click submit button
6. Wait for redirect to / (dashboard)
```

### 6d — Screenshot loop (admin routes)
For each admin route:
1. `browser_navigate` to the route
2. Wait 1500ms for render (or wait for main content element)
3. `browser_screenshot` — save with label `[route]-admin`
4. `browser_snapshot` — capture ARIA accessibility tree
5. From the ARIA snapshot, flag:
   - Interactive elements with no accessible name (buttons/links with empty label)
   - Images with no alt text
   - Form fields with no associated label

### 6e — Switch to collaboratore session
```
1. Navigate to http://localhost:3000/login (or use logout if session persists)
2. Login with collaboratore_test@test.com / Testbusters123
3. Screenshot collaboratore routes
```

### 6f — Switch to responsabile session
```
1. Navigate to http://localhost:3000/login
2. Login with responsabile_compensi_test@test.com / Testbusters123
3. Screenshot responsabile routes
```

### 6g — Visual audit report
Append to the main report:

```
### Visual audit — [N] routes screenshotted

| Route | Role | Screenshot | ARIA issues |
|---|---|---|---|
| /  | admin | ✅ | N issues |
| /coda | admin | ✅ | N issues |
| ... | ... | ... | ... |

### Accessibility issues from ARIA snapshots
[For each issue: route — element — missing property — suggested fix]

### Visual UI observations
[UI-layer anomalies visible in screenshots that static analysis would not catch:
text overflow in cards, icon misalignment, token rendering issues, unexpected blank sections,
component spacing anomalies, theme inconsistencies (light vs dark).
Do NOT include UX flow observations — those belong in /ux-audit.]
```

---

## Step 7 — Final offer

After the full report:

> "Vuoi che sistemi le violazioni trovate? Posso fixare:
> - Tutto in una volta
> - Per categoria: **token** (G1–G3, G10) · **componenti** (G4, G11, G12, S2, S5) · **accessibilità** (G9, S3) · **layout** (G6, G7) · **form** (G8)
> - Per check specifici (indica i numeri)"

**Do NOT apply any changes until confirmed.** Before starting, list:
- Which checks will be fixed
- How many files will be modified
- Any fix requiring a judgment call (flag these separately for user decision)
