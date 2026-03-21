---
name: ux-audit
description: Analyse user experience quality of staff-manager flows. Simulates real user journeys per role using Playwright, then evaluates task completion, interaction consistency, feedback clarity, navigation structure, and cognitive load. Produces a severity-ranked report (Critical / Major / Minor) with concrete fix suggestions. Requires npm run dev on localhost:3000. Use /ui-audit for token/component compliance, /responsive-audit for layout at breakpoints.
user-invocable: true
model: sonnet
context: fork
argument-hint: [flow:<flow-id>|role:<role>|full]
allowed-tools: Read, Glob, Grep, mcp__playwright__browser_navigate, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_snapshot, mcp__playwright__browser_type, mcp__playwright__browser_click, mcp__playwright__browser_wait_for, mcp__playwright__browser_evaluate, mcp__playwright__browser_fill_form, mcp__playwright__browser_press_key
---

## Mode detection

Check `$ARGUMENTS`:
- Empty / not provided → **standard mode** — run all Priority 1 flows (P1) for all roles
- `flow:<id>` → run a specific flow only (e.g. `flow:rimborso-nuovo`)
- `role:<role>` → run all flows for a specific role (e.g. `role:collab`)
- `full` → run all flows including Priority 2

Announce at start: `Running ux-audit in [STANDARD | FLOW:<id> | ROLE:<role> | FULL] mode.`

---

## Step 1 — Load architecture context

Read in parallel:
1. `docs/sitemap.md` — full route inventory, sub-hierarchies, role mapping, test accounts
2. `docs/ui-components.md` — component contracts (Dialog patterns, form structures)

From sitemap sub-hierarchies, build a mental model of:
- What tabs exist per page
- What states each page can be in (empty, loading, error, data)
- What actions are available per role

---

## Step 2 — Pre-flight check

Navigate to `http://localhost:3000`. If not reachable:
> ❌ Dev server not running. Start with `npm run dev` then re-run `/ux-audit`.

---

## Step 3 — UX evaluation framework

Apply these 6 dimensions to every flow simulated:

| Dimension | Question | What to look for |
|---|---|---|
| **D1 — Task completion** | Can the user finish the task without confusion? | Dead ends, missing CTAs, ambiguous button labels |
| **D2 — Interaction consistency** | Do similar operations work the same way across sections? | CRUD patterns in compensi vs rimborsi vs ticket vs contenuti |
| **D3 — Feedback clarity** | Does the user always know what happened? | Toast presence/absence, loading states, success/error messaging |
| **D4 — Navigation clarity** | Does the user always know where they are? | Page titles, breadcrumbs, back affordances, active state in sidebar |
| **D5 — Cognitive load** | How many decisions or pieces of info per screen? | Form fields per step, actions per card, info density |
| **D6 — Error recovery** | When something goes wrong, is the path forward clear? | Validation messages, retry affordances, empty state guidance |

Severity scale:
- **Critical** — user cannot complete a core task (blocker)
- **Major** — user is confused or slowed significantly (friction)
- **Minor** — small inconsistency or suboptimal pattern (polish)

---

## Step 4 — Flow catalog

### Priority 1 flows (always run in standard mode)

#### F1 — Collaboratore: apertura rimborso
**Role**: collab · **Credential**: collaboratore_tb_test@test.com / Testbusters123
**Steps**:
1. Login → `/`
2. Navigate to `/rimborsi`
3. Click "Nuova rimborso" (or equivalent CTA)
4. Fill form: importo, descrizione, data, tipo
5. Attach file (if field present — skip upload, verify field is visible)
6. Submit
7. Verify: redirect or modal close + success feedback + record appears in list

**Evaluate**: D1 (can user find the CTA?), D3 (success toast present?), D5 (how many fields?), D6 (what if required field missing — validation message clear?)

#### F2 — Collaboratore: consultazione comunicazioni
**Role**: collab · **Credential**: collaboratore_tb_test@test.com / Testbusters123
**Steps**:
1. Navigate to `/comunicazioni`
2. Click first communication card
3. Read detail at `/comunicazioni/[id]`
4. Navigate back

**Evaluate**: D4 (is there a back affordance?), D2 (does detail page match eventi/[id] and opportunita/[id] patterns?)

#### F3 — Collaboratore: apertura ticket
**Role**: collab · **Credential**: collaboratore_tb_test@test.com / Testbusters123
**Steps**:
1. Navigate to `/ticket`
2. Click "Nuovo ticket"
3. Fill: oggetto, categoria, descrizione
4. Submit
5. Verify: redirect to ticket detail + status APERTO visible

**Evaluate**: D1, D3, D5 (form length appropriate?), D2 (consistent with rimborso form?)

#### F4 — Responsabile: consultazione compensi
**Role**: resp · **Credential**: responsabile_compensi_test@test.com / Testbusters123
**Steps**:
1. Login → `/`
2. Navigate to `/approvazioni`
3. Verify Compensi tab is default active
4. Inspect a compensation row — check available info (collaboratore, importo, stato, data)
5. Switch to Rimborsi tab
6. Verify read-only state (no approve/reject buttons visible — resp cannot approve)

**Evaluate**: D2 (is the read-only constraint clearly communicated?), D4 (is the active tab visually clear?), D5 (info density per row appropriate?)

#### F5 — Collaboratore: dashboard orientation
**Role**: collab · **Credential**: collaboratore_tb_test@test.com / Testbusters123
**Steps**:
1. Login → `/`
2. Observe dashboard: what is shown first?
3. Interact with DashboardUpdates tabs (Documenti / Eventi / Comunicazioni / Opportunità)
4. Check if any CTA on dashboard leads to the correct section

