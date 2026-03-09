# Context File Review Checklist

Executed in **Phase 8.5** at the end of every block.
Each check has a specific, verifiable pass/fail condition.
**The phase is complete only when all checks are ✅ — not when the review "seems thorough".**

---

## C1 — Security: no credentials in auto-memory

**What**: grep for token/secret patterns in the auto-memory MEMORY.md.
**Run**: `grep -in "sbp_[a-z0-9]\{10,\}\|sk_live_[a-z0-9]\|SUPABASE_ACCESS_TOKEN.*sbp_\|RESEND_API_KEY.*re_" ~/.claude/projects/-Users-MarcoG-Projects-staff-manager/memory/MEMORY.md`
**Pass**: 0 matches (placeholder strings like `sbp_...` or `re_...` with no further characters are allowed).
**Fail**: redact immediately → replace value with `...see .env.local` → remind user to rotate the exposed credential.
**Note**: `must_change_password`, `password=false` in code examples are NOT credentials — they are property names. The grep targets actual token strings (minimum 10 chars after the prefix).

---

## C2 — Language: no Italian in internal explanatory text

**Scope**: every non-code-block line in CLAUDE.md and auto-memory MEMORY.md.
**Allowed Italian**: DB column names, enum values (`IN_ATTESA`, `APPROVATO`), route paths (`/compensi`), UI labels inside quotes.
**Flag** Italian words that are clearly explanatory prose, not quoted values. Key indicators:
`obbligatori`, `opzional`, `rimozione`, `rimosso`, `aggiunto`, `aggiornato`, `necessario`, `corretto`, `utilizza`, `gestisce`, `nota bene`, `attenzione`, `verificare`

**Run on CLAUDE.md**: `grep -n "obbligatori\|opzional\|rimozione\|rimosso\|aggiornato\|necessario\|utilizza\|gestisce" CLAUDE.md`
**Run on auto-memory**: same grep on `~/.claude/projects/.../memory/MEMORY.md`
**Pass**: 0 matches, or all matches are inside quoted Italian UI strings or DB values.
**Fail**: translate flagged text to English.

---

## C3 — Field name staleness (CLAUDE.md)

**What**: every DB field name mentioned in CLAUDE.md must exist in the current schema.
**Run**: `ls supabase/migrations/ | tail -1` to identify the latest migration, then read it to confirm any field referenced in CLAUDE.md is current.
**Specific risk pattern**: field renames across blocks. After each block that renames a DB column: immediately update every mention in CLAUDE.md.

**Pass**: all field names in CLAUDE.md match the current schema.
**Fail**: update the field name and add the rename to Known Patterns if non-obvious.

---

## C4 — Stale block references (CLAUDE.md + auto-memory)

**What**: references like "(Block N)", "(optional, Block N)", "from Block N" must not describe closed blocks as if they are open or future.
**Run on CLAUDE.md**: `grep -n "Block [0-9]" CLAUDE.md`
**Run on auto-memory**: `grep -n "Block [0-9]" ~/.claude/projects/.../memory/MEMORY.md`
**Pass**: every match is either a historical note in past tense ("renamed in Block 3") or references a genuinely open block.
**Fail**: remove forward-looking block references for closed blocks; convert to past tense if the historical context is useful.

---

## C5 — MEMORY.md qualifier completeness (pipeline.md)

**What**: every mention of "MEMORY.md" in pipeline.md must be unambiguous about which file is meant.
**Run**: `grep -n "MEMORY\.md" .claude/rules/pipeline.md`
**Pass**: every match contains one of: `(project root)`, `auto-memory`, or is wrapped in backticks as a filename reference within a code block.
**Fail**: add the appropriate qualifier.

---

## C6 — No duplication: auto-memory vs CLAUDE.md

**What**: a pattern in auto-memory that has become a stable project truth belongs in CLAUDE.md, not in both files.
**Check method**: read the "Key technical patterns" section of auto-memory and the "Known Patterns" section of CLAUDE.md side by side.
**Pass**: no entry is substantially identical in both files (same pattern + same fix + same context).
**Fail**: remove from auto-memory; CLAUDE.md is the canonical location for stable patterns.

---

## C7 — Size compliance

**Run**: `wc -l MEMORY.md` (project root) and `wc -l ~/.claude/projects/.../memory/MEMORY.md` (auto-memory)
**Pass**: both files < 150 lines.
**Fail**: extract oldest or least-referenced patterns into a topic file under `.claude/` and replace the section with a link.

---

## C8 — files-guide.md path accuracy

**What**: every file path listed in the "Automatically loaded" tree must exist on disk and be correct.
**Run**: for each path in the tree, `ls [path]` or Glob to confirm existence.
**Also check**: the `CLAUDE.local.md` "Current content" description must match what `.claude/CLAUDE.local.md` actually contains. If the file's purpose has changed, update the description.
**Pass**: all paths resolve; description matches reality.
**Fail**: correct the path or update the description.

---

## C9 — Active plan currency (project-root MEMORY.md)

**What**: the Active plan table must reflect the actual state of the project at the time of the current commit.
**Check each row**:
- Status `🔄 in progress` → is it genuinely still in progress, or was it completed in this block?
- Status `✅` → was it committed and verifiable in the implementation checklist?
- Description → does it accurately describe what happened, not what was planned?
**Pass**: every row is accurate as of the last `git push`.
**Fail**: update status and/or description before closing the session.

---

## C10 — Dead file references (cross-doc)

**What**: file paths referenced in context docs must exist on disk. Any `docs/*.md` or `.claude/*.md` path mentioned in CLAUDE.md, pipeline.md, or refactoring-backlog.md that no longer exists is a silent broken pointer.
**Run**:
```
grep -oE "docs/[a-z A-Z0-9_-]+\.md|\.claude/[a-zA-Z0-9/_-]+\.md" \
  CLAUDE.md .claude/rules/pipeline.md docs/refactoring-backlog.md
```
For each path found, verify it exists: `ls [path]`.
**Pass**: all referenced paths resolve.
**Fail**: remove or update the stale reference before closing.

---

## C11 — Refactoring backlog: completed items

**What**: items in `docs/refactoring-backlog.md` that correspond to work completed in the current block must be removed. Completed items inflate the backlog and dilute attention on real open issues.
**Run**: read the current block's Log row in `docs/implementation-checklist.md`. Grep `docs/refactoring-backlog.md` for any ID or topic that matches completed work (e.g. shadcn migration → UI1/UI2/UI3; dead code removed → N1).
**Pass**: no completed item remains open in the priority index or detail sections.
**Fail**: remove from priority index table AND delete the corresponding detail section.

---

## Execution order and completion condition

Run C1 → C2 → C3 → C4 → C5 → C6 → C7 → C8 → C9 → C10 → C11 in sequence.
Apply any fixes found before moving to the next check.
**The phase is complete when C1–C11 have all passed.** Then run `/compact`.

> If a check reveals a pattern worth adding to CLAUDE.md or auto-memory, add it before C6 (duplication check) so the dedup pass catches any overlap.
