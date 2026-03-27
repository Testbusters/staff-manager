---
name: visual-audit
description: Evaluate the aesthetic quality and visual polish of staff-manager pages. Takes live screenshots via Playwright, analyses each on 8 visual dimensions (typography, spacing, hierarchy, colour, density, dark-mode, micro-polish, contrast/legibility), runs computed browser checks (font scale, 8px grid, transition timing, contrast), and produces a scored report with concrete improvement suggestions. Use /ui-audit for token/component compliance, /ux-audit for UX flows, /responsive-audit for breakpoints.
user-invocable: true
model: opus
context: fork
argument-hint: [quick|full] [target:page:<route>|target:role:<role>|target:section:<section>]
allowed-tools: Read, Glob, Grep, mcp__playwright__browser_navigate, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_wait_for, mcp__playwright__browser_resize, mcp__playwright__browser_evaluate
---

## Step 0 — Mode + target detection

Parse `$ARGUMENTS`:

**Mode** (controls page roster breadth):
- `quick` → 5 key pages only
- `full` → all routes from sitemap, both themes
- No mode keyword → **standard** (10 pages, light + dark)

**Target** (filters the page roster):
- `target:page:/compensi` → only that exact route
- `target:role:collab` → collab-accessible routes only
- `target:role:resp` → resp-accessible routes only
- `target:role:admin` → admin-accessible routes only
- `target:section:corsi` → routes whose path contains "corsi"
- `target:section:<name>` → routes whose path contains `<name>`
- No target → no filter (use all pages from the mode roster)

Mode and target are **independent** — `quick target:role:collab` means "run quick mode but limit to collab routes".

Announce at start:
`Running visual-audit in [STANDARD | QUICK | FULL] mode — scope: [FULL | target: <resolved description>]`

---

## Step 1 — Load context (parallel)

Read in parallel:
1. `docs/sitemap.md` — route inventory, role mapping, key components per page
2. `app/globals.css` — token definitions (`--brand`, `--base-*`, semantic tokens)
3. `app/themes.css` — color scale for light/dark

Hold in working memory:
- Brand color token and its approximate hue (for V4 colour discipline checks)
- Base scale: from base-50 (lightest) to base-950 (darkest)
- Semantic token map: `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-brand`
- List of all routes with their roles and key component files

Apply target filter from Step 0 to the route list from sitemap. The filtered list is the **working roster** for all subsequent steps.

---

## Step 2 — Pre-flight check

Navigate to `http://localhost:3001`. If not reachable, try `http://localhost:3000`.
If neither reachable:
> ❌ Dev server not running. Start with `npm run dev -- -p 3001` from the worktree, or `npm run dev` from the main directory, then re-run `/visual-audit`.

Record the base URL that responded — use it for all subsequent navigations.

---

## Step 3 — Visual evaluation framework

Apply these 8 dimensions to every screenshot captured.

| Dim | Name | What to look for | Target score |
|---|---|---|---|
| **V1** | Typographic hierarchy | H1 vs body weight contrast; label vs value distinction; font size spread; muted-foreground on secondary text. **Quantitative anchor**: ≤ 5 distinct font sizes in use (from computed check); 2 font weights (semibold for headings, regular for body). Flag if computed check reveals > 5 sizes. | ≥ 4 |
| **V2** | Spatial rhythm | Consistent padding inside similar components; visual breathing room; margin harmony between sections; card internal padding uniformity. **Quantitative anchor**: padding values should be multiples of 4px (8px preferred). Flag non-grid values (14px, 6px, 10px) when identified by computed check. | ≥ 4 |
| **V3** | Visual focal point | Primary CTA is the most prominent element; user's eye is guided to the most important content; no competing elements of equal weight | ≥ 4 |
| **V4** | Colour discipline | Brand colour used sparingly and intentionally; status colours follow semantic convention (green=done, amber=pending, red=destructive); no arbitrary colour decoration; `bg-brand` reserved for primary CTAs not row-level buttons. **APCA anchors** (source: APCA/WCAG 3 working draft): body text on card background should achieve APCA Lc ≥ 60 equivalent; label/muted text ≥ Lc 45 for large font sizes; non-text contrast (borders, icons) ≥ Lc 15. Evaluate in both themes. | ≥ 4 |
| **V5** | Information density | Appropriate density for the page type (list = dense, form = airy); tables scannable at a glance; no cognitive overload; no empty visual regions | ≥ 3 |
| **V6** | Dark-mode polish | Dark theme looks intentional, not inverted; borders visible without being harsh; badge colours adapt; no washed-out text; card backgrounds distinguishable from page background. **OKLCH note**: shadcn uses OKLCH colour space for dark tokens — verify converted colours retain intended luminance and hue (no washed-out off-whites, no over-saturated brand colours in dark context, no unexpected hue shifts at the OKLCH→sRGB boundary). | ≥ 4 |
| **V7** | Micro-polish | Hover/focus states visible; transitions not jarring; empty states and skeletons look professional; icon–text alignment clean; status badges correct size relative to surrounding text. **Timing anchor**: transitions < 100ms are imperceptible (no feedback value); > 400ms feels sluggish. Flag when computed check reveals out-of-range transition durations on interactive elements. | ≥ 3 |
| **V8** | Contrast & legibility | Computed contrast ratios for key text elements against their backgrounds in both light and dark themes. References APCA thresholds: Lc 75 preferred for body text, Lc 60 minimum, Lc 45 for large/label text, Lc 15 for non-text (borders, icons). Specifically checks `text-muted-foreground` on `bg-card` — a common silent failure in dark mode. Uses computed style values from browser_evaluate. | ≥ 4 |

