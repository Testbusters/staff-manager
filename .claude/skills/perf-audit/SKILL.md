---
name: perf-audit
description: Performance audit for the staff-manager web app. Checks bundle size (Turbopack + webpack analyzers, optimizePackageImports), server/client component boundaries, data fetching patterns (sequential await waterfall, missing use cache/React.cache, parallel Promise.all), unnecessary re-renders, image optimization, Core Web Vitals impact (LCP/CLS/INP), and N+1 query patterns in API routes. Internal app — SEO meta tags, sitemap.xml, OpenGraph, and Lighthouse public-facing metrics are out of scope. Core Web Vitals are included as ranking factors for any future public-facing surface.
user-invocable: true
model: sonnet
context: fork
argument-hint: [target:section:<section>|target:page:<route>]
---

You are performing a performance audit of the staff-manager Next.js application.

## Context and scope

**In scope**: bundle composition, server/client component boundaries, data fetching efficiency (caching, parallelism, N+1), re-render patterns, image optimization, Core Web Vitals impact.
**Out of scope**: SEO, public indexing, `robots.txt`, `sitemap.xml`, OG tags, Lighthouse "accessibility" and "best practices" categories (covered by `/ui-audit`), database schema (covered by `/skill-db`).

**Core Web Vitals note**: This is an internal app, so Google ranking is not directly relevant today. However, these metrics are included because (a) they measure real perceived performance for internal users, (b) CWV are Google search ranking signals — relevant if any page ever becomes public, and (c) the thresholds are useful quantitative anchors for triage.

| Metric | Measures | Good | Needs work | Poor |
|---|---|---|---|---|
| LCP | Loading — largest content element visible | ≤ 2.5s | 2.5–4s | > 4s |
| CLS | Visual stability — layout shift score | ≤ 0.1 | 0.1–0.25 | > 0.25 |
| INP | Interactivity — response to input | ≤ 200ms | 200–500ms | > 500ms |

Source: web.dev/articles/vitals. Measured at 75th percentile of page loads across mobile/desktop.

---

## Step 0 — Target resolution

Parse `$ARGUMENTS` for a `target:` token.

| Pattern | Meaning |
|---|---|
| `target:section:corsi` | Focus on corsi/lezioni/candidature/assegnazioni components and routes |
| `target:section:compensi` | Focus on compensation and expense components |
| `target:page:/dashboard` | Focus on the dashboard and its component tree |
| No argument | Full audit — all files from sitemap |

Announce: `Running perf-audit — scope: [FULL | target: <resolved>]`
Apply the target filter to the file list in Step 1.

---

## Step 1 — Build file inventory

Read `docs/sitemap.md`. From the "Componenti chiave" column, build a list of:
- All page files in scope
- All heavy components (those with chart, calendar, data table, Tiptap editor — high rendering cost)
- All lib files used in API routes
- `next.config.ts` (or `next.config.js`)

Read `docs/refactoring-backlog.md` — note existing `PERF-` entries to avoid duplicates.

---

## Step 2 — Server/Client boundary checks (Explore agent)

Launch a **single Explore subagent** (model: haiku) with all page, component, and lib files from Step 1:

"Run all 7 checks below. For each: state total match count, list every match as `file:line — excerpt`, and state PASS or FAIL.

**CHECK B1 — Unnecessary 'use client' directives**
Grep: `'use client'` across all `app/**/*.tsx` files.
For each match: check if the file uses ANY of: `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`, `onClick`, `onChange`, `useRouter`, `usePathname`, `useSearchParams`.
Flag: any `'use client'` file that uses NONE of these patterns. It may be a Server Component that was incorrectly marked as client.

**CHECK B2 — Heavy libraries in client bundle**
Grep: `import.*from` in `'use client'` files. Flag any imports of these known-heavy libraries that do NOT need browser APIs and should be moved to Server Components:
- `xlsx`, `pdf-lib`, `pdfjs-dist` — document processing (server-only)
- `@tiptap/*` — rich text editor (client is acceptable IF interactive; flag if read-only render only)
- Chart libraries (e.g. `recharts`, `chart.js`) — acceptable in client if interactive; flag if data-display only
- Any library > ~50KB that could run server-side
Flag: each import with the library name and whether a server-side equivalent pattern exists.

