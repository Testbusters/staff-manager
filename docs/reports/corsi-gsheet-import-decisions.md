# Block `corsi-gsheet-import` - Decisions Report

**Date**: 2026-04-13
**Block**: corsi-gsheet-import
**Branch**: worktree-corsi-gsheet-import
**Migration**: 069_lezioni_materie_array_and_corsi_unique.sql
**Scope owner**: stakeholder directive dated 2026-04-13 (Phase 8 step 9)

This report captures every stakeholder- and architect-level decision made during Phases 1-2 of the block, so that future blocks touching corsi, lezioni, or admin imports have a durable record of *why* the code looks as it does.

---

## Part 1 - Scope decisions (Phase 1)

Fifteen decisions confirmed through the scope sweep. Each is stated as answered, with the rationale captured where the question was non-obvious.

### I1 - GSheet layout: one tab per corso

**Decision**: the source GSheet uses one tab per corso. Tab name maps to the corso identifier (`codice_identificativo`). Columns A-E carry per-lezione data (data, ora_inizio, ora_fine, modalita, materia). Columns G-H carry corso-level metadata (nome_corso, community).
**Rationale**: matches how the operations team already organises the spreadsheet. Moving to a flat "one row per lezione" format would have required rebuilding every existing template.

### I2 - Per-materia split in valutazioni

**Decision**: when a lezione covers multiple materie, the valutazione bucket is split per materia. Iterate each lezione's `materie[]` array and contribute one count per (docente, ruolo, materia) triple. The 80% docente threshold is computed against `lezioni-con-quella-materia`, not total lezioni.
**Rationale**: a docente who taught 10 M&F lessons has in fact taught 10 Matematica AND 10 Fisica - not 10 of an unspecified combined bucket. Single-bucket counting under-rewarded cross-materia teachers.

### I3 - Candidature overlap filter limited to `docente_lezione`

**Decision**: the materie overlap check applies only to candidature with `tipo='docente_lezione'`. Q&A (`tipo='qa'`) and CoCoD'à (`tipo='cocoda'`) candidature are not filtered by materia. On no overlap: API returns 422 with descriptive error.
**Rationale**: Q&A is a general tutoring role; CoCoD'à is organisational. Only teaching requires materia competence. Filtering Q&A would block legitimate candidates.

### I4 - Service-role insert bypasses E17 email

**Decision**: the import runs as service role and inserts corsi directly into the DB. The E17 "nuovo corso in città" email is suppressed by default - the admin decides per-run via a `notify: boolean` body param (default `false`).
**Rationale**: bulk imports can create 15+ corsi at once. Sending E17 by default would flood collaborators in every affected city. Opt-in preserves the per-corso notification behaviour when needed.

### I5 - Best-effort rollback on lezione failure

**Decision**: if the corso row is inserted successfully but one or more of its lezioni fail, CASCADE-delete the corso row (which removes the orphan parent) and record an ERROR entry for that tab. Do not retry the tab automatically.
**Rationale**: a corso without lezioni is a broken record that pollutes the UI. Full rollback at run level was rejected as too coarse - one bad tab would abort the other 16. Per-tab atomicity strikes the right balance.

### I6 - Città `ASSEGNAZIONE` maps to NULL

**Decision**: when a tab's G8 cell contains the sentinel `ASSEGNAZIONE`, the corso is inserted with `citta = NULL`. Any other unknown city value produces an ERROR entry.
**Rationale**: the ops team uses `ASSEGNAZIONE` to mean "city not yet assigned - to be set later by the responsabile cittadino". This is operationally common during planning.

### I7 - Modalità validated case-insensitive against enum

**Decision**: `modalita` values from the sheet are trimmed and lowercased, then matched against the existing enum (`in_presenza`, `online`, `ibrido`). Out-of-enum values produce an ERROR entry for the tab.
**Rationale**: manual data entry produces "Online", "ONLINE", " online " - strict match would reject all of them. Normalising protects against cosmetic variance without loosening the enum.

### I8 - Materia lookup strict per-community

**Decision**: materie in the sheet are normalised (Title Case, see Q3a override) and looked up in `lookup_options` filtered by the tab's community. Mismatch produces ERROR.
**Rationale**: TB and P4M have different materia catalogs. A "Farmacologia" lesson tagged for TB is an error, not a cross-community signal.

