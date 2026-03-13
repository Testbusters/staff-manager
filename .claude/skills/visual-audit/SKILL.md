---
name: visual-audit
description: Evaluate the aesthetic quality and visual polish of staff-manager pages. Takes live screenshots via Playwright, analyses each on 7 visual dimensions (typography, spacing, hierarchy, colour, density, dark-mode, micro-polish), and produces a scored report with concrete improvement suggestions. Use /ui-audit for token/component compliance, /ux-audit for UX flows, /responsive-audit for breakpoints.
user-invocable: true
model: sonnet
context: fork
argument-hint: [quick|full|page:<route>|role:<role>]
allowed-tools: Read, Glob, Grep, mcp__playwright__browser_navigate, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_wait_for, mcp__playwright__browser_resize, mcp__playwright__browser_evaluate
---

## Mode detection

Check `$ARGUMENTS`:
- Empty / not provided → **standard mode** — 10 key pages, light + dark mode
- `quick` → 5 pages only (dashboard, compensi list, rimborsi nuova, approvazioni, ticket)
- `full` → all routes from sitemap, both themes
- `page:<route>` → single page deep-analysis (e.g. `page:/compensi`)
- `role:<role>` → all pages for a given role (collab | resp | admin)

Announce at start: `Running visual-audit in [STANDARD | QUICK | FULL | PAGE:<route> | ROLE:<role>] mode.`

---

## Step 1 — Load context (parallel)

Read in parallel:
1. `docs/sitemap.md` — route inventory, role mapping, key components per page
2. `app/globals.css` — token definitions (`--brand`, `--base-*`, semantic tokens)
3. `app/themes.css` — color scale for light/dark

Hold in working memory:
- Brand color token and its approximate hue
- Base scale: from base-50 (lightest) to base-950 (darkest)
- Semantic token map: `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`

---

## Step 2 — Pre-flight check

Navigate to `http://localhost:3001`. If not reachable, try `http://localhost:3000`.
If neither reachable:
> ❌ Dev server not running. Start with `npm run dev -- -p 3001` from the worktree, or `npm run dev` from the main directory, then re-run `/visual-audit`.

Record the base URL that responded — use it for all subsequent navigations.

---

## Step 3 — Visual evaluation framework

Apply these 7 dimensions to every screenshot captured.

| Dim | Name | What to look for | Target score |
|---|---|---|---|
| **V1** | Typographic hierarchy | H1 vs body weight contrast; label vs value distinction; font size spread | ≥ 4 |
| **V2** | Spatial rhythm | Consistent padding inside similar components; visual breathing room; margin harmony between sections | ≥ 4 |
| **V3** | Visual focal point | Primary CTA is the most prominent element; user's eye is guided to the most important content; no competing elements of equal weight | ≥ 4 |
| **V4** | Colour discipline | Brand colour used sparingly and intentionally; status colours follow semantic convention (green=done, amber=pending, red=destructive); no arbitrary colour decoration | ≥ 4 |
| **V5** | Information density | Appropriate density for the page type (list = dense, form = airy); tables scannable at a glance; no cognitive overload | ≥ 3 |
| **V6** | Dark-mode polish | Dark theme looks intentional, not inverted; borders visible without being harsh; badge colours adapt; no washed-out text | ≥ 4 |
| **V7** | Micro-polish | Hover/focus states visible; transitions not jarring; empty states and skeletons look professional; icon–text alignment clean | ≥ 3 |

Score scale: **1** = poor · **2** = needs work · **3** = acceptable · **4** = good · **5** = excellent

**Scoring rules:**
- Score 1–2 on any dimension → Critical finding
- Score 3 on V1, V3, V4 → Major finding (these are highest visual impact)
- Score 3 on V2, V5, V6, V7 → Minor finding
- Write one concrete, actionable observation per dimension per page (not just a number)

---

## Step 4 — Page roster

### Standard mode (10 pages)

