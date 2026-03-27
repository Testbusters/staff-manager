---
name: security-audit
description: Security review of the staff-manager API routes and data layer. Covers auth guards, RLS completeness, Zod validation, sensitive data exposure, HTTP security headers, environment variable leakage, service role key in client code, storage signed URL compliance, open redirect, mass assignment, Supabase Security Advisors (MCP), and dependency CVE audit. Internal webapp — SEO, public visibility, and indexing are out of scope.
user-invocable: true
model: sonnet
context: fork
effort: high
argument-hint: [target:page:<route>|target:role:<role>|target:section:<section>]
allowed-tools: mcp__claude_ai_Supabase__get_advisors
---

You are performing a security audit of the staff-manager Next.js API and data layer.

**Scope**: API routes, middleware/proxy, RLS policies, data validation, response shapes, environment variables, Supabase configuration, dependencies.
**Out of scope**: SEO, robots.txt, public crawlability, OpenGraph, sitemap.xml — this is a private internal webapp.
**Do NOT make code changes. Audit only.**
**All findings go to `docs/refactoring-backlog.md`.**

---

## Step 0 — Target resolution

Parse `$ARGUMENTS` for a `target:` token.

| Pattern | Meaning |
|---|---|
| `target:page:/api/compensations` | Restrict scope to that route only |
| `target:role:collab` | Focus on routes accessible/relevant to collaboratore |
| `target:role:admin` | Focus on admin routes |
| `target:section:corsi` | Focus on all corsi-domain routes (derive from docs/sitemap.md API routes section) |
| `target:section:export` | Focus on all export/bulk-data routes |
| No argument | Full audit — all API routes |

Announce: `Running security-audit — scope: [FULL | target: <resolved>]`
Apply the target filter to the route inventory built in Step 1.

---

## Step 1 — Build API route inventory

Read `docs/sitemap.md`. Extract all API routes from the "API routes" section (or derive from `app/api/` structure).
Also read:
- `proxy.ts` — understand the auth layer and whitelisted routes
- `lib/auth.ts` or equivalent auth helpers — understand session/token helpers
- `docs/refactoring-backlog.md` — avoid duplicates

Output: complete list of API routes grouped by:
- **Public** (no auth required)
- **Protected** (auth required, any role)
- **Role-specific** (grouped by functional section per sitemap.md)
- **Admin-only** (`app/api/admin/`)
- **Cron/job routes** (`app/api/jobs/` — whitelisted in proxy.ts, bypass normal auth layer)
- **Export routes** (bulk data endpoints returning CSV or XLSX)

Apply target scope from Step 0 before proceeding.

---

## Step 2 — Auth, authorization, and injection checks (Explore agent)

Launch a **single Explore subagent** (model: haiku) with the full route file list:

"Run all 12 checks on the provided API route files (`app/api/**/*.ts`) and adjacent files as noted.

**CHECK A1 — Missing auth check at route entry**
Pattern: route handler function body does NOT contain any of the following within the first 20 lines of the handler:
`getSession|getUser|createClient|supabase.auth|auth()|session|serviceClient|createServiceClient`
Grep: for each route file, check if any of these patterns appear within the first 20 lines of the exported handler function. Flag any route file where none appear.
Note: service-role-only routes must still verify the caller's role — service role alone is not an auth check.

**CHECK A2 — Role check present for admin routes**
Pattern: routes under `app/api/admin/` must contain a role check within 20 lines of function start.
Grep: in `app/api/admin/` files — search for `amministrazione|role ===|role !==|is_active|checkRole` within 20 lines of function start.
Flag: any admin route without an explicit role assertion.

**CHECK A3 — Zod validation on POST/PUT/PATCH bodies**
Pattern: route files handling POST/PUT/PATCH should import Zod and use `safeParse` or `parse`.
Grep: in all write route files, check for `z\.object|zod|safeParse|\.parse\(`.
Flag: any write route without Zod validation.

