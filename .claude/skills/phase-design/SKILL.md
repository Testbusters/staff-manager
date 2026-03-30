---
name: phase-design
description: Visual & UX design phase for staff-manager blocks. Steps 0-6: consistency check, ASCII wireframe, HTML preview, UX rationale, design system mapping, Design Quality Gate (10 criteria), session file persist. Invoked by pipeline.md Phase 1.6 only — not user-invocable directly.
user-invocable: false
model: opus
context: fork
allowed-tools: Read, Glob, mcp__figma__view_node
---

## Phase 1.6 — Visual & UX Design

Execute steps 0–6 in order. All clarification questions must use `AskUserQuestion` — no inline open questions.

---

### Step 0 — Consistency check

Before producing any wireframe, read `docs/ui-components.md` and identify existing pages with similar patterns (lists, forms, detail panels, state machines). State which existing patterns will be reused and which will diverge, and why. No region in the wireframe should introduce a new pattern if an existing one fits.

---

### Step 1 — ASCII wireframe

Call the **Skill tool** (`skill: "frontend-design"`) with an explicit wireframe prompt. **Do NOT generate the wireframe inline in text** — the Skill tool must be invoked. Prompt must request:
- Full page layout with named regions
- Column structure for tables/lists
- Action placement and grouping
- **All UI states**: loading, empty, error, partial (data partially loaded), 403/permission-denied
- **Mobile breakpoint (375px) — mandatory for all non-admin routes** (admin is desktop-only by project design). The 375px wireframe is the primary design artifact — design layout mobile-first and scale up. Do not design desktop-first and compress down. The mobile wireframe must name every region explicitly and show how multi-column structures collapse, how hero/header sections reflow, and how card content remains readable at narrow width.

---

### Step 2 — HTML preview

Call the **Skill tool** (`skill: "frontend-design"`) a second time with a full component generation prompt. Two paths:
- **Path A — Figma MCP**: fetch design tokens with `get_variable_defs` on Foundation TB file (`p9kUAQ2qNVg4PojTBEkSmC`), include in Skill tool prompt. Use when block introduces new UI components or token-sensitive layouts. **If `get_variable_defs` fails or Figma MCP is unavailable → fall back to Path B immediately, do not retry.**
- **Path B — standalone**: self-contained HTML with inline Tailwind CDN. Use when focus is structure/layout and tokens are already established in the codebase.

Approved output = visual contract for Phase 2; generated code is reference only, not committed.

---

### Step 3 — UX rationale

For each layout decision, state explicitly:
- What mental model it maps to (inbox, pipeline, kanban, wizard…)
- Why **at least 2 competing alternatives** were discarded — "no alternatives considered" is not acceptable
- For **new pages**: primary design goal of the chosen mental model. For **redesigns**: single most important improvement over the current state.

---

### Step 4 — Design system mapping

Map every wireframe region to the correct shadcn component and token before writing any code. No region should be "TBD" at this stage.

---

### Step 5 — Design Quality Gate

The design contract must explicitly address all 10 criteria below before the STOP. Any missing item = incomplete contract, do not proceed to STOP.

**Existing criteria (6):**
- **Accessibility plan**: heading hierarchy (h1→h2→h3), focus order in dialogs/sheets, aria-label strategy for icon-only buttons, semantic tokens only (no hardcoded color pairs)
- **Dark mode plan**: for every region, confirm which semantic token covers it in both themes. Flag any region where light/dark rendering differs structurally
- **Responsive plan** (all non-admin routes — mandatory): confirm 375px wireframe is in step 1 and was designed mobile-first. The mobile wireframe must explicitly address: (1) which multi-column grids collapse to single column and how cell content remains readable at the reduced width; (2) how hero/header sections reflow — multi-column header layouts must not simply compress, they must redesign to vertical stack; (3) which card labels are at risk of truncation and how operationally critical text is preserved; (4) primary CTA visible above fold at 375px without scrolling; (5) all navigation reachable at 375px.
- **Selector strategy**: define `data-attribute` names for all stateful elements (badges, rows, dialogs) that Phase 4 Playwright e2e will need. These are part of the implementation contract
- **State coverage**: confirm loading, empty, error, partial, 403 states are all in step 1 wireframe. Missing state = incomplete wireframe
- **Pattern consistency**: confirm step 0 check was completed; no new pattern introduced without explicit justification

**New criteria (4):**
- **Eye-path declaration** (mandatory): identify the element with maximum visual weight in the wireframe. Document the intended reading path: "eye goes to [X] → [Y] → [Z]". If a decorative element dominates the hierarchy: FAIL — redesign before proceeding.
- **Typography scale declaration** (mandatory for new pages): for every text region in the wireframe, declare explicitly: size token + weight + line-height + role (heading/body/label/caption). "Uses text-sm" without further context is not acceptable.
- **Touch target floor** (mandatory for non-admin routes): every interactive element must be ≥ 44×44px (WCAG 2.5.5). Icon-only buttons, links in dense lists, tab elements: all must declare their touch area explicitly in the design contract.
- **Component state spec** (mandatory for every new component): document default → hover → focus → active → disabled → loading → error states. "Shadcn standard style" is not sufficient for custom interactions — each state must be specified.

---

### Step 6 — Persist design contract

Append the approved wireframe (ASCII) and UX rationale to the session file (`.claude/session/block-[name].md`) before proceeding. This ensures the design contract survives `/compact` and remains the Phase 2 reference.

---

### Step 7 — STOP

Present: wireframe + HTML preview + UX rationale + component map + Design Quality Gate checklist (all 10 criteria addressed).

Wait for an execution keyword (`Esegui` · `Procedi` · `Confermo` · `Execute` · `Proceed`) before proceeding to Phase 2.

Switch back to Sonnet (`/model sonnet`) only after the user confirms.

**The approved output is the implementation contract — Phase 2 must match it.**