| # | Route | Role | Priority | What to focus on |
|---|---|---|---|---|
| P01 | `/login` | — | High | First impression, brand presence, form clarity |
| P02 | `/` | collab | High | Dashboard hierarchy, widget balance, CTA prominence |
| P03 | `/compensi` | collab | High | List density, status badge clarity, filter chips |
| P04 | `/rimborsi/nuova` | collab | High | Form airy-ness, stepper legibility, progress bar |
| P05 | `/ticket` | collab | Medium | List layout, empty state quality |
| P06 | `/ticket/nuova` | collab | Medium | Form simplicity, CTA weight |
| P07 | `/approvazioni` | resp | High | KPI cards, table density, tab clarity |
| P08 | `/` | resp | Medium | Dashboard card balance, KPI visual weight |
| P09 | `/coda` | admin | High | Table density, bulk action bar, status strip |
| P10 | `/comunicazioni` | collab | Low | Content card rhythm, empty state |

### Quick mode (5 pages): P02, P03, P04, P07, P09

### Full mode: all routes from `docs/sitemap.md` sitemap, grouped by role.

---

## Step 5 — Screenshot session

### 5a — Login helper
```
1. browser_navigate [base_url]/login
2. browser_wait_for: input[type=email] visible
3. browser_type email field → [credential]
4. browser_type password field → Testbusters123
5. browser_click submit button
6. browser_wait_for: url contains /  (not /login)
7. Confirm sidebar role matches expected role
```

Credentials:
- collaboratore: `collaboratore_test@test.com`
- responsabile: `responsabile_compensi_test@test.com`
- admin: `admin_test@test.com`

### 5b — Per-page capture loop

For each page in roster:

1. Switch role if needed (navigate to /login, sign out via sidebar "Esci", re-login)
2. `browser_navigate` to route
3. `browser_wait_for` network idle or main content visible (1500ms max)
4. **Light mode**: ensure sidebar theme toggle shows "Light mode" (or click to switch to light)
   - `browser_take_screenshot` → save as `visual-[P##]-light.png`
5. **Dark mode**: click sidebar theme toggle
   - `browser_wait_for` 500ms
   - `browser_take_screenshot` → save as `visual-[P##]-dark.png`
6. Read both screenshots using the `Read` tool (Claude Vision)
7. **Immediately analyse** both screenshots on V1–V7 before moving to the next page

> Do not batch all screenshots then analyse. Analyse immediately after each pair — avoids context overload and produces sharper observations.

### 5c — Theme toggle interaction
The sidebar theme toggle (Switch component at bottom of sidebar) controls light/dark.
- In light mode: Switch is unchecked, label shows "Light mode"
- In dark mode: Switch is checked, label shows "Dark mode"
- Click the row containing the Switch to toggle (the full div is the click target)

---

## Step 6 — Per-page analysis

For each page, produce:

```
### [P##] — [Route] ([Role])

| Dim | Score | Observation | Action needed |
|---|---|---|---|
| V1 Typographic hierarchy | N/5 | [specific observation] | [fix or "none"] |
| V2 Spatial rhythm | N/5 | [specific observation] | [fix or "none"] |
| V3 Visual focal point | N/5 | [specific observation] | [fix or "none"] |
| V4 Colour discipline | N/5 | [specific observation] | [fix or "none"] |
| V5 Information density | N/5 | [specific observation] | [fix or "none"] |
| V6 Dark-mode polish | N/5 | [specific observation] | [fix or "none"] |
| V7 Micro-polish | N/5 | [specific observation] | [fix or "none"] |

**Page score**: [sum]/35 — [label: Excellent ≥28 | Good 21–27 | Needs work 14–20 | Poor <14]
**Critical findings on this page**: [list or "none"]
```

---

## Step 7 — Cross-page pattern analysis

After all pages, identify:

1. **Recurring weaknesses**: dimensions that score ≤ 3 on ≥ 3 pages → systemic issue
2. **Best-in-class pages**: the 2 pages with highest scores → what patterns make them work?
3. **Worst offenders**: the 2 pages with lowest scores → highest ROI for improvement
4. **Theme gap**: average V6 score vs average of V1–V5 → if V6 is ≥ 1 point lower, dark mode needs dedicated attention

---

## Step 8 — Report

```
## Visual Audit — [DATE] — [MODE]
### Reference: docs/sitemap.md · app/globals.css · app/themes.css
### Scope: aesthetic quality · typography · spacing · visual hierarchy · colour · dark mode · polish
### Out of scope: token compliance → /ui-audit | UX flows → /ux-audit | Responsiveness → /responsive-audit

---

### Overall score

| Dimension | Avg score | Trend |
|---|---|---|
| V1 Typographic hierarchy | N.N/5 | ↑/→/↓ |
| V2 Spatial rhythm | N.N/5 | ↑/→/↓ |
| V3 Visual focal point | N.N/5 | ↑/→/↓ |
| V4 Colour discipline | N.N/5 | ↑/→/↓ |
| V5 Information density | N.N/5 | ↑/→/↓ |
| V6 Dark-mode polish | N.N/5 | ↑/→/↓ |
| V7 Micro-polish | N.N/5 | ↑/→/↓ |
| **Total** | **N.N/5** | |

---

### Per-page results

| Page | Route | Score | Weakest dim | Critical? |
|---|---|---|---|---|
| P01 Login | /login | N/35 | V[N] | yes/no |
...

---

### [Per-page analysis blocks from Step 6]

---

### Systemic issues (recurring across ≥ 3 pages)

| Issue | Affected pages | Dimension | Suggested global fix |
|---|---|---|---|
| [e.g. H1 and subtitle same visual weight] | P02, P04, P07 | V1 | Increase H1 to font-bold text-2xl; subtitle to text-sm text-muted-foreground |

---

### Priority improvement list

Critical first, then by impact (pages affected × dimension weight):

1. **[CRITICAL]** [page] — [dimension] — [concrete fix]
2. **[MAJOR]** [page] — [dimension] — [concrete fix]
...

---

### Best-in-class patterns (preserve these)

1. [Page]: [what works and why — pattern to replicate elsewhere]
2. [Page]: [what works and why]

---

### Worst offenders (highest ROI)

1. [Page]: score N/35 — [top 3 fixes that would most improve it]
2. [Page]: score N/35 — [top 3 fixes]
```

---

## Step 9 — Improvement offer

After the report:

> "Vuoi che approfondisca o che generi proposte visive concrete? Posso:
>
> - **Mockup**: invocare `/frontend-design` per generare un'alternativa migliorata di qualsiasi pagina (HTML standalone, fedele al design system)
> - **Fix mirato**: applicare direttamente i miglioramenti che non richiedono decisioni di design (es. spaziatura padding, pesi tipografici, token mancanti)
> - **Dark mode pass**: concentrarmi esclusivamente sul miglioramento del tema scuro su tutte le pagine
> - **Singola pagina**: analisi approfondita di una pagina specifica con wireframe comparativo before/after"

**Do NOT apply visual changes without confirmation.** Many of the fixes touch spacing and typography — they affect multiple components and require design decision, not just code.

---

## Notes for interpretation

- **V5 (density) scores of 3 on data-heavy admin pages are acceptable** — `/coda` and `/collaboratori` are intentionally dense. A score of 3 on `/rimborsi/nuova` (a form) would be a problem.
- **V4 brand colour overuse**: if brand colour appears on >30% of interactive elements per page, flag it even if individual uses are correct.
- **V7 micro-polish on mobile**: not in scope for this skill — use `/responsive-audit` for that.
- **Screenshots must be analysed fresh** — do not rely on memory from previous sessions. If a screenshot shows unexpected content (wrong role, empty state when data expected), note it and analyse what's visible.
