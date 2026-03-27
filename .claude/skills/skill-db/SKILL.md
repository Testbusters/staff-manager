---
name: skill-db
description: Database schema and query quality audit for staff-manager. Reviews normalization, index coverage (including FK columns, partial indexes, GIN for arrays), RLS completeness and performance (function caching, TO clause, SELECT-before-UPDATE, views), constraint gaps, data type antipatterns (timestamp/timestamptz, varchar(n), serial vs identity), N+1 query patterns, and unbounded queries. Uses docs/db-map.md as authoritative schema reference. Outputs findings to docs/refactoring-backlog.md.
user-invocable: true
model: sonnet
context: fork
argument-hint: [target:section:<section>|target:table:<table>]
---

You are performing a database quality audit of the staff-manager Supabase/PostgreSQL schema.

## Step 0 — Target resolution

Parse `$ARGUMENTS` for a `target:` token.

| Pattern | Meaning |
|---|---|
| `target:section:corsi` | Focus on corsi/lezioni/candidature/assegnazioni/blacklist/allegati_globali tables (migrations 055–060) |
| `target:section:compensi` | Focus on compensations, expense_reimbursements, compensation_competenze |
| `target:section:contenuti` | Focus on content tables (comunicazioni, eventi, opportunita, sconti, risorse) |
| `target:table:<tablename>` | Focus on a specific table and its direct FKs |
| No argument | Full audit — all tables in db-map.md |

Announce: `Running skill-db — scope: [FULL | target: <resolved>]`
Apply the target filter to the schema analysis in Steps 2–4.

**Critical constraints**:
- `docs/db-map.md` is the authoritative schema reference. Read it first — do NOT query the live DB to discover schema unless verifying a specific detail.
- `docs/sitemap.md` provides the API route inventory for checking query patterns.
- `docs/prd/01-rbac-matrix.md` is the authority for expected role access — use it as the baseline for RLS policy completeness.
- Do NOT make schema changes. Audit only.
- All findings go to `docs/refactoring-backlog.md`.

---

## Step 1 — Read schema reference

Read `docs/db-map.md` in full. Note:
- Tables and their key columns (including nullable/NOT NULL status)
- FK graph (all FK relationships and referenced tables)
- Existing indexes (B-tree, GIN, partial)
- RLS summary and flagged gaps
- Ownership patterns (`user_id`, `collaborator_id`, `creator_user_id`)

Read `docs/prd/01-rbac-matrix.md` — extract the role × entity × action matrix. This is the baseline for S4 RLS completeness.

Read `docs/refactoring-backlog.md` to avoid duplicate reporting.

Output: structured understanding of schema. Do not proceed until complete.

---

## Step 2 — Schema quality checks (main context)

**S1 — Index coverage: filter columns + FK columns**

*Part A — Common filter columns*
Cross-reference the "Missing indexes" section of `db-map.md` with query patterns described in the sitemap. For each table frequently filtered/ordered by a column not in the index list, flag it.

Priority columns to verify:
- `compensations.data_competenza` — date range filters in export
- `expense_reimbursements.data_spesa` — date filters
- `notifications.created_at` — recency ordering in bell + page
- `tickets.last_message_at` — recency sort
- Any table with `ORDER BY created_at DESC` usage in API routes

*Part B — FK column coverage*
For every FK relationship in the FK graph, verify that the **child** FK column is indexed (parent primary keys are indexed by default — child columns must be explicitly indexed).
Unindexed FK columns cause sequential scans on every `ON DELETE` cascade and on every JOIN.
Run in Step 4 (live DB):
```sql
SELECT
  tc.conname AS fk_name,
  tbl.relname AS table_name,
  att.attname AS fk_column,
  idx.indexname AS index_name
FROM pg_constraint tc
JOIN pg_attribute att ON att.attrelid = tc.conrelid AND att.attnum = ANY(tc.conkey)
JOIN pg_class tbl ON tbl.oid = tc.conrelid
LEFT JOIN pg_indexes idx ON idx.tablename = tbl.relname
  AND idx.indexdef LIKE '%' || att.attname || '%'
WHERE tc.contype = 'f'
ORDER BY tbl.relname, att.attname;
```
Flag: any FK column where `index_name IS NULL`.

*Part C — Partial index opportunity on state machine columns*
Tables with `stato` columns (compensations, expense_reimbursements, tickets, documents, corsi, candidature) are frequently filtered by active states (`IN_ATTESA`, `DA_FIRMARE`, `APERTA`).
Check: does each such table have either (a) a B-tree index on `stato`, or (b) a partial index (e.g. `WHERE stato = 'IN_ATTESA'`)?
A full B-tree on `stato` has low cardinality and provides limited benefit. A partial index is preferable when the active-state subset is < 20% of rows.
Flag as Low: missing any index on state machine columns. Suggest partial index strategy.

