---
name: arch-audit
description: Audit the Claude Code architecture files against latest Anthropic documentation and release notes, AND verify internal ecosystem consistency. Run weekly to maintain compliance, catch new features, and keep the project's context system clean and efficient.
user-invocable: true
model: sonnet
context: fork
effort: high
---

You are performing a weekly architecture compliance and internal consistency audit for the staff-manager project. Execute all steps below in order.

## Step 1 — Fetch latest Anthropic documentation

> **Parallelism**: Steps 1 and 2 have no data dependency. Launch the Step 1 research agent first (async), then begin Step 2 file reads in the main context immediately — do not wait for the agent to complete before reading local files.

Launch a single research agent **(model: haiku)** to fetch ALL of the following URLs and extract key changes:

- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/settings
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/mcp
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/slash-commands
- https://code.claude.com/docs/en/release-notes/overview
- https://github.com/anthropics/claude-code/releases (latest 5 releases)
- https://docs.anthropic.com/en/docs/about-claude/models (latest model IDs and deprecation notices)
- https://code.claude.com/docs/en/best-practices

From each Claude Code source extract: new keys/features, deprecations, breaking changes, best practice updates.
From the models page extract: current model IDs for Opus/Sonnet/Haiku, any deprecation dates announced.
From the prompting guide sources extract: principles for system prompt design, instruction clarity, context management, and what Anthropic explicitly discourages in long instruction files.

**URL resilience**: if any URL returns 404, try the canonical base `https://code.claude.com/docs/en/` to locate the current path. Note in the report if a URL changed. Do not skip a topic because one URL failed — find the current equivalent page.

**Expected current model IDs** (as of last research — verify against the models page):
- Opus: `claude-opus-4-6`
- Sonnet: `claude-sonnet-4-6`
- Haiku: `claude-haiku-4-5-20251001`
- Deprecated: `claude-3-haiku-*` and `claude-3-5-haiku-*` (deprecation: April 19, 2026)

Flag any changes to this list in the report.

## Step 2 — Read current architecture files (run in parallel with Step 1)

Read these files in parallel while the Step 1 agent runs:
- `CLAUDE.md`
- `.claude/rules/pipeline.md`
- `.claude/rules/context-review.md`
- `.claude/rules/claudemd-standards.md` ← normative baseline for P1–P5 compliance checks
- `.claude/settings.json`
- `.claude/files-guide.md`
- `.claude/cheatsheet.md`
- `.claude/agents/dependency-scanner.md`
- `~/.claude/projects/-Users-MarcoG-Projects-staff-manager/memory/MEMORY.md`
- All `.claude/skills/*/SKILL.md` files (11 skills: arch-audit, api-design, perf-audit, resend-verify, security-audit, ui-audit, responsive-audit, ux-audit, visual-audit, skill-dev, skill-db)

## Step 3 — Anthropic compliance gap analysis

Compare Step 1 findings against Step 2 state. For each gap found, classify it:

**AUTO-FIX** — apply directly without asking:
- Deprecated keys in settings.json with a direct replacement
- New settings keys that are clearly beneficial and low-risk (token efficiency, attribution)
- Stale file paths or descriptions in files-guide.md
- New hook events or agent frontmatter fields that improve existing patterns
- Deprecated model IDs in SKILL.md files or settings.json

**RECOMMEND** — list for user review, do not apply:
- Structural changes (splitting files, new directories)
- New features requiring user decision (sandbox, new MCP servers)
- Changes that could affect existing workflow behavior
- Anything touching the pipeline phase gates

## Step 3b — Internal ecosystem consistency checks

**Execution strategy — two tiers**:
- **Grep-tier** (pure pattern matching, no judgment): C2, C4, C6, C9, C10, C11, C12, C13, C14, C15, C16, C17 — batch into a **single haiku subagent** that runs all commands and returns structured pass/fail results.
- **Judgment-tier** (require file reading + interpretation): C1, C3, C5, C7, C8 — run in main context using files already read in Step 2.

**Grep-tier batch** — invoke one Agent with `model: "haiku"`, pass these exact commands, and receive one structured result:

