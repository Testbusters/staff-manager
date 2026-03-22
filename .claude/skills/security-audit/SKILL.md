---
name: security-audit
description: Security review of the staff-manager API routes and data layer. Checks authentication guards, RLS completeness, Zod validation coverage, sensitive data exposure in responses, and HTTP security headers. Internal webapp — SEO, public visibility, and indexing concerns are out of scope.
user-invocable: true
model: sonnet
context: fork
---

You are performing a security audit of the staff-manager Next.js API and data layer.

**Scope**: API routes, middleware, RLS policies, data validation, response shapes.
**Out of scope**: SEO, robots.txt, public crawlability, OpenGraph, sitemap.xml — this is a private internal webapp.
**Do NOT make code changes. Audit only.**
**All findings go to `docs/refactoring-backlog.md`.**

---

## Step 1 — Build API route inventory

Read `docs/sitemap.md`. Extract all API routes from the "API routes" section (or derive from `app/api/` structure).
Also read:
- `middleware.ts` or `proxy.ts` — understand the auth layer
- `lib/auth.ts` or equivalent — understand session/token helpers
- `docs/refactoring-backlog.md` — avoid duplicates

Output: complete list of API routes grouped by: Public (no auth), Protected (auth required), Admin-only, Role-specific.

---

## Step 2 — Auth & authorization checks (Explore agent)

Launch a **single Explore subagent** (model: haiku) with the full route file list:

"Run all 5 checks on the provided API route files (`app/api/**/*.ts`):

**CHECK A1 — Missing auth check at route entry**
Pattern: route handler function body does NOT contain `getSession`, `getUser`, `createServiceClient`, `auth()`, or equivalent within the first 10 lines of the handler.
Grep: for each route file, check if the first 10 lines after the function declaration contain any of: `getSession|getUser|auth()|session|supabaseAuth`.
Flag: any route file where none of these patterns appear in the first 15 lines of the handler.
Note: service-role-only routes (import, admin operations) must still verify the caller's role.

**CHECK A2 — Role check present for admin/responsabile routes**
Pattern: routes under `app/api/admin/` or routes that modify compensations/expenses must contain a role check (`role === 'amministrazione'` or equivalent).
Grep: in `app/api/admin/` files — search for `amministrazione|is_active|role` within 20 lines of function start.
Flag: any admin route without an explicit role assertion.

**CHECK A3 — Zod validation on POST/PUT/PATCH bodies**
Pattern: route files handling POST/PUT/PATCH should contain `z.object(` or `zod` import or `safeParse`.
Grep: in all route files, find POST/PUT/PATCH handlers. Check if the file imports `zod` or contains `z.object|safeParse|parseBody`.
Flag: any write route without Zod validation.

**CHECK A4 — Raw user input in SQL/queries**
Pattern: template literals or string concatenation used to build Supabase queries with user-provided values.
Grep: `` `.from(`${` `` or `'eq.' + ` or similar string interpolation in query building.
Flag: any parameterized query built with string concat (should use `.eq(col, val)` parameterized form).

**CHECK A5 — Sensitive fields in API responses**
Pattern: API routes returning full objects that may include sensitive fields.
Grep: `.select('*')` in route files — flag any route that selects all columns AND returns the full result to the client.
Also flag: any route that returns `user_profiles` rows including `must_change_password`, `onboarding_completed`, or similar internal flags to non-admin callers."

---

## Step 3 — Response shape review (main context)

For the 10 most-used API routes (identified from sitemap "API routes" column, pick highest-traffic ones):

**R1 — Collaborator data exposure**
Read the GET handlers for `/api/admin/collaboratori/[id]` and `/api/profile`. Verify that:
- `codice_fiscale` and `iban` are NOT returned to non-admin/non-owner callers
- `must_change_password` is not returned in list endpoints (only in own-profile)

**R2 — Compensation data exposure**
Read GET `/api/compensazioni/[id]`. Verify `ritenuta_acconto` calculation details are not exposed to unauthenticated callers.

**R3 — Error message verbosity**
Scan 5 route handlers for `catch` blocks. Verify internal error messages (DB errors, stack traces) are NOT forwarded to the client response. Expected: `return NextResponse.json({ error: 'Generic message' }, { status: 500 })` — never `{ error: err.message }` for DB errors.

---

## Step 4 — HTTP security headers check

Read `next.config.ts`. Check if the following headers are configured:

| Header | Expected | Risk if missing |
|---|---|---|
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` | Clickjacking on internal pages |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Data leakage in referrer |
| `Content-Security-Policy` | Present (even basic) | XSS escalation |
| `Permissions-Policy` | camera/mic/geolocation denied | Feature abuse |

Note: `Strict-Transport-Security` is typically handled by the hosting platform (Vercel) — skip.
Note: Since this is an internal app, CSP can be relatively permissive — flag absence, not strictness.

---

## Step 5 — CORS / proxy check

Read `middleware.ts` or equivalent. Verify:
- API routes are not accessible without a valid session token (no CORS bypass)
- `proxy.ts` auth layer cannot be bypassed via direct `/api/` calls
- `must_change_password` and `onboarding_completed` redirects are enforced at the middleware level, not just client-side

---

## Step 6 — Produce report and update backlog

### Output format

```
## Security Audit — [DATE]

### Auth & Authorization (API routes)
| # | Check | Routes flagged | Verdict |
|---|---|---|---|
| A1 | Missing auth check | N | ✅/❌ |
| A2 | Missing role check (admin routes) | N | ✅/❌ |
| A3 | Missing Zod validation | N | ✅/❌ |
| A4 | Raw input in queries | N | ✅/❌ |
| A5 | Sensitive fields in responses | N | ✅/❌ |

### Response Shape Review
| # | Check | Verdict | Notes |
|---|---|---|---|
| R1 | Collaborator data exposure | ✅/❌ | |
| R2 | Compensation data exposure | ✅/❌ | |
| R3 | Error message verbosity | ✅/❌ | |

### HTTP Headers
| Header | Present | Verdict |
|---|---|---|
| X-Frame-Options | ✅/❌ | |
| X-Content-Type-Options | ✅/❌ | |
| Referrer-Policy | ✅/❌ | |
| Content-Security-Policy | ✅/❌ | |

### Proxy / Middleware
| Check | Verdict | Notes |
|---|---|---|
| API protected behind auth layer | ✅/❌ | |
| Proxy redirects server-side | ✅/❌ | |

### ❌ Critical findings ([N])
[route — issue — exploit scenario — fix]

### ⚠️ Medium findings ([N])
[route — issue — fix]
```

### Write to backlog

For each Critical or High finding, append to `docs/refactoring-backlog.md`:
- Assign ID: `SEC-[n]`
- Add to priority index
- Add full detail section with exploit scenario

### Severity guide
- **Critical**: unauthenticated route that exposes or modifies data; RLS bypass in API; raw input in query
- **High**: admin route without role check; sensitive field (CF, IBAN) exposed to non-owner
- **Medium**: missing Zod on write route; error message leaking DB internals; missing security header
- **Low**: header best-practice gap (low-impact); informational over-exposure

---

## Execution notes

- Do NOT modify any route or config file.
- Do NOT test exploits against the production DB (`nyajqcjqmgxctlqighql`). Use staging only.
- SEO, robots.txt, meta tags, sitemaps, and public indexing are explicitly OUT OF SCOPE.
- After the report, ask: "Vuoi che implementi i fix Critical/High identificati?"