*Part D — GIN index for UUID[] array columns*
`community_ids UUID[]` columns on content tables (comunicazioni, eventi, opportunita, sconti, risorse) cannot be efficiently queried with B-tree indexes.
Verify from `db-map.md` indexes section: do any content tables have GIN indexes on `community_ids`?
Note: in-memory filtering is currently used (documented in CLAUDE.md — not a violation), but if PostgREST array operators are ever used, a GIN index will be required.
Flag as Low if GIN index is absent, with a note that it becomes necessary if query strategy changes.

**S2 — Normalization issues**
Check for:
- Repeated denormalized data (e.g. `last_message_author_name` on `tickets` — denormalized from auth.users)
- Fields stored as `text` that should be an enum or FK (e.g. `stato` on all state machines — text instead of ENUM type)
- `jsonb` columns used as arrays when a junction table would be cleaner (`community_ids UUID[]` on content tables)

For each: assess trade-off. The `community_ids[]` pattern is intentional (documented in CLAUDE.md) — note it as known, not a violation.

**S3 — Missing NOT NULL constraints**
From `db-map.md`, identify columns that are `is_nullable=YES` but should logically never be null in a valid record (e.g. `compensations.importo_lordo`, `collaborators.data_ingresso` for active users).
Flag as Medium if the column is used in calculations without null guards in application code.
PostgreSQL best practice: "the majority of columns should be marked NOT NULL" — err toward NOT NULL, not nullable.

**S4 — RLS completeness and performance**

*Part A — Policy existence (RBAC cross-reference)*
From the "⚠️ RLS gaps" section of `db-map.md`, evaluate each flagged gap:

1. `communications.announcements_admin_write` grants ALL to `responsabile_compensi` — verify if intended (responsabili CAN publish announcements per requirements) or accidental over-grant.
2. `compensation_attachments.comp_attachments_own_insert` — no WITH CHECK clause. Can any authenticated user insert attachments for any compensation?
3. `expense_attachments.exp_attachments_own_insert` — same.
4. `ticket_messages.ticket_messages_insert` — no WITH CHECK. Any authenticated user can post to any ticket.

For all other tables: cross-reference policies in `db-map.md` RLS Summary against `docs/prd/01-rbac-matrix.md`. Flag any table with a documented access right but no matching policy.

*Part B — Function call caching*
Supabase recommendation: wrap `auth.uid()` and `auth.role()` in `(select ...)` to enable per-statement caching instead of per-row evaluation.
Run in Step 4:
```sql
SELECT policyname, tablename, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
  AND (qual NOT LIKE '%(select auth.uid())%' AND with_check NOT LIKE '%(select auth.uid())%'
       OR (with_check IS NULL AND qual NOT LIKE '%(select auth.uid())%'));
```
Flag as Medium: each policy using bare `auth.uid()` instead of `(select auth.uid())`. On tables with many rows, this can cause the function to be called once per row instead of once per statement.

*Part C — Explicit TO clause*
Policies without a `TO` clause execute for ALL roles (including anon), creating unnecessary overhead.
Run in Step 4:
```sql
SELECT tablename, policyname, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND roles = '{public}';
```
Flag as Low: policies that apply to `{public}` where a specific role (`authenticated`, `anon`) would be more precise.

*Part D — SELECT policy before UPDATE*
Supabase requires a matching SELECT policy to be present for UPDATE to function correctly. A table with UPDATE but no SELECT policy will silently fail to return updated rows.
Run in Step 4:
```sql
SELECT DISTINCT tablename
FROM pg_policies
WHERE schemaname = 'public' AND cmd = 'UPDATE'
EXCEPT
SELECT DISTINCT tablename
FROM pg_policies
WHERE schemaname = 'public' AND cmd IN ('SELECT', 'ALL');
```
Flag as High: any table with UPDATE policy but no SELECT policy.

*Part E — Views without security_invoker*
Views bypass RLS by default unless `security_invoker = true` (Postgres 15+).
Run in Step 4:
```sql
SELECT viewname, definition
FROM pg_views
WHERE schemaname = 'public';
```
For each view found: check if the underlying tables have RLS policies. If yes, flag as High unless `security_invoker = true` is set.

**S5 — Data type choices**

*Known antipatterns (source: wiki.postgresql.org/wiki/Don%27t_Do_This):*