| Check | Command | Pass condition |
|---|---|---|
| C2 | `grep -rn "backlog-refinement" .claude/skills/ .claude/cheatsheet.md` | 0 matches |
| C4 | `grep -n "ln -s" .claude/rules/pipeline.md` | 0 matches |
| C6 | `grep -A3 "Phase 5b" .claude/rules/pipeline.md \| grep -i "dev\|server\|localhost"` | ≥1 match |
| C9 | `grep -c "\*\*\* STOP" .claude/rules/pipeline.md` | ≥5 |
| C10 | `grep -n "Worktree isolation" .claude/rules/pipeline.md` | ≥1 match |
| C11 | `for skill_dir in .claude/skills/*/; do name=$(basename "$skill_dir"); grep -q "$name" .claude/cheatsheet.md && echo "OK: $name" \|\| echo "MISSING: $name"; done` | 0 MISSING lines |
| C12 | `grep -o "SessionStart\|PostCompact\|InstructionsLoaded" .claude/settings.json \| sort -u` | 3 lines |
| C13 | `grep -rL --include="SKILL.md" "context: fork" .claude/skills/` | 0 files returned |
| C14 | `git check-ignore -q CLAUDE.md && echo "PASS" \|\| echo "FAIL"` | PASS |
| C15 | `wc -l CLAUDE.md \| awk '{print $1}'` | ≤200 |
| C16 | `grep -rn "claude-3-haiku\|claude-3-5-haiku\|claude-3-opus\|claude-3-sonnet\|claude-3-5-sonnet" .claude/skills/ .claude/settings.json` | 0 matches |
| C17 | `for f in .claude/skills/*/SKILL.md; do if grep -q "mcp__" "$f" && ! grep -q "allowed-tools:" "$f"; then echo "MISSING allowed-tools: $f"; fi; done` | 0 MISSING lines |

Collect batch results, then run judgment-tier checks below. For each FAIL: classify as AUTO-FIX or RECOMMEND using the same criteria as Step 3.

**C1 — Deploy information currency (CLAUDE.md)**
Check: does the `## Tech Stack → Deploy` entry describe the actual deploy platform?
Expected: Vercel + `staff-staging.peerpetual.it` / `staff.peerpetual.it`. Any mention of "Replit" = FAIL.

**C2 — Skill output file references (all skills + cheatsheet)**
Check: no skill SKILL.md or cheatsheet.md must reference `docs/backlog-refinement.md` — the correct output path for all audit findings is `docs/refactoring-backlog.md`.
Run: `grep -rn "backlog-refinement" .claude/skills/ .claude/cheatsheet.md`
Expected: 0 matches. Any match = FAIL.
AUTO-FIX: replace every `backlog-refinement.md` → `refactoring-backlog.md` occurrence in all matching files.

**C3 — files-guide.md: CLAUDE.local.md description is not live state**
Check: does the CLAUDE.local.md section in files-guide.md contain specific current content descriptions (e.g. "Phase 4/5 suspended") rather than a generic description of the file's purpose?
Expected: generic description only. Specific current content = FAIL (live state in static doc).

**C4 — settings.json ↔ pipeline.md worktree symlink alignment**
Check: `settings.json` has `worktree.symlinkDirectories: ["node_modules", ".next"]`. Pipeline.md Phase 0 worktree setup must NOT contain a manual `ln -s` command for node_modules.
Run: `grep -n "ln -s" .claude/rules/pipeline.md`
Expected: 0 matches. Any `ln -s` = FAIL (redundant, potentially conflicting with auto-symlink).

**C5 — CLAUDE.md Worktree Known Pattern: reflects standard (not optional) usage**
Check: does the "Worktree setup" Known Pattern in CLAUDE.md describe worktrees as the **standard pattern for all functional blocks** (not just parallel development)?
Expected: language like "standard pattern for all functional blocks". Language implying optional/parallel-only = FAIL.