Score scale: **1** = poor · **2** = needs work · **3** = acceptable · **4** = good · **5** = excellent

**Scoring rules:**
- Score 1–2 on any dimension → Critical finding
- Score 3 on V1, V3, V4, V8 → Major finding (highest visual and accessibility impact)
- Score 3 on V2, V5, V6, V7 → Minor finding
- Write one concrete, actionable observation per dimension per page (not just a number)
- **Never write a vague observation like "good overall"** — every line must name what specifically works or what specifically is wrong

**Code-grounded scoring**: after reading a page's component files (Step 5a), if you see a class like `text-muted-foreground` on a subtitle in the code but the screenshot shows it rendered too light, flag it. Conversely, if `bg-brand` appears on a row-level button in the code, flag it even if the screenshot looks acceptable — it's a systematic violation.

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

### Full mode: all routes from `docs/sitemap.md`, grouped by role.

### Roster currency check (run before starting any mode)
Cross-reference the Standard roster above against `docs/sitemap.md`. Flag any route present in the sitemap but absent from the Standard roster with:
> ⚠️ Roster gap: `/[route]` exists in sitemap but is not in the Standard roster. Add it to the next roster update or include it manually in Full mode.
This ensures pages added after the roster was last written are not silently skipped.

---

## Step 5 — Screenshot session

### 5a — Per-page code inspection (MANDATORY before each screenshot)

Before navigating to each page, read its primary page file AND the 1–2 most important component files listed in the "Componenti chiave" column of the sitemap.

Specifically note:
- Which Tailwind classes are used on the main container, headings, primary CTA buttons
- Whether `bg-brand` appears on any row-level or inline button (→ V4 flag)
- Whether semantic tokens (`text-foreground`, `text-muted-foreground`, `bg-card`) are used consistently
- Whether empty state, loading, and error states are handled in the component

This code context MUST inform the scoring in Step 6 — reference it explicitly when writing observations.

### 5b — Login helper
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
- collaboratore: `collaboratore_tb_test@test.com`
- responsabile: `responsabile_compensi_test@test.com`
- admin: `admin_test@test.com`

### 5c — Per-page capture loop

For each page in roster:

1. Read page + component files (Step 5a) BEFORE navigating
2. Switch role if needed (navigate to /login, sign out via sidebar "Esci", re-login)
3. `browser_navigate` to route
4. `browser_wait_for` network idle or main content visible (2000ms max)
5. **DOM preflight validation** — run this evaluate before any screenshot:
   ```js
   ({
     loaded: document.readyState === 'complete',
     hasMain: (document.querySelector('main')?.innerText?.length ?? 0) > 30,
     noError: !document.title.toLowerCase().includes('error') &&
               !document.body.innerText.includes('Application error') &&
               !document.body.innerText.includes('500')
   })
   ```
   If `hasMain === false` OR `noError === false`:
   > ⚠️ Page [route] failed preflight: [which flag was false]. Skipping screenshot — investigate page state before retrying.
   Do NOT analyse an empty or errored page — flag it and continue to the next page.