**CHECK A4 — Raw user input in SQL/queries**
Pattern: template literals or string concatenation used to build Supabase queries with user-provided values.
Grep: `` `.from(`${` `` or `'eq.' +` or `.filter('` + ` or `.eq(` + ` (string concatenation in query building).
Flag: any parameterized query built with string concat. The correct form is `.eq('column', variable)` — not `.eq('column=' + variable)`.

**CHECK A5 — Sensitive fields in API responses**
Pattern: API routes returning full objects that may include sensitive fields.
Grep: `.select('*')` in route files — flag any route that selects all columns AND returns the full result to the client without explicit field filtering.
Also flag: any route that returns `user_profiles` rows including `must_change_password`, `onboarding_completed`, or `theme_preference` to non-admin callers.

**CHECK A6 — Cron/job routes missing secret check**
Scope: all files under `app/api/jobs/`.
Pattern: these routes are whitelisted in proxy.ts (bypass auth layer). They MUST verify the request using a cron secret.
Grep: in each `app/api/jobs/` file, check for presence of: `CRON_SECRET|authorization|x-cron|vercel-cron|Authorization`.
Flag: any job route that does NOT contain one of these patterns.

**CHECK A7 — Export routes missing role check**
Scope: any route file whose path contains 'export' or that returns `Content-Type: text/csv` or `application/vnd.openxmlformats`.
Grep: files containing `text/csv|Content-Disposition.*attachment|application/vnd.openxml`.
For each match: verify the route also contains a role check (`role ===|amministrazione|responsabile`).
Flag: any export route without an explicit role assertion.

**CHECK A8 — NEXT_PUBLIC_ secret exposure**
Scope: all `.ts`, `.tsx`, `.env*`, and `next.config.*` files in the project root and `app/`.
Pattern: `NEXT_PUBLIC_.*KEY|NEXT_PUBLIC_.*SECRET|NEXT_PUBLIC_.*TOKEN|NEXT_PUBLIC_.*PASSWORD`
Flag: any `NEXT_PUBLIC_` variable name that contains secret-like suffixes. These variables are inlined into the client bundle at build time and are visible to all users.
Note: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are expected and safe — exclude these two exact names.

**CHECK A9 — Service role key in client-side code**
Scope: all `.ts` and `.tsx` files that contain `'use client'` at the top.
Pattern: in those client files, grep for: `SERVICE_ROLE|service_role|SUPABASE_SERVICE|serviceRoleKey`
Flag: any match. The service role key bypasses all RLS — its presence in a client-side file exposes it in the browser bundle to every authenticated user.

**CHECK A10 — Storage public URL for private buckets**
Scope: all API route files and lib files that handle file/document/attachment operations.
Pattern: `getPublicUrl` in files that also reference `documents`, `attachments`, `compensation_attachments`, `expense_attachments`, `contract`, or `receipt`.
Flag: any `getPublicUrl` call for what appears to be a private-bucket asset. Private buckets must use `createSignedUrl` with a TTL.
Note: `avatars` bucket is public by design — exclude matches in files solely handling avatars.

**CHECK A11 — Open redirect**
Scope: `proxy.ts` and all API route files containing `redirect` or `NextResponse.redirect`.
Pattern: lines with `redirect(` or `NextResponse.redirect(` where the URL argument is NOT a hardcoded string literal but derives from: `searchParams.get|req.body|params\.|query\.`
Flag: any redirect where the target URL is constructed from user-controlled input without an explicit allowlist check.

**CHECK A12 — Mass assignment**
Scope: all API route files handling POST/PUT/PATCH.
Pattern:
  Step 1: find lines with `const body = await req.json()|const data = await req.json()`
  Step 2: in the same file, check if `body` or `data` (the whole object) is passed directly to `.insert(body)|.update(body)|.upsert(body)` or `.insert(data)|.update(data)|.upsert(data)`.
Flag: any route where the raw request body object is passed wholesale to a DB write without explicit field destructuring (e.g. `const { field1, field2 } = body`).
Note: routes that use a Zod `schema.parse(body)` result (not the raw `body`) before inserting are safe — exclude those."

---

## Step 3 — Response shape review (main context)

For the 10 most-used API routes (identified from sitemap.md "API routes" column):

**R1 — Collaborator sensitive data exposure**
Read GET `/api/admin/collaboratori/[id]` and `/api/profile`. Verify that:
- `codice_fiscale` is NOT returned to non-admin/non-owner callers
- `iban` is NOT returned to non-admin/non-owner callers
- `partita_iva` is NOT returned to non-admin/non-owner callers
- `must_change_password` is not returned in list endpoints (only own-profile)

**R2 — Compensation data exposure**
Read GET `/api/compensations/[id]` (or equivalent path). Verify `ritenuta_acconto` and calculation details are not exposed to unauthenticated callers.

**R3 — Error message verbosity**
Scan 5 route handlers for `catch` blocks. Verify internal error messages (DB errors, stack traces) are NOT forwarded to the client response.
Expected: `return NextResponse.json({ error: 'Generic message' }, { status: 500 })` — never `{ error: err.message }` for DB errors where `err.message` may contain schema details.

**R4 — Domain data scoping**
For each entity listed in `docs/entity-manifest.md`, read its corresponding GET list/detail routes and verify:
- Collaborators can only see records scoped to themselves (ownership via `get_my_collaborator_id()` or equivalent RLS)
- Responsabili can only see records within their community/city scope (via `can_manage_community` or `user_community_access` join)
- Sensitive data (blacklist entries, fiscal data, contact details) is not accessible by roles without explicit permission per `docs/prd/01-rbac-matrix.md`
Cross-reference expected access rules from `docs/prd/01-rbac-matrix.md` against what the API routes actually enforce.

**R5 — Rate limiting on high-value endpoints**
Check `next.config.ts`, `proxy.ts`, and any Vercel config for rate limiting configuration. For the following endpoints, verify whether request rate limiting is present:
- Any `POST` route under `/api/admin/` that creates users or modifies roles
- `POST /api/profile/change-password` or equivalent
- Any export route (bulk data)
- Any compensation bulk-action route
Flag if no rate limiting is found at any layer (Vercel Firewall, middleware, application-level).
Note: absence of rate limiting is a Medium finding for an internal app — flag it, don't treat as Critical.

---

## Step 3b — Supabase Security Advisors (MCP)

Call `mcp__claude_ai_Supabase__get_advisors` with `project_id: "gjwkvgfwkdwzqlvudgqr"` (staging).

This returns Supabase's own automated security recommendations covering:
- Exposed service role key
- RLS disabled on tables
- Leaked `anon` or `authenticated` role grants on sensitive objects
- Unprotected database functions
- Auth configuration issues

For each advisor returned:
- `level: "error"` → **Critical** finding
- `level: "warning"` → **High** finding
- `level: "info"` → **Low** / informational

Include the full list in the report output. Do not suppress any advisor result.

---

## Step 3c — Dependency CVE audit

Run in the project root:
```bash
npm audit --json --omit=dev 2>/dev/null
```

Parse the JSON output for vulnerabilities with `severity: "high"` or `severity: "critical"`.

For each finding, record:
- Package name and affected version range
- CVE ID (if available)
- Brief description
- Whether a `fixAvailable` patch exists

Flag any `critical` CVE in a production dependency as a **Critical** finding.
Flag any `high` CVE as a **High** finding.
`moderate` and `low` → note in report but do not add to backlog unless directly exploitable in this app's context.

If `npm audit` exits with non-zero but the JSON output is parseable, continue. If the command is not available or fails to produce parseable output, note it and skip.

---

## Step 4 — HTTP security headers check

**Static check**: read `next.config.ts`. Verify these headers are configured:

| Header | Expected | Risk if missing |
|---|---|---|
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer data leakage |
| `Content-Security-Policy` | Present (even permissive) | XSS escalation |
| `Permissions-Policy` | camera/mic/geolocation denied | Feature abuse |

Note: `Strict-Transport-Security` is handled by Vercel — skip.

**Live check** (staging): run:
```bash
curl -sI https://staff-staging.peerpetual.it/ | grep -i "x-frame\|x-content-type\|referrer-policy\|content-security\|permissions-policy"
```
Compare actual headers received vs configuration. A header present in `next.config.ts` but absent in the curl output indicates a `source` pattern mismatch (e.g. only applying to `/` not `/(.*)`).

Flag: any header present in config but absent in live response — this means the config is ineffective.

---

## Step 5 — Proxy / middleware check

Read `proxy.ts`. Verify:
- API routes are not accessible without a valid session token (no CORS bypass path)
- The `must_change_password` and `onboarding_completed` redirects are enforced at the proxy level, not just client-side
- The `/api/jobs/` whitelist is narrow — specific paths only, not a wildcard `startsWith('/api/jobs')` that could expose other routes under a similar prefix
- Each whitelisted path has a comment explaining why it is public
- The proxy does not trust any header that could be forged by the client to bypass auth (e.g. `X-User-Role`, `X-Is-Admin`)

---

## Step 6 — Produce report and update backlog

### Output format

```
## Security Audit — [DATE] — [TARGET]

### Auth & Authorization (API routes)
| # | Check | Routes flagged | Severity | Verdict |
|---|---|---|---|---|
| A1 | Missing auth check | N | Critical | ✅/❌ |
| A2 | Missing role check (admin routes) | N | Critical | ✅/❌ |
| A3 | Missing Zod validation | N | High | ✅/❌ |
| A4 | Raw input in queries | N | Critical | ✅/❌ |
| A5 | Sensitive fields in responses | N | High | ✅/❌ |
| A6 | Cron routes missing secret | N | Critical | ✅/❌ |
| A7 | Export routes missing role check | N | High | ✅/❌ |
| A8 | NEXT_PUBLIC_ secret exposure | N | Critical | ✅/❌ |
| A9 | Service role key in client code | N | Critical | ✅/❌ |
| A10 | Storage public URL on private bucket | N | High | ✅/❌ |
| A11 | Open redirect | N | High | ✅/❌ |
| A12 | Mass assignment | N | High | ✅/❌ |

### Response Shape Review
| # | Check | Verdict | Notes |
|---|---|---|---|
| R1 | Collaborator sensitive data (CF, IBAN, P.IVA) | ✅/❌ | |
| R2 | Compensation data exposure | ✅/❌ | |
| R3 | Error message verbosity | ✅/❌ | |
| R4 | Domain data scoping (entity-manifest × rbac-matrix) | ✅/❌ | |
| R5 | Rate limiting on high-value endpoints | ✅/❌ | |

### Supabase Security Advisors
| Level | Count | Items |
|---|---|---|
| error (Critical) | N | [list] |
| warning (High) | N | [list] |
| info (Low) | N | [list] |

### Dependency CVEs
| Package | Version | Severity | CVE | Fix available |
|---|---|---|---|---|
| [name] | [range] | critical/high | [id] | yes/no |

### HTTP Headers
| Header | In config | In live response | Verdict |
|---|---|---|---|
| X-Frame-Options | ✅/❌ | ✅/❌ | ✅/❌ |
| X-Content-Type-Options | ✅/❌ | ✅/❌ | ✅/❌ |
| Referrer-Policy | ✅/❌ | ✅/❌ | ✅/❌ |
| Content-Security-Policy | ✅/❌ | ✅/❌ | ✅/❌ |
| Permissions-Policy | ✅/❌ | ✅/❌ | ✅/❌ |

### Proxy / Middleware
| Check | Verdict | Notes |
|---|---|---|
| API protected behind auth layer | ✅/❌ | |
| Proxy redirects server-side (not client-side) | ✅/❌ | |
| Jobs whitelist is narrow (no wildcard) | ✅/❌ | |
| No forgeable bypass header trusted | ✅/❌ | |

### ❌ Critical findings ([N])
[route/file — check# — issue — exploit scenario — recommended fix]

### ⚠️ High findings ([N])
[route/file — check# — issue — recommended fix]

### 🔶 Medium findings ([N])
[route/file — check# — issue — recommended fix]

### ℹ️ Low / Informational ([N])
[route/file — check# — note]
```

### Write to backlog

For each Critical or High finding, append to `docs/refactoring-backlog.md`:
- Assign ID: `SEC-[n]`
- Add to priority index
- Add full detail section with exploit scenario and recommended fix

### Severity guide

- **Critical**: unauthenticated route exposing or modifying data; RLS bypass; service role key in client code; NEXT_PUBLIC_ secret; cron route with no secret check; raw input in queries; Supabase advisor `level: error`
- **High**: admin route without role check; sensitive field (CF, IBAN, P.IVA) exposed to non-owner; export route without role check; storage public URL on private bucket; open redirect; mass assignment; Supabase advisor `level: warning`; critical/high CVE in production dependency
- **Medium**: missing Zod on write route; error message leaking DB internals; missing security header; no rate limiting on high-value endpoints
- **Low**: header best-practice gap; informational Supabase advisor; moderate/low CVE not directly exploitable

---

## Execution notes

- Do NOT modify any route, config, or migration file.
- Do NOT test exploits or trigger requests against the production DB (`nyajqcjqmgxctlqighql`). Staging only.
- Supabase advisors MCP call: always use `project_id: "gjwkvgfwkdwzqlvudgqr"` (staging).
- SEO, robots.txt, meta tags, sitemaps, and public indexing are explicitly OUT OF SCOPE.
- After the report, ask: "Vuoi che implementi i fix Critical/High identificati?"