**C6 — Phase 5b dev server prerequisite**
Check: does Phase 5b in pipeline.md contain an explicit prerequisite to verify `npm run dev` is running before fixture setup?
Run: `grep -A3 "Phase 5b" .claude/rules/pipeline.md | grep -i "dev\|server\|localhost"`
Expected: at least one mention. Missing = FAIL.

**C7 — Cross-file path references (dead pointers)**
For each file path mentioned in CLAUDE.md and pipeline.md that is a docs/ or .claude/ path, verify the file exists.
Check these paths: `docs/requirements.md`, `docs/implementation-checklist.md`, `docs/refactoring-backlog.md`, `docs/migrations-log.md`, `docs/entity-manifest.md`, `docs/prd/prd.md`, `docs/prd/01-rbac-matrix.md`, `docs/profile-editing-contract.md`, `docs/ui-components.md`, `docs/design-system.md`, `docs/sitemap.md`, `docs/dependency-map.md`, `docs/db-map.md`, `.claude/rules/pipeline.md`, `.claude/rules/context-review.md`, `.claude/agents/dependency-scanner.md`, `.claude/files-guide.md`, `.claude/cheatsheet.md`.
Also verify directories: `docs/contracts/` and `.claude/skills/`.
Run: `ls docs/requirements.md docs/implementation-checklist.md docs/refactoring-backlog.md docs/migrations-log.md docs/entity-manifest.md docs/prd/prd.md docs/prd/01-rbac-matrix.md docs/profile-editing-contract.md docs/ui-components.md docs/design-system.md docs/sitemap.md docs/dependency-map.md docs/db-map.md .claude/rules/pipeline.md .claude/rules/context-review.md .claude/agents/dependency-scanner.md .claude/files-guide.md .claude/cheatsheet.md 2>&1 && ls -d docs/contracts/ .claude/skills/ 2>&1`
Expected: all paths resolve. Any "No such file or directory" = FAIL.

**C8 — Interaction Protocol present in CLAUDE.md**
Check: does CLAUDE.md contain a `## Interaction Protocol — Plan-then-Confirm` section with execution keywords defined?
Run: `grep -n "Interaction Protocol" CLAUDE.md`
Expected: at least 1 match. Missing = FAIL.

**C9 — Pipeline STOP gate integrity**
Check: pipeline.md must contain at least 5 `*** STOP` markers (Phase 1, Phase 1.5, Phase 1.6, Phase 6, Phase 8 worktree cleanup).
Run: `grep -c "\*\*\* STOP" .claude/rules/pipeline.md`
Expected: ≥ 5. Fewer = FAIL (gate was accidentally removed).

**C10 — Worktree isolation rule present in Cross-Cutting**
Check: pipeline.md Cross-Cutting Rules must contain the "Worktree isolation (hard rule)" entry prohibiting staging merges before Phase 8.
Run: `grep -n "Worktree isolation" .claude/rules/pipeline.md`
Expected: at least 1 match. Missing = FAIL.

**C11 — Cheatsheet skill registry completeness**
Check: every directory under `.claude/skills/` must have a corresponding entry in `.claude/cheatsheet.md`.
Run: `for skill_dir in .claude/skills/*/; do name=$(basename "$skill_dir"); grep -q "$name" .claude/cheatsheet.md && echo "OK: $name" || echo "MISSING: $name"; done`
Expected: all lines show "OK". Any "MISSING" = FAIL.
AUTO-FIX: add a minimal row to the "Custom Skills" table in cheatsheet.md for any missing skill.

**C12 — settings.json hook integrity and hook type coverage**
Check: `.claude/settings.json` must contain all 3 essential hooks: `SessionStart` (audit overdue reminder), `PostCompact` (CLAUDE.local.md restore reminder), `InstructionsLoaded` (debug log).
Run: `grep -o "SessionStart\|PostCompact\|InstructionsLoaded" .claude/settings.json | sort -u`
Expected: 3 lines (SessionStart, PostCompact, InstructionsLoaded). Any missing = FAIL.
RECOMMEND if failing — do not auto-fix (hooks require verifying intent before restoring).