**CHECK B3 — useEffect for data fetching in client components**
Grep: `useEffect.*fetch\(|useEffect.*supabase\.|useEffect.*svc\.` in `'use client'` files.
Flag: `useEffect` calls that fetch data — these defeat server rendering. Consider Server Components with `Suspense`, or SWR/React Query for client-side caching with proper revalidation.

**CHECK B4 — Memo/callback missing on stable callbacks passed to child components**
Grep: inline `() =>` arrow functions passed as props to components that are known to be memoized (check if child is wrapped in `memo()`). Pattern: `onX={()=>` where the prop is passed to a component declared with `memo(`.
Flag: each case. Inline arrow function props create new references on every parent render, defeating `memo`.
Note: do NOT flag `onClick` on native HTML elements — React batches these internally.

**CHECK B5 — Sequential await waterfall in Server Components**
Pattern: two or more consecutive `await` calls for independent data sources in the same async function.
Grep in server component files (files WITHOUT `'use client'`): lines matching `const .* = await (fetch|svc\.|supabase\.)` that appear consecutively (i.e., within 5 lines of each other) without the first result being an input to the second call.
Flag: each pair of sequential awaits that could be parallelised with `Promise.all`. A sequential waterfall adds full latency of each call one after the other; `Promise.all` runs them concurrently.
Example of violation: `const a = await getA(); const b = await getB();` where b doesn't depend on a.
Example of correct: `const [a, b] = await Promise.all([getA(), getB()]);`

**CHECK B6 — Missing caching on repeated Server Component queries**
Pattern: data fetches that run on every request without caching in Server Components.
Grep in server component files: `await svc.from(|await supabase.from(` — check if ANY of these are wrapped in `React.cache(` or called inside a function decorated with `use cache` directive.
Flag: server-side Supabase queries that are not cached and are called in layout-level or frequently-visited components (e.g. navigation data, user profile, community list). These execute on every page visit.
Note: `fetch` calls have automatic deduplication within a request, but Supabase client calls do NOT — they always hit the DB.

**CHECK B7 — Images without explicit dimensions (CLS risk)**
Grep: `<Image` without both `width` and `height` props (or without `fill` + parent position:relative).
Pattern: `<Image[^>]+(?<!width=)[^>]+/>` — flag any Next.js Image without sizing props.
Also grep: `<img` (raw img tags — covered by /ui-audit but also a CLS risk here).
Flag: each unsized image. Without dimensions, the browser cannot reserve layout space → content below the image shifts when it loads = CLS violation."

---

## Step 3 — Bundle composition check (main context)

Read `next.config.ts` (or `next.config.js`).

**P1 — Bundle analyzer availability**
Check if `@next/bundle-analyzer` is configured or `npx next experimental-analyze` is available:
- `@next/bundle-analyzer` (webpack): requires `require('@next/bundle-analyzer')` in config + `ANALYZE=true npm run build`
- Turbopack native analyzer (Next.js v16.1+): `npx next experimental-analyze` — no config needed, interactive module graph with import chain tracing

Since this project uses Next.js 16, both options are available. If neither is configured/documented, flag as Medium — developers cannot easily audit bundle composition.

**P2 — `serverExternalPackages` coverage**
Check if `serverExternalPackages` in `next.config.ts` includes all heavy server-only packages.
Known mandatory entries for this project: `['pdfjs-dist', 'pdf-lib']` (documented in CLAUDE.md).
Also check for: `xlsx`, `docxtemplater`, `pizzip` — large packages that should never be client-bundled.
Flag: any heavy server-only package that is NOT in `serverExternalPackages` (risk: it gets bundled into the client JS if accidentally imported from a `'use client'` path).

**P3 — `optimizePackageImports` for icon/utility libraries**
Check if `optimizePackageImports` in `next.config.ts` includes large packages with many exports that are partially used.
For this project, check: `lucide-react` (hundreds of icons — tree-shaking is critical).
Note: Next.js automatically optimizes some packages (check the official list). If `lucide-react` is already auto-optimized, note as PASS.
Flag: any package with 100+ exports where only a subset is used, not in `optimizePackageImports`.

---

## Step 4 — API query efficiency (Explore agent — separate pass)

Launch a second **Explore subagent** (model: haiku) scoped to API route files only (`app/api/**/*.ts`):

"Run these 3 checks:

**CHECK Q1 — Unbounded queries (no limit on large-growth tables)**
Grep: `\.from\('(compensations|expense_reimbursements|notifications|candidature|assegnazioni|lezioni|tickets)'\)` without `.limit(` or `.range(` within 10 lines.
Flag: each collection query without pagination bounds. Exception: export routes that intentionally fetch all for CSV/XLSX — verify from context.

**CHECK Q2 — Select * (over-fetching columns)**
Grep: `\.select\('\*'\)` in route handlers.
Flag: each match. Fetching all columns is a performance and security risk — columns with large values (e.g. `body`, `content`, blob URLs) are sent over the wire unnecessarily.

**CHECK Q3 — N+1 patterns**
Pattern A: `.from(table).select` inside `.map(` or `for` loop.
Pattern B: `for...of` with `await svc.from(` inside the loop body.
Flag: each match. N+1 on a list endpoint means N DB queries for an N-item list — use `.in([ids])` batch query or an embedded select instead."

---

## Step 5 — Produce report and update backlog

### Output format

```
## Perf Audit — [DATE] — [SCOPE]
### Sources: Next.js bundle docs (v16), web.dev/vitals, React docs

### Core Web Vitals thresholds (reference)
| Metric | Good | Needs work | Poor | Primary cause |
|---|---|---|---|---|
| LCP | ≤ 2.5s | 2.5–4s | > 4s | Slow server response, render-blocking resources |
| CLS | ≤ 0.1 | 0.1–0.25 | > 0.25 | Unsized images, dynamic content above fold |
| INP | ≤ 200ms | 200–500ms | > 500ms | Blocking JS on event handlers |

### Server/Client Boundary
| # | Check | Matches | Severity | Verdict |
|---|---|---|---|---|
| B1 | Unnecessary 'use client' | N | Medium | ✅/⚠️ |
| B2 | Heavy libraries in client bundle | N | High | ✅/⚠️ |
| B3 | useEffect data fetching | N | High | ✅/⚠️ |
| B4 | Unstable callbacks on memo'd children | N | Low | ✅/⚠️ |
| B5 | Sequential await waterfall | N | High | ✅/⚠️ |
| B6 | Uncached server queries | N | Medium | ✅/⚠️ |
| B7 | Images without dimensions (CLS) | N | Medium | ✅/⚠️ |

### Bundle Composition
| # | Check | Verdict | Notes |
|---|---|---|---|
| P1 | Bundle analyzer availability | ✅/⚠️ | [which tool] |
| P2 | serverExternalPackages | ✅/⚠️ | [missing packages if any] |
| P3 | optimizePackageImports | ✅/⚠️ | [lucide-react status] |

### API Query Efficiency
| # | Check | Matches | Verdict |
|---|---|---|---|
| Q1 | Unbounded queries | N | ✅/⚠️ |
| Q2 | Select * | N | ✅/⚠️ |
| Q3 | N+1 patterns | N | ✅/⚠️ |

### Findings requiring action ([N] total)
[file:line — check# — issue — impact — suggested fix for each]
```

### Write to backlog

For each finding with severity Medium or above, append to `docs/refactoring-backlog.md`:
- Assign ID: `PERF-[n]` (increment from last PERF entry)
- Add row to priority index table
- Add full detail section

### Severity guide

- **Critical**: N+1 in dashboard/list endpoints under heavy load (Q3); heavy server-only library (pdfjs, xlsx) discovered in client bundle (B2)
- **High**: Sequential await waterfall with >500ms combined latency risk (B5); useEffect data fetching on a primary route (B3); unbounded query on large-growth table (Q1)
- **Medium**: Uncached layout-level server queries called on every page load (B6); `select *` on tables with blob/large-text columns (Q2); unsized images (B7 — CLS risk); `optimizePackageImports` missing for lucide-react (P3); unnecessary `'use client'` on a heavy page (B1)
- **Low**: Unstable callbacks on memoized children (B4); minor code-splitting opportunities; bundle analyzer not configured (P1)

---

## Execution notes

- Do NOT make any code changes.
- Do NOT flag `SupabaseClient<any, any, any>` type workaround in notification helpers — intentional pattern per CLAUDE.md.
- `pdfjs-dist` and `pdf-lib` in `serverExternalPackages` are intentional and documented — note as correctly configured.
- Tiptap in `'use client'` files is acceptable — it requires browser APIs. Only flag if used in a read-only display context.
- After producing the report, ask: "Vuoi che implementi le ottimizzazioni di priorità High/Critical?"