Flag questionable data type choices from `db-map.md` Column specs section:
- **`timestamp` without timezone** → should be `timestamptz`. Plain `timestamp` stores a "picture of a clock" without timezone context — arithmetic errors across timezones. Expected: all timestamp columns use `timestamptz`.
- **`varchar(n)` with arbitrary length limits** → should be `text`. `varchar(n)` takes identical storage to `text` but adds an arbitrary rejection constraint. Prefer `text` with `CHECK (length(col) <= N)` when a limit is genuinely required.
- **`serial` columns** → should use `IDENTITY` (Postgres 10+). `serial` creates hidden sequences with "weird permission and dependency behaviours". `GENERATED ALWAYS AS IDENTITY` is the standard.
- **`money` type** → use `numeric` instead. `money` has rounding behaviour tied to locale and doesn't store currency.
- **State machine columns as `text`** → no ENUM constraint, risk of invalid values. Flag as Medium — consider CHECK constraint or Postgres ENUM.
- `ritenuta_acconto` stored as `numeric` (correct) vs percentage (verify: is it 20 or 0.20?)
- `community_ids UUID[]` on content tables — no FK enforcement, silent invalid UUIDs possible

Run in Step 4:
```sql
-- Detect timestamp without timezone
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'timestamp without time zone';

-- Detect varchar(n) columns
SELECT table_name, column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'character varying'
  AND character_maximum_length IS NOT NULL;

-- Detect serial (uses sequences with serial ownership)
SELECT s.relname AS seq_name, d.refobjid::regclass AS table_name
FROM pg_class s
JOIN pg_depend d ON d.objid = s.oid
WHERE s.relkind = 'S'
  AND d.deptype = 'a'
  AND d.classid = 'pg_class'::regclass;
```

**S6 — FK cascade behavior**
For each FK in the FK graph, verify delete cascade behavior. Flag any FK without explicit `ON DELETE` handling where orphaned records are a risk (e.g. if a `collaborator` is deleted, what happens to `compensations`?).
Run in Step 4:
```sql
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
ORDER BY c.conrelid::regclass::text;
```
Flag: any FK with `NO ACTION` where orphaned children would be a data integrity risk. Flag: any unexpected `CASCADE` that could cause unintended mass deletes.