Additionally (judgment check in main context): verify that the hook configurations use the appropriate hook type. Claude Code supports 4 hook types — `command`, `http`, `prompt`, and `agent`. For reference:
- `command` — runs a shell command, captures stdout for injection
- `http` — calls a URL endpoint with event data as JSON body
- `prompt` — injects a text message into the conversation
- `agent` — spawns an agent to handle the hook event
Flag any hook that uses `command` type but would benefit from `prompt` type (simpler config, no shell needed for static reminders), or vice versa.

Also flag any of the following new events from recent Claude Code releases that the project might benefit from adding:
- `WorktreeCreate` / `WorktreeRemove` — auto-setup / teardown logic when worktrees change
- `SubagentStart` / `SubagentStop` — logging or context injection for subagent calls
- `PreCompact` — save critical in-progress state before context compression
- `TaskCompleted` — post-completion summary or notification
- `FileChanged` — lint/format trigger on file write
These are RECOMMEND, not AUTO-FIX.

**C13 — context: fork on all skills**
Check: every skill SKILL.md must declare `context: fork` so audits run in an isolated context and do not pollute the main session window.
Run: `grep -rL --include="SKILL.md" "context: fork" .claude/skills/`
Expected: 0 files returned. Any returned file path = FAIL.
AUTO-FIX: insert `context: fork` after the `model: sonnet` line in any failing skill.

**C14 — CLAUDE.md is gitignored**
Check: `CLAUDE.md` must be listed in `.gitignore` (project convention: personal CLAUDE.md is never committed — exposes internal context, causes commit history pollution).
Run: `git check-ignore -q CLAUDE.md && echo "PASS" || echo "FAIL"`
Expected: "PASS" (exit 0 — file is ignored). "FAIL" = FAIL.
RECOMMEND if failing — do not auto-fix (requires user to add `CLAUDE.md` to `.gitignore` explicitly).

**C15 — CLAUDE.md line budget**
Check: CLAUDE.md must stay within 200 lines. Beyond this threshold, Anthropic's own research shows instruction adherence degrades — lower-priority rules get silently ignored (hard auto-truncation at 200 lines per Claude Code docs).
Run: `wc -l CLAUDE.md | awk '{print $1}'`
Expected: ≤ 200. Any count above 200 = WARN.
RECOMMEND if failing: invoke P1 and P5 to identify sections to remove or convert to `@import` references. Do not auto-fix — pruning requires judgment.

**C16 — Deprecated model IDs**
Check: no SKILL.md file or `.claude/settings.json` should reference model IDs from Claude 3 family (deprecated or retiring). Deprecated as of April 19, 2026: `claude-3-haiku-*`, `claude-3-5-haiku-*`. Also check for any `claude-3-opus-*` or `claude-3-sonnet-*` references (superseded by claude-4.x family).
Run: `grep -rn "claude-3-haiku\|claude-3-5-haiku\|claude-3-opus\|claude-3-sonnet\|claude-3-5-sonnet" .claude/skills/ .claude/settings.json`
Expected: 0 matches. Any match = FAIL.
AUTO-FIX: replace deprecated model IDs with the current equivalents:
- `claude-3-haiku-*` or `claude-3-5-haiku-*` → `claude-haiku-4-5-20251001`
- `claude-3-opus-*` → `claude-opus-4-6`
- `claude-3-sonnet-*` or `claude-3-5-sonnet-*` → `claude-sonnet-4-6`

**C17 — `allowed-tools` frontmatter on MCP-dependent skills**
Check: any SKILL.md that calls `mcp__*` tools in its instructions must declare those tools in `allowed-tools:` frontmatter. This ensures Claude requests the correct permissions upfront before the skill runs, preventing mid-execution permission prompts.
Run: `for f in .claude/skills/*/SKILL.md; do if grep -q "mcp__" "$f" && ! grep -q "allowed-tools:" "$f"; then echo "MISSING allowed-tools: $f"; fi; done`
Expected: 0 MISSING lines. Any match = FAIL.
AUTO-FIX: for each failing skill, read the `mcp__*` tool names from its body and add `allowed-tools: [mcp__tool1, mcp__tool2, ...]` to its frontmatter after the `context:` line.

