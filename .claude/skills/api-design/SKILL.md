---
name: api-design
description: API design consistency review for staff-manager. Checks endpoint naming conventions, HTTP verb correctness, response shape consistency, error code standardization, pagination patterns, and input validation presence. Does not cover auth implementation (use /security-audit) or performance (use /perf-audit).
user-invocable: true
model: sonnet
---

You are performing an API design consistency review of the staff-manager Next.js API routes.

**Scope**: endpoint naming, HTTP verbs, response shapes, error codes, pagination, validation.
**Out of scope**: auth implementation → `/security-audit` | performance → `/perf-audit` | DB schema → `/skill-db`.
**Do NOT make code changes. Audit only.**
**All findings go to `docs/backlog-refinement.md`.**

---

## Step 1 — Build API inventory

Read `docs/sitemap.md` API routes section. Build a complete list of all routes with:
- Path
- HTTP methods supported
- Expected request body shape (infer from sitemap or read the route file)
- Expected response shape

Also read current `docs/backlog-refinement.md` to avoid duplicates.

---

## Step 2 — Naming and verb checks (Explore agent)

Launch a **single Explore subagent** (model: haiku) with all `app/api/**/*.ts` files:

"Run all 5 checks on the provided API route files:

**CHECK N1 — HTTP verb / action alignment**
For each route file, identify the exported function names (GET, POST, PUT, PATCH, DELETE).
Flag mismatches:
- POST used for read-only operations (should be GET)
- PUT used for partial updates (should be PATCH — PUT implies full replacement)
- DELETE used with a request body (non-standard)
- GET handlers that modify state

**CHECK N2 — URL structure consistency**
From route file paths, flag:
- Inconsistent pluralization: e.g. `/api/collaboratore/` vs `/api/collaboratori/` (mixed singular/plural)
- Nested routes that skip a level: e.g. `/api/documents/sign` but also `/api/documents/[id]/sign`
- Action verbs in URLs that should be HTTP verbs: e.g. `/api/compensazioni/approve` (should be `PATCH /api/compensazioni/[id]` with `{ action: 'approve' }` or use a sub-resource)

**CHECK N3 — Response shape consistency (success)**
Grep: `return NextResponse.json({` across all route files.
For each route returning a single entity (GET /[id]): check if the top-level key is consistent (e.g. `{ compensation }` vs `{ data }` vs `{ result }` vs naked object).
For each route returning a list: check if the shape is `{ items, total, page }` or `{ data }` or a naked array.
Flag: any inconsistency in the key name for the same entity type across different routes.

**CHECK N4 — Error response shape consistency**
Grep: `return NextResponse.json.*status.*[4-5][0-9][0-9]` across all route files.
Check if error responses consistently use `{ error: string }` or a different shape.
Flag: any route returning a different error shape (e.g. `{ message: }` vs `{ error: }` vs `{ errors: [] }`).

**CHECK N5 — Status code correctness**
Grep for common misuses:
- `status: 200` on a successful POST that creates a resource (should be 201)
- `status: 400` for authorization errors (should be 403)
- `status: 500` for validation errors (should be 400)
- `status: 200` with `{ error: }` in body (should never return 200 with an error field)
Flag each mismatch."

---

## Step 3 — Pagination consistency check (main context)

For the 5 list endpoints with the most data (compensations, expense_reimbursements, tickets, documents, collaborators):
Read each GET handler. Verify:

**P1 — Consistent pagination shape**
Expected: `{ items: T[], total: number, page: number, pageSize: number }` or a documented project standard.
Flag any list endpoint using a different shape or no pagination at all (returning all records).

**P2 — Pagination parameter names**
Check if all paginated endpoints use the same query param names (`page`, `pageSize` or `limit`/`offset` — pick one, not mixed).
Flag inconsistencies.

**P3 — Default page size**
Check if a missing `pageSize` param falls back to a safe default (e.g. 50). Flag any endpoint with no default that could return unbounded results.

---

## Step 4 — Validation consistency check (main context)

For the 5 highest-impact write routes (create compensation, create expense, create ticket, update collaborator profile, create user):
Read each handler. Verify:

**V1 — Zod schema completeness**
Check that the Zod schema validates all fields that are required by the DB (NOT NULL, no default). Flag any required field missing from the Zod schema.

**V2 — Consistent validation placement**
Check that validation always happens BEFORE any DB query (not after a partial DB read). Flag: any handler that reads from DB before validating input.

**V3 — Validation error response**
Check that validation failures return `status: 400` with a field-level error message (not just a generic "bad request"). Flag: any handler using generic 400 without field context.

---

## Step 5 — Produce report and update backlog

### Output format

```
## API Design Audit — [DATE]
### Scope: [N] API routes

### Pattern Checks
| # | Check | Issues | Verdict |
|---|---|---|---|
| N1 | HTTP verb alignment | N | ✅/⚠️ |
| N2 | URL structure | N | ✅/⚠️ |
| N3 | Response shape (success) | N | ✅/⚠️ |
| N4 | Error shape consistency | N | ✅/⚠️ |
| N5 | Status code correctness | N | ✅/⚠️ |

### Pagination
| # | Check | Verdict | Notes |
|---|---|---|---|
| P1 | Pagination shape | ✅/⚠️ | |
| P2 | Parameter names | ✅/⚠️ | |
| P3 | Default page size | ✅/⚠️ | |

### Validation
| # | Check | Verdict | Notes |
|---|---|---|---|
| V1 | Zod completeness | ✅/⚠️ | |
| V2 | Validation before DB | ✅/⚠️ | |
| V3 | Validation error quality | ✅/⚠️ | |

### ⚠️ Inconsistencies requiring action ([N] total)
[route — issue — standard to apply — fix]
```

### Write to backlog

For each finding with severity Medium or above, append to `docs/backlog-refinement.md`:
- Assign ID: `API-[n]`
- Add to priority index
- Add full detail section

### Severity guide
- **High**: unbounded list endpoint (no pagination, could return 10k+ rows); POST used for a write that should return 201
- **Medium**: inconsistent response shape for the same entity across routes; mixed pagination param names; 200 returned with error body
- **Low**: PUT vs PATCH mismatch; action verb in URL; minor status code issue

---

## Execution notes

- Do NOT make any route changes.
- Do NOT audit auth logic (covered by `/security-audit`).
- If a pattern is used consistently project-wide (even if non-standard), note it as "consistent but non-standard" — don't flag as a violation unless it causes actual client-side issues.
- After the report, ask: "Vuoi che allineo gli endpoint che presentano inconsistenze?"
