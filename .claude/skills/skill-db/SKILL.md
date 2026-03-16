---
name: skill-db
description: Database schema and query quality audit for staff-manager. Reviews normalization, index coverage, RLS completeness, constraint gaps, N+1 query patterns in API routes, and data type choices. Uses docs/db-map.md as authoritative schema reference. Outputs findings to docs/backlog-refinement.md.
user-invocable: true
model: sonnet
---

You are performing a database quality audit of the staff-manager Supabase/PostgreSQL schema.

**Critical constraints**:
- `docs/db-map.md` is the authoritative schema reference. Read it first — do NOT query the live DB to discover schema unless verifying a specific detail.
- `docs/sitemap.md` provides the API route inventory for checking query patterns.
- Do NOT make schema changes. Audit only.
- All findings go to `docs/backlog-refinement.md`.

---

## Step 1 — Read schema reference

Read `docs/db-map.md` in full. Note:
- Tables and their key columns
- FK graph
- Existing indexes
- RLS summary and flagged gaps
- Ownership patterns

Also read `docs/refactoring-backlog.md` and current `docs/backlog-refinement.md` to avoid duplicate reporting.

Output: structured understanding of schema. Do not proceed until complete.

---

## Step 2 — Schema quality checks (main context)

**S1 — Missing indexes on common filter columns**
Cross-reference the "Missing indexes" section of `db-map.md` with query patterns described in the sitemap. For each table frequently filtered/ordered by a column not in the index list, flag it.

Priority columns to verify:
- `compensations.data_competenza` — date range filters in export
- `expense_reimbursements.data_spesa` — date filters
- `notifications.created_at` — recency ordering in bell + page
- `tickets.last_message_at` — recency sort
- `feedback.created_at` — admin list ordering

**S2 — Normalization issues**
Check for:
- Repeated denormalized data (e.g. `last_message_author_name` on `tickets` — denormalized from auth.users)
- Fields stored as `text` that should be an enum or FK (e.g. `stato` on all state machines — text instead of ENUM type)
- `jsonb` columns used as arrays when a junction table would be cleaner (`community_ids UUID[]` on content tables)

For each: assess trade-off. The `community_ids[]` pattern is intentional (documented in CLAUDE.md) — note it as known, not a violation.

**S3 — Missing NOT NULL constraints**
From `db-map.md`, identify columns that are `is_nullable=YES` but should logically never be null in a valid record (e.g. `compensations.importo_lordo`, `collaborators.data_ingresso` for active users).
Flag as Medium if the column is used in calculations without null guards in application code.

**S4 — RLS gap analysis**
From the "⚠️ RLS gaps" section of `db-map.md`, evaluate each flagged gap:

1. `communications.announcements_admin_write` grants ALL to `responsabile_compensi` — verify if intended (responsabili CAN publish announcements per requirements) or accidental over-grant.
2. `compensation_attachments.comp_attachments_own_insert` — no WITH CHECK clause. Can any authenticated user insert attachments for any compensation?
3. `expense_attachments.exp_attachments_own_insert` — same.
4. `ticket_messages.ticket_messages_insert` — no WITH CHECK. Any authenticated user can post to any ticket.

For each: query the live DB to confirm the policy definition, then assess actual exploitability.

**S5 — data type choices**
Flag questionable data type choices:
- State machine columns stored as `text` (no ENUM constraint) — risk of invalid values inserted
- `ritenuta_acconto` stored as `numeric` (correct) vs percentage (verify: is it 20 or 0.20?)
- `community_ids UUID[]` on content tables — no FK enforcement, silent invalid UUIDs possible

**S6 — Cascade behavior**
For each FK in the FK graph, verify delete cascade behavior. Flag any FK without explicit ON DELETE handling where orphaned records are a risk (e.g. if a `collaborator` is deleted, what happens to `compensations`?). Query: check `pg_constraint` for `confdeltype`.

---

## Step 3 — API query pattern check (Explore agent)

Launch a **single Explore subagent** (model: haiku) to check API routes for query anti-patterns.

File scope: all files in `app/api/` (from sitemap.md API routes list).

"Run these 4 checks on the provided API route files:

**CHECK Q1 — N+1 queries in list endpoints**
Pattern: a `.from(table).select(...)` inside a `.map(` callback or `for` loop.
Grep: `\.from\(` inside `\.map\(|for\s*\(|forEach\(`
Flag: each match with file:line.

**CHECK Q2 — Missing await on Supabase calls**
Pattern: `supabase.from(` or `svc.from(` not preceded by `await` or `.then(`.
Grep: `[^await\s]svc\.from\(|[^await\s]supabase\.from\(`
Flag: each match.

**CHECK Q3 — Select * (unbounded column fetch)**
Pattern: `.select('*')` in API routes — fetches all columns including potentially sensitive ones.
Grep: `\.select\('\*'\)`
Flag: each match. Evaluate if the route returns the full object to the client.

**CHECK Q4 — Missing error handling on DB writes**
Pattern: `await svc.from(table).insert/update/delete(` without a subsequent `if (error)` check.
Grep: `await svc\.from\(.*\)\.(insert|update|delete)` — flag any call not followed within 3 lines by `if.*error` or `.catch`.
Flag: each match."

---

## Step 4 — Live DB verification (targeted)

Run these queries against the staging DB (project_id: `gjwkvgfwkdwzqlvudgqr`) to verify specific concerns:

```sql
-- Cascade behavior on collaborators FK
SELECT
  c.conname,
  c.confrelid::regclass AS referenced_table,
  c.conrelid::regclass AS table_name,
  CASE c.confdeltype
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
  END AS on_delete
FROM pg_constraint c
WHERE c.contype = 'f'
  AND c.confrelid = 'collaborators'::regclass
ORDER BY c.conrelid::regclass::text;
```

```sql
-- Verify ritenuta_acconto scale (is it 20 or 0.20?)
SELECT MIN(ritenuta_acconto), MAX(ritenuta_acconto), AVG(ritenuta_acconto)
FROM compensations
WHERE ritenuta_acconto IS NOT NULL;
```

```sql
-- Check for invalid stato values (text instead of ENUM risk)
SELECT stato, COUNT(*) FROM compensations GROUP BY stato ORDER BY stato;
SELECT stato, COUNT(*) FROM expense_reimbursements GROUP BY stato ORDER BY stato;
SELECT stato, COUNT(*) FROM tickets GROUP BY stato ORDER BY stato;
```

---

## Step 5 — Produce report and update backlog

### Output format

```
## Skill-DB Audit — [DATE]

### Schema Checks
| # | Check | Verdict | Notes |
|---|---|---|---|
| S1 | Missing indexes | ✅/⚠️ | [columns flagged] |
| S2 | Normalization | ✅/⚠️ | |
| S3 | Missing NOT NULL | ✅/⚠️ | |
| S4 | RLS gaps | ✅/⚠️ | |
| S5 | Data type choices | ✅/⚠️ | |
| S6 | FK cascade behavior | ✅/⚠️ | |

### Query Pattern Checks (API routes)
| # | Check | Matches | Verdict |
|---|---|---|---|
| Q1 | N+1 queries | N | ✅/⚠️ |
| Q2 | Missing await | N | ✅/⚠️ |
| Q3 | Select * | N | ✅/⚠️ |
| Q4 | Missing error handling | N | ✅/⚠️ |

### Findings requiring action ([N] total)
[table/file — issue — impact — suggested fix]
```

### Write to backlog

For each finding with severity Medium or above, append to `docs/backlog-refinement.md`:
- Assign ID: `DB-[n]`
- Add row to priority index
- Add full detail section

### Severity guide
- **Critical**: RLS gap that allows unauthorized data access; cascade DELETE that would destroy live data
- **High**: Missing index on a column with >1000 rows filtered frequently; N+1 on a list endpoint
- **Medium**: Text stato without ENUM constraint; missing NOT NULL on a logically required column
- **Low**: Normalization opportunity with known trade-off; missing index on a low-traffic column

---

## Execution notes

- Do NOT apply migrations or modify the schema.
- Do NOT report gaps already documented in `db-map.md` "⚠️ RLS gaps" section unless you have new evidence of actual exploitation risk.
- If `docs/db-map.md` is not in the worktree, read from `/Users/MarcoG/Projects/staff-manager/docs/db-map.md`.
- After the report, ask: "Vuoi che prepari le migration SQL per i fix identificati?"