## Step 3c — Anthropic Prompting Guide compliance

Using the prompting guide content fetched in Step 1 **and the normative baseline in `.claude/rules/claudemd-standards.md`** (read in Step 2), evaluate `CLAUDE.md`, `pipeline.md`, and `context-review.md` against best practices. The standards file is the local stable reference — use it as the primary benchmark; live-fetched docs confirm it's still current. These checks are judgment-based — classify each as PASS or WARN (not hard FAIL), and always RECOMMEND, never auto-fix.

**Standards file currency check (run first)**: compare the `Last verified` date in `.claude/rules/claudemd-standards.md` against today's date. If > 30 days old AND Step 1 fetched new material changes → flag as RECOMMEND to update the standards file. If ≤ 30 days → skip.

**P1 — CLAUDE.md content type (Anthropic's inclusion test)**
Anthropic's rule: CLAUDE.md should contain ONLY non-obvious information Claude cannot infer by reading the code. Apply Anthropic's own test to every section: *"Would removing this cause Claude to make mistakes?"*

Flag as WARN if a section:
- Describes what a file does structurally (e.g. "file X handles Y") without explaining a non-obvious constraint — Claude can read the code
- States a standard convention Claude already knows without a project-specific reason
- Contains tutorial-style explanations of concepts (React, TypeScript, SQL) that Claude understands natively
- Describes current session state or temporary phase status (this belongs in CLAUDE.local.md or MEMORY.md)

Report: list any sections that fail the test with a suggested action (remove, condense, or move to a more appropriate file).

**P2 — Instruction clarity and actionability**
Anthropic's guidance: instructions must be specific, actionable, and unambiguous. A vague rule gives Claude discretion where a concrete rule would remove ambiguity.

Flag as WARN:
- Directives with no measurable outcome ("be thorough", "be careful", "verify appropriately")
- Instructions that say "ensure X" without specifying how to verify X
- Rules with implicit scope ("update relevant files") where an explicit list would prevent errors

Report: flagged instances with suggested sharper wording.

**P3 — Structural redundancy across instruction files**
Redundancy dilutes attention. If a rule appears in both CLAUDE.md and pipeline.md with no clear canonical source, Claude may apply it inconsistently — or the longer file may suppress the shorter one.

Check: read "Known Patterns" in CLAUDE.md and "Cross-Cutting Rules" in pipeline.md side-by-side. Also check for overlap between context-review.md checks and arch-audit C1–C17.

Flag as WARN: any rule stated substantively in two files where one should be canonical.

Report: duplicates with a recommendation on which file is the correct owner.

**P4 — Pipeline complexity proportionality**
Anthropic's principle: instruction complexity should be proportional to the actual risk and value it protects against. Over-specified pipelines make Claude slower and more likely to get stuck on process rather than output.

Evaluate:
- Are there phases (or sub-phases) whose STOP gate catches errors that have actually occurred in practice? Or are they theoretical?
- Does the Fast Lane meaningfully simplify, or does it mostly duplicate the full pipeline?
- Are there context-review checks (C1–C12) that have never caught a real issue — suggesting they address a risk that doesn't materialize?
- Does the total length of pipeline.md + context-review.md stay within a range where Claude can hold the key constraints in working context?

Report: any phase or check that appears to add friction without demonstrated value → RECOMMEND for review or consolidation. Note: do NOT recommend removing STOP gates without strong evidence of zero value — gates protect against irreversible actions.

**P5 — Long context structure and scannability**
Anthropic guidance for long system prompts: critical rules should be visually distinct and easy to locate. Recency and position matter — Claude gives more weight to recent context.

Check:
- Are the most-critical, most-referenced rules (RBAC, worktree isolation, migration isolation, environment isolation) marked as CRITICAL or placed at the top of their sections?
- Is CLAUDE.md structured so Claude can find a rule without reading the entire file?
- Are there sections that are rarely referenced but consume significant token space in every context window?

Report: structural improvements for scannability → RECOMMEND.

## Step 3d — Token & subagent optimization checks

These checks audit the project's own efficiency at model selection and subagent delegation. Regressions here increase cost and latency without improving output quality. Judgment-based where noted; mechanical checks reuse the grep-tier haiku batch from Step 3b.

**T1 — Research agent model in arch-audit Step 1**
Check: does the Step 1 instruction in this SKILL.md specify `model: haiku` for the research agent?
Batch command: `grep -n "model.*haiku\|haiku.*model" .claude/skills/arch-audit/SKILL.md`
Expected: at least 1 match in the Step 1 section. Missing = FAIL.
AUTO-FIX: add `(model: haiku)` to the research agent invocation in Step 1.

**T2 — Haiku model on all Explore subagents across skills**
Check: every "Launch ... Explore subagent" instruction in all SKILL.md files must explicitly name `model: haiku`.
Batch command: `grep -rn "Explore subagent" .claude/skills/*/SKILL.md | grep -v "model.*haiku\|haiku"`
Expected: 0 matches (all invocations already name haiku). Any match = FAIL.
AUTO-FIX: append `(model: haiku)` to the invocation description in each failing line.

**T3 — Phase 5d Playwright concurrency note**
Check: does pipeline.md Phase 5d document that `/ui-audit` (static, no Playwright by default) can run concurrently with Playwright-based skills, and that `/visual-audit`, `/ux-audit`, `/responsive-audit` must run sequentially (shared MCP Playwright session)?
Batch command: `grep -A30 "Phase 5d" .claude/rules/pipeline.md | grep -i "concurrent\|parallel\|sequenti\|playwright.*conflict\|conflict.*playwright"`
Expected: at least 1 match. Missing = WARN.
RECOMMEND if failing: add a note to Phase 5d: "Run `/ui-audit` concurrently with the first Playwright skill launch. Run `/visual-audit` → `/ux-audit` → `/responsive-audit` sequentially — they share the MCP Playwright session and cannot run in parallel."

**T4 — shadcn MCP referenced in CLAUDE.md and cheatsheet**
Check: CLAUDE.md references the shadcn MCP for component lookup; cheatsheet.md lists it in the MCP Servers table.
Batch commands:
- `grep -n "shadcn MCP\|shadcn.*mcp\|mcp.*shadcn" CLAUDE.md`
- `grep -n "shadcn" .claude/cheatsheet.md`
Expected: ≥1 match in each file. Missing from either = FAIL.
AUTO-FIX: add shadcn MCP reference where missing. CLAUDE.md: in the shadcn/ui Component Map note — "For components not yet in the map: query the **shadcn MCP** (configured globally) for up-to-date component docs and props before writing native HTML." Cheatsheet: add row `| **shadcn** | Component docs, props, install commands — use before writing any new UI component |` to the MCP Servers table.

**T5 — Skill model fitness (judgment)**
For each skill, verify `model:` frontmatter fits the task's reasoning requirement:
- `model: haiku` appropriate for: mechanical structural checks, pure grep/pattern matching, URL text extraction, formatting validation
- `model: sonnet` appropriate for: cross-file judgment, complex analysis, fix application, multi-dimension scoring
- `model: opus` appropriate for: screenshot-based visual reasoning, multi-role journey simulation, live aesthetic scoring — requires vision + deep analysis

Current expected state:
| Skill | Expected | Rationale |
|---|---|---|
| arch-audit | sonnet | Complex judgment, cross-doc analysis, AUTO-FIX application |
| ui-audit | sonnet | Design system judgment, visual compliance scoring |
| ux-audit | opus | Multi-flow simulation + live screenshot analysis — visual reasoning requires Opus |
| visual-audit | opus | 7-dimension aesthetic scoring + screenshot analysis — visual reasoning requires Opus |
| security-audit | sonnet | Exploit reasoning, authorization analysis |
| api-design | sonnet | REST pattern judgment + internal haiku Explore agent |
| perf-audit | sonnet | Bundle analysis, server/client boundary judgment + internal haiku Explore agent |
| skill-dev | sonnet | Coupling/abstraction judgment + internal haiku Explore agent |
| skill-db | sonnet | Schema normalization + RLS reasoning + internal haiku Explore agent |
| responsive-audit | opus | Multi-viewport screenshot judgment — visual reasoning requires Opus |
| resend-verify | sonnet | Delivery verification, MCP tool orchestration, template content inspection |

Batch command: `grep -A1 "^name:" .claude/skills/*/SKILL.md | grep "model:"` — compare each result against the table above.
FAIL: any skill using `model: haiku` as top-level model (only Explore *subagents within* skills should use haiku, not the skill itself).
WARN: any skill using `model: opus` **unless** it is one of the three visual/UX skills (`visual-audit`, `ux-audit`, `responsive-audit`) — these intentionally use Opus for screenshot-based visual reasoning. All other skills should use sonnet.

## Step 4 — Apply AUTO-FIX changes

For each AUTO-FIX from Step 3 and Step 3b: apply the change, note the file and line modified.

## Step 5 — Update timestamp

```bash
date +%s > ~/.claude/projects/-Users-MarcoG-Projects-staff-manager/last-audit
```

## Step 6 — Produce audit report

Output a structured report in this exact format:

```
## Arch Audit — [DATE]
### Claude Code version checked: [version from changelog/releases]
### Current model IDs verified: Opus=[id] · Sonnet=[id] · Haiku=[id]

### ✅ Auto-fixed ([N] changes)
- [file]: [what changed and why]

### 📋 Recommendations ([N] items)
- [Priority: High/Medium/Low] [description] — [why it matters]

### ✓ Compliant (no action needed)
- [area]: [brief confirmation]

### Ecosystem consistency (C1–C17) — grep-tier via haiku batch, judgment-tier in main context
- C1 Deploy currency: [PASS/FAIL]
- C2 Skill output refs: [PASS/FAIL — batch]
- C3 files-guide static: [PASS/FAIL]
- C4 Symlink alignment: [PASS/FAIL — batch]
- C5 Worktree standard: [PASS/FAIL]
- C6 Dev server prereq: [PASS/FAIL — batch]
- C7 Dead path refs: [PASS/FAIL — list any missing paths]
- C8 Interaction Protocol: [PASS/FAIL]
- C9 STOP gate count: [PASS/FAIL — actual count — batch]
- C10 Worktree isolation: [PASS/FAIL — batch]
- C11 Cheatsheet coverage: [PASS/FAIL — list missing skills if any — batch]
- C12 Hook integrity: [PASS/FAIL — list missing hooks if any + new events worth adding]
- C13 context:fork coverage: [PASS/FAIL — list missing skills if any — batch]
- C14 CLAUDE.md gitignored: [PASS/FAIL — batch]
- C15 CLAUDE.md line budget: [PASS/WARN — actual line count — batch]
- C16 Deprecated model IDs: [PASS/FAIL — list any found — batch]
- C17 allowed-tools frontmatter: [PASS/FAIL — list missing skills if any — batch]

### Prompting compliance (P1–P5) — judgment-based, PASS/WARN only
- P1 CLAUDE.md content type: [PASS/WARN — list any sections failing Anthropic's inclusion test]
- P2 Instruction clarity: [PASS/WARN — list any vague or unmeasurable directives]
- P3 Structural redundancy: [PASS/WARN — list any rules duplicated across files]
- P4 Pipeline complexity: [PASS/WARN — list any phases with unclear value]
- P5 Long context structure: [PASS/WARN — list any scannability or positioning issues]

### Token & subagent optimization (T1–T5)
- T1 Research agent model: [PASS/FAIL — haiku specified in Step 1]
- T2 Explore subagent model: [PASS/FAIL — all haiku, list any missing]
- T3 Phase 5d Playwright concurrency: [PASS/WARN]
- T4 shadcn MCP referenced: [PASS/FAIL — CLAUDE.md / cheatsheet]
- T5 Skill model fitness: [PASS/FAIL/WARN — list any mismatches]

### Next audit due: [DATE + 7 days]
```

If no gaps are found: output "Architecture fully compliant as of [DATE]. No changes needed." and still update the timestamp.
