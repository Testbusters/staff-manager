---
name: api-design
description: API design consistency review for staff-manager. Checks endpoint naming conventions, HTTP verb correctness, response shape consistency, error code standardization (400/409/422 distinction), pagination patterns, input validation presence, Next.js 15+ breaking changes (await params, request.json try/catch), and RFC 9457 error shape compliance. Does not cover auth implementation (use /security-audit) or performance (use /perf-audit).
user-invocable: true
model: sonnet
context: fork
argument-hint: [target:page:<route>|target:role:<role>|target:section:<section>]
---

You are performing an API design consistency review of the staff-manager Next.js API routes.

**Scope**: endpoint naming, HTTP verbs, response shapes, error codes, pagination, validation, Next.js 15+ compliance.
**Out of scope**: auth implementation → `/security-audit` | performance → `/perf-audit` | DB schema → `/skill-db`.
**Do NOT make code changes. Audit only.**
**All findings go to `docs/refactoring-backlog.md`.**

### Status code reference (source: MDN + RFC 9457)
- **400** — malformed request: bad JSON, Zod parse failure, missing required field
- **401** — not authenticated (no valid session)
- **403** — authenticated but lacks permission
- **404** — resource not found
- **409** — valid request conflicts with current server state (e.g., approving an already-APPROVATO record, duplicate unique value)
- **422** — semantically invalid data that passes Zod schema but violates a business rule
- **500** — unexpected server error (no internal details in response)

### Idempotency keys — explicit non-requirement
This project has no external API consumers, no payment integration, and handles deduplication via GSheet PROCESSED state. Idempotency-Key headers are intentionally out of scope.

---

## Step 0 — Target resolution

Parse `$ARGUMENTS` for a `target:` token.

| Pattern | Meaning |
|---|---|
| `target:section:corsi` | Only corsi-domain routes (derive from docs/sitemap.md API routes section) |
| `target:section:compensi` | Only `/api/compensations/`, `/api/expenses/` routes |
| `target:section:export` | Only export/bulk routes |
| `target:role:resp` | Routes relevant to responsabile role |
| No argument | Full audit — all API routes |

Announce: `Running api-design — scope: [FULL | target: <resolved>]`
Apply the target filter to the route inventory in Step 1.

---

## Step 1 — Build API inventory

Read `docs/sitemap.md` API routes section. Build a complete list of all routes (filtered by target scope) with:
- Path
- HTTP methods supported
- Expected request body shape (infer from sitemap or read the route file)
- Expected response shape

Group routes by functional area (derived from `docs/sitemap.md` API routes section):
- Core entities (compensation, expense, ticket, document, collaborator routes)
- Content routes (comunicazioni, eventi, opportunita, sconti, risorse)
- Role-specific domain routes (read from sitemap — include all non-admin, non-cron routes per role)
- Admin: `/api/admin/`
- Jobs/cron: `/api/jobs/`
- Export: routes returning CSV/XLSX

Also read current `docs/refactoring-backlog.md` to avoid duplicates.

---

## Step 2 — Naming, verb, and Next.js compliance checks (Explore agent)

Launch a **single Explore subagent** (model: haiku) with all `app/api/**/*.ts` files in scope:

"Run all 10 checks on the provided API route files. For each check: report total match count, list every match as `file:line — excerpt`, state PASS or FAIL.

**CHECK N1 — HTTP verb / action alignment**
For each route file, identify the exported function names (GET, POST, PUT, PATCH, DELETE).
Flag mismatches:
- POST used for read-only operations (should be GET)
- PUT used for partial updates (should be PATCH — PUT implies full replacement)
- DELETE used with a request body (non-standard)
- GET handlers that modify state (write to DB)

**CHECK N2 — URL structure consistency**
From route file paths, flag:
- Inconsistent pluralization: e.g. `/api/collaboratore/` vs `/api/collaboratori/` (mixed singular/plural)
- Nested routes that skip a level: e.g. `/api/documents/sign` but also `/api/documents/[id]/sign`
- Action verbs in URLs that should be HTTP verbs: e.g. `/api/compensazioni/approve` (should be `PATCH /api/compensazioni/[id]` with action body)

**CHECK N3 — Response shape consistency (success)**
Grep: `return NextResponse.json({` across all route files.
For each route returning a single entity (GET /[id]): check if the top-level key is consistent — e.g. `{ compensation }` vs `{ data }` vs `{ result }` vs naked object. The same entity must use the same wrapper key across all routes.
For each route returning a list: check if the shape is `{ items, total, page }` or a naked array.
Flag: any inconsistency in the key name for the same entity type across different routes.