**S7 — Unused indexes**
Indexes that are never used by the query planner waste write I/O (every INSERT/UPDATE/DELETE must maintain them).
Run in Step 4:
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```
Flag as Low: any index with 0 scans. Note that staging DB may have low traffic — treat as a hint, not a definitive finding.

---

## Step 3 — API query pattern check (Explore agent)

Launch a **single Explore subagent** (model: haiku) to check API routes for query anti-patterns.

File scope: all files in `app/api/` (from sitemap.md API routes list).

"Run these 5 checks on the provided API route files:

**CHECK Q1 — N+1 queries in list endpoints**
Pattern A: a `.from(table).select(...)` inside a `.map(` callback or `for` loop.
Grep: `\.from\(` inside `\.map\(|for\s*\(|forEach\(`
Pattern B: `for...of` loop with `await svc.from(` or `await supabase.from(` inside the loop body (sequential awaits = N+1).
Grep: `for\s*\(.*of\s|for\s+await` — then check if `await.*\.from\(` appears within the same block.
Flag: each match with file:line. A single JOIN query or batch `.in()` query should replace any N+1 pattern.

**CHECK Q2 — Missing await on Supabase calls**
Pattern: `svc.from(` or `supabase.from(` not preceded by `await` or assigned to a promise chain.
Grep: `[^=\s]svc\.from\(|[^=\s]supabase\.from\(`
Flag: each match.

**CHECK Q3 — Select * (unbounded column fetch)**
Pattern: `.select('*')` in API routes — fetches all columns including potentially sensitive ones.
Grep: `\.select\('\*'\)`
Flag: each match. Evaluate if the route returns the full object to the client.

**CHECK Q4 — Missing error handling on DB writes**
Pattern: `await svc.from(table).insert/update/delete(` without a subsequent `if (error)` check.
Grep: `await svc\.from\(.*\)\.(insert|update|delete)` — flag any call not followed within 3 lines by `if.*error` or `.catch`.
Flag: each match.

**CHECK Q5 — Unbounded queries (no limit on large tables)**
Pattern: `.from(table).select(...)` without `.limit(N)`, `.range(from, to)`, or a `pageSize` parameter on tables that can grow unboundedly (compensations, expense_reimbursements, notifications, tickets, candidature, assegnazioni, lezioni).
Grep for each of those table names: `\.from\('(compensations|expense_reimbursements|notifications|tickets|candidature|assegnazioni|lezioni)'\)` — then verify if `.limit(` or `pageSize` appears within 10 lines.
Flag: any collection endpoint that fetches without bounds. Exception: admin export routes that intentionally fetch all records for CSV/XLSX export."

---

## Step 4 — Live DB verification

Run all queries marked "Run in Step 4" from Step 2 against the staging DB (project_id: `gjwkvgfwkdwzqlvudgqr`). Group them by check:

1. S1B — FK column index coverage (full FK × index join query above)
2. S4B — Function call caching (`auth.uid()` without `select`)
3. S4C — Policies without explicit `TO` clause
4. S4D — UPDATE without matching SELECT policy
5. S4E — Views without security_invoker
6. S5 — Data type antipatterns (timestamp, varchar(n), serial)
7. S6 — FK cascade behavior

Additionally:
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
## Skill-DB Audit — [DATE] — [SCOPE]
### Sources: Supabase RLS docs, PostgreSQL docs (indexes, constraints), wiki.postgresql.org/Don't_Do_This

### Schema Checks
| # | Check | Verdict | Notes |
|---|---|---|---|
| S1A | Index — filter columns | ✅/⚠️ | [columns flagged] |
| S1B | Index — FK column coverage | ✅/⚠️ | [N FK columns unindexed] |
| S1C | Index — partial on stato columns | ✅/⚠️ | |
| S1D | Index — GIN for UUID[] arrays | ✅/⚠️ | |
| S2 | Normalization | ✅/⚠️ | |
| S3 | Missing NOT NULL | ✅/⚠️ | |
| S4A | RLS — policy completeness | ✅/⚠️ | |
| S4B | RLS — function call caching | ✅/⚠️ | [N policies with bare auth.uid()] |
| S4C | RLS — explicit TO clause | ✅/⚠️ | |
| S4D | RLS — SELECT before UPDATE | ✅/⚠️ | |
| S4E | RLS — views security_invoker | ✅/⚠️ | |
| S5 | Data type choices | ✅/⚠️ | [timestamp/varchar/serial hits] |
| S6 | FK cascade behavior | ✅/⚠️ | |
| S7 | Unused indexes | ✅/⚠️ | [N indexes with 0 scans] |

### Query Pattern Checks (API routes)
| # | Check | Matches | Verdict |
|---|---|---|---|
| Q1 | N+1 queries (map/for/for..of) | N | ✅/⚠️ |
| Q2 | Missing await | N | ✅/⚠️ |
| Q3 | Select * | N | ✅/⚠️ |
| Q4 | Missing error handling | N | ✅/⚠️ |
| Q5 | Unbounded queries | N | ✅/⚠️ |

### Findings requiring action ([N] total)
[table/file — check# — issue — impact — suggested fix]
```

### Write to backlog

For each finding with severity Medium or above, append to `docs/refactoring-backlog.md`:
- Assign ID: `DB-[n]`
- Add row to priority index
- Add full detail section

### Severity guide

- **Critical**: RLS gap that allows unauthorized data access (S4A); UPDATE policy without SELECT (S4D); view bypassing RLS on sensitive table (S4E); cascade DELETE that would destroy live data (S6)
- **High**: N+1 on a list endpoint (Q1); unbounded query on large table (Q5); unindexed FK column on a high-traffic table (S1B); missing index on a column with >1000 rows filtered frequently (S1A); bare `auth.uid()` on large tables (S4B)
- **Medium**: Text stato without ENUM/CHECK constraint (S5); missing NOT NULL on logically required column (S3); timestamp without timezone (S5); varchar(n) with arbitrary limit (S5); serial instead of IDENTITY (S5); policies without `TO` clause (S4C)
- **Low**: Unused indexes with 0 scans (S7); normalization opportunity with known trade-off (S2); missing GIN for UUID[] (S1D); partial index opportunity (S1C)

---

## Execution notes

- Do NOT apply migrations or modify the schema.
- Do NOT report gaps already documented in `db-map.md` "⚠️ RLS gaps" section unless you have new evidence of actual exploitation risk or the gap is now resolvable.
- If `docs/db-map.md` is not in the worktree, read from `/Users/MarcoG/Projects/staff-manager/docs/db-map.md`.
- S1D (GIN for UUID[]) and the in-memory filtering pattern are documented in CLAUDE.md as intentional — note them as known patterns unless query strategy changes.
- After the report, ask: "Vuoi che prepari le migration SQL per i fix identificati?"