6. **Computed checks** (run in light mode after preflight passes):
   ```js
   // Typography scale — count distinct font sizes
   const fontSizes = [...new Set(
     [...document.querySelectorAll('h1,h2,h3,h4,p,td,th,label,span,a')]
       .map(el => parseFloat(getComputedStyle(el).fontSize))
       .filter(Boolean)
   )].sort((a, b) => a - b);

   // Spacing grid — spot check first Card-like container
   const card = document.querySelector(
     '[data-slot="card"], [class*="rounded"][class*="border"], main > div'
   );
   const cardPad = card ? parseInt(getComputedStyle(card).paddingTop) : null;

   // Transition timing — check interactive elements
   const transitions = [...document.querySelectorAll('button, a[href], [role="button"]')]
     .map(el => getComputedStyle(el).transitionDuration)
     .filter(d => d && d !== '0s')
     .map(d => parseFloat(d) * 1000); // convert to ms

   // Contrast spot check — text-muted-foreground on bg-card (light mode)
   const mutedEl = document.querySelector('[class*="muted-foreground"]');
   const mutedColor = mutedEl ? getComputedStyle(mutedEl).color : null;
   const cardBg = card ? getComputedStyle(card).backgroundColor : null;

   return {
     fontSizeCount: fontSizes.length,
     fontSizes,
     cardPaddingTopPx: cardPad,
     cardPaddingIsGridAligned: cardPad !== null ? cardPad % 4 === 0 : null,
     transitionCount: transitions.length,
     transitionsOutOfRange: transitions.filter(ms => ms > 0 && (ms < 100 || ms > 400)),
     mutedForegroundColor: mutedColor,
     cardBackgroundColor: cardBg
   };
   ```
   Record results. Use to inform V1 (font scale), V2 (grid alignment), V7 (transition timing), V8 (contrast).

7. **Light mode screenshot**: ensure sidebar theme toggle shows "Light mode" (click to switch if needed)
   - `browser_take_screenshot` → label `visual-[P##]-light`

8. **Dark mode**: click sidebar theme toggle → `browser_wait_for` 500ms
   - Run the contrast portion of computed checks again in dark mode:
     ```js
     const mutedEl = document.querySelector('[class*="muted-foreground"]');
     const card = document.querySelector('[data-slot="card"], [class*="rounded"][class*="border"], main > div');
     return {
       mutedForegroundColor: mutedEl ? getComputedStyle(mutedEl).color : null,
       cardBackgroundColor: card ? getComputedStyle(card).backgroundColor : null,
       bodyColor: getComputedStyle(document.body).color,
       bodyBg: getComputedStyle(document.body).backgroundColor
     };
     ```
   - `browser_take_screenshot` → label `visual-[P##]-dark`

9. **Immediately analyse** both screenshots + computed data against V1–V8 using the code context from Step 5a

> Do not batch all screenshots then analyse. Analyse immediately after each pair — avoids context overload and produces sharper observations.

### 5d — Theme toggle interaction
The sidebar theme toggle (Switch component at bottom of sidebar) controls light/dark.
- In light mode: Switch is unchecked, label shows "Light mode"
- In dark mode: Switch is checked, label shows "Dark mode"
- Click the row containing the Switch to toggle (the full div is the click target)

---

## Step 6 — Per-page analysis

For each page, produce:

```
### [P##] — [Route] ([Role])

**Code context**: [key classes observed in code that informed scoring — 2-3 bullet points]

**Computed data**:
- Font sizes: [N distinct values — list]
- Card padding: [Npx — grid-aligned: yes/no]
- Transitions out of range: [list ms values, or "none"]
- Muted foreground (light): [rgb value]
- Card background (light): [rgb value]
- Muted foreground (dark): [rgb value]
- Card background (dark): [rgb value]

| Dim | Score | Observation | Action needed |
|---|---|---|---|
| V1 Typographic hierarchy | N/5 | [specific observation — reference fontSizeCount from computed data] | [fix or "none"] |
| V2 Spatial rhythm | N/5 | [specific observation — reference cardPaddingIsGridAligned] | [fix or "none"] |
| V3 Visual focal point | N/5 | [specific observation] | [fix or "none"] |
| V4 Colour discipline | N/5 | [specific observation — note if bg-brand on row buttons; note APCA-level concern if muted text appears low-contrast] | [fix or "none"] |
| V5 Information density | N/5 | [specific observation] | [fix or "none"] |
| V6 Dark-mode polish | N/5 | [specific observation from dark screenshot — note any OKLCH hue shifts or washed-out tones] | [fix or "none"] |
| V7 Micro-polish | N/5 | [specific observation — reference transitionsOutOfRange from computed data] | [fix or "none"] |
| V8 Contrast & legibility | N/5 | [specific observation — reference computed muted/card color pairs for both themes; flag if muted text appears to fall below Lc 45 anchor] | [fix or "none"] |

**Page score**: [sum]/40 — [label: Excellent ≥32 | Good 24–31 | Needs work 16–23 | Poor <16]
**Critical findings on this page**: [list or "none"]
```

---

## Step 7 — Cross-page pattern analysis

After all pages, identify:

1. **Recurring weaknesses**: dimensions that score ≤ 3 on ≥ 3 pages → systemic issue
2. **Best-in-class pages**: the 2 pages with highest scores → what patterns make them work?
3. **Worst offenders**: the 2 pages with lowest scores → highest ROI for improvement
4. **Theme gap**: average V6 score vs average of V1–V5 → if V6 is ≥ 1 point lower, dark mode needs dedicated attention
5. **Contrast gap**: average V8 score vs V6 → if V8 is lower in dark mode, OKLCH conversion or token values need review
6. **Typography discipline**: pages where fontSizeCount > 5 → systemic type scale violation
7. **Code pattern violations**: list any systematic code patterns observed across pages that cause visual problems (e.g., "bg-brand on row buttons appears on 4 pages: [list]")

---

## Step 8 — Report

```
## Visual Audit — [DATE] — [MODE] — [TARGET]
### Reference: docs/sitemap.md · app/globals.css · app/themes.css
### Scope: aesthetic quality · typography · spacing · visual hierarchy · colour · dark mode · polish · contrast
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
| V8 Contrast & legibility | N.N/5 | ↑/→/↓ |
| **Total** | **N.N/5** | |

---

### Per-page results

| Page | Route | Score | Weakest dim | Critical? |
|---|---|---|---|---|
| P01 Login | /login | N/40 | V[N] | yes/no |
...

---

### [Per-page analysis blocks from Step 6]

---

### Systemic issues (recurring across ≥ 3 pages)

| Issue | Affected pages | Dimension | Code cause | Suggested global fix |
|---|---|---|---|---|
| [e.g. H1 and subtitle same visual weight] | P02, P04, P07 | V1 | [class observed in code] | [fix] |

---

### Systematic code violations (patterns found in code across multiple pages)

| Violation | Pages | PERMANENT RULE | Fix |
|---|---|---|---|
| [e.g. bg-brand on row buttons] | [list] | Row-level buttons use variant="outline" | Replace with variant="outline" |

---

### Roster gaps (routes in sitemap not in standard roster)
[list new routes flagged in Step 4 roster check, or "None — roster current"]

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

1. [Page]: score N/40 — [top 3 fixes that would most improve it]
2. [Page]: score N/40 — [top 3 fixes]
```

---

## Step 9 — Improvement offer

After the report:

> "Vuoi che approfondisca o che generi proposte visive concrete? Posso:
>
> - **Mockup via Figma MCP**: leggere le Foundation TB direttamente da Figma (`get_variable_defs` su file `p9kUAQ2qNVg4PojTBEkSmC`) e generare un'alternativa migliorata fedele al design system reale
> - **Mockup standalone**: invocare `/frontend-design` per generare un'alternativa migliorata (HTML standalone, fedele ai token del progetto)
> - **Fix mirato**: applicare direttamente i miglioramenti che non richiedono decisioni di design (es. spaziatura padding, pesi tipografici, token mancanti)
> - **Dark mode pass**: concentrarmi esclusivamente sul miglioramento del tema scuro su tutte le pagine
> - **Contrast pass**: verificare e correggere i valori token per `text-muted-foreground` e `border-border` su entrambi i temi alla luce dei risultati V8
> - **Singola pagina**: analisi approfondita di una pagina specifica con wireframe comparativo before/after"

**Do NOT apply visual changes without confirmation.** Many of the fixes touch spacing and typography — they affect multiple components and require design decision, not just code.

---

## Notes for interpretation

- **V5 (density) scores of 3 on data-heavy admin pages are acceptable** — `/coda` and `/collaboratori` are intentionally dense. A score of 3 on `/rimborsi/nuova` (a form) would be a problem.
- **V4 brand colour overuse**: if `bg-brand` appears on row-level buttons (not just primary CTAs), flag it even if each individual use seems minor. This is a PERMANENT RULE violation.
- **V8 computed contrast is indicative, not definitive**: `getComputedStyle` returns resolved CSS values but does not compute APCA Lc scores directly. Use the colour values as evidence to support or flag concerns — the final contrast verdict is qualitative based on what's visible in the screenshot combined with the computed colours.
- **V7 micro-polish on mobile**: not in scope for this skill — use `/responsive-audit` for that.
- **Screenshots must be analysed fresh** — do not rely on memory from previous sessions. If a screenshot shows unexpected content (wrong role, empty state when data expected), note it and analyse what's visible.
- **Preflight failures**: if more than 2 pages fail preflight, stop and report the issue before continuing — likely a dev server or auth problem, not a page-specific issue.
- **Score denominator changed to /40** (8 dimensions × 5) — update any stored baselines accordingly.