**Evaluate**: D1 (can user understand what to do from the dashboard?), D4 (is current section clear from sidebar?), D5 (info density — too much / too little?)

### Priority 2 flows (full mode only)

#### F6 — Responsabile: creazione compensation
**Role**: resp
**Steps**: `/approvazioni` → Carica → GSheet URL input → preview → confirm
**Evaluate**: D1 (is the import path discoverable?), D3 (feedback on each step?), D6 (what if GSheet URL is wrong?)

#### F7 — Collaboratore: firma documento
**Role**: collab
**Steps**: `/profilo?tab=documenti` → find DA_FIRMARE document → open → sign flow → verify FIRMATO state
**Evaluate**: D1 (is the signing CTA prominent enough?), D3 (progress during multi-step sign flow?), D6 (what if signature invalid?)

#### F8 — Multi-role: gestione ticket (resp view)
**Role**: resp
**Steps**: `/ticket` → open an existing ticket → reply → change status
**Evaluate**: D2 (does resp chat view match admin's — consistency?), D3 (reply confirmation?), D4 (clear indicator of role capability — can resp close a ticket?)

#### F9 — Collaboratore: notifiche
**Role**: collab
**Steps**: Click bell icon → see notification list → click notification → verify redirect to correct entity
**Evaluate**: D1 (is the notification item actionable — clear link?), D3 (unread vs read visual distinction clear?), D4 (landing page after click — correct context?)

#### F10 — Collaboratore: opportunità + sconti
**Role**: collab
**Steps**: `/opportunita` → switch between tabs → open detail → back
**Evaluate**: D2 (are the two content types visually distinct enough?), D4 (tab switching clear?)

---

## Step 5 — Flow simulation

For each flow in scope:

1. **Setup**: Login with correct credentials (reuse session if same role as previous flow)
2. **Execute steps** as listed, taking a screenshot at each significant state change:
   - Initial page load
   - After each interaction (form open, field filled, submitted, redirected)
   - Error state (if triggerable without data setup)
3. **Measure**:
   - Click count to complete task (target: ≤ 3 for primary actions)
   - Form field count (target: ≤ 6 for a single form without stepper)
   - Redirect count (target: ≤ 1 after submission)
4. **Evaluate** against D1–D6 dimensions, noting severity per finding

### Session management
```
Login helper:
1. browser_navigate http://localhost:3000/login
2. If at /: check sidebar for correct role indicator
   - If wrong role: find "Esci" in sidebar → click → confirm → wait for /login
3. browser_type email field
4. browser_type password field
5. browser_click submit
6. browser_wait_for url contains localhost:3000/
```

---

## Step 6 — Analysis pass

After simulation, for each flow apply a structured analysis:

**Per dimension (D1–D6)**:
- What did you observe?
- Does it meet the expectation for that dimension?
- If not: what is the specific friction point?
- What is the severity (Critical / Major / Minor)?
- What is the concrete fix?

**Cross-flow consistency check**:
- Compare F1 (rimborso) with F3 (ticket) — do both new-record forms have the same pattern? (CTA placement, field order, submit label, post-submit behavior)
- Compare F2 (comunicazioni detail) with F7 (documento detail) — do both detail pages have equivalent back navigation?
- Compare CRUD in `/contenuti` tabs — do all 5 tabs (Comunicazioni, Risorse, Eventi, Opportunità, Sconti) follow the same interaction pattern for create/edit/delete?

---

## Step 7 — Report

```
## UX Audit — [DATE] — [MODE]
### Reference: docs/sitemap.md · flows F[N]–F[N]
### Scope: task completion · consistency · feedback · navigation · cognitive load · error recovery
### Out of scope: token compliance → /ui-audit | Responsiveness → /responsive-audit

---

### Executive summary

| Severity | Count | Top issue |
|---|---|---|
| Critical | N | [one-line description] |
| Major | N | [one-line description] |
| Minor | N | [one-line description] |

---

### Flow results

#### F[N] — [Flow name] — [Role]
- **Task completion**: [steps taken] / [click count] clicks
- **Outcome**: ✅ Completed without friction / ⚠️ Completed with friction / ❌ Could not complete

**Findings:**

| # | Dimension | Severity | Observation | Fix |
|---|---|---|---|---|
| UX-[N] | D[N] — [name] | Critical/Major/Minor | [what was observed] | [concrete suggestion] |

**Screenshots**: [list filenames]

---

[Repeat for each flow]

---

### Cross-flow consistency gaps

| Pattern | Routes compared | Gap | Severity |
|---|---|---|---|
| [e.g. New record CTA] | /rimborsi/nuova vs /ticket/nuova | [difference] | Minor |

---

### Prioritised fix list

Order by severity, then by impact (flows affected):

1. **[UX-N]** · Critical · [one-line fix description]
2. **[UX-N]** · Major · [one-line fix description]
...

---

### What's working well
[2–4 positive observations — patterns that are clear, consistent, and worth preserving]
```

---

## Step 8 — Final offer

After the report:

> "Vuoi approfondire qualche finding specifico? Posso:
> - **Design via Figma MCP**: leggere le Foundation TB (`get_variable_defs` su file `p9kUAQ2qNVg4PojTBEkSmC`) e proporre un redesign del flusso critico fedele al design system reale
> - **Wireframe ASCII**: proporre il design dettagliato per un fix via `/frontend-design`
> - Eseguire un flow aggiuntivo (elenca il flow con i passi)
> - Comparare due sezioni specifiche per consistenza
> - Generare una checklist di fix da integrare nel backlog (`docs/refactoring-backlog.md`)"

**Do NOT apply code changes directly.** UX findings must be validated with the user before implementation — they often require design decisions, not just code fixes.