**CHECK N4 — Error response shape consistency**
Grep: `NextResponse.json.*status.*[4-5][0-9][0-9]` across all route files.
Check if error responses consistently use `{ error: string }`.
Flag: any route returning a different error shape: `{ message: }`, `{ msg: }`, `{ errors: [] }`, or a bare string.
Severity: High for divergent shapes that client code may silently mishandle.

**CHECK N5 — Status code correctness**
Grep for common misuses:
- `status: 200` on a successful POST that creates a resource (should be 201)
- `status: 400` for authorization errors (should be 403)
- `status: 500` for validation errors (should be 400)
- `status: 200` with `{ error: }` in body (should never return 200 with an error field)
- `status: 400` in handlers that check state machine values (`APPROVATO`, `LIQUIDATO`, `RIFIUTATO`, `IN_ATTESA`) — state conflicts should return 409, not 400
Flag each mismatch with the correct status code.

**CHECK N6 — ZodError .issues vs .errors convention**
Project rule: when handling ZodError, always access `.issues` (not `.errors`). Using `.errors` returns `undefined` silently.
Grep: `zodResult\.error\.errors|err\.errors|parseResult\.error\.errors|\.error\.errors`
Expected: 0 matches. All ZodError access must use `.issues`.

**CHECK N7 — await params missing (Next.js 15+ breaking change)**
Scope: only files in `app/api/` paths containing `[` (dynamic segments).
Pattern: lines with `const {` or `const id` that destructure from `params` (or `context.params`) WITHOUT a preceding `await`.
Grep: `const \{[^}]+\} = params[^.]|const \{[^}]+\} = context\.params[^.]|const \{[^}]+\} = props\.params[^.]`
Also grep for `params\.[a-z]` (direct property access without await).
Flag: any access to `params` without `await`. Since Next.js 15, `params` is a Promise — direct destructuring is a runtime error.
Expected: 0 matches. Correct pattern: `const { id } = await params`.

**CHECK N8 — .parse() instead of .safeParse() in route handlers**
Scope: all `app/api/` route files.
Pattern: `[A-Z][a-zA-Z]+Schema\.parse\(|z\.object[^)]+\.parse\(|Schema\.parse\(await`
Exclude: lines inside `try {` blocks (wrapped `.parse()` is acceptable if ZodError is explicitly caught).
Flag: any bare `.parse()` call in a route handler outside a try/catch. Correct pattern: use `.safeParse()` and check `result.success`.
Expected: 0 matches.

**CHECK N9 — request.json() without try/catch**
Scope: all `app/api/` route files.
Pattern: `await request\.json\(\)|await req\.json\(\)`
For each match: check if the `await` line is inside a `try {` block (search within ±10 lines for `try {` before the match and `} catch` after).
Flag: any `request.json()` call NOT inside a try/catch. A malformed JSON body throws `SyntaxError` which becomes an unhandled 500 text response.
Expected: 0 matches outside try/catch.

**CHECK N10 — Top-level array response**
Pattern: `NextResponse\.json\(\s*\[|Response\.json\(\s*\[`
Flag: any route returning a bare array at the top level of the JSON response.
Expected: 0 matches. All responses must be wrapped in an object: `{ items: [...] }` not `[...]`. This allows adding `meta`, `pagination`, or `error` fields later without a breaking change."

---

## Step 3 — Pagination consistency check (main context)

Derive the list of paginated endpoints dynamically:
Read `docs/sitemap.md` API routes section. Select all `GET` routes whose path does NOT contain `[id]` (i.e., collection endpoints, not single-resource endpoints). These are the candidates for pagination audit.

For each collection endpoint, read the GET handler. Verify:

**P1 — Consistent pagination shape**
Expected: `{ items: T[], total: number, page: number, pageSize: number }` or equivalent documented project standard.
Flag any list endpoint using a different shape or returning a bare array (overlap with N10 — both check this, flag independently).
Flag any list endpoint with no pagination at all (returning all records).

**P2 — Pagination parameter names**
Check if all paginated endpoints use the same query param names (`page`, `pageSize` — not `limit`/`offset`).
Flag inconsistencies.

**P3 — Default page size**
Check if a missing `pageSize` param falls back to a safe default (e.g. 50). Flag any endpoint with no default that could return unbounded results.

