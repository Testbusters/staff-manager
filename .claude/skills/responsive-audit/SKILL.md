---
name: responsive-audit
description: Verify that all staff-manager pages render correctly across mobile, tablet, and desktop breakpoints. Scope limited to collab and responsabile routes (Admin excluded — desktop-only usage). Uses Playwright to take screenshots at 375px / 768px / 1024px per route. Produces a PASS/WARN/FAIL report per route × breakpoint. Requires npm run dev on localhost:3000.
user-invocable: true
model: sonnet
context: fork
argument-hint: [quick|full]
allowed-tools: Read, Glob, Grep, mcp__playwright__browser_navigate, mcp__playwright__browser_resize, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_snapshot, mcp__playwright__browser_type, mcp__playwright__browser_click, mcp__playwright__browser_wait_for, mcp__playwright__browser_evaluate
---

## Mode detection

Check `$ARGUMENTS`:
- Empty / not provided → **quick mode** (375px only, key routes per role)
- `quick` → same as empty
- `full` → all breakpoints (375px + 768px + 1024px), all R-flagged routes

Announce at start: `Running responsive-audit in [QUICK | FULL] mode.`

---

## Step 1 — Load reference

Read `docs/sitemap.md`. Extract:
- All routes with `R` in the Audit column (collab + resp + multi-role + common routes)
- Test accounts from the "Test accounts" section
- Sub-hierarchy notes from "Page sub-hierarchies" section (tabs, states, responsive notes)

Hold in working memory:
- Route list grouped by role session needed (collab routes, resp routes, shared routes)
- Responsive notes per page (from sitemap sub-hierarchies)

---

## Step 2 — Pre-flight check

Navigate to `http://localhost:3000`. If not reachable:
> ❌ Dev server not running. Start with `npm run dev` then re-run `/responsive-audit`.

---

## Step 3 — Breakpoint definitions

| ID | Width | Height | Label | Priority |
|---|---|---|---|---|
| BP1 | 375px | 812px | Mobile S (iPhone SE) | Critical — always tested |
| BP2 | 768px | 1024px | Tablet (iPad) | Full mode only |
| BP3 | 1024px | 768px | Laptop S | Full mode only |

Quick mode: BP1 only.
Full mode: BP1 + BP2 + BP3.

---

## Step 4 — Route matrix

### Collab session routes
Login with `collaboratore_test@test.com` / `Testbusters123`.

| Route | Tabs/states to check |
|---|---|
| `/` | Collab dashboard — DashboardUpdates widget (4 tabs visible?) |
| `/profilo` | Tabs: Informazioni · Documenti · Sicurezza |
| `/compensi` | List + pagination |
| `/compensi/[id]` | Skip in quick mode (needs real ID) |
| `/rimborsi` | List + pagination |
| `/rimborsi/nuova` | Form fields + submit button |
| `/comunicazioni` | Feed cards |
| `/eventi` | Feed cards + date boxes |
| `/opportunita` | Tabs: Opportunità · Sconti |
| `/ticket` | List |
| `/ticket/nuova` | Form |
| `/notifiche` | List + filter buttons |

### Resp session routes
Login with `responsabile_compensi_test@test.com` / `Testbusters123`.

| Route | Tabs/states to check |
|---|---|
| `/` | Resp dashboard — KPI strip + pending items |
| `/approvazioni` | Tabs: Compensi · Rimborsi + table |
| `/documenti` | List |
| `/contenuti` | Tabs: 5 tabs visible on mobile? |
| `/ticket` | Manager view list |

### Shared routes (test with collab session — already logged in)
- `/profilo` (already in collab list above)
- `/notifiche` (already in collab list above)

---

## Step 5 — Screenshot loop

For each session × route × breakpoint:

1. `browser_resize(width, height)` — set viewport
2. `browser_navigate(url)`
3. Wait 1500ms or until main content visible
4. `browser_take_screenshot` — save with label `responsive/[route-slug]-[role]-[bp].png`
5. `browser_evaluate` — run overflow check:
   ```js
   (() => {
     const body = document.body;
     const htmlW = document.documentElement.scrollWidth;
     const vpW = window.innerWidth;
     return { hasHorizontalScroll: htmlW > vpW, overflowPx: Math.max(0, htmlW - vpW) };
   })()
   ```