### I9 - Date parser strict `DD <mese_it> YYYY`

**Decision**: lezione dates are parsed with the strict pattern `D[D] <italian-month-name> YYYY` (e.g. `15 marzo 2026`). Missing year, missing day, or unknown month produces ERROR.
**Rationale**: the sheet template forces this format. Accepting ambiguous variants (`15/3/26`, `15-mar`) would hide typos that matter for calendar rendering.

### I10 - Idempotency via TO_PROCESS/PROCESSED marker + UNIQUE

**Decision**: idempotency is enforced at two levels: (a) a sheet cell marker flipped from `TO_PROCESS` to `PROCESSED` after each successful tab; (b) a DB-level `UNIQUE` constraint on `corsi.codice_identificativo`. Re-running the import skips PROCESSED tabs; even if the marker were lost, the UNIQUE constraint prevents duplicates.
**Rationale**: belt-and-suspenders. The sheet marker gives human-readable progress; the UNIQUE constraint gives correctness.

### I11 - Sheet ID via env var with hardcoded fallback

**Decision**: the sheet ID comes from `IMPORT_CORSI_SHEET_ID` env var. If unset, fall back to the hardcoded value `1UC8LXU430ks0CXWnjmzI2SDlWFYYcf8eKbVb6wHFwAk` (staging sheet). Production will override via env on Vercel.
**Rationale**: lets staging and production point at different sheets without code changes, while keeping the default useful for local dev.

### I12 - Admin-only endpoint

**Decision**: `POST /api/admin/import-corsi/run` is admin-only. No responsabile, no collaboratore.
**Rationale**: bulk creation with side effects (potential mass email notification) is an admin operation. Responsabili can still create individual corsi from the UI.

### I13 - Error reporting per tab, not per cell

**Decision**: errors are reported at tab granularity. The response body lists `{ tab: 'X', status: 'ERROR', reason: '...' }` per failed tab. Per-cell errors (e.g. lezione 3 malformed) surface as a tab-level ERROR with the failing row identified in the reason string.
**Rationale**: finer granularity complicates the response shape and the UI table. Tab-level is the unit the ops team edits in.

### I14 - Community name case-insensitive

**Decision**: community names in the sheet (`testbusters`, `Peer4Med`, `PEER4MED`) are matched case-insensitively against `communities.name`.
**Rationale**: same as I7 - manual entry variance.

### I15 - Writeback batched into a single batchUpdate

**Decision**: at the end of the run, all PROCESSED marker writes are coalesced into a single `sheets.spreadsheets.values.batchUpdate` call rather than one call per tab.
**Rationale**: reduces Google API quota pressure and latency on a 17-tab run. Partial writeback failure is acceptable because the DB-level UNIQUE constraint (I10) is the authoritative idempotency guard.

---

## Part 2 - Architectural decisions (Phase 1.5)

Five decisions made by the Plan subagent during design review. Alphabetised as A-E.

### A - Shared helper extraction: `lib/google-sheets-shared.ts`

**Decision**: extract `getToken()` and `pemToDer()` from `lib/google-sheets.ts` into a new file `lib/google-sheets-shared.ts`. Refactor `lib/google-sheets.ts`, `lib/contratti-import-sheet.ts`, `lib/cu-import-sheet.ts`, and the new `lib/corsi-import-sheet.ts` to import from there.
**Alternatives considered**:
- *Duplicate auth code into the new file*: rejected - 4 copies of the same JWT signing logic was already a smell before this block.
- *Absorb everything into `lib/google-sheets.ts`*: rejected - the file was already ~300 lines and growing.
**Rationale**: three existing importers shared the same auth preamble. A block that adds a fourth consumer is the right moment to extract.

### B - Pre-emptive cross-tab duplicate scan

**Decision**: before inserting any corso, the import scans all TO_PROCESS tabs upfront and collects their `codice_identificativo` values. Any duplicate across tabs produces ERROR on both tabs pre-emptively (not during insert).
**Alternatives considered**:
- *Let the UNIQUE constraint reject the second insert*: rejected - the first duplicate would be inserted and the second marked ERROR, producing asymmetric results for a symmetric problem.
- *Deduplicate silently (first-wins)*: rejected - silent data loss. The ops team needs to see both tabs flagged so they can decide which one is correct.
**Rationale**: the pre-emptive scan is O(n) and runs once; the alternative has non-deterministic behaviour depending on tab order.

