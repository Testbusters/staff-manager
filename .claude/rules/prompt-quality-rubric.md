---
name: prompt-quality-rubric
description: Reference spec for the UserPromptSubmit quality gate hook (T1-T5). Hook suspended 2026-03-30 — CLAUDE.md Interaction Protocol handles vague prompts; only factual check hook active. Restore from this file when re-enabling.
type: project
---

# Prompt Quality Rubric

> **STATUS: SUSPENDED as of 2026-03-30**
> The T1-T5 quality gate prompt hook has been removed from `.claude/settings.json`.
> **Why**: the gate was blocking ~90% of prompts including legitimate scoped requests, causing excessive friction.
> **What replaced it**: the existing CLAUDE.md Interaction Protocol (§ Plan-then-Confirm, point 3: "Flag missing information or unclear instructions — ask before acting") provides advisory behavior inline without blocking.
> **Still active**: factual check hook (premessa da verificare) + PreToolUse hard blocks (execute_sql on prod, git push to main/staging).
> **PreToolUse JSON format note**: the PreToolUse hard blocks use `exit 2` (shell exit code) to block — NOT the JSON `decision` field. If a future PreToolUse hook is added using JSON output, it MUST use `hookSpecificOutput.permissionDecision: "deny"` and `hookSpecificOutput.permissionDecisionReason: "..."` — the top-level `decision`/`reason` fields are deprecated for PreToolUse as of 2026-03-30.
> **To re-enable**: add the hook back to `settings.json` `UserPromptSubmit[0].hooks` array using the logic documented below. Run `validate-hooks.mjs` (recreate from this file's Calibration notes section) before going live.

Last updated: 2026-03-30 (suspended quality gate hook; factual check hook + PreToolUse hooks unchanged)

---

## STEP 1 — Bypass check (highest priority, overrides all triggers)

| Condition | Rationale |
|---|---|
| Prompt starts with «Procedi consapevolmente» | Explicit conscious bypass — user has already seen and acknowledged the quality gate block. Evaluated before any exclusion or trigger, regardless of what else the prompt contains (including scope wildcards or action verbs). |

This check is structurally separated from the exclusion list in the hook prompt to prevent model evaluation order issues (e.g. T3 wildcard firing before E5 is checked).

## STEP 2 — Exclusion conditions (any match → allow immediately)

| # | Condition | Rationale |
|---|---|
| E1 | Prompt is ≤8 words | Too short to be an unscoped action request; likely a keyword or follow-up |
| E2 | Prompt contains "?" | Research/question intent — no execution risk |
| E3 | Starts with read-only verb: mostrami, spiega, dimmi, elenca, trova, cerca, cos'è, come funziona, leggi, controlla, verifica, show, explain, what, describe, check, list, find, read | No write action implied |
| E4 | Contains a file path (has "/" or file extension .tsx .ts .sql .md .json .mjs) | Already scoped to a specific target |
| E5 | Is only an execution keyword: Procedi, Esegui, Confermo, Sì, Ok, Go ahead, Do it, Continua, Execute, Proceed, Confirmed, Vai, Yes | Pipeline execution flow — never block |

Note: E5 in previous versions was the "Procedi consapevolmente" bypass — this has been promoted to STEP 1. The old E6 (execution keywords) is now E5.

---

## STEP 3 — Trigger conditions (any match → block + educate)

| # | Condition | Rationale |
|---|---|---|
| T1 | Action verb + no explicit target | Claude cannot act safely without knowing WHAT to act on |
| T2 | Mentions auth/RLS/migrations/permissions/roles without a specific identifier | These are high-risk areas where ambiguity causes security or schema errors |
| T3 | Scope wildcard: tutto, tutti, ovunque, tutta l'app, all files, everything, everywhere, ogni componente, qualsiasi file, tutte le utenze, tutti gli utenti, tutte le rotte, tutta la codebase | Unbounded scope = unbounded blast radius |
| T4 | Irreversible operation (deploy, push, drop, delete, truncate) without execution keyword + phase context | Irreversible actions require explicit authorization |
| T5 | fix/risolvi/correggi/sistema/aggiusta without symptom, file, or expected behavior | Claude will guess the target — likely wrong or over-scoped |

**Action verbs for T1:** crea, modifica, elimina, applica, sposta, fix, update, remove, delete, deploy, aggiorna, cancella, rimuovi, aggiungi, sostituisci, refactora, migra

---

## CRITICAL OUTPUT RULES (enforced in hook prompt — do not remove)

These constraints are explicitly stated as `CRITICAL OUTPUT RULES` at the top of both hook prompts in `settings.json`. They exist to prevent Haiku from explaining its reasoning instead of executing the instruction.

| Rule | Applies to | Why |
|---|---|---|
| STEP 1 bypass match: output ONLY `{"ok": true}` — no explanation | Quality gate | Bypass is the highest-priority override; no reasoning allowed |
| STEP 2 exclusion match: output ONLY `{"ok": true}` — no explanation, no mention of the exclusion, no reasoning | Quality gate (T1-T5) | Haiku was returning `ok: false` with an English explanation of why E3 should have allowed the prompt, instead of silently returning `ok: true` |
| When no trigger matches: output ONLY `{"ok": true}` — nothing else | Quality gate (T1-T5) | Same "show your work" failure mode |
| Detect prompt language: English prompt → English response, Italian prompt → Italian response | Both hooks | Default fallback was Italian even for English prompts when Haiku reasoned outside the trigger branch |
| Single-line JSON only — no markdown, no code fences, no literal newlines in string values | Both hooks | Haiku sometimes wraps output in ```json``` fences or emits 0x0A newlines in string values, both causing JSON validation failure |

**Architectural note**: the factual check hook (`premessa da verificare`) has the same `CRITICAL OUTPUT RULES` header. Its reason field also uses ` · ` separators and `«»` for quoted keywords.

---

## Block output format

When a trigger fires, the hook returns a single-line JSON object (no newlines in string values — JSON spec requires escape sequences, Haiku sometimes emits literal newlines which break parsing):
```json
{
  "ok": false,
  "trigger": "T<N>: <one-line summary of matched condition>",
  "reason": "🚫 <trigger summary> · ❓ Mancante: <missing info> · ⚠️ Rischio: <risk> · 💡 Suggerimento: <rewritten prompt> · 🔓 Bypass: anteponi «Procedi consapevolmente — » al prompt originale e reinvia"
}
```

Displayed to the user as a single line:
```
Operation stopped by hook: 🚫 <trigger summary> · ❓ Mancante: ... · ⚠️ Rischio: ... · 💡 Suggerimento: ... · 🔓 Bypass: anteponi «Procedi consapevolmente — » al prompt originale e reinvia
```

**Format constraints (JSON safety)**:
- Separatore sezioni: ` · ` (middle dot) — non richiede escaping in JSON
- Quote attorno a keyword di bypass: `«»` (guillemets) — non richiedono escaping in JSON
- NO `\n` nelle istruzioni al modello — Haiku emette newline letterali invece di `\n`, rendendo il JSON invalido
- NO `\"` nelle istruzioni — il double-escaping `\\\"` causa backslash letterali nel testo che il modello vede

---

## Bypass mechanism

- The bypass is handled at the prompt level, not the hook level.
- User prepends `Procedi consapevolmente — ` to their original prompt (or types it alone as a follow-up).
- The hook fires again on the new prompt → STEP 1 bypass check matches → allowed through immediately, before any exclusion or trigger is evaluated.
- Claude proceeds with the full prompt as confirmed scope.
- Note: the colon variant (`Procedi consapevolmente: ...`) also matches STEP 1 since it starts with the prefix.
- **Why STEP 1 instead of E5**: previously the bypass was exclusion E5. Testing revealed that when the bypassed prompt also contained a T3 scope wildcard (e.g. `tutto`), Haiku evaluated T3 before E5 and returned `ok: false`. Promoting it to STEP 1 (structurally before EXCLUSION/TRIGGER) eliminates this race condition.

---

## Calibration notes

- **False positive risk**: T1 and T5 are the most likely to over-fire. If legitimate short commands are blocked, narrow the action verb list.
- **False negative risk**: T3 (wildcard scope) is the most likely to be missed if phrased unusually. Consider adding: tutto il codice, qualunque, any, all.
- **Review cadence**: reassess after 10 blocks. If >30% are bypassed with "Procedi consapevolmente", the rubric is too aggressive — loosen T1 or T5.
- **Validation**: `validate-hooks.mjs` (one-shot, deleted after run) tests 15 scenarios against the live Haiku model via the API. Re-create it if hook logic changes and run `node validate-hooks.mjs` before closing the session. API key source: macOS keychain `Claude Code-credentials` (JSON, `claudeAiOauth.accessToken`).