**P4 — Total count as number (not string)**
Supabase `count()` returns a string in some configurations. Verify that paginated endpoints convert count to `Number()` or `parseInt()` before including it in the response.
Flag: any endpoint returning `total` without an explicit numeric conversion where the source is a Supabase count query.

---

## Step 4 — Validation consistency check (main context)

Derive the list of write routes dynamically:
Read `docs/entity-manifest.md`. Identify entities with state machines or FK dependencies. Then read `docs/sitemap.md` API routes to find their `POST`, `PUT`, and `PATCH` endpoints. Audit all of them.

For each write endpoint, read the handler. Verify:

**V1 — Zod schema completeness**
Check that the Zod schema validates all fields that are required by the DB (NOT NULL, no default). Flag any required field missing from the Zod schema.

**V2 — Consistent validation placement**
Check that validation always happens BEFORE any DB query (not after a partial DB read). Flag: any handler that reads from DB before validating input.

**V3 — Validation error response**
Check that validation failures return `status: 400` with field-level error detail — not just a generic "bad request".
Verify `.issues` (not `.errors`) is used when accessing ZodError details.
Preferred response shape: `{ error: 'Validation failed', issues: result.error.issues }` or `z.flattenError(result.error)` for form-facing endpoints.

---

## Step 5 — Produce report and update backlog

### Output format

```
## API Design Audit — [DATE] — [TARGET]
### Scope: [N] API routes
### Sources: Next.js 15+ route handler docs, RFC 9457, Zod docs, MDN HTTP status codes

### Pattern Checks
| # | Check | Issues | Severity | Verdict |
|---|---|---|---|---|
| N1 | HTTP verb alignment | N | Medium | ✅/⚠️ |
| N2 | URL structure | N | Low | ✅/⚠️ |
| N3 | Response shape (success) | N | High | ✅/⚠️ |
| N4 | Error shape consistency | N | High | ✅/⚠️ |
| N5 | Status code correctness | N | High | ✅/⚠️ |
| N6 | ZodError .issues convention | N | Critical | ✅/⚠️ |
| N7 | await params (Next.js 15+) | N | Critical | ✅/⚠️ |
| N8 | .parse() without safeParse | N | Critical | ✅/⚠️ |
| N9 | request.json() without try/catch | N | Critical | ✅/⚠️ |
| N10 | Top-level array response | N | Medium | ✅/⚠️ |

### Pagination
| # | Check | Verdict | Notes |
|---|---|---|---|
| P1 | Pagination shape | ✅/⚠️ | |
| P2 | Parameter names | ✅/⚠️ | |
| P3 | Default page size | ✅/⚠️ | |
| P4 | Total count as number | ✅/⚠️ | |

### Validation
| # | Check | Verdict | Notes |
|---|---|---|---|
| V1 | Zod completeness | ✅/⚠️ | |
| V2 | Validation before DB | ✅/⚠️ | |
| V3 | Validation error quality | ✅/⚠️ | |

### Error Shape Consistency Note
Current project standard: `{ error: string }`. RFC 9457 standard: `{ type, title, status, detail }`.
Verdict: [Consistent / Inconsistent — N routes diverge with { message: } or { errors: [] }]
Recommendation: [keep current if consistent | standardize to { error, status } minimum]

### ⚠️ Inconsistencies requiring action ([N] total)
[route — check# — issue — standard to apply — fix]
```

### Write to backlog

For each finding with severity High or above, append to `docs/refactoring-backlog.md`:
- Assign ID: `API-[n]`
- Add to priority index
- Add full detail section

### Severity guide

- **Critical**: N6 (silent undefined on ZodError); N7 (runtime error on params access); N8 (unhandled ZodError throw); N9 (unhandled SyntaxError → 500 text response)
- **High**: unbounded list endpoint (no pagination); inconsistent response shape for same entity; 200 returned with error body; divergent error shapes (`message` vs `error`); 400 used for state-conflict scenarios (should be 409)
- **Medium**: N10 top-level array; POST not returning 201 on create; N2 URL structure issues; mixed pagination param names
- **Low**: PUT vs PATCH mismatch; action verb in URL; minor status code pedantry; `total` count not converted to number (low-risk for TypeScript frontends)

---

## Execution notes

- Do NOT make any route changes.
- Do NOT audit auth logic (covered by `/security-audit`).
- If a pattern is used consistently project-wide (even if non-standard), note it as "consistent but non-standard" — don't flag as a violation unless it causes actual client-side issues.
- After the report, ask: "Vuoi che allineo gli endpoint che presentano inconsistenze?"