### C - Per-tab service-role insert (bypass RLS)

**Decision**: the import endpoint uses the service role client for all corsi/lezioni inserts, bypassing `corsi_insert` and `lezioni_insert` RLS policies.
**Alternatives considered**:
- *Insert under the admin's JWT*: rejected - `corsi_insert` policy is scoped to responsabile_cittadino by default (city-level); admin insertion would require a new RLS branch.
- *Add a service-role-only policy*: rejected - service role bypasses RLS anyway; adding a policy just for this is noise.
**Rationale**: the API route performs explicit admin-role verification before the service-role call. This is the same pattern used by ticket routes (CLAUDE.md "Ticket service role" known pattern).

### D - Shared `MateriaBadges` component

**Decision**: introduce `components/MateriaBadges.tsx` with signature `<MateriaBadges materie={string[]} />`. Use it at every site that renders lezione materie (LezioniTab* variants, CorsiCalendario, AssegnazioneRespCittPage).
**Alternatives considered**:
- *Inline `.map()` at every call site*: rejected - six call sites would each drift from each other on spacing, wrap behaviour, and colour mapping.
- *Extend the existing Badge component with an array variant*: rejected - would pollute a generic component with domain-specific `MATERIA_COLORS` lookup.
**Rationale**: six call sites plus the shared `MATERIA_COLORS` map make the abstraction cheap and obvious.

### E - Upfront prefetch of communities and materie

**Decision**: `runImport()` prefetches all communities (name → id map) and all materie lookup_options (community × name → normalised value map) once at the start of the run, then performs all per-tab lookups against these in-memory maps.
**Alternatives considered**:
- *Query on demand per-tab*: rejected - a 17-tab run would issue 17-34 redundant queries for data that does not change during the run.
- *Cache with TTL in Redis*: rejected - over-engineered for a route called by one admin at a time.
**Rationale**: flat latency cost, zero cache-coherency concerns (the run is short enough that real-time mutation during the run is implausible).

---

## Part 3 - Q3a override: Title Case for materie

**Background**: during Phase 1.5 risk catalog (R1), the Plan subagent proposed normalising materie to UPPER_SNAKE_CASE to match the project convention for enum values.

**Override decision**: materie are normalised to **Title Case** (e.g. `Matematica`, `Fisica`, `Logica`) rather than UPPER_SNAKE_CASE.

**Rationale**: the existing `lookup_options` rows (migration 054) already store materie in Title Case and the UI renders them verbatim. Forcing UPPER_SNAKE_CASE would have required either (a) migrating 5+ existing materie rows per community, breaking the collaborator profile `materie_insegnate` TEXT[] foreign-key-like references, or (b) a display-time reverse mapping adding complexity with no user-visible benefit. Materia names are proper nouns displayed to users - Title Case is the natural form.

**Consequence**: the enum-values convention (`UPPER_SNAKE_CASE`, CLAUDE.md "Coding Conventions") does not apply to materie strings. This is an explicit, documented exception for human-facing lookup values. No other enum in the project follows this exception.

---

## Part 4 - Deviations discovered in Phase 2

Two deviations from the approved plan emerged during implementation. Both were flagged under the Plan Deviation Protocol (pipeline.md Phase 2) and resolved with the user before continuing.

### D1 - Multi-materia requires `lezioni_materie_nonempty` CHECK

**Planned**: rename `lezioni.materia TEXT` to `lezioni.materie TEXT[]` with `NOT NULL` and `DEFAULT '{}'` dropped after migration.
**Actual**: the `NOT NULL` alone does not prevent empty arrays - an empty `{}` satisfies `NOT NULL`. Added an explicit CHECK constraint:
```sql
ALTER TABLE lezioni ADD CONSTRAINT lezioni_materie_nonempty
  CHECK (array_length(materie, 1) >= 1);
```
**Why it matters**: without the CHECK, an empty materie array would bypass the Zod `.min(1)` in the API (since RLS policies or direct DB writes could circumvent it). The CHECK is a defence-in-depth guarantee that every lezione has at least one materia, regardless of entry point.

### D2 - Candidature route was partially shared with Q&A and CoCoD'à branches