6. `browser_snapshot` — ARIA snapshot for tap target size check

### Checks per screenshot

**R1 — Horizontal overflow**
`hasHorizontalScroll === true` → FAIL. Report `overflowPx` px overflow.

**R2 — Table overflow**
From ARIA snapshot: if a `<table>` role element is present, verify its container does not produce horizontal scroll. Grep result for `scrollable` or check `overflow` CSS via evaluate.

**R3 — Text truncation**
From screenshot: flag if text is cut off mid-word (ellipsis mid-sentence is acceptable if intentional `line-clamp`).

**R4 — Tap target size**
From ARIA snapshot: interactive elements (buttons, links) should have a minimum 44×44px touch target at mobile breakpoints. Check via:
```js
Array.from(document.querySelectorAll('button, a, [role="button"]')).map(el => {
  const r = el.getBoundingClientRect();
  return { text: el.textContent?.slice(0,30), w: Math.round(r.width), h: Math.round(r.height), ok: r.width >= 44 && r.height >= 44 };
}).filter(x => !x.ok && x.w > 0)
```
Flag elements with w < 44 OR h < 44 that are primary interactive elements (exclude inline text links and icon-only utility buttons already covered by /ui-audit G9).

**R5 — Stacked layout**
At BP1 (375px): grid/flex containers with `sm:grid-cols-2` or `md:grid-cols-3` should stack to single column. Visually verify from screenshot.

**R6 — Modal/dialog usability**
If a Dialog is open: verify it does not overflow the viewport and has visible close affordance.

---

## Step 6 — Session management

### Login helper (reuse across steps)
```
1. browser_navigate http://localhost:3000/login
2. If already at / (session active): check current role matches needed role
   - If wrong role: click "Esci" → confirm AlertDialog → wait for /login
3. browser_type [email field] [email]
4. browser_type [password field] Testbusters123
5. browser_click [submit button]
6. browser_wait_for url = http://localhost:3000/
```

### Role switch
When switching from collab to resp:
1. `browser_navigate http://localhost:3000/login`
2. If redirected to `/`: look for "Esci" in sidebar → click → confirm → wait for `/login`
3. Login with resp credentials

---

## Step 7 — Report

```
## Responsive Audit — [DATE] — [MODE]
### Reference: docs/sitemap.md (R-flagged routes)
### Breakpoints tested: [BP1 only | BP1 + BP2 + BP3]

### Summary

| Route | Role | BP1 375px | BP2 768px | BP3 1024px | Issues |
|---|---|---|---|---|---|
| /  | collab | PASS/WARN/FAIL | — | — | [description] |
| /rimborsi/nuova | collab | PASS/WARN/FAIL | — | — | |
| ... | | | | | |

Legend: PASS = no issues · WARN = minor (e.g. tap target slightly small) · FAIL = broken (overflow, truncation, unusable layout)

### Violations detail

For each WARN or FAIL:
- **Route**: [url] — **Role**: [role] — **Breakpoint**: [bp]
- **Check**: R[N] — [check name]
- **Detail**: [description of the problem]
- **Screenshot**: [filename]
- **Fix hint**: [suggested CSS fix — e.g. add overflow-x-hidden, add min-w-0, adjust grid breakpoint]

### Clean routes
[List of PASS routes with one-line confirmation]

### Responsive score
- Total routes tested: N
- PASS: N (N%) · WARN: N · FAIL: N
```

---

## Step 8 — Final offer

After the report:

> "Vuoi che sistemi le violazioni responsive trovate? Posso intervenire su:
> - Tutto in una volta
> - Per breakpoint: mobile (BP1) · tablet (BP2) · laptop (BP3)
> - Per check: overflow (R1+R2) · testo (R3) · tap target (R4) · layout (R5) · modal (R6)"

**Do NOT apply any changes until confirmed.**