**Planned**: add a materie-overlap check to `app/api/candidature/route.ts` (POST).
**Actual**: the route already branched on `tipo` to enforce other rules (member_status, assegnazione capacity). The new overlap check was added as an additional branch, gated explicitly on `tipo === 'docente_lezione'`. The lezione's materie are fetched inside the branch, and the collaboratore's `materie_insegnate` comes from the existing auth fetch - no new query needed in the common path.
**Why it matters**: keeps the fast path (Q&A, CoCoD'à) unchanged and avoids a second DB round-trip for roles that do not require the check.

---

## Part 5 - Risk register (catalogued Phase 1.5, outcomes Phase 2-5)

Nine risks were identified during Plan subagent review. All are recorded here for post-mortem reference.

| # | Risk | Severity | Outcome |
|---|---|---|---|
| R1 | Materia normalisation case mismatch with existing DB rows | High | Resolved via Q3a override (Title Case). No data migration needed. |
| R2 | Test fixtures still reference `materia: 'X'` (scalar) | Medium | 9 test files mechanically refactored to `materie: ['X']`. `npx vitest run` green. |
| R3 | Default-on E17 notification would spam collaborators on bulk runs | High | `notify: boolean` defaulted to `false`. Admin UI exposes an opt-in toggle. |
| R4 | Google Sheets API 429 on sustained load | Medium | Exponential backoff retry in `lib/corsi-import-sheet.ts`. Single `batchUpdate` at end reduces call volume. |
| R5 | PostgREST `.eq('materia', x)` breaks silently on TEXT[] column | High | Refactored `app/api/corsi/[id]/valutazioni/route.ts` to `.contains('materie', [x])`. Verified in Phase 3 tests. |
| R6 | Cross-tab duplicate `codice_identificativo` causes asymmetric insert | Medium | Pre-emptive scan (Decision B). Both duplicates flagged ERROR symmetrically. |
| R7 | Partial insert (corso OK, lezioni fail) leaves orphan corso row | Medium | Best-effort CASCADE delete (Decision I5). ERROR row emitted. |
| R8 | Admin UI lacks feedback during long runs | Low | Deferred to post-block; synchronous fetch is acceptable for MVP (17 tabs runs in ~20s). Tracked as DEV-* entry in refactoring-backlog.md if needed. |
| R9 | Google service account JSON credential size bloats Vercel env limits | Low | Existing helper already consumes it; no change. Monitored. |

---

## Part 6 - Open questions for UAT (Phase 5c / 6)

Questions deferred to manual verification. These are not blockers but will inform the Phase 6 checklist:

1. **Performance ceiling**: does a 50-tab run (hypothetical scaling) complete within the Vercel function timeout (300s default on Fluid Compute)? Current staging sheet has 17 tabs; scaling headroom is not tested.
2. **Writeback partial failure UX**: if Google Sheets `batchUpdate` partially fails, the DB is authoritative but the sheet shows stale TO_PROCESS. Should the next run detect this drift and emit a warning row? Deferred - not observed in staging runs so far.
3. **Admin E17 toggle discoverability**: the "Notifica collaboratori" switch is OFF by default. A less-experienced admin might assume notifications always fire. Consider a tooltip on the next UI iteration.
4. **Materie chip wrapping in CorsiCalendario**: dense monthly cells with multi-materia lezioni may overflow. Phase 5c visual check will confirm.
5. **Q&A candidature without materia filter**: confirmed as by design (I3), but worth flagging to stakeholders in case the behaviour surprises them (a Q&A docente in Biology can legitimately candidate for a Mathematics Q&A session).

---

## Provenance

- **Source plan**: `/Users/MarcoG/.claude/plans/velvety-plotting-flame.md`
- **Implementation plan reminder (stakeholder directive 2026-04-13)**: generate this report as Phase 8 step 9.
- **Related documents updated in this block**:
  - `docs/prd/prd.md` v2.7 (FR-IMP-07, FR-CORSI-31, FR-CORSI-13 revised)
  - `docs/contracts/corsi-fields.md` (materie TEXT[], codice_identificativo UNIQUE, Import Source section)
  - `docs/entity-manifest.md` (Corsi: added /api/admin/import-corsi/run + /import tab)
  - `docs/sitemap.md` (/import tabs: 3 → 4)
  - `docs/db-map.md` (Last synced: migration 069)
  - `docs/migrations-log.md` (069 entry)
